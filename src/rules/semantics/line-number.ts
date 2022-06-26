import { SourceSyntaxNodeTypes } from "tab-ast";
import { RuleModule } from "../../rules";
import { getPositionDescriptor, getTextFromNode } from "../utils/node-util-functions";

export type LineNumberState = {
    doclineToMlineNum: Map<number, number>,
    mlineToDoclineNum: Map<number, number>
}

export default {
    meta: {
        name: "line-number",
        dependencies: [],
        accurateAt: "Measure:entry"
    },
    initialState: () => ({
        doclineToMlineNum: new Map<number, number>(),
        mlineToDoclineNum: new Map<number, number>()
    }),
    createVisitors: function(context) {
        return {
            Measure: function(node) {
                const doclineToMlineNum = new Map<number, number>();
                const mlineToDoclineNum = new Map<number, number>();
                let prevDocline = 0;
                let mlineNum = 0;
                node.sourceSyntaxNodes()[SourceSyntaxNodeTypes.MeasureLine].forEach(mline => {
                    const docline = getPositionDescriptor(mline.from, context).line;
                    if (docline<=prevDocline) {
                        context.reportError("There's an error with the syntax node grouping.")
                        return;
                    }
                    prevDocline = docline;

                    mlineNum += 1;
                    doclineToMlineNum.set(docline, mlineNum);
                    mlineToDoclineNum.set(mlineNum, docline);
                });

                context.setState(state => {
                    state.doclineToMlineNum = doclineToMlineNum;
                    state.mlineToDoclineNum = mlineToDoclineNum;
                    return state;
                });
            }
        }
    }
} as RuleModule<LineNumberState>