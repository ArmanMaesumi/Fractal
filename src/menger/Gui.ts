import { Camera } from "../lib/webglutils/Camera.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { MengerSponge } from "./MengerSponge.js";
import { Mat4, Vec3 } from "../lib/TSM.js";

/**
 * Might be useful for designing any animation GUI
 */
interface IGUI {
    viewMatrix(): Mat4;
    projMatrix(): Mat4;
    dragStart(me: MouseEvent): void;
    drag(me: MouseEvent): void;
    dragEnd(me: MouseEvent): void;
    onKeydown(ke: KeyboardEvent): void;
}

/**
 * Handles Mouse and Button events along with
 * the the camera.
 */
export class GUI implements IGUI {
    private static readonly rotationSpeed: number = 0.05;
    private static readonly zoomSpeed: number = 0.1;
    private static readonly rollSpeed: number = 0.1;
    private static readonly panSpeed: number = 0.1;

    private camera: Camera;
    private dragging: boolean;
    private fps: boolean;
    private prevX: number;
    private prevY: number;
    private button: number;

    private height: number;
    private width: number;

    private sponge: MengerSponge;
    private animation: CanvasAnimation;

    /**
     *
     * @param canvas required to get the width and height of the canvas
     * @param animation required as a back pointer for some of the controls
     * @param sponge required for some of the controls
     */
    constructor(
        canvas: HTMLCanvasElement,
        animation: CanvasAnimation,
        sponge: MengerSponge
    ) {
        this.height = canvas.height;
        this.width = canvas.width;
        this.prevX = 0;
        this.prevY = 0;

        this.sponge = sponge;
        this.animation = animation;

        this.reset();

        this.registerEventListeners(canvas);
    }

    /**
     * Resets the state of the GUI
     */
    public reset(): void {
        this.fps = false;
        this.dragging = false;
        /* Create camera setup */
        this.camera = new Camera(
            new Vec3([0, 1, 0]),
            new Vec3([0, 0, 0]),
            new Vec3([1, 0, 0]),
            45,
            this.width / this.height,
            0.1,
            1000.0
        );
    }

    /**
     * Sets the GUI's camera to the given camera
     * @param cam a new camera
     */
    public setCamera(
        pos: Vec3,
        target: Vec3,
        upDir: Vec3,
        fov: number,
        aspect: number,
        zNear: number,
        zFar: number
    ) {
        this.camera = new Camera(pos, target, upDir, fov, aspect, zNear, zFar);
    }

    /**
     * Returns the view matrix of the camera
     */
    public viewMatrix(): Mat4 {
        return this.camera.viewMatrix();
    }

    /**
     * Returns the projection matrix of the camera
     */
    public projMatrix(): Mat4 {
        return this.camera.projMatrix();
    }

    /**
     * Callback function for the start of a drag event.
     * @param mouse
     */
    public dragStart(mouse: MouseEvent): void {
        this.dragging = true;
        this.prevX = mouse.screenX;
        this.prevY = mouse.screenY;
        this.button = mouse.button;
    }

    /**
     * The callback function for a drag event.
     * This event happens after dragStart and
     * before dragEnd.
     * @param mouse
     */
    public drag(mouse: MouseEvent): void {

        // TODO: Your code here for left and right mouse drag
        if (this.dragging && this.button == 0) {
            let curX = mouse.screenX;
            let curY = mouse.screenY;
            let dx = curX - this.prevX;
            let dy = this.prevY - curY; // (0,0) of screen in top left corner
            if (dx != 0 || dy != 0) {
                let world_vec = this.camera.up().normalize().scale(dy).add(this.camera.right().normalize().scale(dx)).normalize();
                let rotate_axis = Vec3.cross(this.camera.forward().normalize(), world_vec);
                this.camera.rotate(rotate_axis, -GUI.rotationSpeed);
                this.prevX = curX;
                this.prevY = curY;
            }
        }

    }

    /**
     * Callback function for the end of a drag event
     * @param mouse
     */
    public dragEnd(mouse: MouseEvent): void {
        this.drag(mouse);
        this.dragging = false;
        this.prevX = 0;
        this.prevY = 0;
    }

    /**
     * Callback function for a key press event
     * @param key
     */
    public onKeydown(key: KeyboardEvent): void {
        /*
           Note: key.code uses key positions, i.e a QWERTY user uses y where
                 as a Dvorak user must press F for the same action.
           Note: arrow keys are only registered on a KeyDown event not a
           KeyPress event
           We can use KeyDown due to auto repeating.
         */

        // TOOD: Your code for key handling

        switch (key.code) {
            case "KeyW": {
                this.camera.setPos(this.camera.pos().add(this.camera.forward().normalize().scale(GUI.zoomSpeed).negate()));
                break;
            }
            case "KeyA": {
                this.camera.setPos(this.camera.pos().add(this.camera.right().normalize().negate().scale(GUI.panSpeed)));
                break;
            }
            case "KeyS": {
                this.camera.setPos(this.camera.pos().add(this.camera.forward().normalize().scale(GUI.zoomSpeed)));
                break;
            }
            case "KeyD": {
                this.camera.setPos(this.camera.pos().add(this.camera.right().normalize().scale(GUI.panSpeed)));
                break;
            }
            case "KeyR": {

                break;
            }
            case "ArrowLeft": {
                this.camera.roll(GUI.rollSpeed);
                break;
            }
            case "ArrowRight": {
                this.camera.roll(GUI.rollSpeed, true);
                break;
            }
            case "ArrowUp": {
                this.camera.setPos(this.camera.pos().add(this.camera.up().normalize().scale(GUI.panSpeed)));
                break;
            }
            case "ArrowDown": {
                this.camera.setPos(this.camera.pos().add(this.camera.up().normalize().negate().scale(GUI.panSpeed)));
                break;
            }
            case "Digit1": {
                this.sponge.setLevel(1);
                break;
            }
            case "Digit2": {
                this.sponge.setLevel(2);
                break;
            }
            case "Digit3": {
                this.sponge.setLevel(3);
                break;
            }
            case "Digit4": {
                this.sponge.setLevel(4);
                break;
            }
            default: {
                console.log("Key : '", key.code, "' was pressed.");
                break;
            }
        }
    }

    /**
     * Registers all event listeners for the GUI
     * @param canvas The canvas being used
     */
    private registerEventListeners(canvas: HTMLCanvasElement): void {
        /* Event listener for key controls */
        window.addEventListener("keydown", (key: KeyboardEvent) =>
            this.onKeydown(key)
        );

        /* Event listener for mouse controls */
        canvas.addEventListener("mousedown", (mouse: MouseEvent) =>
            this.dragStart(mouse)
        );

        canvas.addEventListener("mousemove", (mouse: MouseEvent) =>
            this.drag(mouse)
        );

        canvas.addEventListener("mouseup", (mouse: MouseEvent) =>
            this.dragEnd(mouse)
        );

        /* Event listener to stop the right click menu */
        canvas.addEventListener("contextmenu", (event: any) =>
            event.preventDefault()
        );
    }
}
