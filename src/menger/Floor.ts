import { Mat3, Mat4, Vec3, Vec4 } from "../lib/TSM.js";

/* A potential interface that students should implement */
interface IFloor {
    normalsFlat(): Float32Array;
    indicesFlat(): Uint32Array;
    positionsFlat(): Float32Array;
}

export class Floor implements IFloor {

    // TODO: sponge data structures
    positions: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;

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
            -size, y, -size, 1.0,    // A
             size, y,  size, 1.0,    // B
             size, y, -size, 1.0,    // C
             
             size, y,  size, 1.0,    // B
            -size, y, -size, 1.0,   // A
            -size, y, size, 1.0     // D

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
    public positionsFlat(): Float32Array {
        return this.positions;
    }

    /**
     * Returns a flat Uint32Array of the floor's face indices
     */
    public indicesFlat(): Uint32Array {
        return this.indices;
    }

    /**
     * Returns a flat Float32Array of the floor's normals
     */
    public normalsFlat(): Float32Array {
        return this.normals;
    }

    /**
     * Returns the model matrix of the sponge
     */
    public uMatrix(): Mat4 {

        // TODO: change this, if it's useful
        const ret: Mat4 = new Mat4().setIdentity();

        return ret;
    }

}
