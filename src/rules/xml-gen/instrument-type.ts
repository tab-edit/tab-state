/**
 *  determines instrument type. based on if config says "enforce guitar", "enforce bass", or "autodetect", this computes the instrument type 
 */

import { RuleModule } from "../../rules";
import { getPositionDescriptor, getTextFromNode } from "../utils/node-util-functions";
import { ExplicitLineNamingState } from "./line-naming/explicit-line-name";

export type InstrumentTypeState = string;

export type InstrumentTypeConfig = {
    declaredType: string; // "auto" or "[instrument type]". default config value is auto.
}

/**
 *  i think instrument type should only ever be unknown before we enter hte first measure.
 * after we pass the first measure, we should be able to tell what instrument it is.
 * 
 * I'm not too sure about the accurateAt property, because i don't think it should be accurateAt: "Measure:entry"
 * because we may need to see the notes in the first measure to determine which instrument it is. 
 * On the other hand, what if there are no notes in the first measure? i think we should be strict about this
 * and say it is accurate at the first note of the measure or at Measure:exit (if no notes) because we must have an
 * instrument type resolved to be able to generate the data for each note, so we HAVE to resolve the instrument type
 * before, or at the first note in the measure
 * 
 * we also look at the measure-line-count rule to determine what instrument (based on config)
 * e.g. if the measure has 6 lines, it is likely a guitar. if 4, likely a bass. this has to be consolidated with other
 * methods of checking the type though, as it is probably the least important factor that plays into determining instrument type.
 * this should only be a tie-breaker. Also think of when there are no line names too.
 */


/*
uses explicit-line-name to determine which instrument type it could be. also uses the measure-line-count to determine too 
(e.g. 6 lines ? then instrument is guitar unless measureline name suggests it cannot be guitar. only when there is conflict between 
    two instrument types i.e. both instrument types are possible, is the measure line count used as a sort-of tie-breaker)
of course we will have a config value with this that tells us the instrument type, whether auto - meaning we have to figure it out by doing the above,
or they tell us what specific instrument they want, in which case we enforce that. we might also want to have the user be able to change instrument
types by specifying in comments with a specific format. in this case we also override and just use that instrument directly

we might also want to have another value in the InstrumentTypeState that tells us
the possible instrument types, even if the user directly specifies the instrument types.
i'm not too sure but this might be useful information for linters to see what possible instrument types
we were conflicted about

maybe also include some value in the InstrumentTypeState that when the instrument-type
is unknown and cannot be decided (multiple instruments could apply), even
if the user provided the instrument type in the config or comments which we will use,
we will still have some way of knowing that there was some ambiguity. i'm not too sure if this is important
though, would it really benefit linters? or is it unnecessary information

we should use the comment-declared-instrument-type rule too
*/


export default {
    meta: {
        name: "instrument-type",
        dependencies: ["explicit-line-name", "comment-declared-instrument-type"],
        accurateAt: ""
    },
    initialState: () => "unknown",
    createVisitors: function(context) {
        let isFirstLinenameInMeasure: boolean = false;
        let possibleInstrumentTypes = new Set<string>();
        return {
            TabBlock() {
                isFirstLinenameInMeasure = true;
                possibleInstrumentTypes.clear();
                // reset instrument type
                context.setState(() => "unknown");
            },
            MeasureLineName(node) {
                const explicitLinenameState = context.requestExternalState<ExplicitLineNamingState>("explicit-line-name")?.value;
                if (!explicitLinenameState) {
                    context.reportError(`missing dependency 'explicit-line-name'`);
                    return;
                }
                let lineNum = getPositionDescriptor(node.ranges[0], context).line;

                const possibleTypes = Object.keys(explicitLinenameState[lineNum].processed_name)
                if (isFirstLinenameInMeasure) {
                    possibleTypes.forEach(instrument => possibleInstrumentTypes.add(instrument));
                } else {
                    possibleTypes.forEach(instrument => {
                        if () {

                        }
                    })
                }
            },
            "LineNaming:exit"() {
                if (possibleInstrumentTypes.has(context.config.declaredType)) {
                    context.setState(() => context.config.declaredType);
                    return;
                } else {
                    // check if instrument type is auto, if so figure it out. if it is not auto,
                    // give an error that the instrument doesn't match the declared type.
                }
            }
            /* TODO: behaviour might depend on when instrument type rule resolves the instrument type, so can't impelement now.
            Also, should we make it so lineName is accurateOn: ".Note:entry"? given instrument might need to check the first note before
            it is able to be absolutely certain whether it knows the instrument type or not. I'm not sure

            context.config.

            */
        }
    }
} as RuleModule<InstrumentTypeState, InstrumentTypeConfig>
