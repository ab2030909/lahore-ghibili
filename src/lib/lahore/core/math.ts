/** Small math helpers mirroring the `math.*` utilities used by the original Messenger runtime. */

export const clamp = (value: number, min: number, max: number): number =>
	Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Remap `value` from [a, b] to [c, d] with clamping (works for a > b too). */
export function fit(value: number, a: number, b: number, c: number, d: number): number {
	const span = b - a;
	const t = clamp(span === 0 ? 0 : (value - a) / span, 0, 1);
	return c + (d - c) * t;
}

/** Frame-rate independent lerp coefficient, authored against 60 fps like the original. */
export const lerpCoefFPS = (t: number, dt: number): number =>
	1 - Math.pow(1 - clamp(t, 0, 0.9999), Math.max(0, dt) * 60);

export const smoothstep = (a: number, b: number, x: number): number => {
	const t = clamp((x - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};

export const easeOutBack = (t: number): number => {
	const c1 = 1.70158;
	const c3 = c1 + 1;
	return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const easeInOutCubic = (t: number): number =>
	t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export type Rng = () => number;

/** Deterministic PRNG so the generated city is identical on every load. */
export function mulberry32(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export const randRange = (rng: Rng, min: number, max: number): number => min + (max - min) * rng();

export const randInt = (rng: Rng, min: number, maxInclusive: number): number =>
	Math.floor(randRange(rng, min, maxInclusive + 1));

export function pick<T>(rng: Rng, items: readonly T[]): T {
	return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

export function shortestAngle(from: number, to: number): number {
	let delta = (to - from) % (Math.PI * 2);
	if (delta > Math.PI) delta -= Math.PI * 2;
	if (delta < -Math.PI) delta += Math.PI * 2;
	return delta;
}

export const DEG = Math.PI / 180;
