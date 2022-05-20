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
    requestExternalState<ExternalStateVal>(ruleId:string): State<ExternalStateVal> | undefined
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
    meta: {
        /**
         * The rule's name.
         */
        name: string,
        /**
         * The names of the rules which this rule depends on.
         */
        dependencies: string[],
        /**
         * The point at which this state is guaranteed to be accurate and up-to-date
         * example:
         *  if a state is evaluated at the start of each Measure node, and is guaranteed
         *  to be accurate at that point, then accurateAt = "Measure:entry"
         *  if on the other hand it is only guaranteed to produce an accurate value after we
         *  just exit a Measure node, then accurateAt = "Measure:exit"
         * 
         * TODO: figure out a better way to express this sentiment. maybe we don't have to formally mention this,
         * and the rule description has the duty to mention at what point the rule is guaranteed to be correct.
         */
        accurateAt: string
    }
    /**
     * The default configuration for this rule.
     */
    defaultConfig?: Config
    /**
     * The lazily-loaded initial state of the rule.
     */
    initialState: (config:Config) => StateValue
    /**
     * Creates visitors that are called while traversing the tab abstract syntax tree (AST) and that return a state-reducer which is used to update the rule's state.
     */
    createVisitors(context: RuleContext<StateValue, Config>): {[selector:string]: RuleVisitor}
}

/**
 * TODO: change code so that users can define rules which have the same name as builtin rules, and have it override the builtin RuleModule.
 * this is important so that users can customize the behaviour of certain internal builtin rules (which has a snowball effect on affecting other builtin rules)
 * like if the user wants to change how instruments are detected, they can write their own module and replace the internal module.
 * However, A very significant and visible warning should be given as if a user accidentally names their module something that is the same as
 * an internal rule module, they can end up massively breaking things.
 */ 

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