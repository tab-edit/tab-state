// credit: https://github.com/eslint/eslint/blob/90a5b6b4aeff7343783f85418c683f2c9901ab07/lib/linter/linter.js
//and https://eslint.org/docs/developer-guide/working-with-rules#contextreport
import { EditorState } from "@codemirror/state";
import { ResolvedASTNode, TabTreeCursor, tabSyntaxTree } from "tab-ast";
import NodeEventGenerator from "./event-generator/node-event-generator";
import SafeEmitter from "./event-generator/safe-emitter";
import { RuleModule, RuleContext, ruleMapper } from "./rules";
import { StateManager } from "./state-manager";

type Config = {
    default: {
        [ruleId:string]: any
    }
    [groupId:string]: {
        [ruleId:string]: any
    }
}

// TODO: generateState should be called with an EditorState as a parameter instead of TabTree, i think
function generateState(editorState:EditorState, configuredGroups: , config: Config) {
    const stateManager = new StateManager();
    const emitter = new SafeEmitter();

    const tree = tabSyntaxTree(editorState);

    // generate a queue containing node traversal info
    type TraversalInfo = {isEntering: boolean, cursor: TabTreeCursor};
    const nodeQueue:TraversalInfo[] = [];
    let currentTraversalInfo:TraversalInfo = {isEntering: false, cursor: tree.cursor};
    tree.iterate({
        enter(_, cursor) {
            nodeQueue.push({ isEntering: true, cursor });
        },
        leave(_, cursor) {
            nodeQueue.push({ isEntering: false, cursor })
        }
    });

    /*
     * Create a frozen object with the ruleContext properties and methods that are shared by all rules.
     * All rule contexts will inherit from this object. This avoids the performance penalty of copying all the
     * properties once for each rule.
     */
    const sharedTraversalContext = Object.freeze({
        getAncestors: () => Object.freeze(currentTraversalInfo.cursor.getAncestors()),
        getSourceText: () => editorState.doc,
        getTextFromNode: (node:ResolvedASTNode) => editorState.doc.sliceString(node.ranges[0],node.ranges[1]),
        languageOptions: { }, // TODO: implement this
    });

    /*
     *  Stores the tags for states whose listeners have been attached to the emitter
     */
    const attachedListenerGroups = new Set<string>();

    Object.keys(configuredGroups).forEach(groupId => {
        const group = configuredGroups[groupId];
        for (const ruleId of group.rules) {
            const rule:RuleModule = ruleMapper(ruleId);
            if (!rule) throw new Error(`The rule ${ruleId}, declared as part of the group ${groupId}, could not be found.`)
            const defaultConfigOverridden = config[groupId] && (ruleId in config[groupId]);

            let stateTag:string;
            if (defaultConfigOverridden) {
                stateTag = stateManager.initState(ruleId, groupId, config[groupId][ruleId], rule.initialState)
            } else {
                stateTag = stateManager.initSharedState(ruleId, config.default[ruleId], rule.initialState, true);
            }
            const {state} = stateManager.resolveState(stateTag);

            const ruleContext:RuleContext = Object.freeze(
                Object.assign(
                    Object.create(sharedTraversalContext),
                    {
                        id: stateTag,
                        config: state.config,
                        getState: () => state.value,
                        setState(reducer: (oldValue:any)=>any) {
                            state.value = reducer(state.value);
                            state.lastUpdate = {
                                nodeHash: currentTraversalInfo.cursor.node.hash(),
                                type: currentTraversalInfo.isEntering ? "onentry" : "onexit"
                            }
                        },
                        requestExternalState(requestedRuleId:string) {
                            if (!(requestedRuleId in group.rules)) throw new Error(`Cannot retrieve requested rule state '${requestedRuleId}'. Requested rule is not a part of the group '${groupId}' from which it was requested.`)
                            if (!(requestedRuleId in rule.dependencies)) throw new Error(`Cannot retrieve requested rule state '${requestedRuleId}'. Requested rule is not declared as a dependency of the requesting rule '${ruleId}'.`)

                            const externalStateTag = stateManager.resolveStateTag(requestedRuleId, groupId)
                            if (!externalStateTag) throw new Error(`Error when trying to retrieve external state ${requestedRuleId} from group ${groupId}.`);
                            return stateManager.resolveState(externalStateTag);
                        }
                    }
                )
            )

            const ruleListeners = attachedListenerGroups.has(stateTag) ? createRuleListeners(rule, ruleContext, stateTag) : {};
            Object.keys(ruleListeners).forEach(selector => {
                const ruleListener = ruleListeners[selector];
                emitter.on(
                    selector,
                    ruleListener,
                    /* 
                     * group events by ruleId. this makes it so we can emit
                     * them in correct order based on their rule dependencies,
                     * using topological sort.
                     */
                    ruleId 
                )
            })
            attachedListenerGroups.add(stateTag);
        }
    })

    const eventGenerator = new NodeEventGenerator(emitter);
    nodeQueue.forEach(traversalInfo => {
        currentTraversalInfo = traversalInfo;
        try {
            if (traversalInfo.isEntering) {
                const cursor = traversalInfo.cursor.fork(); cursor.parent();
                const parent = cursor.node;
                eventGenerator.enterNode(traversalInfo.cursor.node, parent);
            } else {
                eventGenerator.leaveNode(traversalInfo.cursor.node);
            }
        } catch (err) {
            throw err;
        }
    })
}

function createRuleListeners(rule: RuleModule, ruleContext:RuleContext, stateTag:string) {
    try {
        return rule.createVisitors(ruleContext);
    } catch (ex:any) {
        const message = `Error while loading rule '${stateTag}'`;
        ex.message = `${message}: ${ex.message}`;
        throw ex;
    }
}
