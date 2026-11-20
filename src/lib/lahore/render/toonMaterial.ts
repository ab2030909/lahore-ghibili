import {
	Color,
	DoubleSide,
	FrontSide,
	RepeatWrapping,
	ShaderMaterial,
	UniformsLib,
	UniformsUtils,
	Vector2,
	type Texture
} from 'three';
import { UNLIT_V_THRESHOLD } from './palette';

/**
 * Lahore port of Messenger's `baseMaterial`:
 *  - colour from a palette/atlas texture through the mesh UVs
 *  - toon shadow: HSV shadow tint (hue -0.02, value x0.5), soft cut for the world and a hard
 *    cut for characters, driven by N.L x shadow map like the original `totalShadow`
 *  - painterly noise detail from `noises-terrain.ktx2` (the existing gameplay port's term)
 *  - near-camera line dissolve (`lineFade`) and distance fog
 *  - blinking eyes / talking mouth sprites for characters (IS_CHARACTER)
 *  - surfaceId written to alpha so the outline pass can draw Messenger's ID outlines
 */

const vertexShader = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>

attribute float surfaceId;
#ifdef USE_ATLAS_RECT
	attribute vec4 uvRect;
	varying vec4 vUvRect;
#endif

varying vec2 vUv;
varying vec3 vViewNormal;
varying vec3 vWorldPos;
flat varying float vSurfaceId;

void main() {
	vUv = uv;
	#ifdef USE_ATLAS_RECT
		vUvRect = uvRect;
	#endif
	vSurfaceId = surfaceId;

	#include <beginnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <skinning_vertex>

	vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
	vWorldPos = worldPosition.xyz;
	vViewNormal = normalize(transformedNormal);

	#include <shadowmap_vertex>

	gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = /* glsl */ `
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>

uniform sampler2D tColors;
uniform sampler2D tPalette;
uniform sampler2D tNoiseTerrain;
uniform float uNoiseDetail;
uniform float uTime;
uniform vec3 uFogColor;
uniform vec2 uFogRange;
uniform float uFogAmount;
uniform vec2 uShadowCut;
uniform float uAmbient;
uniform float uFadeIn;

#ifdef IS_CHARACTER
	uniform sampler2D tEye;
	uniform sampler2D tMouth;
	uniform vec3 uSkinColor;
	uniform vec3 uMouthColor;
	uniform float uIsTalking;
	uniform float uSeed;
#endif

#ifdef USE_ATLAS_RECT
	varying vec4 vUvRect;
#endif

varying vec2 vUv;
varying vec3 vViewNormal;
varying vec3 vWorldPos;
flat varying float vSurfaceId;

vec3 rgb2hsv(vec3 c) {
	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
	vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
	vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
	float d = q.x - min(q.w, q.y);
	float e = 1.0e-10;
	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float hash11(float p) {
	p = fract(p * .1031);
	p *= p + 33.33;
	p *= p + p;
	return fract(p);
}

float aastep(float threshold, float value) {
	float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678;
	return smoothstep(threshold - afwidth, threshold + afwidth, value);
}

float lineFade(vec3 p, float size, float amount) {
	float h = size * 0.5;
	return 1.0 - step(amount * 1.01, (abs(mod(p.y, size) - h) / h));
}

float sphereFade(vec3 p, float size, float amount) {
	float h = size * 0.5;
	return clamp(1.0 - step(amount * 1.85, length(mod(p, size) - h) / h), 0.0, 1.0);
}

void main() {
	float camDist = length(vWorldPos - cameraPosition);

	#ifdef LINE_FADE
		float show = lineFade(vWorldPos, 0.015, smoothstep(0.1, 0.5, camDist));
		if (show < 0.001) discard;
	#endif

	if (uFadeIn < 0.999) {
		if (sphereFade(vWorldPos, 0.15, uFadeIn) < 0.001) discard;
	}

	#ifdef USE_ATLAS_RECT
		vec3 baseColor;
		bool unlit = false;
		if (vUvRect.z <= 0.0) {
			// palette-coloured face inside a decorated part
			baseColor = texture2D(tPalette, vUv).rgb;
			unlit = vUv.y > ${UNLIT_V_THRESHOLD.toFixed(5)} && vUv.y < 1.0;
		} else {
			vec2 tiled = fract(vUv * 0.99999 + 0.000005);
			vec2 atlasUv = vUvRect.xy + tiled * vUvRect.zw;
			vec2 grad = vUv * vUvRect.zw;
			vec2 gx = dFdx(grad);
			vec2 gy = dFdy(grad);
			// cap the mip level (~LOD 2.5) so neighbouring atlas regions never bleed into seams
			float maxLen = 5.5 / 2048.0;
			float len = max(length(gx), length(gy));
			if (len > maxLen) {
				gx *= maxLen / len;
				gy *= maxLen / len;
			}
			// keep samples away from the region border by a few texels
			vec2 pad = vec2(3.0 / 2048.0);
			atlasUv = clamp(atlasUv, vUvRect.xy + pad, vUvRect.xy + vUvRect.zw - pad);
			baseColor = textureGrad(tColors, atlasUv, gx, gy).rgb;
		}
	#else
		vec3 baseColor = texture2D(tColors, vUv).rgb;
		bool unlit = vUv.y > ${UNLIT_V_THRESHOLD.toFixed(5)} && vUv.y < 1.0;
	#endif

	#ifdef IS_CHARACTER
		// eyes: three blink sprites, "random" blink from overlapping intervals (original logic)
		if (vUv.y > 1.0) {
			vec2 eyeUv = vUv;
			float eyeTime = uTime * 3.0 + uSeed * 23.73464;
			float line1 = fract(eyeTime * (1.0 / 22.0)) * 22.0 - 22.0 + 1.0;
			float line2 = fract(eyeTime * (1.0 / 34.0)) * 34.0 - 34.0 + 1.0;
			float line3 = fract(eyeTime * (1.0 / 57.0)) * 57.0 - 57.0 + 1.0;
			float eyeProgress = max(0.0, max(max(line1, line2), line3));
			eyeUv.x *= 0.25;
			eyeUv.x += floor(eyeProgress * 3.0) * 0.25;
			float mask = aastep(0.5, texture2D(tEye, eyeUv).r);
			baseColor = uSkinColor * (1.0 - mask);
		}
		// mouth: r = mouth, g = teeth, b = tongue; random sprite while talking
		if (vUv.y < 0.0) {
			vec2 mouthUv = vUv;
			mouthUv.x *= 0.25;
			float offset = 0.0;
			if (uIsTalking > 0.5) offset = floor(hash11(floor(uTime * 8.0) + uSeed * 31.0) * 3.0);
			mouthUv.x += offset * 0.25;
			vec3 mask = texture2D(tMouth, mouthUv).rgb;
			mask = vec3(aastep(0.5, mask.r), aastep(0.5, mask.g), aastep(0.5, mask.b));
			float mouthMask = min(1.0, mask.r + mask.g + mask.b);
			baseColor = vec3(1.0) * mask.g
				+ uMouthColor * mask.r
				+ mix(uMouthColor, uSkinColor, 0.1) * mask.b
				+ uSkinColor * (1.0 - mouthMask);
		}
	#endif

	vec3 color = baseColor;

	if (!unlit) {
		vec3 normal = normalize(vViewNormal);
		if (!gl_FrontFacing) normal = -normal;

		float NdotL = 1.0;
		float shadow = 1.0;
		#if NUM_DIR_LIGHTS > 0
			NdotL = max(dot(normal, directionalLights[0].direction), 0.0);
			#if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
				if (receiveShadow) {
					DirectionalLightShadow sh = directionalLightShadows[0];
					shadow = getShadow(
						directionalShadowMap[0],
						sh.shadowMapSize,
						sh.shadowIntensity,
						sh.shadowBias,
						sh.shadowRadius,
						vDirectionalShadowCoord[0]
					);
				}
			#endif
		#endif

		float totalShadow = NdotL * shadow;
		float shadowCut = smoothstep(uShadowCut.x, uShadowCut.y, totalShadow);

		vec3 hsv = rgb2hsv(baseColor);
		hsv.x -= 0.02;
		hsv.z *= 0.5;
		vec3 colorShadow = hsv2rgb(hsv);
		color = mix(colorShadow, baseColor, shadowCut);

		float detail = texture2D(tNoiseTerrain, (vWorldPos.xz + vWorldPos.y * vec2(0.37, -0.21)) * 0.12).r;
		color *= 1.0 - uNoiseDetail + detail * uNoiseDetail;
		color += baseColor * uAmbient;

		float fog = smoothstep(uFogRange.x, uFogRange.y, camDist) * uFogAmount;
		color = mix(color, uFogColor, fog);
	}

	gl_FragColor = vec4(color, vSurfaceId);
}
`;

export type ToonMaterialOptions = {
	colors: Texture;
	/** Palette used by zero-uvRect faces of atlas materials. */
	palette?: Texture;
	noise: Texture;
	atlasRect?: boolean;
	character?: boolean;
	lineFade?: boolean;
	doubleSide?: boolean;
	eye?: Texture | null;
	mouth?: Texture | null;
	skinColor?: string;
	seed?: number;
	name?: string;
};

export function createToonMaterial(options: ToonMaterialOptions): ShaderMaterial {
	options.noise.wrapS = RepeatWrapping;
	options.noise.wrapT = RepeatWrapping;

	const uniforms = UniformsUtils.merge([
		UniformsLib.lights,
		{
			tColors: { value: null },
			tPalette: { value: null },
			tNoiseTerrain: { value: null },
			uNoiseDetail: { value: options.character ? 0.0 : 0.08 },
			uTime: { value: 0 },
			uFogColor: { value: new Color('#e9e3d2') },
			uFogRange: { value: null },
			uFogAmount: { value: 0.0 },
			uShadowCut: { value: null },
			uAmbient: { value: 0.0 },
			uFadeIn: { value: 1 },
			tEye: { value: null },
			tMouth: { value: null },
			uSkinColor: { value: new Color(options.skinColor ?? '#c99a7d') },
			uMouthColor: { value: new Color('#2f1013') },
			uIsTalking: { value: 0 },
			uSeed: { value: options.seed ?? Math.random() }
		}
	]);
	uniforms.tColors.value = options.colors;
	uniforms.tPalette.value = options.palette ?? options.colors;
	uniforms.tNoiseTerrain.value = options.noise;
	uniforms.tEye.value = options.eye ?? null;
	uniforms.tMouth.value = options.mouth ?? null;
	uniforms.uFogRange.value = new Vector2(40, 140);
	uniforms.uShadowCut.value = options.character ? new Vector2(0.1, 0.15) : new Vector2(0.2, 0.4);

	const defines: Record<string, string> = {};
	if (options.atlasRect) defines.USE_ATLAS_RECT = '';
	if (options.character) defines.IS_CHARACTER = '';
	if (options.lineFade) defines.LINE_FADE = '';

	const material = new ShaderMaterial({
		name: options.name ?? 'LahoreToon',
		lights: true,
		uniforms,
		defines,
		vertexShader,
		fragmentShader,
		side: options.doubleSide === false ? FrontSide : DoubleSide
	});
	return material;
}
