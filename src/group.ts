import { StateManager } from "./state-manager"

type Group<StateValue> = {
    name: string
    state: StateValue
    rules: string[] // TODO: maybe rename this "dependencies" and change purpose to storing only dependencies and export contains actually exported rules. this will mean we have to deal with making one single set from these though. we can cache to prevent inefficiency
    ruleReducer(accumulator: StateValue, currentValue:any): StateValue
}


/**
 * It might be beneficial for a group to define a reducer function to reduce all its rules into one single State. This would be helpful for
 * linting where there are many rules with different file names and import functions. We can aggregate all of them into one single state
 * without having to manually create a rule that requests all the other rules' states manually, one by one, then combines them.
 * For other groups which don't need to combine rule states, they can simply just use the aggregator to find a state they want to export and export that state
 * without having to comnine it with other states
 */
