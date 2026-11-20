import {
	Color,
	DepthTexture,
	HalfFloatType,
	Matrix4,
	NearestFilter,
	RepeatWrapping,
	ShaderMaterial,
	UnsignedIntType,
	Vector2,
	Vector3,
	WebGLRenderTarget,
	type Data3DTexture,
	type PerspectiveCamera,
	type Scene,
	type Texture,
	type WebGLRenderer
} from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { POST } from '../core/config';

/**
 * Lahore frame pipeline: scene -> HDR target (colour + surfaceId in alpha + depth texture)
 * -> one fullscreen pass that paints the sky, draws Messenger-style outlines (depth
 * discontinuities and surfaceId changes, on the nearer side) and applies the original 32^3
 * `lut.ktx2` grade with the original tetrahedral interpolation.
 */

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;
precision highp sampler3D;

uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform sampler3D tLUT;
uniform sampler2D tClouds;
uniform vec2 uResolution;
uniform float uCameraNear;
uniform float uCameraFar;
uniform vec3 uOutlineColor;
uniform float uOutlineStrength;
uniform float uOutlineThickness;
uniform vec2 uOutlineFade;
uniform float uLUTIntensity;
uniform mat4 uProjInv;
uniform mat4 uViewInv;
uniform vec3 uSkyUp;
uniform vec3 uSunDir;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyBelow;
uniform vec3 uSeaColor;
uniform vec3 uSeaLight;
uniform float uIntroMix;
uniform float uTime;
uniform float uFade;

varying vec2 vUv;

float linearDepth(float depth) {
	float z = depth * 2.0 - 1.0;
	return (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear));
}

vec3 LUTLinearTosRGB(in vec3 value) {
	return mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308))));
}

vec3 sRGBToLinearSimple(vec3 c) {
	return mix(pow(c * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), c * 0.0773993808, vec3(lessThanEqual(c, vec3(0.04045))));
}

// Port of the original apply3DLUTTetrahedral; returns sRGB for display.
vec3 apply3DLUTTetrahedral(vec3 color, float lutIntensity) {
	float lutSize = float(textureSize(tLUT, 0).x);
	float scale = lutSize - 1.0;
	float texelSize = 1.0 / lutSize;
	vec3 col = LUTLinearTosRGB(color);
	vec3 rgb = clamp(col, 0.0, 1.0) * scale;
	vec3 p = floor(rgb);
	vec3 f = rgb - p;
	vec3 v1 = (p + 0.5) * texelSize;
	vec3 v4 = (p + 1.5) * texelSize;
	vec3 v2, v3;
	vec3 frac;
	if (f.r >= f.g) {
		if (f.g > f.b) {
			frac = f.rgb; v2 = vec3(v4.x, v1.y, v1.z); v3 = vec3(v4.x, v4.y, v1.z);
		} else if (f.r >= f.b) {
			frac = f.rbg; v2 = vec3(v4.x, v1.y, v1.z); v3 = vec3(v4.x, v1.y, v4.z);
		} else {
			frac = f.brg; v2 = vec3(v1.x, v1.y, v4.z); v3 = vec3(v4.x, v1.y, v4.z);
		}
	} else {
		if (f.b > f.g) {
			frac = f.bgr; v2 = vec3(v1.x, v1.y, v4.z); v3 = vec3(v1.x, v4.y, v4.z);
		} else if (f.r >= f.b) {
			frac = f.grb; v2 = vec3(v1.x, v4.y, v1.z); v3 = vec3(v4.x, v4.y, v1.z);
		} else {
			frac = f.gbr; v2 = vec3(v1.x, v4.y, v1.z); v3 = vec3(v1.x, v4.y, v4.z);
		}
	}
	vec4 n1 = texture(tLUT, v1);
	vec4 n2 = texture(tLUT, v2);
	vec4 n3 = texture(tLUT, v3);
	vec4 n4 = texture(tLUT, v4);
	vec4 weights = vec4(1.0 - frac.x, frac.x - frac.y, frac.y - frac.z, frac.z);
	vec4 result = weights * mat4(
		vec4(n1.r, n2.r, n3.r, n4.r),
		vec4(n1.g, n2.g, n3.g, n4.g),
		vec4(n1.b, n2.b, n3.b, n4.b),
		vec4(1.0)
	);
	return mix(col, result.rgb, lutIntensity);
}

vec3 viewRay(vec2 uv) {
	vec4 clip = vec4(uv * 2.0 - 1.0, 1.0, 1.0);
	vec4 view = uProjInv * clip;
	view /= view.w;
	return normalize((uViewInv * vec4(view.xyz, 0.0)).xyz);
}

vec3 gameplaySky(vec3 dir) {
	float h = dot(dir, uSkyUp);
	vec3 col = mix(uSkyHorizon, uSkyTop, smoothstep(-0.02, 0.55, h));
	col = mix(uSkyBelow, col, smoothstep(-0.35, 0.0, h));
	// soft drifting cloud bands
	vec3 side = normalize(cross(uSkyUp, vec3(0.31, 0.83, 0.47)));
	vec3 fwd = cross(side, uSkyUp);
	vec2 cuv = vec2(dot(dir, side), dot(dir, fwd)) / max(0.25, h + 0.35);
	float c = texture2D(tClouds, cuv * 0.35 + vec2(uTime * 0.004, uTime * 0.002)).r;
	float clouds = smoothstep(0.55, 0.75, c) * smoothstep(-0.02, 0.25, h);
	col = mix(col, vec3(1.0, 0.99, 0.97), clouds * 0.55);
	float sun = max(dot(dir, uSunDir), 0.0);
	col += vec3(1.0, 0.86, 0.62) * (pow(sun, 18.0) * 0.18 + pow(sun, 300.0) * 0.6);
	return col;
}

vec3 introSea(vec2 uv) {
	float aspect = uResolution.x / uResolution.y;
	vec2 p = vec2(uv.x * aspect, uv.y);
	float n1 = texture2D(tClouds, p * 0.55 + vec2(uTime * 0.006, uTime * 0.003)).r;
	float n2 = texture2D(tClouds, p * 0.9 - vec2(uTime * 0.004, -uTime * 0.005)).g;
	float patches = smoothstep(0.58, 0.62, n1 * 0.7 + n2 * 0.45);
	vec3 col = mix(uSeaColor, uSeaLight, patches * 0.55);
	// tiny drifting particles, like the original intro
	vec2 grid = p * 42.0 + vec2(uTime * 0.05, uTime * 0.02);
	vec2 cell = floor(grid);
	vec2 fr = fract(grid) - 0.5;
	float rnd = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
	float dotMask = step(0.965, rnd) * smoothstep(0.12, 0.05, length(fr));
	col = mix(col, uSeaLight * 1.15, dotMask * 0.8);
	return col;
}

void main() {
	vec4 scene = texture2D(tDiffuse, vUv);
	float rawDepth = texture2D(tDepth, vUv).x;
	bool isSky = rawDepth >= 0.999999;
	vec3 color = scene.rgb;

	if (isSky) {
		vec3 dir = viewRay(vUv);
		vec3 sky = gameplaySky(dir);
		vec3 sea = introSea(vUv);
		color = mix(sky, sea, uIntroMix);
	}

	// --- outlines ---
	vec2 px = uOutlineThickness / uResolution;
	float d0 = linearDepth(rawDepth);
	float id0 = isSky ? -1.0 : scene.a;
	vec2 offs[4];
	offs[0] = vec2(px.x, 0.0);
	offs[1] = vec2(-px.x, 0.0);
	offs[2] = vec2(0.0, px.y);
	offs[3] = vec2(0.0, -px.y);
	float dn[4];
	float idEdge = 0.0;
	float farthest = 0.0;
	for (int i = 0; i < 4; i++) {
		vec2 uv2 = vUv + offs[i];
		float rd = texture2D(tDepth, uv2).x;
		float d = linearDepth(rd);
		dn[i] = d;
		farthest = max(farthest, d - d0);
		float idn = rd >= 0.999999 ? -1.0 : texture2D(tDiffuse, uv2).a;
		float tol = d0 * 0.004 + 0.002;
		float nearer = (d0 < d - tol || (abs(d0 - d) <= tol && id0 > idn)) ? 1.0 : 0.0;
		idEdge = max(idEdge, step(0.0015, abs(id0 - idn)) * nearer);
	}
	float inv0 = 1.0 / d0;
	float lapX = abs(1.0 / dn[0] + 1.0 / dn[1] - 2.0 * inv0);
	float lapY = abs(1.0 / dn[2] + 1.0 / dn[3] - 2.0 * inv0);
	float lap = max(lapX, lapY) / inv0;
	float depthEdge = smoothstep(0.02, 0.06, lap) * step(d0 * 0.012, farthest);
	float edge = isSky ? 0.0 : max(depthEdge, idEdge);
	edge *= 1.0 - smoothstep(uOutlineFade.x, uOutlineFade.y, d0);
	color = mix(color, uOutlineColor, edge * uOutlineStrength);

	vec3 graded = apply3DLUTTetrahedral(max(color, vec3(0.0)), uLUTIntensity);
	graded = mix(graded, vec3(1.0), uFade);
	gl_FragColor = vec4(graded, 1.0);
}
`;

const linear = (hex: string) => new Color(hex);

export type LahoreComposer = {
	target: WebGLRenderTarget;
	material: ShaderMaterial;
	setSize: (width: number, height: number) => void;
	render: (scene: Scene, camera: PerspectiveCamera) => void;
	setSkyUp: (up: Vector3) => void;
	setSunDir: (dir: Vector3) => void;
	dispose: () => void;
};

export function createLahoreComposer(
	renderer: WebGLRenderer,
	lut: Data3DTexture | Texture,
	clouds: Texture
): LahoreComposer {
	const size = renderer.getDrawingBufferSize(new Vector2());
	const depthTexture = new DepthTexture(size.x, size.y);
	depthTexture.type = UnsignedIntType;
	const target = new WebGLRenderTarget(size.x, size.y, {
		type: HalfFloatType,
		depthBuffer: true,
		depthTexture,
		samples: 4
	});
	target.texture.name = 'LahoreSceneColor';

	lut.magFilter = NearestFilter;
	lut.minFilter = NearestFilter;
	lut.needsUpdate = true;
	clouds.wrapS = RepeatWrapping;
	clouds.wrapT = RepeatWrapping;

	const material = new ShaderMaterial({
		name: 'LahorePost',
		depthTest: false,
		depthWrite: false,
		uniforms: {
			tDiffuse: { value: target.texture },
			tDepth: { value: depthTexture },
			tLUT: { value: lut },
			tClouds: { value: clouds },
			uResolution: { value: new Vector2(size.x, size.y) },
			uCameraNear: { value: 0.1 },
			uCameraFar: { value: 600 },
			uOutlineColor: { value: linear(POST.outlineColor) },
			uOutlineStrength: { value: 1 },
			uOutlineThickness: { value: 1 },
			uOutlineFade: { value: new Vector2(POST.outlineFade[0], POST.outlineFade[1]) },
			uLUTIntensity: { value: POST.lutIntensity },
			uProjInv: { value: new Matrix4() },
			uViewInv: { value: new Matrix4() },
			uSkyUp: { value: new Vector3(0, 1, 0) },
			uSunDir: { value: new Vector3(0.3, 0.8, 0.5).normalize() },
			uSkyTop: { value: linear('#8fc9df') },
			uSkyHorizon: { value: linear('#f1e6cf') },
			uSkyBelow: { value: linear('#d9cdb2') },
			uSeaColor: { value: linear('#5fbfb9') },
			uSeaLight: { value: linear('#7fd3cb') },
			uIntroMix: { value: 1 },
			uTime: { value: 0 },
			uFade: { value: 0 }
		},
		vertexShader,
		fragmentShader
	});

	const quad = new FullScreenQuad(material);

	const setSize = (width: number, height: number) => {
		const pr = renderer.getPixelRatio();
		const w = Math.max(1, Math.floor(width * pr));
		const h = Math.max(1, Math.floor(height * pr));
		target.setSize(w, h);
		material.uniforms.uResolution.value.set(w, h);
		material.uniforms.uOutlineThickness.value = Math.min(2.4, Math.max(1, h / 900));
	};

	const render = (scene: Scene, camera: PerspectiveCamera) => {
		material.uniforms.uCameraNear.value = camera.near;
		material.uniforms.uCameraFar.value = camera.far;
		material.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
		material.uniforms.uViewInv.value.copy(camera.matrixWorld);
		renderer.setRenderTarget(target);
		renderer.clear(true, true, false);
		renderer.render(scene, camera);
		renderer.setRenderTarget(null);
		quad.render(renderer);
	};

	return {
		target,
		material,
		setSize,
		render,
		setSkyUp: (up) => material.uniforms.uSkyUp.value.copy(up),
		setSunDir: (dir) => material.uniforms.uSunDir.value.copy(dir).normalize(),
		dispose: () => {
			target.dispose();
			depthTexture.dispose();
			material.dispose();
			quad.dispose();
		}
	};
}
