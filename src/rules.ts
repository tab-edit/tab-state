import { Text } from "@codemirror/text";
import { ResolvedASTNode } from "tab-ast";
import { State } from "./state-manager";
import builtInRules from "./rules/";

export type RuleContext<StateValue=any, RuleConfig=any> = {
    id: string
    config: RuleConfig
    languageOptions:Object //stuff like "guitar, drum, auto" and other tablature-scope language settings.
    getState(): StateValue
    setState(reducer:(oldValue: StateValue) => StateValue): void
    requestExternalState(ruleId:string): State | undefined
    getAncestors(): ResolvedASTNode[]
    getSourceText(): Text
    reportError(message:string): void
    reportWarning(message:string): void
}


type RuleVisitor = (node: ResolvedASTNode) => void
export interface RuleModule<
    StateValue = any,
    Config = any
> {
    /**
     * The rule's name.
     */
    name: string
    /**
     * The names of the rules which this rule depends on.
     */
    dependencies: string[]
    /**
     * The default configuration for this rule.
     */
    defaultConfig?: Config
    /**
     * The lazily-loaded initial state of the rule.
     */
    initialState: () => StateValue
    /**
     * Creates visitors that are called while traversing the tab abstract syntax tree (AST) and that return a state-reducer which is used to update the rule's state.
     */
    createVisitors(context: RuleContext<StateValue, Config>): {[selector:string]: RuleVisitor}
}

// credit: https://github.com/eslint/eslint/blob/main/lib/linter/rules.js
export class Rules {
    private rules: {[ruleId:string]: RuleModule}
    constructor() {
        this.rules = {}
    }
    /**
     * Registers a rule module for rule id in storage.
     * @param ruleId Rule id.
     * @param ruleModule Rule Module.
     */
    define(ruleId:string, ruleModule: RuleModule) {
        this.rules[ruleId] = ruleModule;
    }

    /**
     * Access Rule Module by id.
     * @param ruleId Rule id.
     * @returns A Rule Module.
     */
    get(ruleId:string) {
       if (this.rules[ruleId]) {
           return this.rules[ruleId];
       } else if (builtInRules.has(ruleId)) {
           return builtInRules.get(ruleId)
       }
       return null;
    }

    *[Symbol.iterator]() {
        yield *builtInRules;

        for (const ruleId of Object.keys(this.rules)) {
            yield [ruleId, this.get(ruleId)];
        }
    }

    ruleIds() {
        return [...builtInRules.keys(), ...Object.keys(this.rules)]
    }
}