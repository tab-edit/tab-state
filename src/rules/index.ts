import { RuleModule } from "../rules";
import LazyLoadingRuleMap from "./utils/lazy-loading-rule-map";
import deasync from "deasync";

export const builtInRules = new LazyLoadingRuleMap(Object.entries({
    "line-naming": () => syncImport("./xml-gen/line-naming"),
    "sound-distance": () => syncImport("./xml-gen/sound-distance")
}));
export default builtInRules;


function syncImport(module:string) {
    return deasync<RuleModule>(async () => await import(module))();
}