import { RuleModule } from "../rules";
import LazyLoadingRuleMap from "./utils/lazy-loading-rule-map";
import deasync from "deasync";

export const builtInRules = new LazyLoadingRuleMap(Object.entries({
    "explicit-line-name":   () => sync(import("./semantics/line-naming/explicit-line-name")),
    "line-number":          () => sync(import("./semantics/line-number")),
    "note-distance":        () => sync(import("./semantics/note-distance")),
    "measure-count":        () => sync(import("./semantics/global-measure-count")),
    "overhead-repeats":     () => sync(import("./semantics/overhead-repeats"))
}));
export default builtInRules;


function sync(promise: Promise<any>) {
    return deasync<RuleModule>(async () => await promise)();
}