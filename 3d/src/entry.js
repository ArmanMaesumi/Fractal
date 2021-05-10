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
    #define MAX_DIST 1.
    #define SURFACE_DIST .001

    #define AA_QUALITY 2

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
        for (int i = 0; i < 10; i++) {
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
    
    float length6( vec3 p )
    {
      p = p*p*p; p = p*p;
      return pow( p.x + p.y + p.z, 1.0/6.0 );
    }

    void pR(inout vec2 p, float a) {
      p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
    }

    float DE_tree(vec3 p)
    {
        const int iterations = 20;
      
        float d = time*5. - p.z;
        p=p.yxz;
        pR(p.yz, 1.570795);
        p.x += 6.5;

        p.yz = mod(abs(p.yz)-.0, 20.) - 10.;
        float scale = 1.25;
        
        p.xy /= (1.+d*d*0.0005);
        
        float l = 0.;
      
        for (int i=0; i<iterations; i++) {
          p.xy = abs(p.xy);
          p = p*scale + vec3(-3. + d*0.0095,-1.5,-.5);
              
          pR(p.xy,0.35-d*0.015);
          pR(p.yz,0.5+d*0.02);
          
          l =length6(p);
        }
        return l*pow(scale, -float(iterations))-.15;
    }
    
    #define SCALE 2.8
    #define MINRAD2 .25
    float minRad2 = clamp(MINRAD2, 1.0e-9, 1.0);
    #define scale (vec4(SCALE, SCALE, SCALE, abs(SCALE)) / minRad2)
    float absScalem1 = abs(SCALE - 1.0);
    float AbsScaleRaisedTo1mIters = pow(abs(SCALE), float(1-10));

    float DE_mandelbox(vec3 pos) 
    {
      vec4 p = vec4(pos,1);
      vec4 p0 = p;  // p.w is the distance estimate

      for (int i = 0; i < 9; i++)
      {
        p.xyz = clamp(p.xyz, -1.0, 1.0) * 2.0 - p.xyz;

        float r2 = dot(p.xyz, p.xyz);
        p *= clamp(max(minRad2/r2, minRad2), 0.0, 1.0);

        // scale, translate
        p = p*scale + p0;
      }
      return ((length(p.xyz) - absScalem1) / p.w - AbsScaleRaisedTo1mIters);
    }

    float DE_sphereWorld( vec3 p, float s )
    {
      float S = 1.0;

      vec4 orb = vec4(1000.0); 
      
      for( int i=0; i<8;i++ )
      {
        p = -1.0 + 2.0*fract(0.5*p+0.5);

        float r2 = dot(p,p);
        
        orb = min( orb, vec4(abs(p),r2) );
        
        float k = s/r2;
        p     *= k;
        S *= k;
      }
      
      return 0.25*abs(p.y)/S;
    }

    float DE_pyramid(vec3 pt) {
        float r;
        float offset = 1.;
        float S = 2.;
        pt.y -= 2.5;
        int n = 0;
        while(n < 15) {
            if(pt.x + pt.y < 0.) pt.xy = -pt.yx;
            if(pt.x + pt.z < 0.) pt.xz = -pt.zx;
            if(pt.y + pt.z < 0.) pt.zy = -pt.yz;
            pt = pt * S - offset*(S - 1.0);
            n++;
        }
        
        return (length(pt) * pow(S, -float(n)));
    }

    float sdf(vec3 pos)
    {   
        float t = 0.;
        // float t = sdSphere(pos-vec3(0.0, 0.0, 10.0), 3.0);
        //float t = distance(mod(pos, 2.), vec3(1,1,1))-.25;
        // float t = DE_mandelbox(pos);
        // float t = DE_pyramid(pos);
        // float t = DE_sphereWorld(pos, 1.);
        // float t = SDF_menger(pos,5);
        //float t = DE_mandelbulb(pos);
        // float t = DE_tree(pos);
        // float t = SDF_difference(
        //     SDF_menger(pos, 4),
        //     DE_mandelbulb(pos)
        //   );
        // t = SDF_intersect(t, SDF_menger(pos, 4));
        // float t = SDF_intersect(SDF_menger(pos, 4), distance(mod(pos, 2.), vec3(1,1,1))-.9 * sin(time/5.));
        // float t = SDF_difference(
        //   SDF_menger(pos, 4), 
        //   DE_mandelbulb(pos)
        // );
        return t;
    }

    float castRay(vec3 rayOrigin, vec3 rayDir)
    {
        float t = 0.0; // Stores current distance along ray
        
        for (int i = 0; i < MAX_STEPS; i++)
        {
            float res = sdf(rayOrigin + rayDir * t);
            if (res < (SURFACE_DIST*t))
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
        vec3 L = normalize(vec3(sin(time)*0.5, cos(time*0.5)+0.5, -0.5));
        if (t == -1.0)
        {
            // Skybox colour
            col = vec3(0.30, 0.36, 0.60) - (rayDir.y * 0.7);
        }
        else
        {
            vec3 pos = rayOrigin + rayDir * t;
            vec3 N = calcNormal(pos);
    
            vec3 objectSurfaceColour = vec3(0.4, 0.8, 0.1);
            // L is vector from surface point to light, N is surface normal. N and L must be normalized!
            float NoL = max(dot(N, L), 0.0);
            vec3 LDirectional = vec3(1.80,1.27,0.99) * NoL;
            vec3 LAmbient = vec3(0.03, 0.04, 0.1);
            vec3 diffuse = objectSurfaceColour * (LDirectional + LAmbient);
        
            col = diffuse;
            
            
            float shadow = 0.0;
            vec3 shadowRayOrigin = pos + N * 0.01;
            vec3 shadowRayDir = L;
            float t = castRay(shadowRayOrigin, shadowRayDir);
            if (t >= -1.0)
            {
                shadow = 1.0;
            }
            col = mix(col, col*0.8, shadow);
        }
        
        return col;
    }

    vec3 CameraPath( float t )
    {
      vec3 p = vec3(-.78 + 3. * sin(2.14*t),.05+2.5 * sin(.942*t+1.3),.05 + 3.5 * cos(3.594*t) );
      return p;
    } 

    vec4 getSceneColor(vec2 fragCoord)
    { 
        vec3 camPos = camera;
        vec3 at = camera + look_dir;

        // TREE:
        // vec3 camPos = vec3(3., -1.5, time*5.);
        // vec3 at = camPos+vec3(-1.25,0.1, 1.);

        // mandelbox:
        // camPos = CameraPath(time / 100.);
        // at = CameraPath(time/100. + 0.01);

        vec2 uv = normalizeScreenCoords(fragCoord);
        vec3 rayDir = getCameraRayDir(uv, camPos, at);
        
        vec3 col = render(camPos, rayDir);
        
        return vec4(col, 1.0);
    }

    void main()
    {
      gl_FragColor = vec4(0.0);
      Power = 5.0 + 8.0 * abs(sin(time/4.0));
      // Power = 8.0;
      #if AA_QUALITY > 1
          float AA_size = float(AA_QUALITY);
          float count = 0.0;
          for (float aaY = 0.0; aaY < AA_size; aaY++)
          {
              for (float aaX = 0.0; aaX < AA_size; aaX++)
              {
                gl_FragColor += getSceneColor(gl_FragCoord.xy + vec2(aaX, aaY) / AA_size);
                  count += 1.0;
              }
          }
          gl_FragColor /= count;
      #else
        gl_FragColor = getSceneColor(gl_FragCoord.xy);
      #endif          
        gl_FragColor = pow(gl_FragColor, vec4(0.4545)); // Gamma correction (1.0 / 2.2)


        // vec3 camPos = vec3(0, 0, -5);
        // vec3 camTar = vec3(0, 0, 0);
        // vec3 camPos = camera;
        // vec3 camTar = camera + look_dir;
        
        // Power = 3.0 + 5.0 * abs(sin(time/4.0));

        // vec2 uv = normalizeScreenCoords(gl_FragCoord.xy);
        // vec3 rayDir = getCameraRayDir(uv, camPos, camTar);   
        // rayDir.x *= -1.;
        // vec3 col = render(camPos, rayDir);
        // col = pow(col, vec3(0.4545));
        // gl_FragColor = vec4(col, 1.); // Output to screen
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