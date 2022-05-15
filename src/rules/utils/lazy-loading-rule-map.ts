// credit: https://github.com/eslint/eslint/blob/main/lib/rules/utils/lazy-loading-rule-map.js
import { RuleModule } from "../../rules";

/**
 * The `Map` object that loads each rule when it's accessed.
 * @example
 * const rules = new LazyLoadingRuleMap([
 *      ["eqeqeq", () => require("eqeqeq")],
 *      ["semi", () => require("semi")],
 *      ["no-unused-vars", () => require("no-unused-vars")]
 * ]);
 * 
 * rules.get("semi"); //call `() => require("semi")` here.
 */
class LazyLoadingRuleMap extends Map<string, (() => RuleModule) | RuleModule> {
    constructor(loaders: [ruleId:string, load: () => RuleModule][]) {
        super(loaders);

        // `super(...iterable)` uses `this.set()`, so disable it here.
        Object.defineProperty(LazyLoadingRuleMap.prototype, "set", {
            configurable: true,
            value: void 0
        })
    }
    
    /**
     * Get a rule.
     * Each rule will be loaded on the first access.
     * @param ruleId The rule ID to get
     * @returns The Rule Module
     */
    get(ruleId: string) {
        const load = super.get(ruleId) as () => RuleModule;

        return load && load()
    }

    /**
     * Iterate rules.
     * @returns Rule Modules
     */
    *values() {
        for (const load of super.values()) {
            yield (<() => RuleModule> load)();
        }
    }

    /**
     * Iterate rules.
     * @returns Rule Modules
     */
    *entries() {
        for (const [ruleId, load] of super.entries()) {
            yield [ruleId, (<() => RuleModule> load)()] as [string, RuleModule];
        }
    }

    /**
     * Call a function with each rule.
     * @param callbackFn The callback function.
     * @param thisArg The object to pass to `this` of the callback function.
     */
    forEach(callbackFn: Function, thisArg: any) {
        for (const [ruleId, load] of super.entries()) {
            callbackFn.call(thisArg, (<() => RuleModule>load)(), ruleId, this)
        }
    }
}

// Forbid mutation
Object.defineProperties(LazyLoadingRuleMap.prototype, {
    clear: { configurable: true, value: void 0 },
    delete: { configurable: true, value: void 0 },
    [Symbol.iterator]: {
        configurable: true,
        writable: true,
        value: LazyLoadingRuleMap.prototype.entries
    }
});

export default LazyLoadingRuleMap;