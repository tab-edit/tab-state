// credit: https://github.com/eslint/eslint/blob/90a5b6b4aeff7343783f85418c683f2c9901ab07/lib/linter/linter.js
//and https://eslint.org/docs/developer-guide/working-with-rules#contextreport
import { Text } from "@codemirror/text";
import { ASTNode, Cursor, TabTree } from "tab-ast";
import SafeEmitter from "./event-generator/safe-emitter";

const state = {
    "namespace": {
        export: {

        },
        "field1": {

        },
        "field2": {

        }
    }
}

const lintingState = {
    "linter": {
        export: {
            lintingProblems: Problems[]
        },
        "no-spacing": {

        },
        "linename-present": {

        },
        middleware: {
            "linter": () => {

            },
            "linter:no-spacing linter:linename-present": (newState, statename:string) => {

            }
        }
    }
}

export type StateContext = {
    parserOptions:{}//stuff like enforce guitar? stuff like that
    id: string// string? not sure. stateunit's id
    options:{}
    requestState(namespace:string, field:string): unknown
    getAncestors(): ASTNode[],
    getSourceText(): Text, // TODO: make sure this is the Text class from codemirror6
    getTextFromNode(node: ASTNode): string,
    getCursor(): Cursor<ASTNode>,
    dispatchAction(state:any): void
}

const StateUnitDeclaration = {
    meta: {
        namespace: "line-naming"
    },
    state: {

    },
    create: function(context:StateContext) {
        return {
            "LineNaming > MeasureLineName": function(node:Readonly<ASTNode>, state: StateUnit) {
                // let otherstate = context.requestStateData(namespace="dhiofd", field="hioweg") // figures out if you have write access and returns appropriately
                // if state does not exist, log useful error (inside the requestStateData function obvsly)
                // 
                return state //TODO: think is the best way to update state to return it, or to call a function like dispatchStateChange()
            },
            onStart: function(/*tree:Readonly<AST>*/, state: StateUnit) {

            },
            onEnd: function(/*node:Readonly<AST>*/, state: StateUnit) {

            }
        }
    }
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