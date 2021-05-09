/**
 * entry.js
 * 
 * This is the first file loaded. It sets up the Renderer, 
 * Scene and Camera. It also starts the render loop and 
 * handles window resizes.
 * 
 */

import { WebGLRenderer, PerspectiveCamera, Scene, Vector3 } from 'three';
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FlyControls } from "three/examples/jsm/controls/FlyControls";
import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls";
import SeedScene from './objects/Scene.js';

const vertexShader = `
    precision highp float;
    uniform float time;
    uniform vec2 resolution;
    void main()	{
        gl_Position = vec4( position, 1.0 );
    }
`;

const fragShader = `
    precision highp float;

    uniform float time;
    uniform vec2 resolution;

    uniform vec3 camera;
    uniform vec3 look_dir;

    // Constants
    #define PI 3.1415925359
    #define TWO_PI 6.2831852
    #define MAX_STEPS 500
    #define MAX_DIST 100.
    #define SURFACE_DIST .01

    float Power;

    // SDF Composition
    // ---------------

    float SDF_union(float dist_a, float dist_b) {
      return min(dist_a, dist_b);
    }

    float SDF_intersect(float dist_a, float dist_b) {
      return max(dist_a, dist_b);
    }

    float SDF_difference(float dist_a, float dist_b) {
      return max(dist_a, -1.0 * dist_b);
    }

    float GetDist(vec3 p)
    {
        vec4 s = vec4(0,1,6,1); //Sphere. xyz is position w is radius
        float sphereDist = length(p-s.xyz) - s.w;
        float planeDist = p.y;
        float d = min(sphereDist,planeDist);
    
        return d;
    }

    float DE_infinite_sphere(vec3 pos) {
        // translate
        // pos = pos + 1. * vec3(0,-0.5*time,time);
    
        float d1 = distance(mod(pos, 2.), vec3(1,1,1))-.54321;
        
        return d1;
    }
  
    vec3 getCameraRayDir(vec2 uv, vec3 camPos, vec3 camTarget)
    {
        // Calculate camera's "orthonormal basis", i.e. its transform matrix components
        vec3 camForward = normalize(camTarget - camPos);
        vec3 camRight = normalize(cross(vec3(0.0, 1.0, 0.0), camForward));
        vec3 camUp = normalize(cross(camForward, camRight));
        
        float fPersp = 2.0;
        vec3 vDir = normalize(uv.x * camRight + uv.y * camUp + camForward * fPersp);
    
        return vDir;
    }
    
    vec2 normalizeScreenCoords(vec2 screenCoord)
    {
        vec2 result = 2.0 * (screenCoord/resolution.xy - 0.5);
        result.x *= resolution.x/resolution.y; // Correct for aspect ratio
        return result;
    }

    float RayMarch(vec3 ro, vec3 rd) 
    {
        float dO = 0.; //Distane Origin
        for(int i=0;i<MAX_STEPS;i++)
        {
            vec3 p = ro + rd * dO;
            float ds = DE_infinite_sphere(p); // ds is Distance Scene
            dO += ds;
            if(dO > MAX_DIST || ds < SURFACE_DIST) break;
        }
        return dO;
    }

    float sdSphere(vec3 p, float r)
    {
        return length(p) - r;
    }
    
    float vmax(vec3 v) {
      return max(max(v.x, v.y), v.z);
    }

    float SDF_box(vec3 pos, vec3 s) {
      // s is length of cuboid in each direction
      return vmax(abs(pos) - s);
    }

    float SDF_cross(vec3 pos) {
        /* double inf = 1000000.0; */
        float inf = 3.0;
        float box1 = SDF_box(pos, vec3(inf, 1.0, 1.0));
        float box2 = SDF_box(pos, vec3(1.0, inf, 1.0));
        float box3 = SDF_box(pos, vec3(1.0, 1.0, inf));
        return SDF_union(box1, SDF_union(box2, box3));
    }

    float SDF_menger(vec3 pos, int iters) {
        // Per https://aka-san.halcy.de/distance_fields_prefinal.pdf
        // https://iquilezles.org/www/articles/menger/menger.htm
      
        float d = SDF_box(pos, vec3(1.0));
        float s = 1.0;
      
        for (int i = 0; i < iters; i++) {
          vec3 a = mod(pos * s, 2.0) - 1.0;
          vec3 r = vec3(1.0) - 3.0 * abs(a);
          s *= 3.0;
          float c = SDF_cross(r) / s;
          d = max(d, c);
        }
        return d;
    }

    float DE_mandelbulb(vec3 pos) 
    {
        vec3 z = pos;
        float dr = 1.0;
        float r = 0.0;
        for (int i = 0; i < 25; i++) {
          r = length(z);
          if (r > 1.5) break;
          
          // convert to polar coordinates
          float theta = acos(z.z/r);
          float phi = atan(z.y,z.x);
          dr =  pow( r, Power-1.0)*Power*dr + 1.0;
          
          // scale and rotate the point
          float zr = pow( r,Power);
          theta = theta*Power;
          phi = phi*Power;
          
          // convert back to cartesian coordinates
          z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
          z+=pos;
        }
        return 0.5*log(r)*r/dr;
    }

    float sdf(vec3 pos)
    {
        // float t = sdSphere(pos-vec3(0.0, 0.0, 10.0), 3.0);
        // float t = distance(mod(pos, 2.), vec3(1,1,1))-.54321;
        // float t = DE_mandelbulb(pos);
        float t = SDF_difference(
          SDF_menger(pos, 4), 
          DE_mandelbulb(pos)
        );
        return t;
    }

    float castRay(vec3 rayOrigin, vec3 rayDir)
    {
        float t = 0.0; // Stores current distance along ray
        
        for (int i = 0; i < MAX_STEPS; i++)
        {
            float res = sdf(rayOrigin + rayDir * t);
            if (res < (0.0001*t))
            {
                return t;
            }
            t += res;
        }
        
        return -1.0;
    }

    vec3 calcNormal(vec3 pos)
    {
        // Center sample
        float c = sdf(pos);
        // Use offset samples to compute gradient / normal
        vec2 eps_zero = vec2(0.001, 0.0);
        return normalize(vec3( sdf(pos + eps_zero.xyy), sdf(pos + eps_zero.yxy), sdf(pos + eps_zero.yyx) ) - c);
    }

    vec3 render(vec3 rayOrigin, vec3 rayDir)
    {
        vec3 col;
        float t = castRay(rayOrigin, rayDir);
    
        if (t == -1.0)
        {
            // Skybox colour
            col = vec3(0.30, 0.36, 0.60) - (rayDir.y * 0.7);
        }
        else
        {
            vec3 objectSurfaceColour = vec3(0.4, 0.8, 0.1);
            vec3 ambient = vec3(0.02, 0.021, 0.02);
            col = ambient * objectSurfaceColour;

            col = calcNormal(rayOrigin + rayDir * t) * vec3(0.5) + vec3(0.5);
            
            // float NoL = max(dot(N, L), 0.0);
            // vec3 LDirectional = vec3(0.9, 0.9, 0.8) * NoL;
            // vec3 LAmbient = vec3(0.03, 0.04, 0.1);
            // vec3 diffuse = col * (LDirectional + LAmbient);
        }
        
        return col;
    }

    void main()
    {
        // vec3 camPos = vec3(0, 0, -5);
        // vec3 camTar = vec3(0, 0, 0);
        vec3 camPos = camera;
        vec3 camTar = camera + look_dir;
        
        Power = 3.0 + 5.0 * abs(sin(time/4.0));

        vec2 uv = normalizeScreenCoords(gl_FragCoord.xy);
        vec3 rayDir = getCameraRayDir(uv, camPos, camTar);   
        rayDir.x *= -1.;
        vec3 col = render(camPos, rayDir);
    
        gl_FragColor = vec4(col, 1); // Output to screen
        // vec2 uv = (gl_FragCoord.xy-.5*resolution.xy)/resolution.y;
        // vec3 ro = vec3(0.+time,1. + time,0.); // Ray Origin/ Camera
        // vec3 rd = normalize(vec3(uv.x,uv.y,1));
        // rd.y *= -1.;
        // rd = normalize(vec3(look_dir.x, look_dir.y, -1.0));
        // rd = getCameraRayDir(uv, camera, look_dir);
        // float d = RayMarch(camPos,camTar); // Distance
        // d/= 10.;
        // vec3 color = vec3(d);
        
        // Set the output color
        // gl_FragColor = vec4(color,1.0);
    }
`;

var clock = new THREE.Clock();
const scene = new Scene();
const camera = new PerspectiveCamera();
const renderer = new WebGLRenderer({antialias: true});
const seedScene = new SeedScene();
// const controls = new OrbitControls( camera, renderer.domElement );
// const firstPersonControls = new FirstPersonControls(camera, renderer.domElement);
const flyControls = new FlyControls(camera, renderer.domElement);

// controls.enableDamping = true;
// scene
// scene.add(seedScene);

// camera
// camera.position.set(6,3,-10);
camera.position.set(0,0,-5);
console.log(camera.position);
camera.lookAt(new Vector3(0,0,0));
flyControls.movementSpeed = 5;
flyControls.rollSpeed = Math.PI / 12;
// flyControls.autoForward = true;
flyControls.dragToLook = true;
// flyControls.update();
console.log(camera.position);
// controls.update();

// renderer
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x7ec0ee, 1);

// render loop
const onAnimationFrameHandler = (timeStamp) => {
  renderer.render(scene, camera);
  seedScene.update && seedScene.update(timeStamp);
  window.requestAnimationFrame(onAnimationFrameHandler);
}
window.requestAnimationFrame(onAnimationFrameHandler);

// resize
const windowResizeHanlder = () => { 
  const { innerHeight, innerWidth } = window;
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
};
windowResizeHanlder();
window.addEventListener('resize', windowResizeHanlder);

// dom
document.body.style.margin = 0;
document.body.appendChild( renderer.domElement );

// SHADER
var uniforms = {
  time: { type: "f", value: 1.0 },
  resolution: { type: "v2", value: new THREE.Vector2(innerWidth, innerHeight) },
  camera: {type: "v3", value: camera.position},
  look_dir: {type: "v3", value: new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)}
};

var material = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: vertexShader,
  fragmentShader: fragShader
});

var mesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), material);
scene.add(mesh);
var startTime = Date.now();
render();
// animate();
// function animate() {

// 	requestAnimationFrame( animate );

// 	// required if controls.enableDamping or controls.autoRotate are set to true
// 	controls.update();

// 	// renderer.render( scene, camera );
//   render();
// }
function setCamControls() {

}

function render() {
  // console.log(camera.position);
  // console.log(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
  var elapsedMilliseconds = Date.now() - startTime;
  var elapsedSeconds = elapsedMilliseconds / 1000.;

  var delta = clock.getDelta();
  flyControls.update(delta);
  renderer.clear();
  requestAnimationFrame(render);
  
  uniforms.time.value = clock.getElapsedTime();
  uniforms.look_dir.value = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  renderer.render(scene, camera);
}