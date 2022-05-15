import { Text } from "@codemirror/text";
import { SourceSyntaxNodeTypes } from "tab-ast";
import { RuleModule } from "../../rules";

export type NoteDistanceState = {
    toMeasureStart: number,
    toSound: number
}

export default {
    name: "note-distance",
    dependencies: [],
    initialState: () => ({
        toMeasureStart: 0,
        toSound: 0
    }),
    createVisitors: function(context) {
        // unexposed (private) state should be stored here
        let measureStartCol: {[lineNum:number]: number} = {}
        let prevSoundStartCol: {[lineNum:number]: number} = {}
        return {
            "Measure": function(node) {
                measureStartCol = {};
                const measurelines = node.sourceSyntaxNodes()[SourceSyntaxNodeTypes.MeasureLine];
                measurelines.map((mline) => {
                    const pos = getPositionDescriptor(mline.from, context.getSourceText());
                    measureStartCol[pos.line] = pos.col;
                })
                prevSoundStartCol = measureStartCol
            },
            "Sound": function(node) {
                let distanceToPrevSound: number;
                let distanceToMeasureStart: number;
                node.ranges.forEach((pos, idx) => {
                    if (idx%2!==0) return;
                    const posDesc = getPositionDescriptor(pos, context.getSourceText());

                    const distToPrevSoundTmp = posDesc.col-prevSoundStartCol[posDesc.line];
                    distanceToPrevSound = distanceToPrevSound ? Math.max(distanceToPrevSound, distToPrevSoundTmp) : distToPrevSoundTmp;
                    prevSoundStartCol[posDesc.line] = posDesc.col;

                    const distToMeasureStartTmp = posDesc.col-measureStartCol[posDesc.line];
                    distanceToMeasureStart = distanceToMeasureStart ? Math.max(distanceToMeasureStart, distToMeasureStartTmp) : distToMeasureStartTmp;
                })

                context.setState((state) => {
                    state.toMeasureStart = distanceToMeasureStart;
                    state.toSound = distanceToPrevSound;
                    return state;
                })
            }
        }
    }
} as RuleModule<NoteDistanceState>;

function getPositionDescriptor(pos:number, text:Text): {line: number, col: number} {
    const line = text.lineAt(pos);

    return {
        line: line.number,
        col: pos - line.from
    }
}