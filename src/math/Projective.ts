import { Matrix } from "ml-matrix"


export class Projective {
    n: number
    real_locations: Matrix // [x, y, z]
    proj_locations: Matrix // [a, b, depth] relative to camera
    transform: Matrix // 4x4 model transform: goes into...
    up_to_date: boolean

    z_offset: number
    dmin: number
    dmax: number

    constructor(n: number) {
        this.n = n
        this.real_locations = Matrix.zeros(n, 3)
        this.proj_locations = Matrix.zeros(n, 3)
        this.transform = Matrix.identity(4, 4)

        // Maybe make this configurable at some point
        this.z_offset = 0.4
        this.fov = 2 * Math.atan(0.5 / this.z_offset)

        this.dmin = 0
        this.dmax = 1

        // translate z upwards a bit to get in frame properly
        this.transform.set(2, 3, this.z_offset)
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
        this.dmin = Infinity
        this.dmax = -Infinity
        for (let i = 0; i < this.n; i++) {
            let hom_vec = this.transform.mmul(
                Matrix.from1DArray(4, 1, [...this.real_locations.getRow(i), 1])
            )

            let [x_, y_, z_, w] = hom_vec.getColumn(0)
            let [x, y, z] = [x_ / w, y_ / w, z_ / w]

            // Proper depth calculations eventually

            let z0 = z - this.z_offset
            let depth
            if (z < 0) {
                depth = -1
            } else {
                depth = Math.sqrt(x * x + y * y + z * z)
                this.dmin = Math.min(this.dmin, depth)
                this.dmax = Math.max(this.dmax, depth)
            }

            let ab = [x / z, y / z, depth]
            this.proj_locations.setRow(i, ab)
        }
        this.up_to_date = true
    }

    opacity(v: number) {
        let [a, b, depth] = this.at(v)
        if (depth < 0) return 0

        // return 
        return 1 - Math.max(0, Math.min(0.5, (depth - this.dmin) / (this.dmax - this.dmin)))
    }

    at(i: number) {
        if (!this.up_to_date) {
            this.recompute_proj()
        }
        return this.proj_locations.getRow(i)
    }
}


const ROT_XZ = theta => new Matrix([
    [Math.cos(theta), 0, -Math.sin(theta), 0],
    [0, 1, 0, 0],
    [Math.sin(theta), 0, Math.cos(theta), 0],
    [0, 0, 0, 1],
])


const ROT_YZ = theta => new Matrix([
    [1, 0, 0, 0],
    [0, Math.cos(theta), -Math.sin(theta), 0],
    [0, Math.sin(theta), Math.cos(theta), 0],
    [0, 0, 0, 1],
])

/*
class RotationView {
    el: SVGAElement
    matrix: Matrix
    state: any
    change_callback: (R: Matrix) => void

    constructor (el: SVGAElement) {
        this.el = el
        this.matrix = Matrix.eye(3)

        // UI state
        this.state = {
            mouse_down: true
        }

        this.change_callback = (_) => {}

        this.el.addEventListener("pointerdown", this.pointerdown.bind(this))
        this.el.addEventListener("pointerup", )
        this.el.addEventListener("pointermove", )
        this.el.addEventListener("pointercancel", )


        
    }

    reset() {
        this.matrix = Matrix.eye(3)
    }

    // On graph reload everything is destroyed, so nothing to do here
    // destroy() {
        
    // }

    setCallback(f) {

    }

    pointerdown(ev: PointerEvent) {
        this // wtf is this
    }
}
*/

// groot.onpointerdown = (ev: PointerEvent) => {
//     // Steal pointer and bind release event
//     MOUSE_DOWN = true
//     groot.setPointerCapture(ev.pointerId)
//     last_x = ev.screenX
//     last_y = ev.screenY
// }
// groot.onpointerup = (ev: PointerEvent) => {
//     MOUSE_DOWN = false
//     // groot.releasePointerCapture(ev.pointerId)
// }

// groot.onpointermove = (ev: PointerEvent) => {
//     if (!MOUSE_DOWN) {
//         return
//     }
//     // calculate manually instead of using `ev.movement[XY]` due to what appears to be Firefox bug on touchscreen devices
//     let dx = ev.screenX - last_x
//     let dy = ev.screenY - last_y

//     go.rotate(dx / 1000 * ENV.MOUSE_SCALE_FACTOR, dy / 1000 * ENV.MOUSE_SCALE_FACTOR)
//     last_x = ev.screenX
//     last_y = ev.screenY
// }
// groot.onpointercancel = (ev: PointerEvent) => {
//     groot.releasePointerCapture(ev.pointerId)
// }



