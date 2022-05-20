import { RuleModule } from "../rules";
import LazyLoadingRuleMap from "./utils/lazy-loading-rule-map";
import deasync from "deasync";

export const builtInRules = new LazyLoadingRuleMap(Object.entries({
    "explicit-line-name":   () => sync(import("./xml-gen/line-naming/explicit-line-name")),
    "line-number":          () => sync(import("./xml-gen/line-number")),
    "note-distance":        () => sync(import("./xml-gen/note-distance")),
    "measure-count":        () => sync(import("./xml-gen/global-measure-count")),
    "overhead-repeats":     () => sync(import("./xml-gen/overhead-repeats"))
}));
export default builtInRules;


function sync(promise: Promise<any>) {
    return deasync<RuleModule>(async () => await promise)();
}