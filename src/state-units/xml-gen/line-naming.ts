import { ASTNode } from "tab-ast";
import { TabRuleDeclaration } from "../..";

type LineNamingState = {
    naming: Map<number, string>
    numberingRel2Abs: Map<number, number>
}

export default {
    name: "line-naming",
    dependencies: [],
    initialState: () => ({
        naming: new Map(),
        numberingRel2Abs: new Map()
    }),
    createVisitors: function(context) {
        return {
            "LineNaming": function(node) {
                // reset line naming
                return () => ({
                    naming: new Map<number, string>(),
                    numberingRel2Abs: new Map<number, number>()
                });
            },
            "LineNaming > MeasureLineName": function(node) {
                let state = context.getCurrentState<LineNamingState>()
                
                let lineName = context.getTextFromNode(node).replace(/\s/g,'');;
                let lineNumber = context.getSourceText().lineAt(node.ranges[0]).number;

                if (state.naming.has(lineNumber)) {
                    console.error("multiple line names on a single line for a measure. figure out where the bug is from.")
                    return;
                }
                
                return (state) => {
                    state.naming.set(lineNumber, lineName);
                    return state;
                }
            },
            "LineNaming:exit": function(node) {
                return (state) => {
                    let absNumberingArr:number[] = []
                    for (let key of state.naming.keys()) {
                        absNumberingArr.push(key);
                    }
                    absNumberingArr.sort().map((val, idx) => state.numberingRel2Abs.set(idx, val))
                    return state;
                }
            }
        }
    }
} as TabRuleDeclaration<LineNamingState>