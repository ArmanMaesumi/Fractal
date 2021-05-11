var locX = 0.0;
var locY = 0.0;
// locX = 1.6861733;
// locY = 0.0;

var scale = 0.315;
//      0000006.866455078124999e-7
// scale = 0.0000006866;
var canvas = document.querySelector('#glcanvas');
var mouseDown = false;
var mouseX = 0, mouseY = 0;

main();

//
// Start here
//
function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl');

  // If we don't have a GL context, give up now

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  // Vertex shader program

  const vsSource = `
    precision highp float;
    
    attribute vec4 aVertexPosition;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform vec2 uCenter;
    uniform float uScale;

    varying vec4 pos;
    varying vec2 center;
    varying float scale;
    
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      pos = gl_Position;
      center = uCenter;
      scale = uScale;
    }
  `;

  // Fragment shader program

  const fsSource = `
    precision highp float;

    varying vec2 center;
    varying float scale;
    varying vec4 pos;
    
    // Fractal parameters (be careful here):
    #define AA 4            // Don't go too high, on my 1080Ti AA=4 starts lagging 
    #define iterations 9000 // Can increase if your GPU is good

    // Colorizer parameters:
    #define bg vec3(3.0,3.0,4.0)
    #define bg_exposure 0.5
    #define power 0.22
    #define glow 0.6

    // Compute orbit stability of c under Z_{n+1} = Z_{n}^2 + c
    float mandelbrot(vec2 c) {
        float n = -1.0;
        vec2 z = vec2(0.0);
        for (int i = 0; i < iterations; i++) {
            // complex multiplication for z^2 + c:
            z = vec2(z.x*z.x - z.y*z.y, z.x*z.y + z.y*z.x) + c;

            if(dot(z,z) > 4.0) { // Orbit blew up!
                return float(i);
            }
        }

        // Return number of iterations
        return n;
    }

    // Returns color vector for a given number of iterations
    vec3 colorizer(float iters) {
        if (iters < 0.0) { // Not in mandelbrot set!
            return vec3(0.0, 0.0, 0.0);
        } else {
            vec3 c = vec3(bg_exposure);
            c += glow * cos(bg + 0.05 * iters * pow( scale, power ) );
            return c;
        }
    }

    void main() {
        vec2 resolution = vec2(1280, 960);
        vec2 pixelPos = pos.xy * resolution;
        
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

        if (AA > 1) { // Anti-aliasing
            for (int m = 0; m < AA; m++) {
                for (int n = 0; n < AA; n++) {
                    vec2 p = (2.0*(pixelPos.xy+vec2(float(m),float(n))/float(AA))-resolution.xy)/resolution.y;
                    float iter = mandelbrot(center + p*scale);
                    gl_FragColor.xyz += colorizer(iter);
                }
            }
            
            // blend
            gl_FragColor.xyz /= float(AA*AA);

        } else {
            vec2  p = (2.0*pixelPos-resolution.xy)/resolution.y;
            float iter = mandelbrot(center + p*scale);
            gl_FragColor.xyz += colorizer(iter);
        }

        gl_FragColor.w = 1.0;
    }
  `;

  // Initialize a shader program; this is where all the lighting
  // for the vertices and so forth is established.
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  // Collect all the info needed to use the shader program.
  // Look up which attributes our shader program is using
  // for aVertexPosition, aVertexColor and also
  // look up uniform locations.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      center: gl.getUniformLocation(shaderProgram, 'uCenter'),
      scale: gl.getUniformLocation(shaderProgram, 'uScale'),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = initBuffers(gl);
  var then = 0;
  // Draw the scene
  function render(now) {
        now *= 0.001;
        const deltaTime = now - then;
        then = now;
        drawScene(gl, programInfo, buffers);
        requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffers(gl) {

  // Create a buffer for the square's positions.

  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.

  const positions = [
     3.0,  3.0,
    -3.0,  3.0,
     3.0, -3.0,
    -3.0, -3.0,
  ];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Now set up the colors for the vertices

  var colors = [
    1.0,  1.0,  1.0,  1.0,    // white
    1.0,  0.0,  0.0,  1.0,    // red
    0.0,  1.0,  0.0,  1.0,    // green
    0.0,  0.0,  1.0,  1.0,    // blue
  ];

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    color: colorBuffer,
  };
}

//
// Draw the scene.
//
function drawScene(gl, programInfo, buffers) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
    // gl.disable(gl.DITHER);
    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix,
                    fieldOfView,
                    aspect,
                    zNear,
                    zFar);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();

    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    mat4.translate(modelViewMatrix,     // destination matrix
                    modelViewMatrix,     // matrix to translate
                    [-0.0, 0.0, -6.0]);  // amount to translate
    
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexColor);
    }

    // Tell WebGL to use our program when drawing

    gl.useProgram(programInfo.program);

    // Set the shader uniforms

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    gl.uniform2f(
        programInfo.uniformLocations.center,
        locX, locY);
    gl.uniform1f(
        programInfo.uniformLocations.scale,
        scale);

    {
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

document.addEventListener("keydown", function(event) {
    var keyCode = event.which;
    if (keyCode == 90) {
        console.log("Zoom out : " + scale);
        scale /= 0.1;
        scale = scale > 1.25 ? 1.25 : scale;
    } else if (keyCode == 88) {
        console.log("Zoom in : " + scale);
        scale /= 2;
        scale = scale < 0.0 ? 0.0 : scale;
    }
}, false);

canvas.addEventListener('mousedown', function (evt) {
    evt.preventDefault();
    mouseDown = true;
    mouseX = evt.clientX;
    mouseY = evt.clientY;
}, false);

canvas.addEventListener('mousemove', function (evt) {            
    if (!mouseDown) {return} // is the button pressed?       

    evt.preventDefault();
    var deltaX = evt.clientX - mouseX,
        deltaY = evt.clientY - mouseY;
    mouseX = evt.clientX;
    mouseY = evt.clientY;
    dragAction(deltaX, deltaY);
}, false);

canvas.addEventListener('mouseup', function (evt) {
    evt.preventDefault();
    mouseDown = false;
}, false);

function dragAction(deltaX, deltaY) {
    locX -= deltaX/(100 * (1.0/scale));
    locY -= deltaY/(100 * (1.0/scale));
    console.log(locX + ", " + locY);
}

var lastKnownScrollPosition = 0;
var ticking = false;

window.addEventListener('scroll', function(e) {
    console.log("scrolling");
    // lastKnownScrollPosition = window.scrollY;
  
    // if (!ticking) {
    //   window.requestAnimationFrame(function() {
    //     doSomething(lastKnownScrollPosition);
    //     ticking = false;
    //   });
  
    //   ticking = true;
    // }
    // console.log(lastKnownScrollPosition);
});