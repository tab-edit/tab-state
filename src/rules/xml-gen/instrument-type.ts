/**
 *  determines instrument type. based on if config says "enforce guitar", "enforce bass", or "autodetect", this computes the instrument type 
 */

export type InstrumentTypeState = string; 
/**
 *  i think instrument type should only ever be unknown before we enter hte first measure.
 * after we pass the first measure, we should be able to tell what instrument it is (and if not default to guitar)
 * also, this is a feature for much later on but enable capability for comments to override what instrument is used. 
 * so say for example the user wants to a specific measure to be a different instrument, they can specify by comment.
 */


// accurateBy: "Measure:entry" because we might need to know how many lines the measure contains to determine what instrument it is
// or maybe it is more complex than it looks. maybe if the measure has no sound, it is accurateBy Measure:entry but if there is a sound
// in the measure, and there is ambiguity in the measure line name, then the sound is used to determine the instrument type, thus it would be
// accurate by the Sound:entry in this case.


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

maybe we have the ty
*/

error to remind me to implement later