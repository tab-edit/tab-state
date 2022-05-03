import { ASTNode } from "tab-ast";
import { StateContext } from "../..";

export default {
    meta: {
        namespace: "xml-gen",
        field: "line-naming"
    },
    initState: function() { 
        return {
            linenames: new Map()
        }
    },
    create: function(context:StateContext) {
        return {
            "LineNaming": function(node:ASTNode) {
                //reset line naming
                return (state:any) => {
                    state.linenames = new Map()
                }
            },
            "LineNaming > MeasureLineName": function(node: ASTNode) {
                let state:any = context.requestState("xml-gen", "line-naming");

                let lineName = context.getTextFromNode(node).replace(/\s/g,'');;
                let lineNumber = context.getSourceText().lineAt(node.ranges[0]).number;

                if (state.linenames.has(lineNumber)) {
                    console.error("multiple line names on a single line for a measure. figure out where the bug is from.")
                    return;
                }
                
                return (state:any) => {
                    state.linenames.set(lineNumber, lineName);
                }
            }
        }
    }
};