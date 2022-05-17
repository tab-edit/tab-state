import { RuleModule } from "../rules";
import LazyLoadingRuleMap from "./utils/lazy-loading-rule-map";
import deasync from "deasync";

export const builtInRules = new LazyLoadingRuleMap(Object.entries({
    "line-naming":      () => sync(import("./xml-gen/line-naming")),
    "line-number":      () => sync(import("./xml-gen/line-number")),
    "note-distance":    () => sync(import("./xml-gen/note-distance")),
    "measure-count":    () => sync(import("./xml-gen/measure-count")),
    "overhead-repeats":          () => sync(import("./xml-gen/overhead-repeats"))
}));
export default builtInRules;


function sync(promise: Promise<any>) {
    return deasync<RuleModule>(async () => await promise)();
}