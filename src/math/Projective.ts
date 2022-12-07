import { Matrix } from "ml-matrix"


export class Projective {
    n: number
    real_locations: Matrix // [x, y, z]
    proj_locations: Matrix // [a, b, depth] relative to camera
    transform: Matrix // 4x4 model transform:
    rotate: Matrix // will someday implement transformations properly. that day is not today. 
    up_to_date: boolean

    z_offset: number
    dmin: number
    dmax: number

    constructor(n: number) {
        this.n = n
        this.real_locations = Matrix.zeros(n, 3)
        this.proj_locations = Matrix.zeros(n, 3)
        this.transform = Matrix.identity(4, 4)
        this.rotate = Matrix.identity(4, 4)

        // Maybe make this configurable at some point
        this.z_offset = 0.4
        this.fov = 2 * Math.atan(0.5 / this.z_offset)

        this.dmin = 0
        this.dmax = 1

        // translate z upwards a bit to get in frame properly
        this.transform.set(2, 3, this.z_offset)
    }

    create_rotation_binding() {
        return (R: Matrix) => {
            this.rotate = R
            this.up_to_date = false
        }
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
            let hom_vec = (this.transform.mmul(this.rotate)).mmul(
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
        return 1 - Math.max(0, Math.min(0.6, (depth - this.dmin) / (this.dmax - this.dmin)))
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


export class RotationView {
    groot: SVGSVGElement
    matrix: Matrix
    state: any
    change_callback: (R: Matrix) => void
    MOUSE_SCALE_FACTOR: number

    constructor (groot: SVGSVGElement) {
        this.groot = groot
        this.matrix = Matrix.eye(4)

        // UI state
        this.state = {
            mouse_down: false
        }
        this.MOUSE_SCALE_FACTOR = 3

        this.change_callback = (_) => {}

        this.groot.addEventListener("pointerdown", this.pointerdown.bind(this))
        this.groot.addEventListener("pointerup", this.pointerup.bind(this))
        this.groot.addEventListener("pointermove", this.pointermove.bind(this))
        this.groot.addEventListener("pointercancel", this.pointercancel.bind(this))
    }

    reset() {
        this.matrix = Matrix.eye(4)
    }

    set_callback(f: (R: Matrix) => void) {
        this.change_callback = f
    }

    rotate(ax1: number, ax2: number) {
        this.matrix = ROT_YZ(ax2).mmul(ROT_XZ(ax1)).mmul(this.matrix)
        this.change_callback(this.matrix)
    }

    pointerdown(ev: PointerEvent) {
        this.groot.setPointerCapture(ev.pointerId)
        this.state.mouse_down = true
        this.state.last_x = ev.screenX
        this.state.last_y = ev.screenY
    }

    pointerup(ev: PointerEvent) {
        this.state.mouse_down = false
        this.groot.releasePointerCapture(ev.pointerId)
// }
    }

    pointermove(ev: PointerEvent) {
        if (!this.state.mouse_down) return

        // calculate manually instead of using `ev.movement[XY]` due to what appears to be Firefox bug on touchscreen devices
        let dx = ev.screenX - this.state.last_x
        let dy = ev.screenY - this.state.last_y

        let scale = 1000
        this.rotate(dx / scale * this.MOUSE_SCALE_FACTOR, dy / scale * this.MOUSE_SCALE_FACTOR)
        this.state.last_x = ev.screenX
        this.state.last_y = ev.screenY
    }

    pointercancel(ev: PointerEvent) {
        this.state.mouse_down = false
        this.groot.releasePointerCapture(ev.pointerId)
    }
}

