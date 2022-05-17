import { RuleModule } from "../../rules";

// TODO: implement
export type GuitarNoteState = {
    naming: Map<number, string>
    numberingRel2Abs: Map<number, number>
}

export default {
    name: "guitar-note",
    dependencies: ["measure-line-number"],
    initialState: () => ({
        naming: new Map(),
        numberingRel2Abs: new Map()
    }),
    createVisitors: function(context) {
        return {
            "Fret": function() {
                context.setState(() => {
                    
                })
            },
            LineNaming: function() {
                // reset line naming
                context.setState(() => ({
                    naming: new Map<number, string>(),
                    numberingRel2Abs: new Map<number, number>()
                }));
            },
        }
    }
} as RuleModule<GuitarNoteState>