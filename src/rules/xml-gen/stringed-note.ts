import { RuleModule } from "../../rules";

// TODO: implement
/**
 * This generates the xml information for a note
 */
export type GuitarNoteState = {
    naming: Map<number, string>
    numberingRel2Abs: Map<number, number>
}

export default {
    meta: {
        name: "stringed-note",
        dependencies: ["stringed-pitch"],
        accurateAt: "Fret:entry"
    },
    initialState: () => ({
        naming: new Map(),
        numberingRel2Abs: new Map()
    }),
    createVisitors: function(context) {
        return {
            "Fret": function() {
                context.setState(() => {
                    
                })
            }
        }
    }
} as RuleModule<GuitarNoteState>