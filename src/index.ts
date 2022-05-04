// credit: https://github.com/eslint/eslint/blob/90a5b6b4aeff7343783f85418c683f2c9901ab07/lib/linter/linter.js
//and https://eslint.org/docs/developer-guide/working-with-rules#contextreport
import { Text } from "@codemirror/text";
import { ASTNode, Cursor, TabTree } from "tab-ast";
import SafeEmitter from "./event-generator/safe-emitter";

type RuleReducer<S> = (state: S) => S;
type RuleVisitor<S> = (node: ASTNode) => RuleReducer<S> | void;

export type RuleContext = {
    parserOptions:{}//stuff like enforce guitar? stuff like that
    id: string// string? not sure. stateunit's id
    options:{}
    requestRuleState(name:string): any
    getAncestors(): ASTNode[],
    getSourceText(): Text, // TODO: make sure this is the Text class from codemirror6
    getTextFromNode(node: ASTNode): string,
    getCursor(): Cursor<ASTNode>,
    dispatchAction(state:any): void
}

export interface CreateRule<
    RuleState = any,
    Name extends string = string
> {
    /**
     * The rule's name. Used to namespace the generated action types.
     */
    name: Name
    dependencies?: string[]
    initialState: RuleState | (() => RuleState)
    /**
     * returns an object with methods that tab-state calls to "visit" nodes while traversing the abstract syntax tree and update the state of the rule
     */
    createVisitors: (context: RuleContext) => {[selector:string]: RuleVisitor<RuleState>}
}

function createSlice<RuleState>(
    options: CreateRule<RuleState>
) {

}


function runStates(tree: TabTree, sourceText: Text) {
    const emitter = new SafeEmitter();
    const nodeQueue:{isEntering: boolean, node: Readonly<ASTNode>}[] = [];
    let cursor = tree.cursor;

    tree.iterate({
        enter(node) {
            nodeQueue.push({ isEntering: true, node });
        },
        leave(node) {
            nodeQueue.push({ isEntering: false, node })
        }
    })

    const sharedTraversalContext = Object.freeze({
        getAncestors: () => Object.freeze(cursor.getAncestors()),
        getSourceText: () => sourceText,
        getTextFromNode: (node:ASTNode) => sourceText.sliceString(node.ranges[0],node.ranges[1])
    });

    Object.keys(configuredStates).forEach(stateId => {

    })
}