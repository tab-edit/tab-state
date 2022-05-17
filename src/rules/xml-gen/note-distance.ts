import { Text } from "@codemirror/text";
import { SourceSyntaxNodeTypes } from "tab-ast";
import { RuleModule } from "../../rules";
import { getPositionDescriptor } from "../utils/util-functions";

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
        let measureStartCol: {[lineNum:number]: number} = {}
        let prevSoundStartCol: {[lineNum:number]: number} = {}
        return {
            Measure: function(node) {
                measureStartCol = {};
                const measurelines = node.sourceSyntaxNodes()[SourceSyntaxNodeTypes.MeasureLine];
                measurelines.map((mline) => {
                    const pos = getPositionDescriptor(mline.from, context);
                    measureStartCol[pos.line] = pos.col;
                })
                prevSoundStartCol = measureStartCol
            },
            Sound: function(node) {
                let distanceToPrevSound: number;
                let distanceToMeasureStart: number;
                // TODO: don't use the sound's ranges because that might 
                // be inconsistent with the actual range of the notes in the sound.
                // Think of a grace note g7 which might be in the sound. we wanna use the
                // position of the fret 7, not the grace marking.
                node.ranges.forEach((pos, idx) => {
                    if (idx%2!==0) return;
                    const posDesc = getPositionDescriptor(pos, context);

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