import { RuleModule } from "../../rules";
export type MeasureCountState = {
    count: number
}

export default {
    name: "measure-count",
    dependencies: [],
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