import { Text } from "@codemirror/text";
import { FragmentCursor, SourceSyntaxNodeTypes } from "tab-ast";
import { RuleModule } from "../../rule";

type NoteDistanceState = {
    toMeasure: number,
    toSound: number
}

export default {
    name: "note-distance-left",
    dependencies: [],
    initialState: () => ({
        toMeasure: 0,
        toSound: 0
    }),
    createVisitors: function(context) {
        let measureStartCol: {[lineNum:number]: number} = {}
        return {
            "Measure": function(node) {
                measureStartCol = {};
                const measurelines = context.getCursor().sourceSyntaxNodes()[SourceSyntaxNodeTypes.MeasureLine];
                measurelines.map((mline) => {
                    const pos = getPositionDescriptor(mline.from, context.getSourceText());
                    measureStartCol[pos.line] = pos.col;
                })
            }
        }
    }
} as RuleModule<NoteDistanceState>;

function getPositionDescriptor(pos:number, text:Text): {line: number, col: number} {
    const line = text.lineAt(pos);

    return {
        line: line.number,
        col: pos - line.from
    }
}

// import { ASTNode } from "tab-ast";
// import { CreateRule, StateContext } from "../..";

// // export default {
// //     meta: {
// //         namespace: "xml-gen",
// //         field: "note-distance"
// //     },
// //     initState: function() { 
// //         return {
// //             measure: 0,
// //             sound: 0
// //         }
// //     }, 
// //     create: function(context:StateContext) {
// //         let measureStartIdx:Map<number, number>; // lineNum => measureStartIdx
// //         return {
// //             "Measure": function(node:ASTNode) {
// //                 measureStartIdx = new Map();
// //                 let lineNum;
// //                 for (let i=1; i<node.ranges.length; i+=2) {
// //                     lineNum = context.getSourceText().lineAt(node.ranges[i]).number;
// //                     measureStartIdx.set(lineNum, node.ranges[i]);
// //                 }
// //             },
// //             "Sound .Note, Sound .NoteConnector": function(node:ASTNode) {
// //                 let earliest
// //                 for (let i=0; i<node.ranges.length; i+=2) {
                    
// // ;

// type State = {
//     measure: number
//     sound: number
// }

// export default {
//     name: "note-distance-left",
//     initialState: {
//         measure: 0,
//         sound: 0
//     },
//     createVisitors: function(context) {
//         let measureStartIdx: Map<number, number>;
//         return {
//             "Measure": function(node) {
//                 measureStartIdx = new Map();
//                 let lineNum;
//                 for (let i=1; i<node.ranges.length; i+=2) {
//                     lineNum = context.getSourceText().lineAt(node.ranges[i]).number;
//                     measureStartIdx.set(lineNum, node.ranges[i])
//                 }
//             },
//             "Sound": function(node) {

//                 let cursor = context.getCursor()
//                 cursor.firstChild();
//                 do {
//                     //find Note with earliest start column. that is the basis for all the
//                 } while (cursor.nextSibling())
//             }
//         }
//     }
// } as CreateRule<State>