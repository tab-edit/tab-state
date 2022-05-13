import { Text } from "@codemirror/text";
import { ASTNode, FragmentCursor } from "tab-ast";
import { State } from "./state-manager";
import builtInRules from "./rules"

export type RuleContext<StateValue=any> = {
    id: string
    config: any
    languageOptions:Object //stuff like "guitar, drum, auto" and other tablature-scope language settings.
    getState(): StateValue
    setState(reducer:(oldValue: StateValue) => StateValue): void // TODO: setState is used so the program can internally track whether the state was updated upon visiting the current node or upon visiting an ancestor node.
    requestExternalState(ruleId:string): State | undefined
    getAncestors(): ASTNode[],
    getSourceText(): Text,
    getTextFromNode(node: ASTNode): string,
    getCursor(): FragmentCursor,
}


type RuleVisitor = (node: ASTNode) => void
export interface RuleModule<
    StateValue = any,
    Name extends string = string
> {
    /**
     * The rule's name.
     */
    name: Name
    /**
     * The names of the rules which this rule depends on.
     */
    dependencies: string[]
    /**
     * The lazily-loaded initial state of the rule.
     */
    initialState: () => StateValue
    /**
     * Creates visitors that are called while traversing the tab abstract syntax tree (AST) and that return a state-reducer which is used to update the rule's state.
     */
    createVisitors(context: RuleContext<StateValue>): {[selector:string]: RuleVisitor}
}

export class Rules {
    private rules: {[ruleId:string]: RuleModule}
    constructor() {
        this.rules = {}
    }
    /**
     * Registers a rule module for rule id in storage.
     * @param ruleId Rule id.
     * @param ruleModule Rule handler.
     */
    define(ruleId:string, ruleModule: RuleModule) {
        this.rules[ruleId] = ruleModule;
    }


    get(ruleId:string) {
       if (this.rules[ruleId]) {
           return this.rules[ruleId];
       } else if (builtInRules.has(ruleId)) {
           return builtInRules.get(ruleId)
       }
       return null;
    }

}