import { Text } from "@codemirror/text";
import { ResolvedASTNode, SourceSyntaxNodeTypes } from "tab-ast";
import { RuleContext } from "../../rules";

export function getPositionDescriptor(pos:number, context: RuleContext): {line: number, col: number} {
    const line = context.getSourceText().lineAt(pos);
    return {
        line: line.number,
        col: pos - line.from
    }
}

export function getTextFromNode(node: ResolvedASTNode, context: RuleContext) {
    const text:string[] = [];
    for (let i=1; i<node.ranges.length; i+=2) {
        text.push(context.getSourceText().sliceString(node.ranges[i-1],node.ranges[i]));
    }
    return text;
}


/**
 * Specifies which method is used to compute a single, continuous, column-wise range
 * from a multi-ranged measure.
 * 
 * Two methods:
 *      - "top-line":      a measure's range is the range of it's first (top-most) measureline
 *      - "earliest-line":   a measure's range is the range of the measureline that is closest to the start-of-line.
 *                          if multiple measurelines are on the same column, the longest-range measureline wins out.
 */
export type MeasureAnchorStyle = "top-line" | "earliest-line";

/**
 * Compute a single, continuous, column-wise range from a multi-ranged measure.
 * @param measure the measure syntax node used to determine anchor ragne.
 * @param context context. context.config is used for determining the measure's anchor range.
 * @returns {start: number, end: number} the anchor range of the provided measure.
 */
export function computeMeasureAnchorRange(measure:ResolvedASTNode, context: RuleContext<any, {measureAnchorStyle: MeasureAnchorStyle}>) {
    const mlines = measure.sourceSyntaxNodes()[SourceSyntaxNodeTypes.MeasureLine];
    if (context.config.measureAnchorStyle=="top-line") {
        return {
            start: getPositionDescriptor(mlines[0].from, context).col,
            end: getPositionDescriptor(mlines[0].from, context).col
        }
    }

    // the anchor range is the range of the earliest (column-wise) measureline to appear in the measure 
    // (with measureline length as tie-breaker i.e. larger range measurelines win when there's a tie)
    let range: {start: number, end: number} = {start: 0, end: 0};
    mlines.forEach(mline => {
        const mlinePos = {start: getPositionDescriptor(mline.from, context).col, end: getPositionDescriptor(mline.to, context).col}
        if (!range || range.start > mlinePos.start || (range.start===mlinePos.start && range.end < mlinePos.end)) range = mlinePos;
    })
    return range;
}