import { Mat4 } from "../lib/TSM.js";
const N_DIM = 3;
class Cube {
    // Constructs a new Cube with its min point at origin and with side lengths equal to len.
    // The order of the positions are as follows:
    //
    //     5----------3
    //    /|         /|
    //   / |        / |
    //  7----------1  |
    //  |  |       |  |
    //  |  6-------|--4
    //  | /        | /
    //  |/         |/
    //  0----------2
    // 
    //  Uses the notation of clockwise is facing towards the user.
    constructor(origin, len) {
        // alloc members
        this.positions = new Float32Array(Cube.POINT_SIZE * Cube.N_TRI * N_DIM);
        this.indices = new Uint32Array(N_DIM * Cube.N_TRI);
        this.norms = new Float32Array(Cube.POINT_SIZE * Cube.N_TRI * N_DIM);
        // copy over indices
        for (let face = 0; face < Cube.N_TRI; face++) {
            for (let point = 0; point < N_DIM; point++) {
                this.indices[face * N_DIM + point] = face * N_DIM + point;
                let point_idx = Cube.FLAT_IDX[face * N_DIM + point];
                for (let coord = 0; coord < Cube.POINT_SIZE; coord++) {
                    let base = (face * N_DIM + point) * Cube.POINT_SIZE;
                    if (coord < N_DIM) {
                        this.positions[base + coord] = origin[coord] + Cube.FLAT_PTS[point_idx * Cube.POINT_SIZE + coord] * len;
                    }
                    else {
                        this.positions[base + coord] = Cube.FLAT_PTS[point_idx * Cube.POINT_SIZE + coord];
                    }
                    this.norms[base + coord] = Cube.FLAT_N[face * Cube.POINT_SIZE + coord];
                }
            }
        }
    }
}
Cube.FLAT_PTS = [
    0.0, 0.0, 0.0, 1.0,
    1.0, 1.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, 0.0, 1.0, 1.0,
    0.0, 1.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 1.0, 0.0, 1.0, // p7
];
Cube.FLAT_IDX = [
    // front face
    0, 7, 2,
    2, 7, 1,
    // right face
    1, 4, 2,
    1, 3, 4,
    // back face
    3, 6, 4,
    3, 5, 6,
    // left face
    0, 6, 5,
    5, 7, 0,
    // bottom face
    2, 6, 0,
    4, 6, 2,
    // top face
    3, 1, 7,
    3, 7, 5, // counter
];
Cube.FLAT_N = [
    // front
    0.0, 0.0, -1.0, 0.0,
    0.0, 0.0, -1.0, 0.0,
    // right
    1.0, 0.0, 0.0, 0.0,
    1.0, 0.0, 0.0, 0.0,
    // back
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    // left
    -1.0, 0.0, 0.0, 0.0,
    -1.0, 0.0, 0.0, 0.0,
    // bottom
    0.0, -1.0, 0.0, 0.0,
    0.0, -1.0, 0.0, 0.0,
    // top
    0.0, 1.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
];
Cube.N_FACES = 6;
Cube.N_TRI = Cube.N_FACES * 2;
Cube.POINT_SIZE = 4;
const to_place = [
    [
        [true, true, true],
        [true, false, true],
        [true, true, true],
    ],
    [
        [true, false, true],
        [false, false, false],
        [true, false, true],
    ],
    [
        [true, true, true],
        [true, false, true],
        [true, true, true],
    ],
];
/**
 * Represents a Menger Sponge
 */
export class MengerSponge {
    constructor(level) {
        this.setLevel(level);
        // TODO: other initialization	
    }
    /**
     * Returns true if the sponge has changed.
     */
    isDirty() {
        return this.dirty;
    }
    setClean() {
        this.dirty = false;
    }
    setLevel(level) {
        // TODO: initialize the cube
        if (level > 0) {
            if (level != this.level) {
                if (level == 1) {
                    let cube = new Cube([-.5, -.5, -.5], 1);
                    this.positions = cube.positions;
                    this.indices = cube.indices;
                    this.normals = cube.norms;
                    console.log(this.positions);
                }
                else {
                    const sub_sponge = new MengerSponge(level - 1);
                    for (let i = 0; i < sub_sponge.positions.length; i += Cube.POINT_SIZE) {
                        sub_sponge.positions[i] = (sub_sponge.positions[i] + .5) / N_DIM - .5;
                        sub_sponge.positions[i + 1] = (sub_sponge.positions[i + 1] + .5) / N_DIM - .5;
                        sub_sponge.positions[i + 2] = (sub_sponge.positions[i + 2] + .5) / N_DIM - .5;
                        console.assert(sub_sponge.positions[i + 3] == 1);
                    }
                    let pos_length = sub_sponge.positions.length * 20;
                    let idx_length = sub_sponge.indices.length * 20;
                    let norm_length = sub_sponge.normals.length * 20;
                    this.positions = new Float32Array(pos_length);
                    this.indices = new Uint32Array(idx_length);
                    this.normals = new Float32Array(norm_length);
                    let subidx = 0;
                    for (let xi = 0; xi < N_DIM; xi++) {
                        let x_off = xi / N_DIM;
                        for (let yi = 0; yi < N_DIM; yi++) {
                            let y_off = yi / N_DIM;
                            for (let zi = 0; zi < N_DIM; zi++) {
                                let z_off = zi / N_DIM;
                                if (to_place[xi][yi][zi]) {
                                    // copy
                                    for (let j = 0; j < sub_sponge.positions.length; j += Cube.POINT_SIZE) {
                                        let base = subidx * sub_sponge.positions.length + j;
                                        this.positions[base] = sub_sponge.positions[j] + x_off;
                                        this.positions[base + 1] = sub_sponge.positions[j + 1] + y_off;
                                        this.positions[base + 2] = sub_sponge.positions[j + 2] + z_off;
                                        console.assert(sub_sponge.positions[j + 3] == 1, "not a point");
                                        this.positions[base + 3] = 1;
                                    }
                                    for (let j = 0; j < sub_sponge.normals.length; j++) {
                                        this.normals[subidx * sub_sponge.normals.length + j] = sub_sponge.normals[j];
                                    }
                                    for (let j = 0; j < sub_sponge.indices.length; j++) {
                                        this.indices[subidx * sub_sponge.indices.length + j] = sub_sponge.indices[j] + subidx * Math.floor(sub_sponge.positions.length / Cube.POINT_SIZE);
                                    }
                                    subidx++;
                                }
                            }
                        }
                    }
                }
                console.log(this.positions);
            }
        }
        this.level = level;
        this.dirty = true;
    }
    /* Returns a flat Float32Array of the sponge's vertex positions */
    positionsFlat() {
        // TODO: right now this makes a single triangle. Make the cube fractal instead.
        console.assert(this.positions != null, "positions are null");
        return this.positions;
    }
    /**
     * Returns a flat Uint32Array of the sponge's face indices
     */
    indicesFlat() {
        // TODO: right now this makes a single triangle. Make the cube fractal instead.
        console.assert(this.indices != null, "indices are null");
        return this.indices;
    }
    /**
     * Returns a flat Float32Array of the sponge's normals
     */
    normalsFlat() {
        // TODO: right now this makes a single triangle. Make the cube fractal instead.
        console.assert(this.normals != null, "normals are null");
        return this.normals;
    }
    /**
     * Returns the model matrix of the sponge
     */
    uMatrix() {
        // TODO: change this, if it's useful
        const ret = new Mat4().setIdentity();
        return ret;
    }
}
//# sourceMappingURL=MengerSponge.js.map