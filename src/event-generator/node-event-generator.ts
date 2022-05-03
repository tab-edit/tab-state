// credit: https://github.com/eslint/eslint/blob/90a5b6b4aeff7343783f85418c683f2c9901ab07/lib/linter/node-event-generator.js
import { ASTNode } from "tab-ast";
import { ASTSelector, compareSpecificity, matches, parseSelector } from "./ast-selector";
import SafeEmitter from "./safe-emitter";

class NodeEventGenerator {
    private emitter:SafeEmitter;
    private currentAncestry: ASTNode[];
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
     * Checks a selector against a node, and emits it if it matches
     */
     applySelector(node: ASTNode, selector: ASTSelector): void {
        if (matches(node, selector.parsedSelector, this.currentAncestry)) {
            this.emitter.emit(selector.rawSelector, node);
        }
    }

    /**
     * Applies all appropriate selectors to a node, in specificity order
     */
    applySelectors(node: ASTNode, isExit: boolean): void {
        const selectorsByNodeType = (isExit ? this.exitSelectorsByNodeType : this.enterSelectorsByNodeType).get(node.name) || [];
        const anyTypeSelectors = isExit ? this.anyTypeExitSelectors : this.anyTypeEnterSelectors;

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
                this.applySelector(node, anyTypeSelectors[anyTypeSelectorsIndex++]);
            } else {
                this.applySelector(node, selectorsByNodeType[selectorsByTypeIndex++]);
            }
        }
    }

    /**
     * Emits an event of entering AST node.
     */
    enterNode(node: ASTNode, parent: ASTNode): void {
        if (parent) {
            this.currentAncestry.unshift(parent);
        }
        this.applySelectors(node, false);
    }
    
    /**
     * Emits an event of leaving AST node.
     */
    leaveNode(node: ASTNode): void {
        this.applySelectors(node, true);
        this.currentAncestry.shift();
    }
}