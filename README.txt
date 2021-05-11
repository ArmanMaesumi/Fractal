Graphics Final Project: Fractal Shaders

Name:   Arman Maesumi
UTEID:  am84425

This codebase is separated into two main parts, the "2D" directory and the "3D" directory.
These directories are totally independent from each other.

2D:
The 2D directory contains a WebGL program that renders the Mandelbrot set. To run it, simply
open 2D/index.html in a compatible browser (FireFox or Chrome seem to work best usually).

To interact with the Mandelbrot renderer: 
    1. Click and drag to pan
    2. "Z" to zoom out and "X" to zoom in

3D:
The 3D directory contains a ThreeJS program that renders various 3D fractals. To run it:

    1. Open terminal and cd into 3D/
    2. > npm install
    3. > npm start
    4. Open the localhost url (shown in terminal) in a browser

To interact with the fractal viewer:

    1. Click and drag to orbit
    2. Right click to pan
    3. Scroll to zoom
    4. Number keys 0 through 5 display different fractals:
                1 = Menger sponge
                2 = Mandelbulb
                3 = Mandelbox
                4 = Serpinski Pyramid
                5 = Menger Sponge intersected with Mandelbulb
    5. Press "a" to toggle the mandelbulb animation mode
    6. Press "r" to reset camera position/orientation