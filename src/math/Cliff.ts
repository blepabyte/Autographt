import { Matrix } from "ml-matrix"


function slerp(a: Matrix, b: Matrix, t: number) {
    // new Matrix([])
    let omega = Math.acos(a.dot(b))
    return a.clone().mul(
        Math.sin((1 - t) * omega) / Math.sin(omega)
    ).add(b.clone().mul(
        Math.sin(t * omega) / Math.sin(omega)
    ))
}


/*
Applies the reflection represented by x to v, directly mutating v
*/
function apply_cliff(x: Matrix, v: Matrix) {
    v.sub(x.clone().mul(2 * x.dot(v)))
}


function transpose_vec(i: number, j: number, n: number): Matrix {
    let vec = Matrix.zeros(n, 1)
    vec.set(i, 0, Math.cos(-Math.PI / 4))
    vec.set(j, 0, Math.sin(-Math.PI / 4))
    // oops. tried to set array entries in a sane way
    // vec[i] = Math.cos(-Math.PI / 4)
    // vec[j] = Math.sin(-Math.PI / 4)
    return vec
}

/*
takes permutation of (0..=n-1)
returning naive transposition sequence that "sorts" it, ignoring graph structure
*/
export function naive_transposition_sequence(permutation: Array<number>) {
    let transpositions: Array<[number, number]> = []

    // Note that there is no need to "optimise" for cases where two positions can be corrected at once - happens automatically
    let n = permutation.length
    console.log(permutation)
    let work_perm = [...permutation]
    for (let i = 0; i < n; i++) {
        if (work_perm[i] == i) continue
        let idx = work_perm.indexOf(i)
        if (idx === -1 || idx < i) throw new Error("indexOf banana")
        transpositions.push([i, idx])
        work_perm[idx] = work_perm[i]
        // Unnecessary, as work_perm is discarded
        work_perm[i] = i // Actually is necessary; otherwise indexOf messes up
    }
    return transpositions
}

function expand_cycle(C) {
    let ts = []
    for (let i = 0; i < C.length - 1; i++) {
        ts.push([C[i], C[i + 1]])
    }
    return ts.reverse()
}

/*
Sequence of transpositions equivalent to `permutation`. To be applied left to right. 
*/
export function cycle_transposition_sequence(permutation: Array<number>) {
    let cycles = []
    let left = new Set(permutation)

    while (left.size > 0) {
        // couldn't they have defined a .pop()?
        let x = left.values().next().value
        left.delete(x)
        let y = permutation[x]
        let C = [x]

        // fixed points ignored
        if (y === x) continue

        while (y !== x && left.size > 0) {
            C.push(y)
            if (!left.delete(y)) throw "Not permutation"
            y = permutation[y]
        }
        cycles.push(C)
    }

    return cycles.flatMap(expand_cycle)
}


/*
interpolates (pairwise) the given transposition sequence
returns callable: (v, t) where
at t = 0: identity map
at t = 1: the given permutation
*/
export function morb(n: number, transpositions: Array<[number, number]>) {
    // Computing the transposition sequence is possibly expensive - could be done server-side

    if (transpositions.length % 2 !== 0) {
        throw new Error("will only morb even permutations")
    }

    return (v: Matrix, t: number) => {
        let v0 = v.clone()
        for (let k = 0; k < transpositions.length; k += 2) {
            let t1 = transpose_vec(...transpositions[k], n)
            let t2 = transpose_vec(...transpositions[k + 1], n)

            apply_cliff(t1, v0)

            apply_cliff(slerp(t1, t2, t / 2), v0)
            apply_cliff(slerp(t2, t1, t / 2), v0)

            apply_cliff(t2, v0)
        }
        return v0
    }
}