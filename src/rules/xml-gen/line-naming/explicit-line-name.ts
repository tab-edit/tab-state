import { RuleModule } from "../../../rules";
import { getPositionDescriptor, getTextFromNode, stringToRegex } from "../../utils/node-util-functions";

export type ExplicitLineNamingState = {
    [docLineNum:number]: {
        name: string,
        processed_name: {
            [instrument:string]: string
        }
    }
}

export type ExplicitLineNamingConfig = {
    /**
     * Preprocessors which process the explicitly defined line names.
     * Each instrument has its own group of preprocessors 
     * (i.e. regex -> resolved_linename mappings). As a guiding rule, a group of
     * preprocessors for an instrument should not be able to match the same text.
     * The regex patterns should be "disjoint" in a sense. if that is not the case,
     * this rule does not provide a guarantee of which preprocessor is used to process
     * the linename.
     * 
     * TODO: check provided config for a preprocessor match first before checking default config.
     *      This requires that you separate default and provided config; don't merge them as is currently the case.
     */
    preprocessors: {
        [instruments:string]: {
            [regex:string]: string
        }
    }
}


export default {
    meta: {
        name: "explicit-line-name",
        dependencies: [],
        accurateAt: "LineNaming:exit"
    },
    initialState: () => ({}),
    defaultConfig: {
        preprocessors: getDefaultPreprocessors()
    },
    createVisitors: function(context) {
        const preprocessors: {[instrument:string]: {regex:string, processed_name:string}[]} = {}
        const preprocessorCache = new Map<string, {[instrument:string]: string}>();
        return {
            onTraversalStart() {
                // TODO: arrange preprocessors in the order in which they should be tested:
                // preprocessors from provided config first, then from default config
                for (const instrument of Object.keys(context.config.preprocessors)) {
                    preprocessors[instrument] ||= [];
                    for (const [regex, processed_name] of Object.entries(context.config.preprocessors[instrument])) {
                        preprocessors[instrument].push({regex, processed_name})
                    }
                }
            },
            TabBlock() {
                // reset line naming state
                context.setState(() => ({}));
            },
            MeasureLineName: function(node) {
                let lineName = getTextFromNode(node, context)[0].replace(/\s/g,'');
                if (lineName==="") return;
                let lineNum = getPositionDescriptor(node.ranges[0], context).line;

                let linenameState = context.getState();
                if (linenameState[lineNum]) {
                    context.reportError("multiple line names on a single line for a measure. figure out where the bug is from.")
                    return;
                }

                const processed_name: {[instrument:string]: string} = preprocessorCache.get(lineName) || {};
                if (!preprocessorCache.has(lineName)) {
                    preprocessorCache.set(lineName, processed_name);
                    for (const instrument of Object.keys(preprocessors)) {
                        for (const preprocessor of preprocessors[instrument]) {
                            const match = lineName.match(stringToRegex(preprocessor.regex));
                            if (match && match[0]==lineName) {
                                processed_name[instrument] = preprocessor.processed_name;
                            }
                        }
                    }
                }

                context.setState((linenamingState) => {
                    linenamingState[lineNum] = {
                        name: lineName,
                        processed_name 
                    }
                    return linenamingState;
                })
            }
        }
    }
} as RuleModule<ExplicitLineNamingState, ExplicitLineNamingConfig>

function getDefaultPreprocessors(): ExplicitLineNamingConfig["preprocessors"] {
    return {
        /*
        pitched instruments should all have preprocessors that resolve
        to a string of the format <step><alter><octave>  where alter is optional
        and can only have the value `#`. e.g. a preprocessor might resolve to D#7 or F5
        */
        "guitar": {
            "e": "E4",
            "[bB]": "B3",
            "[gG]": "G3",
            "[dD]": "D3",
            "[aA]": "A2",
            "E": "E2"
        },
        "bass": {
            "e": "E3",
            "[bB]": "B2",
            "[gG]": "G2",
            "[dD]": "D2",
            "[aA]": "A1",
            "E": "E1"
        },
        /*
         TODO: Part names might be invalid now because MusicXML4 seems to have
         introduced a new way of identifying unpitched instruments, so i might
         need to come up with a different way of identifying percussion types by a
         given id
        */
        "percussion": {
            "C": "P1-I50",
            "CC": "P1-I50",
            "R": "P1-I52",
            "RC": "P1-I52",
            "HT": "P1-I48",
            "MT": "P1-I46",
            "FT": "P1-I42",
            "F": "P1-I42",
            "HH|hh": "P1-I43",
            "CH": "P1-I43",
            "hh": "P1-I47",
            "OH": "P1-I47",
            "SD": "P1-I39",
            "BD": "P1-I36",
            "B1": "P1-I36",
            "B": "P1-I36",
            "BA": "P1-I36",
            "B2": "P1-I37",
            "SC": "P1-I56 "
        }
    }
}