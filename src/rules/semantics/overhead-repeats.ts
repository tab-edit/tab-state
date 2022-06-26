import { RuleContext, RuleModule } from "../../rules";
import PriorityQueue from "ts-priority-queue";
import { computeMeasureAnchorRange, getPositionDescriptor, getTextFromNode, MeasureAnchorStyle } from "../utils/node-util-functions";
import { ResolvedASTNode, SourceSyntaxNodeTypes } from "tab-ast";

export type RepeatState = {
    stack: RepeatDescriptor[]
    measureMarking: "start" | "end" | "start-end" | "none"
}

export type RepeatConfig = {
    measureAnchorStyle: MeasureAnchorStyle,
    /**
     * specifies whether dangling repeats are included, and 
     * assumed to end at the end of the TabBlock from which it is dangling
     */
    includeDanglingRepeats: boolean
}

type RepeatDescriptor = { start:number, end:number, count: number, node: ResolvedASTNode };

/**
 * This state provides information on the current stack of repeats, as well as 
 * information on what repeat markings should apply to a measure, guarangteed to
 * be accurate and up to date by the start of each measure.
 */
export default {
    meta: {
        name: "overhead-repeats",
        dependencies: [],
        accurateAt: "Measure:entry"
    },
    initialState: () => ({
        stack: [],
        measureMarking: "none"
    }),
    defaultConfig: {
        measureAnchorStyle: "top-line",
        includeDanglingRepeats: false
    },
    createVisitors: function(context) {
        const orderedRepeats = new PriorityQueue<RepeatDescriptor>({comparator: (a,b) => a.start - b.start})
        let tabBlockRepeats:RepeatDescriptor[];
        let lastMeasureInBlock: {
            hash: string
            anchorRange:{start: number, end: number}
        };
        return {
            TabSegment: function() {
                // reset internal repeat state
                orderedRepeats.clear();
            },
            TabBlock: function(node) {
                // reset repeat state
                context.setState((state) => {
                    state.stack = [];
                    state.measureMarking = "none";
                    return state;
                });

                const children = node.getChildren();
                const lastMeasure = children[children.length-1];
                if (lastMeasure.name!="TabBlock") return; // TODO: change the tab-ast package to make this an enum
                lastMeasureInBlock = {
                    hash: lastMeasure.hash(),
                    anchorRange: computeMeasureAnchorRange(lastMeasure, context)
                }
                // TODO: detect dangling repeats and handle based on RepeatConfig.includeDanglingRepeats
            },
            Repeat: function(node) {
                const startPos = getPositionDescriptor(node.ranges[0], context);
                const endPos = getPositionDescriptor(node.ranges[1], context);
                orderedRepeats.queue({
                    start: startPos.col,
                    end: endPos.col,
                    count: parseInt(getTextFromNode(node, context)[0].replace(/[^0-9]/g, '')),
                    node
                }) 
            },
            Measure: function(node) {
                const measureRange = computeMeasureAnchorRange(node, context)
                
                let repeatStack = context.getState().stack;
                if (repeatStack.length===0) {
                    context.setState(state => {
                        state.measureMarking = "none";
                        return state;
                    })
                }

                // end ongoing repeats
                let repeat: RepeatDescriptor; let repeatEnded: boolean;
                for (let i=repeatStack.length-1; i>=0; i--) {
                    repeat = repeatStack[i];
                    repeatEnded = repeat.end > measureRange.start && (repeat.end <= measureRange.end || node.hash()===lastMeasureInBlock.hash);
                    if (!repeatEnded) break;
                    context.setState(state => {
                        state.stack.pop();
                        state.measureMarking = state.measureMarking==="start" ? "start-end" : "end";
                        return state;
                    })
                }

                // function to detect whether a repeat has started.
                let repeatStarted = function(repeat:RepeatDescriptor) {
                    return (
                        repeat.start >= measureRange.start && 
                        repeat.start < measureRange.end && (
                            repeat.end <= lastMeasureInBlock.anchorRange.end || 
                            context.config.includeDanglingRepeats
                        )
                    )
                }

                repeatStack = context.getState().stack; // get most up-to-date stack (state might've been updated earlier)
                let mostRecentOngoingRepeat = repeatStack[repeatStack.length-1];

                let repeatImproperlyNested: boolean, addStartMarking: boolean;
                while (orderedRepeats.peek().start < measureRange.end) {
                    repeatImproperlyNested = orderedRepeats.peek().end > mostRecentOngoingRepeat.end;
                    if (repeatImproperlyNested || !repeatStarted(orderedRepeats.peek())) {
                        orderedRepeats.dequeue();
                        continue;
                    }
                    repeatStack.push(orderedRepeats.dequeue());
                    addStartMarking = true;
                }
                context.setState((state) => {
                    state.stack = repeatStack;
                    if (addStartMarking) state.measureMarking = state.measureMarking==="end" ? "start-end" : "start";
                    return state;
                });
            }
        }
    }
} as RuleModule<RepeatState, RepeatConfig>