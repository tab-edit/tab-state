import { RuleModule } from "../../rules";
import { getPositionDescriptor, getTextFromNode } from "../utils/util-functions";

export type LineNamingState = {
    doclineToName: Map<number, string>
}

export default {
    name: "line-naming",
    dependencies: [],
    initialState: () => ({
        doclineToName: new Map(),
    }),
    createVisitors: function(context) {
        return {
            LineNaming: function() {
                // reset line naming
                context.setState(() => ({
                    doclineToName: new Map<number, string>(),
                }));
            },
            "LineNaming > MeasureLineName": function(node) {
                let state = context.getState();
                
                let lineName = getTextFromNode(node, context)[0].replace(/\s/g,'');
                let doclineNum = getPositionDescriptor(node.ranges[0], context).line;

                if (state.doclineToName.has(doclineNum)) {
                    context.reportError("multiple line names on a single line for a measure. figure out where the bug is from.")
                    return;
                }

                state.doclineToName.set(doclineNum, lineName)

                context.setState((state) => {
                    state.doclineToName.set(doclineNum, lineName);
                    return state;
                });
            }
        }
    }
} as RuleModule<LineNamingState>