import {
    CanvasAnimation,
    WebGLUtilities
} from "../lib/webglutils/CanvasAnimation.js";
import { GUI } from "./Gui.js";
import { MengerSponge } from "./MengerSponge.js";
import { mengerTests } from "./tests/MengerTests.js";
import {
    defaultFSText,
    defaultVSText,
    floorFSText,
    floorVSText
} from "./Shaders.js";
import { Mat4, Vec4, Vec3 } from "../lib/TSM.js";
import { Floor } from "./Floor.js";

export interface MengerAnimationTest {
    reset(): void;
    setLevel(level: number): void;
    getGUI(): GUI;
    draw(): void;
}

export class MengerAnimation extends CanvasAnimation {
    private gui: GUI;

    private buffer: WebGLBuffer = -1;
    private attribLoc: GLint = -1;
    private program: WebGLProgram = -1;
    private worldUniformLocation: WebGLUniformLocation = -1;
    private viewUniformLocation: WebGLUniformLocation = -1;
    private projUniformLocation: WebGLUniformLocation = -1;

    /* The Menger sponge */
    private sponge: MengerSponge = new MengerSponge(1);

    /* Menger Sponge Rendering Info */
    private mengerVAO: WebGLVertexArrayObjectOES = -1;
    private mengerProgram: WebGLProgram = -1;

    /* Menger Buffers */
    private mengerPosBuffer: WebGLBuffer = -1;
    private mengerIndexBuffer: WebGLBuffer = -1;
    private mengerNormBuffer: WebGLBuffer = -1;

    /* Menger Attribute Locations */
    private mengerPosAttribLoc: GLint = -1;
    private mengerNormAttribLoc: GLint = -1;

    /* Menger Uniform Locations */
    private mengerWorldUniformLocation: WebGLUniformLocation = -1;
    private mengerViewUniformLocation: WebGLUniformLocation = -1;
    private mengerProjUniformLocation: WebGLUniformLocation = -1;
    private mengerLightUniformLocation: WebGLUniformLocation = -1;

    /* Global Rendering Info */
    private lightPosition: Vec4 = new Vec4();
    private backgroundColor: Vec4 = new Vec4();

    // ------------------------------------ //
    // TODO: data structures for the floor
    private floor: Floor = new Floor();

    /* Floor Rendering Info */
    private floorVAO: WebGLVertexArrayObjectOES = -1;
    private floorProgram: WebGLProgram = -1;

    /* Floor Buffers */
    private floorPosBuffer: WebGLBuffer = -1;
    private floorIndexBuffer: WebGLBuffer = -1;
    private floorNormBuffer: WebGLBuffer = -1;

    /* Floor Locations */
    private floorPosAttribLoc: GLint = -1;
    private floorNormAttribLoc: GLint = -1;

    /* Floor Locations */
    private floorWorldUniformLocation: WebGLUniformLocation = -1;
    private floorViewUniformLocation: WebGLUniformLocation = -1;
    private floorProjUniformLocation: WebGLUniformLocation = -1;
    private floorLightUniformLocation: WebGLUniformLocation = -1;

    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        this.gui = new GUI(canvas, this, this.sponge);

        /* Setup Animation */
        this.reset();
    }

    /**
     * Setup the animation. This can be called again to reset the animation.
     */
    public reset(): void {
        /* debugger; */
        this.lightPosition = new Vec4([-10.0, 10.0, -10.0, 1.0]);
        this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);
        this.initBuffers();
        this.gui.reset();
    }

    public initBuffers(): void {
        
        const gl: WebGLRenderingContext = this.ctx;

        const positionBuffer = gl.createBuffer();

        // Select the positionBuffer as the one to apply buffer
        // operations to from here out.

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Now create an array of positions for the square.

        const positions = [
            -1.0,  1.0,
            1.0,  1.0,
            -1.0, -1.0,
            1.0, -1.0,
        ];

        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.

        gl.bufferData(gl.ARRAY_BUFFER,
                        new Float32Array(positions),
                        gl.STATIC_DRAW);

        return {
            position: positionBuffer,
        };
    }
    
    /**
     * Draws a single frame
     */
    public draw(): void {

        const gl: WebGLRenderingContext = this.ctx;
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = gl.canvas.width / gl.canvas.height; // TODO...
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = new Mat4();
      
        // note: glmatrix.js always has the first argument
        // as the destination to receive the result.
        // fov: number, aspect: number, near: number, far: number, dest?: Mat4): Mat4
        Mat4.perspective(fieldOfView,aspect, zNear, zFar, projectionMatrix);
        const modelViewMatrix = new Mat4().translate(new Vec3([0.0, 0.0, -6.0]));

        {
            const numComponents = 2;  // pull out 2 values per iteration
            const type = gl.FLOAT;    // the data in the buffer is 32bit floats
            const normalize = false;  // don't normalize
            const stride = 0;         // how many bytes to get from one set of values to the next
                                    // 0 = use type and numComponents above
            const offset = 0;         // how many bytes inside the buffer to start from
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.vertexAttribPointer(
                this.attribLoc,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                this.attribLoc
            );
        }

        gl.useProgram(this.program);

        // Set the shader uniforms
        
        this.viewUniformLocation = gl.getUniformLocation(
            this.program,
            "mView"
        ) as WebGLUniformLocation;
        this.projUniformLocation = gl.getUniformLocation(
            this.program,
            "mProj"
        ) as WebGLUniformLocation;

        gl.uniformMatrix4fv(
            this.projUniformLocation,
            false,
            new Float32Array(Mat4.identity.all()));

        gl.uniformMatrix4fv(
            this.viewUniformLocation,
            false,
            new Float32Array(Mat4.identity.all()));
        
        {
            const offset = 0;
            const vertexCount = 4;
            gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
        }
    }

    public setLevel(level: number): void {
        this.sponge.setLevel(level);
    }

    public getGUI(): GUI {
        return this.gui;
    }
}

export function initializeCanvas(): void {
    const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
    /* Start drawing */
    const canvasAnimation: MengerAnimation = new MengerAnimation(canvas);
    mengerTests.registerDeps(canvasAnimation);
    mengerTests.registerDeps(canvasAnimation);
    canvasAnimation.start();
}
