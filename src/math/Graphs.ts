import * as Cliff from "./Cliff"
import {Matrix} from "ml-matrix"

// Vertices must be zero-indexed
export interface Graph {
    nv: number
    edges: Array<[number, number]>
    positions: Matrix
    // positions: Array<[number, number, number]>
}

export function to_zero_index_vertices(V: Array<number>) {
    return V.map(v => v - 1)
}

export function to_zero_index_edges(E: Array<[number, number]>) {
    return E.map(e => [e[0] - 1, e[1] - 1])
}

export function default_graph(): Graph {
    return {
        nv: 3,
        edges: [[0, 1], [1, 2], [2, 0]],
        positions: new Matrix([[0.1, 0, 1], [0, 0.1, 1], [-0.1, 0, 1]])
    }
}

export type INTERSPEC = "linear" | "slerp-naive" | "slerp-transposition-seq" | "noop"

/*
The necessary information to animate a graph automorphism
*/
export interface Interpolation {
    spec: INTERSPEC
    permutation?: Array<number>
    transposition?: Array<[number, number]>
    n?: number
}

export function interp(I: Interpolation): ((v: Matrix, t: number) => Matrix) {
    if (I.spec === "slerp-naive") {
        return Cliff.morb(
            I.permutation.length,
            Cliff.naive_transposition_sequence(I.permutation)
        )

    } else if (I.spec === "slerp-transposition-seq") {
        return Cliff.morb(I.n, I.transposition)

    } else if (I.spec === "linear") {
        return (v, t) => {
            let n = I.permutation.length
            let Pv = Matrix.zeros(n, 1)
            for (let i = 0; i < n; i++) {
                Pv.set(i, 0, (1 - t) * v.get(i, 0) + t * v.get(I.permutation[i], 0))
            }
            return Pv
        }

    } else if (I.spec === "noop") {
        return (v, _) => v

    } else {
        throw new Error(`Got invalid interpolation spec: ${I.spec}`)
    }
}
