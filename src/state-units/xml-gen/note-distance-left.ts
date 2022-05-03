import { ASTNode } from "tab-ast";
import { StateContext } from "../..";

export default {
    meta: {
        namespace: "xml-gen",
        field: "note-distance"
    },
    initState: function() { 
        return {
            measure: 0,
            sound: 0
        }
    },
    create: function(context:StateContext) {
        let measureStartIdx:Map<number, number>; // lineNum => measureStartIdx
        return {
            "Measure": function(node:ASTNode) {
                measureStartIdx = new Map();
                let lineNum;
                for (let i=1; i<node.ranges.length; i+=2) {
                    lineNum = context.getSourceText().lineAt(node.ranges[i]).number;
                    measureStartIdx.set(lineNum, node.ranges[i]);
                }
            },
            "Sound .Note, Sound .NoteConnector": function(node:ASTNode) {
                let earliest
                for (let i=0; i<node.ranges.length; i+=2) {
                    

                }
            }
        }
    }
};