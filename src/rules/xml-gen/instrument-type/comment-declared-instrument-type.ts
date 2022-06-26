
/*
TODO:
 Allow users to override the instrument type both at the score-level, and at the tab-block level.
 This module detects the score-level declared instrument type comment, as well as the tab-block-level
 instrument type, and gives teh tab-block-level instrument type priority over the score-level one, and
 it resolves one single comment-declared instrument type, and this is the state it exports

 comment format:

 # [instrument=guitar]
 */

import { RuleModule } from "../../../rules";
import { getTextFromNode } from "../../utils/node-util-functions";

export type CommentDeclaredInstrumentTypeState = {
    type: string | undefined
    commentRange: [number, number] | undefined
}

export default {
    meta: {
        name: "comment-declared-instrument-type",
        dependencies: [],
        accurateAt: "TabBlock:entry"
    },
    initialState: () => ({type: undefined, commentRange: undefined}),
    defaultConfig: {
    },
    createVisitors: function(context) {
        return {
           Comment(node) {
                const commentText = getTextFromNode(node, context)[0];
                // check if comment has tab-block-level, or score-level instrument type declaration
                // extrace the instrument type and the range that the instrument declaration covers

                // if score-level instrument type comment found, update the internal score-level instrument type here
            },


            TabBlock() {
                // reset state
                context.setState(() => ({}));
                // find tab-block level instrument-type-comment that overlaps with this tab block.

                // use this and the score-level instrument type comment to determine what instrument type to export in the state
            },
        }
    }
} as RuleModule<CommentDeclaredInstrumentTypeState>