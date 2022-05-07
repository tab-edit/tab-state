type VisitType = "onexit" | "onentry";
export type State = {
    value: any,
    config: any,
    updatedOnCurrentVisit: "stale" | VisitType,
    updatedOnAncestorVisit: "stale" | VisitType,
}

/**
 * The RootState stores all rule states. By default, rules access a shared state.
 * Some groups, however, may override the configuration of some of their rules.
 * In this case, the overridden rules access a separate state.
 */
type RootState = {
    shared: {
        [stateId:string]: State
    }
    [groupId:string]: {
        [stateId:string]: State
    }
};

const rootState:RootState = {
    shared: {}
}

/**
 * Initializes a shared state for the given rule
 * @param ruleId the id of the rule
 * @param config the configuration of the rule
 * @param initialState a function that returns the initial state value
 * @returns the tag used to access this state
 */
export function initSharedState(ruleId:string, config: any, initialState: () => any): string {
    const state: State = {
        value: initialState(),
        config,
        updatedOnCurrentVisit: "stale",
        updatedOnAncestorVisit: "stale"
    }
    const stateTag = generateStateTag(ruleId);
    if (ruleId in rootState.shared) throw new Error(`Cannot initialize existing state '${stateTag}'.`)
    rootState.shared[ruleId] = state;
    return stateTag;
}

/**
 * Initializes a state for the given rule
 * @param ruleId the id of the rule
 * @param groupId the id of the group the rule belongs to
 * @param config the configuration of the rule
 * @param initialState a function that returns the initial state value
 * @returns the tag used to access the initialized state
 */
export function initState(ruleId:string, groupId:string, config: any, initialState: () => any) {
    const state: State = {
        value: initialState(),
        config,
        updatedOnCurrentVisit: "stale",
        updatedOnAncestorVisit: "stale"
    }
    const stateTag = generateStateTag(ruleId, groupId);
    if (groupId in rootState && ruleId in rootState[groupId]) throw new Error(`Cannot initialize existing state '${stateTag}'.`)
    rootState[groupId][ruleId] = state;
    return stateTag;
}

/**
 * Retrieves a state using its identifying tag
 * @param stateTag The tag identifying the state to be accessed
 * @returns {{state: State, shared: boolean}} the state associated with the provided stateTag, as well as a flag indicating if the state is a shared state.
 */
export function resolveState(stateTag:string): {state: State, shared: boolean} {
    const shared = stateTag.endsWith("@shared");
    const temp = stateTag.split(/@shared|@group:/)
    const ruleId = temp[0];
    const groupId = temp[1];
    return {
        state: shared ? rootState.shared[ruleId] : rootState[groupId][ruleId],
        shared
    }
}


function generateStateTag(ruleId:string, groupId?:string) {
    if (!groupId) return `${ruleId}@shared`;
    return `${ruleId}@group:${groupId}`;
}