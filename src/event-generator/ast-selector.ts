// credit https://github.com/estools/esquery/blob/master/esquery.js
// and https://github.com/eslint/eslint/blob/90a5b6b4aeff7343783f85418c683f2c9901ab07/lib/linter/node-event-generator.js
import { ResolvedASTNode } from 'tab-ast';

const parsel = require('parsel-js');


function parse(rawSelector: string) {
    return parsel.parse(rawSelector, { recursive: true, list: false });
}

function tryParseSelector(rawSelector: string) {
   try {
       return parsel.parse(rawSelector.replace(/:exit$/u, ""));
   } catch (err) {
       throw err;
   }
}

export type ASTSelector = {
    rawSelector: string,
    isExit: boolean,
    parsedSelector: any,
    listenerTypes: string[]|null,
    attributeCount: number,
    identifierCount: number
};

const selectorCache = new Map<string, ASTSelector>();
/**
 * Parses a raw selector string, and returns the parsed selector along with specificity and type information.
 */
 export function parseSelector(rawSelector:string) {
    if (selectorCache.has(rawSelector)) {
        return selectorCache.get(rawSelector)!;
    }

    const parsedSelector = tryParseSelector(rawSelector);

    const result: ASTSelector = {
        rawSelector,
        isExit: rawSelector.endsWith(":exit"),
        parsedSelector,
        listenerTypes: getPossibleTypes(parsedSelector),
        attributeCount: countClassAttributes(parsedSelector),
        identifierCount: countIdentifiers(parsedSelector)
    };

    selectorCache.set(rawSelector, result);
    return result;
}

export function matches(
    node: ResolvedASTNode,
    selector: any,
    ancestry: ResolvedASTNode[]
): any {
    if (!selector) return false;
    if (!node) return false;
    if (!ancestry) {
        ancestry = [];
    }

    switch (selector.type) {
        case "type": {
            //wildcard
            if (selector.content == "*") {
                return true;
            }
            //identifier
            return selector.name && selector.name.toLowerCase() === node.name.toLowerCase();
        }
        case "complex": {
            switch (selector.combinator) {
                //child
                case ">":
                    if (matches(node, selector.right, ancestry)) {
                        // TODO: i believe we're trying to see if the latest ancestor matches.
                        // make sure that the most recent ancestor is in ancestry[0].
                        return matches(ancestry[0], selector.left, ancestry.slice(1));
                    }
                    return false;
                //descendant
                case " ":
                    if (matches(node, selector.right, ancestry)) {
                        for (let i = 0; i < ancestry.length; i++) {
                            if (matches(ancestry[i], selector.left, ancestry.slice(i + 1))) {
                                return true;
                            }
                        }
                    }
                    return false;
            }
            throw new Error(`Unknown combinator: ${selector.combinator}`);
        }
        case "compound": {
            for (const sel of selector.list) {
                if (!matches(node, sel, ancestry)) { return false }
            }
            return true;
        }
        case "pseudo-class": {
            switch (selector.name) {
                case "is":
                case "where":
                    for (const sel of getSubtreeSelectors(selector)) {
                        if (matches(node, sel, ancestry)) {
                            return true;
                        }
                    }
                    return false;
                case "not":
                    if (selector.subtree.type !== "list") {
                        return !matches(node, selector.subtree, ancestry);
                    }
                    for (const sel of selector.subtree.list) {
                        if (matches(node, sel, ancestry)) {
                            return false;
                        }
                    }
                    return true;
                case "has": {
                    let selectors = getSubtreeSelectors(selector);
                    let has = false;
                    throw new Error(`Unknown combinator: ${selector.combinator}`);
                    for (const sel of selectors) {
                        const a: any = [];

                        // TODO: implement :has() selector
                        // Traverser.traverse(node, {
                        //     enter(node: ASTNode) {
                        //         if (node.parent != null) {
                        //             a.unshift(parent);
                        //         }
                        //         if (matches(node, sel, a)) {
                        //             has = true;
                        //             return TraverserAction.break;
                        //         }
                        //     },
                        //     leave(_) {
                        //         a.shift();
                        //     },
                        //     groups: true,
                        // });
                    }
                    return has;
                }
            }
        }
        case "attribute": {
            const p = getPath(node, selector.name);
            switch (selector.operator) {
                case undefined:
                    return p != null;
                case "=":
                    return `${selector.value}` === `${p}`;
                case "<=":
                    return p <= selector.value;
                case "<":
                    return p < selector.value;
                case ">":
                    return p > selector.value;
                case ">=":
                    return p >= selector.value;
            }
            throw new Error(`Unknown operator: ${selector.operator}`);
        }
    }
    throw new Error(`Unknown selector type: ${selector.type}`);
}

function getPath(obj: any, key: string) {
    const keys = key.split(".");
    for (const key of keys) {
        if (obj == null) {
            return obj;
        }
        obj = obj[key];
    }
    return obj;
}

const astQuery = {
    parse: parse,
    matches: matches,
    countIdentifiers: countIdentifiers,
    countClassAttributes: countClassAttributes,
    getPossibleTypes: getPossibleTypes,
};

function countIdentifiers(parsedSelector: any): number {
    switch (parsedSelector.type) {
        case "complex": {
            switch (parsedSelector.combinator) {
                //child
                case ">":
                //descendant
                case " ":
                    return (
                        countIdentifiers(parsedSelector.left) +
                        countIdentifiers(parsedSelector.right)
                    );
            }
        }
        case "compound": {
            return parsedSelector.list.reduce(
                (sum: number, childSelector: any) => sum + countIdentifiers(childSelector),
                0
            );
        }
        case "pseudo-class": {
            switch (parsedSelector.name) {
                case "is":
                case "where":
                case "not":
                    let selectors = getSubtreeSelectors(parsedSelector);
                    return selectors.reduce(
                        (sum: number, childSelector: any) => sum + countIdentifiers(childSelector),
                        0
                    );
            }
        }
        case "type":
            return 1;
        default:
            return 0;
    }
}
function countClassAttributes(parsedSelector: any): number {
    switch (parsedSelector.type) {
        case "complex": {
            switch (parsedSelector.combinator) {
                //child
                case ">":
                //descendant
                case " ":
                    return (
                        countClassAttributes(parsedSelector.left) +
                        countIdentifiers(parsedSelector.right)
                    );
            }
        }
        case "compound": {
            return parsedSelector.list.reduce(
                (sum: number, childSelector: any) => sum + countClassAttributes(childSelector),
                0
            );
        }
        case "pseudo-class": {
            switch (parsedSelector.name) {
                case "is":
                case "where":
                case "not":
                    let selectors = getSubtreeSelectors(parsedSelector);
                    return selectors.reduce(
                        (sum: number, childSelector: any) => sum + countClassAttributes(childSelector),
                        0
                    );
            }
        }
        case "attribute":
            return 1;
        default:
            return 0;
    }
}
function getSubtreeSelectors(parsedSelector: any): any {
    if (parsedSelector.subtree.type == "list") {
        return parsedSelector.subtree.list;
    } else {
        return [parsedSelector.subtree];
    }
}
function getPossibleTypes(parsedSelector: any): string[] | null {
    switch (parsedSelector.type) {
        case "type": {
            if (parsedSelector.content != "*") {
                return [parsedSelector.content];
            }
        }
        case "complex": {
            switch (parsedSelector.combinator) {
                //child
                case ">":
                //descendant
                case " ":
                    return getPossibleTypes(parsedSelector.right);
            }
        }
        case "compound": {
            const typesForComponents =
                parsedSelector.list.map(getPossibleTypes).filter((typesForComponent: string[] | null) => typesForComponent);

            // If all of the components could match any type, then the compound could also match any type.
            if (!typesForComponents.length) {
                return null;
            }
            /*
             * If at least one of the components could only match a particular type, the compound could only match
             * the intersection of those types.
             */
            return intersection(...typesForComponents);
        }
        case "pseudo-class": {
            switch (parsedSelector.name) {
                case "is":
                case "where":
                    const typesForComponents =
                        getSubtreeSelectors(parsedSelector).map(getPossibleTypes);
                    if (typesForComponents.every(Boolean)) {
                        return union(...typesForComponents);
                    }
                    return null;
            }
        }
        default:
            return null;
    }
}

export function compareSpecificity(selectorA:any, selectorB:any) {
    return selectorA.attributeCount - selectorB.attributeCount ||
        selectorA.identifierCount - selectorB.identifierCount ||
        (selectorA.rawSelector <= selectorB.rawSelector ? -1 : 1);
}

function union(...arrays: string[]): string[] {
    return [...new Set(arrays.flat())];
}

function intersection(...arrays: string[]): string[] {
    if (arrays.length == 0) {
        return [];
    }

    let result: string[] = [...new Set(arrays[0])];

    for (const array of arrays.slice(1)) {
        result = result.filter((x) => array.includes(x));
    }
    return result;
}

export default astQuery;  