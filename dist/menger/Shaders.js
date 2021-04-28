export let defaultVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec3 vertColor;
    attribute vec4 aNorm;
    
    varying vec4 lightDir;
    varying vec4 normal;  
    varying vec3 worldPosition; 
 
    uniform vec4 lightPosition;
    uniform mat4 mWorld;
    uniform mat4 mView;
	uniform mat4 mProj;

    void main () {
		//  Convert vertex to camera coordinates and the NDC
        gl_Position = mProj * mView * mWorld * vec4 (vertPosition, 1.0);
        
        //  Compute light direction (world coordinates)
        lightDir = lightPosition - vec4(vertPosition, 1.0);
		
        //  Pass along the vertex normal (world coordinates)
        normal = aNorm;
        worldPosition = vertPosition;
    }
`;
// TODO: Write the fragment shader
export let defaultFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec4 normal;    
	
    
    void main () {
        float diffuse = max(dot(normalize(normal), normalize(lightDir)), 0.0);
        vec3 color = vec3(0.0, 0.0, 0.0);
        if (normal[0] > .5 || normal[0] < -.5) {
            color = vec3(1.0, 0.0, 0.0);
        } else if (normal[1] > .5 || normal[1] < -.5) {
            color = vec3(0.0, 1.0, 0.0);
        } else {
            color = vec3(0.0, 0.0, 1.0);
        }

        gl_FragColor = vec4(diffuse * color, 1.0);
    }
`;
// TODO: floor shaders
export let floorVSText = ``;
export let floorFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec4 normal;    
    varying vec3 worldPosition;

    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    void main () {
        float diffuse = max(dot(normalize(normal), normalize(lightDir)), 0.0);
        vec3 color = vec3(1.0, 1.0, 1.0);

        if(mod(floor(worldPosition.x), 2.0) == mod(floor(worldPosition.z), 2.0)) {
            color = vec3(0.0, 0.0, 0.0);
        }

        //gl_FragColor = vec4(diffuse * color, 1.0);
        gl_FragColor = vec4(worldPosition, 1.0);
    }
`;
//# sourceMappingURL=Shaders.js.map