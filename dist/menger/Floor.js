import { Mat4 } from "../lib/TSM.js";
export class Floor {
    constructor() {
        let size = 1000.0;
        let y = -2.0;
        this.positions = new Float32Array([
            /*
            B---------D
            |\        |
            |   \     |
            |       \ |
            C-------- A
            
            */
            -size, y, -size, 1.0,
            size, y, size, 1.0,
            size, y, -size, 1.0,
            size, y, size, 1.0,
            -size, y, -size, 1.0,
            -size, y, size, 1.0 // D
        ]);
        this.indices = new Uint32Array([
            0, 1, 2,
            3, 4, 5
        ]);
        this.normals = new Float32Array([
            0.0, 1.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0
        ]);
    }
    /* Returns a flat Float32Array of the floor's vertex positions */
    positionsFlat() {
        return this.positions;
    }
    /**
     * Returns a flat Uint32Array of the floor's face indices
     */
    indicesFlat() {
        return this.indices;
    }
    /**
     * Returns a flat Float32Array of the floor's normals
     */
    normalsFlat() {
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
//# sourceMappingURL=Floor.js.map