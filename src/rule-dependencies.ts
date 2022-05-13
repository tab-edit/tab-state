
/**
 * Placeholder function to simulate future implementation
 * TODO: delete this function and replace with actual implementation.
 * @returns topologically sorted list of rules
 */
function getTopologicallySortedRuleList(): string[] { 
    // TODO: detect and throw circular dependancy error
    error to remind me to come back here
    return []
}

/**
 * A data-structure-agnostic topological sort implementation.
 * @param vertexSet the set (in array form) of vertices in the graph
 * @param getNeighbours a function that takes in a vertex and returns an array of all its neighbours
 * @returns a topologically-sorted list of all the vertices in the graph.
 */
function  topological_sort<Vertex>(vertexSet: Vertex[], getNeighbours: (vertex:Vertex)=>Vertex[]) {
    const stack:Vertex[] = [];
    const visited = new Set<Vertex>();
    for (const vertex of vertexSet) {
        if (!visited.has(vertex)) dfs(vertex, getNeighbours, stack, visited);
    }
    return stack.reverse();
}

function dfs<Vertex>(vertex:Vertex, getNeighbours:(vertex:Vertex)=>Vertex[], stack: Vertex[], visited: Set<Vertex>) {
    visited.add(vertex);
    for (const neighbour of getNeighbours(vertex)) {
        if (!visited.has(neighbour)) dfs(neighbour, getNeighbours, stack, visited);
    }
}