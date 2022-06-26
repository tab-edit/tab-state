import { RuleModule } from "../../rules";
export type MeasureCountState = {
    count: number
}

export default {
    meta: {
        name: "global-measure-count",
        dependencies: [],
        accurateAt: "Measure:entry"
    },
    initialState: () => ({
        count: 0
    }),
    createVisitors: function(context) {
        return {
            Measure: function() {
                context.setState(state => {
                    state.count+=1;
                    return state;
                });
            }
        }
    }
} as RuleModule<MeasureCountState>