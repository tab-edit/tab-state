// credit: https://github.com/eslint/eslint/blob/90a5b6b4aeff7343783f85418c683f2c9901ab07/lib/linter/linter.js
//and https://eslint.org/docs/developer-guide/working-with-rules#contextreport
import { Text } from "@codemirror/text";
import { ASTNode, Cursor, TabTree } from "tab-ast";
import SafeEmitter from "./event-generator/safe-emitter";

// TODO: consider making it optional for rules to be group-agnostic or to tie themselves to a group. 
// this could be beneficial so that rules can use group-level tools, like a reportTranslator() method 
// for the linter group so that rules can easily convert their linting issues into "Problem" objects.
// might not be necessary though. may just be able to use exported functions to solve this problem.
type TabRuleReducer<S> = (state: S) => S;
type TabRuleVisitor<S> = (node: ASTNode) => TabRuleReducer<S> | void;

type StateUpdateStatus = "stale" | "onentry" | "onexit";
export type TabRuleContext = {
    parserOptions:Object //stuff like enforce guitar? stuff like that
    id: string// string? not sure. stateunit's id
    config:Object
    getCurrentState<S>(): S
    requestState<S>(name:string): {state: S, updatedOnCurrentVisit: StateUpdateStatus, updatedOnAncestorVisit: StateUpdateStatus}
    getAncestors(): ASTNode[],
    getSourceText(): Text, // TODO: make sure this is the Text class from codemirror6
    getTextFromNode(node: ASTNode): string,
    getCursor(): Cursor<ASTNode>,
}

export interface TabRuleDeclaration<
    RuleState = any,
    Name extends string = string
> {
    /**
     * The rule's name.
     */
    name: Name
    /**
     * The names of the rule states which this rule depends on.
     */
    dependencies: string[]
    /**
     * The lazily-loaded initial state of the rule.
     */
    initialState: () => RuleState
    /**
     * Creates visitors that are called while traversing the tab abstract syntax tree (AST) and that return a state-reducer which is used to update the rule's state.
     */
    createVisitors(context: TabRuleContext): {[selector:string]: TabRuleVisitor<RuleState>}
}

type GroupDeclaration<
    Name extends string = string
> = {
    name: Name
    rules: string[]
}

function generateState(root: TabTree|ASTNode, sourceText: Text) {
    const emitter = new SafeEmitter();
    const nodeQueue:{isEntering: boolean, node: Readonly<ASTNode>}[] = [];
    const tree = root instanceof ASTNode ? new TabTree([]) : root; // TODO: replace new TabTree([]) with producing a TabTree from the root ASTNode
    let currentNodeCursor = tree.cursor;

    tree.iterate({
        enter(node) {
            nodeQueue.push({ isEntering: true, node });
        },
        leave(node) {
            nodeQueue.push({ isEntering: false, node })
        }
    });

    const sharedTraversalContext = Object.freeze({
        getAncestors: () => Object.freeze(currentNodeCursor.getAncestors()),
        getSourceText: () => sourceText,
        getTextFromNode: (node:ASTNode) => sourceText.sliceString(node.ranges[0],node.ranges[1]),
        getCursor: () => currentNodeCursor.fork(),
        parserOptions: { }, // TODO: implement this
    });

    type TabRuleObject = {
        state: any,
        updatedOnCurrentVisit: StateUpdateStatus,
        updatedOnAncestorVisit: StateUpdateStatus,
    }

    /**
     * The RootState stores the state of all the rules. For some rules, they may have multiple instances of their state.
     * This may only be the case if a group overrides a rule's default configuration. if that is the case, the group
     * that overrided the rule's default configuration will have its own separate instance of the rule's state.
     */
    type RootState = {
        sharedRuleStates: {
            [ruleId:string]: TabRuleObject
        }
        [groupId:string]: {
            [ruleId:string]: TabRuleObject
        }
    }; 
    const state:RootState = {
        sharedRuleStates: {}
    };
    const usesSharedState = (ruleId:string, groupId:string) => !state[groupId][ruleId] // it uses a shared state if a separate rule-state object wasn't created for it in this group
    const getRuleState = (ruleId:string, groupId:string) => usesSharedState(ruleId, groupId) ? state[groupId][ruleId] : state.sharedRuleStates[ruleId];
    const updateRuleState = (newState:any, ruleId:string, groupId:string) => {
        if (!usesSharedState(ruleId, groupId)) state[groupId][ruleId] = newState;
        else if (state.sharedRuleStates[ruleId]) state.sharedRuleStates[ruleId] = newState;
        else return false;
        return true;
    }

    /**
     *  a way to keep track of rule-listeners that have been attached for shared states to prevent attaching redundant listeners
     */
    const attachedSharedListeners = new Set<string>();
    /**
     * temporary way to mock the yml or json rule config that will be passed in. (the config will 
     * be similar to eslintrc. it will follow the format below, having a default config for rules
     * but also allowing each group the ability to override the default config for rules.
     * 
     * rule configs do not need to be exhaustive.
     */
    type Config = {
        configRules: {
            [ruleId:string]: any
        }
        configGroups: {
            [groupId:string]: {
                [ruleId:string]: any
            }
        }
    }
    
    const config:Config = {
        configRules: {},
        configGroups: {}
    }

    Object.keys(configuredGroups).forEach(groupId => {
        state[groupId] = {};
        const group:GroupDeclaration = configuredGroups[groupId];
        const groupConfig = config.configGroups[groupId] || {};
        for (const ruleId of group.rules) {
            const rule:TabRuleDeclaration = ruleMapper(ruleId);
            if (!rule) throw new Error(`The rule (${ruleId}) declared in the group (${groupId}) could not be found.`)

            // initialize rule's state and config
            let ruleConfig:Object;
            if (ruleId in groupConfig) { // this group probably modifies this rule's config from it's default config
                state[groupId][ruleId] = rule.initialState();
                ruleConfig = groupConfig[ruleId];
            } else {
                state.sharedRuleStates[ruleId] = rule.initialState();
                ruleConfig = config.configRules[ruleId] || {}
            }

            const ruleContext:TabRuleContext = Object.freeze(
                Object.assign(
                    Object.create(sharedTraversalContext),
                    {
                        id: ruleId,
                        config: Object.freeze(ruleConfig),
                        getCurrentState: () => getRuleState(ruleId, groupId),
                        requestState(name:string) {
                            if (!(ruleId in group.rules)) throw new Error(`The requested rule-state (${name}) is not a member of the group (${groupId}) of the rule which requested it (${ruleId}).`)
                            if (!rule.dependencies || !(ruleId in rule.dependencies)) throw new Error(`The requested rule-state (${name}) must be declared as a dependency of the rule which requested it (${ruleId})`)
                            // TODO: do computation to visit the requested rule and update its state if it is in the visit queue
                            return getRuleState(ruleId, groupId);
                        }
                    }
                )
            )

            let ruleListeners: ReturnType<typeof createRuleListeners> = {};
            if(usesSharedState(ruleId, groupId)) {
                if (!attachedSharedListeners.has(ruleId)) { //prevent attaching redundant rule listeners for shared states
                    ruleListeners = createRuleListeners(rule, ruleContext, groupId);
                    attachedSharedListeners.add(ruleId);
                }
            } else ruleListeners = createRuleListeners(rule, ruleContext, groupId);


            Object.keys(ruleListeners).forEach(selector => {
                const ruleListener = ruleListeners[selector];
                emitter.on(
                    selector,
                    ruleListener
                )
            })
        }
    })

    const eventGenerator = NodeEventGenerator()


}

function createRuleListeners(rule: TabRuleDeclaration, ruleContext:TabRuleContext, groupId: string) {
    try {
        return rule.createVisitors(ruleContext);
    } catch (ex:any) {
        ex.message = `Error while loading rule '${ruleContext.id}' of group ${groupId}`
        throw ex;
    }
}
