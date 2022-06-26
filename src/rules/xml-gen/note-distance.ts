import { Text } from "@codemirror/text";
import { SourceSyntaxNodeTypes } from "tab-ast";
import { RuleContext, RuleModule } from "../../rules";
import { getPositionDescriptor } from "../utils/node-util-functions";

export type NoteDistanceState = {
    toMeasure: number,
    toSound: number
}

export default {
    meta: {
        name: "note-distance",
        dependencies: [],
        accurateAt: "Sound:entry"
    },
    initialState: () => ({
        toMeasure: 0,
        toSound: 0
    }),
    createVisitors: function(context) {
        let measureStart: {[lineNum:number]: number} = {}
        let prevSoundStart: {[lineNum:number]: number} = {}
        return {
            Measure: function(node) {
                measureStart = {};
                const measurelines = node.sourceSyntaxNodes()[SourceSyntaxNodeTypes.MeasureLine];
                measurelines.map((mline) => {
                    const pos = getPositionDescriptor(mline.from, context);
                    measureStart[pos.line] = mline.from;
                })
                prevSoundStart = measureStart
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

                    const distToPrevSoundTmp = getNonWhitespaceDistanceByCol(prevSoundStart[posDesc.line], pos, context)
                    distanceToPrevSound = distanceToPrevSound ? Math.max(distanceToPrevSound, distToPrevSoundTmp) : distToPrevSoundTmp;
                    prevSoundStart[posDesc.line] = pos;

                    const distToMeasureStartTmp = getNonWhitespaceDistanceByCol(measureStart[posDesc.line], pos, context);
                    distanceToMeasureStart = distanceToMeasureStart ? Math.max(distanceToMeasureStart, distToMeasureStartTmp) : distToMeasureStartTmp;
                })

                context.setState((state) => {
                    state.toMeasure = distanceToMeasureStart;
                    state.toSound = distanceToPrevSound;
                    return state;
                })
            }
        }
    }
} as RuleModule<NoteDistanceState>;

function getNonWhitespaceDistanceByCol(startIdx:number, endIdx:number, context:RuleContext) {
    return context.getSourceText().slice(startIdx, endIdx).toString().replace(/\s+/g, '').length;
}