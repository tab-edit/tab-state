/**
 * TODO:
 * Combines the inferred-instrument-types and the comment-declared-instrument-type rules into one single instrument type.
 */

import { RuleContext, RuleModule } from "../../../rules";
import { CommentDeclaredInstrumentTypeState } from "./comment-declared-instrument-type";
import { InferredInstrumentTypeState } from "./inferred-instrument-types";

export type InstrumentTypeState = string | undefined;
export type InstrumentTypeConfig = {
    declaredType: string; // "auto" or "instrument-type". default config value is auto.
}

export default {
    meta: {
        name: "inferred-instrument-types",
        dependencies: ["inferred-instrument-types", "comment-declared-instrument-type"],
        accurateAt: ""
    },
    initialState: () => undefined,
    createVisitors: function(context) {
        let isFirstNoteInFirstMeasure = false;
        let isFirstMeasureInBlock = false;
        return {
            TabBlock() {
                isFirstNoteInFirstMeasure = true;
                isFirstMeasureInBlock = true;
                context.setState(() => undefined)
            },
            Measure() {
                if (!isFirstMeasureInBlock) return;
                isFirstMeasureInBlock = false;
                
                context.setState(() => determineInstrumentType(context))

            },
            ".Note"() {
                /*
                 if there is a note in the first measure, it may have been used to narrow down the instrument type
                 (in the inferred-instrument-type rule). Thus we redetermine instrument type on the first note of the tab block
                 so we redetermine the instrument type, incase instrument type has been determined

                 TODO: do we do this on "Sound" instead of on ".Note"? i'm not sure.
                 */
                if (!isFirstNoteInFirstMeasure) return;
                isFirstNoteInFirstMeasure = false;


                context.setState(() => determineInstrumentType(context))
            }
        }
    }
} as RuleModule<InstrumentTypeState, InstrumentTypeConfig>

function determineInstrumentType(context:RuleContext) {
    const possibleInstrumentTypes = context.requestExternalState<InferredInstrumentTypeState>("inferred-instrument-types")!.value.possibleInstrumentTypes;

    /*
    Priority order for determining instrument type, from highest to lowest priority:
    comment-declared instrument type -> config-declared instrument type -> inferred instrument type
    */
    let instrumentType = context.requestExternalState<CommentDeclaredInstrumentTypeState>("comment-declared-instrument-type")!.value.type;
    instrumentType = instrumentType || context.config.declaredType;
    if (instrumentType && !possibleInstrumentTypes.has(instrumentType)) {
        context.reportError("Measure does not match declared instrument type.");
        instrumentType = undefined;
    } else if (!instrumentType) {
        if (possibleInstrumentTypes.size==0) {
            context.reportError("Could not identify the instrument of this measure.");
            instrumentType = undefined;
        }else if (possibleInstrumentTypes.size>1) {
            context.reportError("Ambiguous instrument type for this measure.");
            instrumentType = undefined;
        } else {
            instrumentType = possibleInstrumentTypes.values().next().value;
        }
    }
    return instrumentType;
}