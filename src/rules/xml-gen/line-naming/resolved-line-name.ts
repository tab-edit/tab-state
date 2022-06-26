
/**
 * uses instrument-type rule and explicit-line-name rule and the configuration to determine the final linename that is to be used.
 * the configuration would include a mapping of default names for each line when no explicit linename is provided. this would be grouped by instrument
 */

import { SourceSyntaxNodeTypes } from "tab-ast"
import { RuleModule } from "../../../rules"
import { getPositionDescriptor } from "../../utils/node-util-functions"
import { InstrumentTypeState } from "../instrument-type/resolved-instrument-type"
import { LineNumberState } from "../line-number"
import { ExplicitLineNamingState } from "./explicit-line-name"

export type LineNamingState = {
    [docLineNum:number]: string
}

export type LineNamingConfig = {
    /**
     * Provides the default line names for each line in a measure.
     * e.g for a guitar, line 1 is `E4`, line 2 is `B3`, line 3 is `G3` e.t.c.
     */
    defaultLineNames: {
        [instrument:string]: {
            [measureLineNum: number]: string
        }
    }
}


export default {
    meta: {
        name: "resolved-line-name",
        dependencies: ["explicit-line-name", "instrument-type", "line-number"],
        accurateAt: "LineNaming:exit"
    },
    initialState: () => ({}),
    defaultConfig: {
        defaultLineNames: getDefaultLineNames()
    },
    createVisitors: function(context) {
        let isFirstMeasure: boolean = false;
        return {
            TabBlock() {
                // reset line naming state
                context.setState(() => ({}));
                isFirstMeasure = true;
            },
            /* TODO: behaviour might depend on when instrument type rule resolves the instrument type, so can't impelement now.
            Also, should we make it so lineName is accurateOn: ".Note:entry"? given instrument might need to check the first note before
            it is able to be absolutely certain whether it knows the instrument type or not. I'm not sure

            context.config.

            */

           Measure(node) {
                if (!isFirstMeasure) return;
                isFirstMeasure = false;

                const explicitLineName = context.requestExternalState<ExplicitLineNamingState>("explicit-line-name")?.value!;
                const instrumentType = context.requestExternalState<InstrumentTypeState>("instrument-type")?.value!;
                const measureLineNumberMap = context.requestExternalState<LineNumberState>("line-number")?.value.doclineToMlineNum!;

                if (instrumentType==="unknown") {
                    // TODO: figure out what to do
                } else {
                    const newState:LineNamingState = {}
                    node.sourceSyntaxNodes()[SourceSyntaxNodeTypes.MeasureLine].forEach(mline => {
                        const lineNum = getPositionDescriptor(mline.from, context).line;
                        if (measureLineNumberMap.has(lineNum)) return;

                        const measureLineNum = measureLineNumberMap?.get(lineNum)!;
                        const explicitLinename = explicitLineName[lineNum]?.processed_name[instrumentType];
                        const linename = explicitLinename || context.config.defaultLineNames[instrumentType][measureLineNum];
                        newState[lineNum] = linename;
                    });

                    context.setState(() => newState)
                }
           }
        }
    }
} as RuleModule<LineNamingState, LineNamingConfig>



function getDefaultLineNames() {
    return {
        "stringed::guitar": {
            1: "E4",
            2: "B3",
            3: "G3",
            4: "D3",
            5: "A2",
            6: "E2"
        },
        "stringed::bass": {
            1: "E3",
            2: "B2",
            3: "G2",
            4: "D2",
            5: "A1",
            6: "E1"
        }
    }
}