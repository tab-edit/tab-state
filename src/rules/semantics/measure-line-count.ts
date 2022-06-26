import { ASTNodeTypes, ResolvedASTNode, SourceSyntaxNodeTypes } from "tab-ast"
import { RuleModule } from "../../rules"

export type MeasureLineCountState = number;

export default {
    meta: {
        name: "measure-line-count",
        dependencies: ["explicit-line-name", "comment-declared-instrument-type"],
        accurateAt: "Measure"
    },
    initialState: () => 0,
    createVisitors: function(context) {
        return {
            Measure(node) {
                context.setState(state => state = node.sourceSyntaxNodes()[SourceSyntaxNodeTypes.MeasureLine]?.length || 0)
            }
        }
    }
} as RuleModule<MeasureLineCountState>
