import { ASTNode, Cursor } from "tab-ast";
import { State } from "./state-manager";

export type RuleContext = {
    id: string// string? not sure. stateunit's id
    config: any
    languageOptions:Object //stuff like enforce guitar? stuff like that
    getState(): any
    setState(value:any): void // TODO: setState is used so the program can internally track whether the state was updated upon visiting the current node or upon visiting an ancestor node.
    requestExternalState(ruleId:string): State | undefined
    getAncestors(): ASTNode[],
    getSourceText(): Text, // TODO: make sure this is the Text class from codemirror6
    getTextFromNode(node: ASTNode): string,
    getCursor(): Cursor<ASTNode>,
}


type RuleVisitor = (node: ASTNode) => void
export interface Rule<
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
    createVisitors(context: RuleContext): {[selector:string]: RuleVisitor}
}

