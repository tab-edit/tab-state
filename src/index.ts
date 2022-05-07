// credit: https://github.com/eslint/eslint/blob/90a5b6b4aeff7343783f85418c683f2c9901ab07/lib/linter/linter.js
//and https://eslint.org/docs/developer-guide/working-with-rules#contextreport
import { Text } from "@codemirror/text";
import { ASTNode, Cursor, FragmentCursor, TabTree } from "tab-ast";
import StateReducerEventGenerator from "./event-generator/state-reducer-event-generator";
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


/**
 * Creates a tag for identifying a rule which is under a specific group. 
 * @param ruleName 
 * @param groupName 
 * @returns a string tag for the rule/group combination 
 */
function createGroupedRulestateTag(ruleName:string, groupName:string) { return `${ruleName}@group:${groupName}` }
/**
 * Creates a tag for a rule which accesses a shared state 
 * @param ruleName 
 * @returns a string tag for the rule 
 */
function createSharedRulestateTag(ruleName:string) { return `${ruleName}@shared` }


function generateState(root: TabTree|ASTNode, sourceText: Text) {
    const emitter = new SafeEmitter();
    const reducerEventGenerator = new StateReducerEventGenerator(emitter);

    const tree = root instanceof ASTNode ? new TabTree([]) : root; // TODO: replace new TabTree([]) with producing a TabTree from the root ASTNode

    type TraversalInfo = {isEntering: boolean, node: Readonly<ASTNode>, getCursor: () => FragmentCursor}
    const nodeQueue:TraversalInfo[] = [];
    let currentTraversalInfo = {isEntering: false, node: tree.cursor.node, getCursor: () => tree.cursor};
    tree.iterate({
        enter(node, getCursor) {
            nodeQueue.push({ isEntering: true, node, getCursor });
        },
        leave(node, getCursor) {
            nodeQueue.push({ isEntering: false, node, getCursor })
        }
    });

    const sharedTraversalContext = Object.freeze({
        getAncestors: () => Object.freeze(currentTraversalInfo.getCursor().getAncestors()),
        getSourceText: () => sourceText,
        getTextFromNode: (node:ASTNode) => sourceText.sliceString(node.ranges[0],node.ranges[1]),
        getCursor: () => currentTraversalInfo.getCursor(),
        parserOptions: { }, // TODO: implement this
    });

    

    const rootState:RootState = {
        shared: {}
    };
    const usesSharedState = (ruleName:string, groupName:string) => !rootState[groupName][ruleName] // it uses a shared state if a separate rule-state object wasn't created for it in this group
    const generateStateTag = (ruleName:string, groupName:string) => usesSharedState(ruleName, groupName) ? createSharedRulestateTag(ruleName) : createGroupedRulestateTag(ruleName, groupName);
    const resolveState = (stateTag:string) => {
        
    }
    const getRuleState = (ruleName:string, groupName:string) => usesSharedState(ruleName, groupName) ? rootState[groupName][ruleName] : rootState.shared[ruleName];
    const updateRuleState = (newState:any, ruleName:string, groupName:string) => {
        if (!usesSharedState(ruleName, groupName)) rootState[groupName][ruleName] = newState;
        else if (rootState.shared[ruleName]) rootState.shared[ruleName] = newState;
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
            [ruleName:string]: any
        }
        configGroups: {
            [groupName:string]: {
                [ruleName:string]: any
            }
        }
    }
    
    const config:Config = {
        configRules: {},
        configGroups: {}
    }

    Object.keys(configuredGroups).forEach(groupName => {
        rootState[groupName] = {};
        const group:GroupDeclaration = configuredGroups[groupName];
        const groupConfig = config.configGroups[groupName] || {};
        for (const ruleName of group.rules) {
            const rule:TabRuleDeclaration = ruleMapper(ruleName);
            if (!rule) throw new Error(`The rule ${createGroupedRulestateTag(ruleName, groupName)} could not be found.`)

            // initialize rule's state and config
            let ruleConfig:Object;
            if (ruleName in groupConfig) { // this group probably modifies this rule's config from it's default config
                rootState[groupName][ruleName] = rule.initialState();
                ruleConfig = groupConfig[ruleName];
            } else {
                rootState.shared[ruleName] = rule.initialState();
                ruleConfig = config.configRules[ruleName] || {}
            }
            const stateTag = generateStateTag(ruleName, groupName);

            const ruleContext:TabRuleContext = Object.freeze(
                Object.assign(
                    Object.create(sharedTraversalContext),
                    {
                        id: stateTag,
                        config: Object.freeze(ruleConfig),
                        getCurrentState: () => getRuleState(stateTag),
                        requestState(name:string) {
                            if (!(ruleName in group.rules)) throw new Error(`Cannot retrieve requested rule state. Requested rule '${name}' does not belong to the same group as the requesting rule '${createGroupedRulestateTag(ruleName, groupName)}'.`)
                            if (!rule.dependencies || !(ruleName in rule.dependencies)) throw new Error(`Cannot retrieve requested rule state. The requested rule '${name}' must be declared as a dependancy of the requesting rule '${ruleName}.`)
                            reducerEventGenerator.ensureStateListener
                            return getRuleState(ruleName, groupName);
                        }
                    }
                )
            )

            // initialize rule listeners for this rule, as well as its state
            let ruleListeners: ReturnType<typeof createRuleListeners> = {};
            if(usesSharedState(ruleName, groupName)) {
                if (!attachedSharedListeners.has(ruleName)) { //prevent attaching redundant rule listeners for shared states
                    ruleListeners = createRuleListeners(rule, ruleContext, groupName);
                    attachedSharedListeners.add(ruleName);
                }
            } else ruleListeners = createRuleListeners(rule, ruleContext, groupName);


            Object.keys(ruleListeners).forEach(selector => {
                const ruleListener = ruleListeners[selector];
                emitter.on(
                    selector,
                    ruleListener
                )
            })
        }
    })

    nodeQueue.forEach(traversalInfo => {
        currentTraversalInfo = traversalInfo;
        try {
            if (traversalInfo.isEntering) {
                const cursor = traversalInfo.getCursor(); cursor.parent();
                const parent = cursor.node;
                reducerEventGenerator.enterNode(traversalInfo.node, parent);
            } else {
                reducerEventGenerator.leaveNode(traversalInfo.node);
            }
        } catch (err) {
            throw err;
        }
    })


}

function createRuleListeners(rule: TabRuleDeclaration, ruleContext:TabRuleContext, ruleStateTag:string) {
    try {
        return rule.createVisitors(ruleContext);
    } catch (ex:any) {
        ex.message = `Error while loading rule '${ruleTag}'`
        throw ex;
    }
}
