/**
 *  Infers instrument type from the details of the score, ignoring meta-details such as the config files, or the
 * comment-declared instrument type.
 */

import { RuleModule } from "../../../rules";
import { getPositionDescriptor } from "../../utils/node-util-functions";
import { ExplicitLineNamingState } from "../line-naming/explicit-line-name";
import { MeasureLineCountState } from "../measure-line-count";


export type InferredInstrumentTypeState = {
    possibleInstrumentTypes: Set<string>
}
export type InferredInstrumentTypeConfig = {
    /**
     * Mapping from measure-line-count => list-of-instruments-with-this-count
     * e.g. 
     * {
     *  6 => ["stringed::guitar"],
     *  4 => ["stringed::bass"]
     * }
     * 
     * This is used as a tie-breaker between instruments of the same instrument-group.
     * Thus, it is only used when there are multiple instruments in the same instrument-group,
     * e.g. if we have "stringed::guitar" and "stringed::bass" then we chose bass instead of
     * guitar when the measure line has 4 lines.
     * 
     */
    instrumentLinecountMap: {[lineCount: number]: string[]} 
}

export default {
    meta: {
        name: "inferred-instrument-types",
        dependencies: ["explicit-line-name", "measure-line-count"],
        accurateAt: ""
    },
    initialState: () => ({possibleInstrumentTypes: new Set()}),
    createVisitors: function(context) {
        let isFirstLinenameInMeasure = false;
        return {
            /*
            reset state
            */
            TabBlock() {
                isFirstLinenameInMeasure = true;
                context.setState((state) => {
                    state.possibleInstrumentTypes.clear();
                    return state;
                });
            },
            /*
            First layer of instrument-type determination uses the measure line names
            */
            MeasureLineName(node) {
                const explicitLinenameState = context.requestExternalState<ExplicitLineNamingState>("explicit-line-name")?.value;
                if (!explicitLinenameState) {
                    context.reportError(`missing dependency 'explicit-line-name'`);
                    return;
                }
                const lineNum = getPositionDescriptor(node.ranges[0], context).line;
                const processedLineNames = explicitLinenameState[lineNum].processed_name

                const possibleInstrumentTypes = context.getState().possibleInstrumentTypes;
                if (isFirstLinenameInMeasure) {
                    isFirstLinenameInMeasure = false;
                    // first line name determines initial instrument-type list
                    for (const instrument of Object.keys(processedLineNames)) {
                        possibleInstrumentTypes.add(instrument);
                    }
                } else {
                    // every line name reduces the list of possible instrument types
                    for (const instrument of possibleInstrumentTypes.keys()) {
                        if (!processedLineNames[instrument]) possibleInstrumentTypes.delete(instrument);
                    }
                }
                context.setState(state => {
                    state.possibleInstrumentTypes = possibleInstrumentTypes;
                    return state;
                })
            },

            /*
            Second layer of instrument determination uses the measure-line-count
            as tie-breaker between instruments of the same group (e.g. determines between guitar and bass)
            */
            Measure(node) {
                const possibleInstrumentTypes = context.getState().possibleInstrumentTypes;
                const lineCount = context.requestExternalState<MeasureLineCountState>("measure-line-count")?.value || 0;

                const linecountInstruments = context.config.instrumentLinecountMap[lineCount] || [];
                if (linecountInstruments.length===0) return;

                const linecountInstrumentsByGroup: {[group:string]: string} = {};
                for (const instrument of linecountInstruments) {
                    const group = extractInstrumentGroup(instrument);
                    if (linecountInstrumentsByGroup[group]) context.reportError("Cannot associate a measure-line-count with multiple instruments of the same group");
                    linecountInstrumentsByGroup[group] = instrument;
                }

                const filterableGroups = new Set<string>();
                const possibleInstrumentsByGroup: {[group:string]: string[]} = {}
                for (const instrument of context.getState().possibleInstrumentTypes) {
                    const group = extractInstrumentGroup(instrument);
                    if (!possibleInstrumentsByGroup[group]) possibleInstrumentsByGroup[group] = [group]
                    else possibleInstrumentsByGroup[group].push(group);

                    if (linecountInstrumentsByGroup[group]) filterableGroups.add(group)
                }

                for (const group of filterableGroups) {
                    const instrumentsInGroup = possibleInstrumentsByGroup[group];
                    for (const instrument of instrumentsInGroup) {
                        possibleInstrumentTypes.delete(instrument);
                    }
                }

                context.setState((state) => {
                    state.possibleInstrumentTypes = possibleInstrumentTypes;
                    return state;
                })
            },
            
            /*
            TODO:
            Third layer of instrument determination uses the measure components.
            */
            ".MeasureComponent"(node) {
            },
        }
    }
} as RuleModule<InferredInstrumentTypeState, InferredInstrumentTypeConfig>


function extractInstrumentGroup(instrument:string) {
    return instrument.split("::")[0] || "";
}