// credit: https://github.com/eslint/eslint/blob/90a5b6b4aeff7343783f85418c683f2c9901ab07/lib/linter/linter.js
//and https://eslint.org/docs/developer-guide/working-with-rules#contextreport
import { Text } from "@codemirror/text";
import { ASTNode, FragmentCursor, TabTree } from "tab-ast";
import NodeEventGenerator from "./event-generator/node-event-generator";
import SafeEmitter from "./event-generator/safe-emitter";
import { Rule, RuleContext } from "./rule";
import { StateManager } from "./state-manager";

type Config = {
    default: {
        [ruleId:string]: any
    }
    [groupId:string]: {
        [ruleId:string]: any
    }
}


function generateState(root: TabTree|ASTNode, sourceText: Text, configuredGroups: , config: Config) {
    const tree = root instanceof ASTNode ? new TabTree([]) : root; // TODO: replace new TabTree([]) with producing a TabTree from the root ASTNode
    const stateManager = new StateManager();

    const emitter = new SafeEmitter();
    const eventGenerator = new NodeEventGenerator(emitter);

    // generate a queue containing node traversal info
    type TraversalInfo = {isEntering: boolean, node: ASTNode, getCursor: () => FragmentCursor};
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

    /*
     * Create a frozen object with the ruleContext properties and methods that are shared by all rules.
     * All rule contexts will inherit from this object. This avoids the performance penalty of copying all the
     * properties once for each rule.
     */
    const sharedTraversalContext = Object.freeze({
        getAncestors: () => Object.freeze(currentTraversalInfo.getCursor().getAncestors()),
        getSourceText: () => sourceText,
        getTextFromNode: (node:ASTNode) => sourceText.sliceString(node.ranges[0],node.ranges[1]),
        getCursor: () => currentTraversalInfo.getCursor(),
        languageOptions: { }, // TODO: implement this
    });

    /*
     *  Stores the tags for states whose listeners have been attached to the emitter
     */
    const attachedListenerGroups = new Set<string>();

    Object.keys(configuredGroups).forEach(groupId => {
        const group = configuredGroups[groupId];
        for (const ruleId of group.rules) {
            const rule:Rule = ruleMapper(ruleId);
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
                        setState(value: any) {
                            state.value = value;
                            // TODO: update the fields state.updated
                        },
                        requestExternalState(requestedRuleId:string) {
                            if (!(requestedRuleId in group.rules)) throw new Error(`Cannot retrieve requested rule state '${requestedRuleId}'. Requested rule is not a part of the group '${groupId}' from which it was requested.`)
                            if (!(requestedRuleId in rule.dependencies)) throw new Error(`Cannot retrieve requested rule state '${requestedRuleId}'. Requested rule is not declared as a dependency of the requesting rule '${ruleId}'.`)

                            const externalStateTag = stateManager.resolveStateTag(requestedRuleId, groupId)
                            if (!externalStateTag) throw new Error(`Error when trying to retrieve external state ${requestedRuleId} from group ${groupId}.`)

                            // prioritize listeners associated with this state to make sure the state is not stale.
                            eventGenerator.prioritizeListenerGroup(externalStateTag);
                            // TODO: if (xxx) throw new Error(`Circular dependency found: ${stateTag}`)
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
                    stateTag
                )
            })
            attachedListenerGroups.add(stateTag)
        }
    })

    nodeQueue.forEach(traversalInfo => {
        currentTraversalInfo = traversalInfo;
        try {
            if (traversalInfo.isEntering) {
                const cursor = traversalInfo.getCursor(); cursor.parent();
                const parent = cursor.node;
                eventGenerator.enterNode(traversalInfo.node, parent);
            } else {
                eventGenerator.leaveNode(traversalInfo.node);
            }
        } catch (err) {
            throw err;
        }
    })
}

function createRuleListeners(rule: Rule, ruleContext:RuleContext, stateTag:string) {
    try {
        return rule.createVisitors(ruleContext);
    } catch (ex:any) {
        ex.message = `Error while loading rule '${stateTag}'`
        throw ex;
    }
}
