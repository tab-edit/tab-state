// credit: https://github.com/eslint/eslint/blob/90a5b6b4aeff7343783f85418c683f2c9901ab07/lib/linter/node-event-generator.js
import { ResolvedASTNode } from "tab-ast"
import { ASTSelector, compareSpecificity, matches, parseSelector } from "./ast-selector";
import SafeEmitter, { DeferredEmission } from "./safe-emitter";

/**
 * A Node Event Generator whose listeners produce state reducers.
 */
export default class NodeEventGenerator {
    private emitter:SafeEmitter;
    private currentAncestry: ResolvedASTNode[];
    private enterSelectorsByNodeType: Map<string, ASTSelector[]>;
    private exitSelectorsByNodeType: Map<string, ASTSelector[]>;
    private anyTypeEnterSelectors: ASTSelector[];
    private anyTypeExitSelectors: ASTSelector[];
    
    /**
     * @param {SafeEmitter} emitter
     * An SafeEmitter which is the destination of events. This emitter must already
     * have registered listeners for all of the events that it needs to listen for.
     * (See lib/linter/safe-emitter.js for more details on `SafeEmitter`.)
     */
    constructor(emitter:SafeEmitter) {
        this.emitter = emitter;
        this.currentAncestry = [];
        this.enterSelectorsByNodeType = new Map();
        this.exitSelectorsByNodeType = new Map();
        this.anyTypeEnterSelectors = [];
        this.anyTypeExitSelectors = [];

        emitter.eventNames().forEach(rawSelector => {
            const selector = parseSelector(rawSelector);

            if (selector.listenerTypes) {
                const typeMap = selector.isExit ? this.exitSelectorsByNodeType : this.enterSelectorsByNodeType;

                selector.listenerTypes.forEach(nodeType => {
                    if (!typeMap.has(nodeType)) {
                        typeMap.set(nodeType, []);
                    }
                    typeMap.get(nodeType)!.push(selector);
                });
                return;
            }
            const selectors = selector.isExit ? this.anyTypeExitSelectors : this.anyTypeEnterSelectors;

            selectors.push(selector);
        });

        this.anyTypeEnterSelectors.sort(compareSpecificity);
        this.anyTypeExitSelectors.sort(compareSpecificity);
        this.enterSelectorsByNodeType.forEach(selectorList => selectorList.sort(compareSpecificity));
        this.exitSelectorsByNodeType.forEach(selectorList => selectorList.sort(compareSpecificity));
    }

    /**
     * Checks a selector against a node, and creates an emission list that can be used for delayed emission of the selector
     */
     applySelector(node: ResolvedASTNode, selector: ASTSelector): DeferredEmission[] {
        if (matches(node, selector.parsedSelector, this.currentAncestry)) {
            return this.emitter.generateDeferredEmissions(selector.rawSelector, node);
        }
        return [];
    }

    /**
     * Applies all appropriate selectors to a node, in specificity order
     */
    applySelectors(node: ResolvedASTNode, isExit: boolean): DeferredEmission[] {
        const selectorsByNodeType = (isExit ? this.exitSelectorsByNodeType : this.enterSelectorsByNodeType).get(node.name) || [];
        const anyTypeSelectors = isExit ? this.anyTypeExitSelectors : this.anyTypeEnterSelectors;

        const deferredEmissions:DeferredEmission[] = []
        /*
         * selectorsByNodeType and anyTypeSelectors were already sorted by specificity in the constructor.
         * Iterate through each of them, applying selectors in the right order.
         */
        let selectorsByTypeIndex = 0;
        let anyTypeSelectorsIndex = 0;

        while (selectorsByTypeIndex < selectorsByNodeType.length || anyTypeSelectorsIndex < anyTypeSelectors.length) {
            if (
                selectorsByTypeIndex >= selectorsByNodeType.length ||
                anyTypeSelectorsIndex < anyTypeSelectors.length &&
                compareSpecificity(anyTypeSelectors[anyTypeSelectorsIndex], selectorsByNodeType[selectorsByTypeIndex]) < 0
            ) {
                deferredEmissions.concat(this.applySelector(node, anyTypeSelectors[anyTypeSelectorsIndex++]));
            } else {
                deferredEmissions.concat(this.applySelector(node, selectorsByNodeType[selectorsByTypeIndex++]));
            }
        }
        return deferredEmissions;
    }

    /**
     * Emits an event of entering AST node.
     */
    enterNode(node: ResolvedASTNode, parent: ResolvedASTNode): void {
        if (parent) {
            this.currentAncestry.unshift(parent);
        }
        // sort the delayed emissions by rule
        emitInRuleOrder(this.applySelectors(node, false));
    }
    
    /**
     * Emits an event of leaving AST node.
     */
    leaveNode(node: ResolvedASTNode): void {
        emitInRuleOrder(this.applySelectors(node, true));
        this.currentAncestry.shift();
    }
}


function emitInRuleOrder(deferredEmissions: DeferredEmission[]) {
    const groupedDeferredEmissions:{[group:string]: DeferredEmission[]} = {};
    deferredEmissions.forEach(emission => {
        if (emission.eventGroup in groupedDeferredEmissions) groupedDeferredEmissions[emission.eventGroup].push(emission);
        else groupedDeferredEmissions[emission.eventGroup] = [emission];
    })

    const ruleOrder = getTopologicallySortedRuleList();
    ruleOrder.forEach(ruleId => {
        groupedDeferredEmissions[ruleId].forEach(emission => emission.emit());
    })
}
