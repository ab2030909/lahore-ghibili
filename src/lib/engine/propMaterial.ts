import { Color, DoubleSide, ShaderMaterial, type Texture } from 'three';

/**
 * Thin translucent material for props such as overhead cables and string lights, with an
 * optional noise ripple along the normal so the wires drift a little in the wind.
 */
export function createPropMaterial(color: string, noise?: Texture): ShaderMaterial {
	return new ShaderMaterial({
		transparent: true,
		side: DoubleSide,
		depthWrite: true,
		uniforms: {
			uColor: { value: new Color(color) },
			tNoise: { value: noise ?? null },
			uTime: { value: 0 },
			uUseNoise: { value: noise ? 1 : 0 }
		},
		vertexShader: /* glsl */ `
			varying vec3 vWorldPosition;
			uniform float uTime;
			uniform float uUseNoise;
			uniform sampler2D tNoise;
			void main() {
				vec3 pos = position;
				if (uUseNoise > 0.5) {
					float n = texture2D(tNoise, pos.xz * 0.05 + uTime * 0.02).r;
					pos += normal * n * 0.04;
				}
				vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
				vWorldPosition = worldPosition.xyz;
				gl_Position = projectionMatrix * viewMatrix * worldPosition;
			}
		`,
		fragmentShader: /* glsl */ `
			uniform vec3 uColor;
			varying vec3 vWorldPosition;
			void main() {
				gl_FragColor = vec4(uColor, 0.9);
			}
		`
	});
}
