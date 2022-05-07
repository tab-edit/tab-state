type VisitType = "onexit" | "onentry";
export type State<
    StateValue = any,
    StateConfig = any
> = {
    value: StateValue,
    config: StateConfig,
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
export class StateManager {
    private rootState: RootState;
    constructor() {
        this.rootState = {shared:{}};
    }

    /**
     * Initializes a shared state for the given rule
     * @param ruleId the id of the rule
     * @param config the configuration of the rule
     * @param initialState a function that returns the initial state value
     * @returns the tag used to access this state
     */
    public initSharedState(ruleId:string, config: any, initialState: () => any, ignoreDuplicateInit: boolean = false): string {
        const state: State = {
            value: initialState(),
            config,
            updatedOnCurrentVisit: "stale",
            updatedOnAncestorVisit: "stale"
        }
        const stateTag = this.generateStateTag(ruleId);
        if (ruleId in this.rootState.shared) {
            if (ignoreDuplicateInit) return stateTag;
            throw new Error(`Cannot initialize existing state '${stateTag}'.`);
        } 
        this.rootState.shared[ruleId] = state;
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
    public initState(ruleId:string, groupId:string, config: any, initialState: () => any, ignoreDuplicateInit: boolean = false) {
        const state: State = {
            value: initialState(),
            config,
            updatedOnCurrentVisit: "stale",
            updatedOnAncestorVisit: "stale"
        }
        const stateTag = this.generateStateTag(ruleId, groupId);
        if (groupId in this.rootState && ruleId in this.rootState[groupId]) {
            if (ignoreDuplicateInit) return stateTag;
            throw new Error(`Cannot initialize existing state '${stateTag}'.`)
        }
        this.rootState[groupId][ruleId] = state;
        return stateTag;
    }

    /**
     * Retrieves a state using its identifying tag
     * @param stateTag The tag identifying the state to be accessed
     * @returns {{state: State, isShared: boolean}} the state associated with the provided stateTag, as well as a flag indicating if the state is a shared state.
     */
    public resolveState(stateTag:string): {state: State, isShared: boolean} {
        const isShared = stateTag.endsWith("@shared");
        const temp = stateTag.split(/@shared|@group:/)
        const ruleId = temp[0];
        const groupId = temp[1];
        return {
            state: isShared ? this.rootState.shared[ruleId] : this.rootState[groupId][ruleId],
            isShared
        }
    }

    public resolveStateTag(ruleId:string, groupId:string) {
        if (this.rootState[groupId] && (ruleId in this.rootState[groupId])) {
            return this.generateStateTag(ruleId, groupId);
        } else if (ruleId in this.rootState.shared) {
            return this.generateStateTag(ruleId);
        }
        return undefined;
    }
    
    private generateStateTag(ruleId:string, groupId?:string) {
        if (!groupId) return `${ruleId}@shared`;
        return `${ruleId}@group:${groupId}`;
    }
}