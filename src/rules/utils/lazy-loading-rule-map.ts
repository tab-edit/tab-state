import { RuleModule } from "../../rule";

class LazyLoadingRuleMap extends Map {
    constructor(loaders: [ruleId:string, load:()=>RuleModule][]) {
        super(loaders);
    }
    get(ruleId) {
        const load = super.get(ruleId);
        
    }
}