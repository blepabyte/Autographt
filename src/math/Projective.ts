import { Matrix } from "ml-matrix"


export class Projective {
    n: number
    real_locations: Matrix // [x, y, z]
    proj_locations: Matrix // [a, b, depth] relative to camera
    transform: Matrix // 4x4 model transform: goes into...
    up_to_date: boolean

    constructor(n: number) {
        this.n = n
        this.real_locations = Matrix.zeros(n, 3)
        this.proj_locations = Matrix.zeros(n, 3)
        this.transform = Matrix.identity(4, 4)

        // Maybe make this configurable at some point
        let z_offset = 0.2
        this.fov = 2 * Math.atan(0.5 / z_offset)

        // translate z upwards a bit to get in frame properly
        this.transform.set(2, 3, z_offset)
    }

    real_matrix() {
        return this.real_locations.clone()
    }

    reset_real_cols(a, b, c) {
        this.real_locations.setColumn(0, a)
        this.real_locations.setColumn(1, b)
        this.real_locations.setColumn(2, c)
        this.up_to_date = false
    }

    set_positions(M: Matrix) {
        if (M.rows !== this.n) {
            throw new Error("Wrong number of vertices to construct projective view")
        }
        this.real_locations = M
        // this.real_locations = M.clone() // safety?
        this.up_to_date = false
    }

    set_real(position_list: Array<[number, number, number]>) {
        if (position_list.length !== this.n) {
            throw new Error("Wrong number of vertices to construct projective view")
        }
        for (let v = 0; v < this.n; v++) {
            this.real_locations.setRow(v, position_list[v])
        }
        
        this.up_to_date = false
    }

    recompute_proj() {
        for (let i = 0; i < this.n; i++) {
            let hom_vec = this.transform.mmul(
                Matrix.from1DArray(4, 1, [...this.real_locations.getRow(i), 1])
            )
            let depth = hom_vec.norm()
            let [x_, y_, z_, w] = hom_vec.getColumn(0)
            let [x, y, z] = [x_ / w, y_ / w, z_ / w]
            let ab = [x / z, y / z, depth]
            this.proj_locations.setRow(i, ab)
        }
        this.up_to_date = true
    }

    at(i) {
        if (!this.up_to_date) {
            this.recompute_proj()
        }
        return this.proj_locations.getRow(i)
    }
}