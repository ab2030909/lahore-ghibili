import { PLANET_RADIUS } from '../core/config';

/**
 * Layout of the Lahore planet in trail coordinates (see core/planet.ts).
 *
 * The royal trail (Shahi Guzargah) circles the equator westwards, following the real order
 * of the Walled City: Delhi Gate -> Shahi Hammam -> Wazir Khan Chowk & Mosque -> Kashmiri
 * Bazaar -> Lahore Fort -> Hazuri Bagh -> Badshahi Mosque -> Fort Road Food Street, and then
 * back to the Delhi Gate chowk. Greater Iqbal Park (Minar-e-Pakistan) crowns the north pole
 * and the River Ravi fills the south polar cap, matching their real directions from the fort.
 *
 * `facing` is the compass direction of a landmark's main facade (0 N, 90 E, 180 S, 270 W).
 */

export const CIRCUMFERENCE = Math.PI * 2 * PLANET_RADIUS;

export const TRAIL_WIDTH = 7;

export type Placement2D = { w: number; t: number; facing: number };

export const LANDMARKS = {
	delhiGate: { w: 0, t: 0, facing: 90 },
	shahiHammam: { w: 21, t: -14, facing: 0 },
	wazirKhanChowk: { w: 44, t: -11, facing: 0 },
	wazirKhan: { w: 72, t: -18.5, facing: 90 },
	sunehriMasjid: { w: 118, t: 10.5, facing: 180 },
	lahoreFort: { w: 176, t: 26, facing: 270 },
	hazuriBagh: { w: 214, t: 26, facing: 270 },
	badshahi: { w: 251, t: 27, facing: 90 },
	foodStreet: { w: 308, t: 0, facing: 270 },
	minarEPakistan: { w: 0, t: CIRCUMFERENCE / 4, facing: 180 },
	railwayStation: { w: -22, t: 30, facing: 180 },
	gaddafiStadium: { w: -40, t: -32.5, facing: 0 },
	kamranBaradari: { w: 0, t: -CIRCUMFERENCE / 4, facing: 0 },
	/**
	 * Wagah, far from the Minar on the open ground south of the Fort. The road runs along the
	 * trail: Pakistan's end faces Delhi Gate (the way you arrive), India's end faces Badshahi.
	 */
	wagah: { w: 190, t: -36, facing: 270 }
} as const satisfies Record<string, Placement2D>;

export const SPAWN = { w: -16, t: 0.5, facing: 270 };

/** The painted truck parked on the north side of Delhi Gate chowk, cab facing east. */
export const TRUCK_SPOT = { w: -11.6, t: 10.7, facing: 90 };

/** Rectangular keep-out areas for procedural filler (w0, w1, t0, t1). */
export const RESERVED: [number, number, number, number][] = [
	[-27, -3, -9, 9], // Delhi Gate chowk
	[-4, 4, -13, 13], // Delhi Gate
	[8, 35, -23, -4], // Shahi Hammam
	[35, 56, -31, -4], // Wazir Khan Chowk
	[53, 92, -32, -4], // Wazir Khan Mosque
	[109, 127, 4, 18], // Sunehri Masjid
	[150, 202, 5, 48], // Lahore Fort
	[200, 228, 6, 46], // Hazuri Bagh
	[227, 275, 3, 52], // Badshahi Mosque
	[205, 222, 3, 8], // Roshnai Gate approach
	[282, 290, 4, 13], // Food Street rooftop terrace
	[-50, 6, 20, 55], // Lahore Junction: station, platforms and yard
	[-63, -17, -52, -13], // Gaddafi Stadium (bowl, forecourt and floodlights)
	[-24, -6.5, -21, -9], // Delhi Gate chowk south garden
	[143, 237, -54, -13] // Wagah border, south of the Fort
];

/** Streets other than the trail: polylines of [w, t] with a width. */
export const STREETS: { name: string; width: number; points: [number, number][] }[] = [
	{ name: 'Gali Surjan Singh', width: 3.6, points: [[36, 3], [36, 20]] },
	{ name: 'Kashmiri Bazaar North', width: 3.4, points: [[100, 3], [100, 22]] },
	{ name: 'Kashmiri Bazaar South', width: 3.4, points: [[104, -3], [104, -24]] },
	{ name: 'Dabbi Bazaar', width: 3.2, points: [[134, 3], [134, 18]] },
	{ name: 'Suha Bazaar', width: 3.2, points: [[140, -3], [140, -22]] },
	{ name: 'Roshnai Path', width: 4.2, points: [[214, 3], [214, 14]] },
	{ name: 'Tibbi Gali', width: 3.2, points: [[292, -3], [292, -20]] },
	{ name: 'Taxali Gali', width: 3.2, points: [[324, 3], [324, 20]] },
	{ name: 'Ravi Road', width: 3.8, points: [[-4.5, -14.5], [-4.5, -46]] }
];

/** Jetties on the Ravi: the city bank and Kamran's Baradari island (same meridian). */
export const JETTIES = {
	w: -4.5,
	north: { deckFrom: -46.5, deckTo: -53.4, deckY: 0.25, dock: -55.2 },
	island: { deckFrom: -84.6, deckTo: -80.6, deckY: 0.55, dock: -78.9 }
};

/** Stretches of the trail lined with havelis on each side ([w0, w1]). */
export const BAZAAR_ROWS: { w0: number; w1: number; side: 1 | -1; style: 'walled' | 'food' | 'mixed' }[] = [
	{ w0: 5, w1: 34, side: 1, style: 'walled' },
	{ w0: 5, w1: 8, side: -1, style: 'walled' },
	// the outer (north) side of Wazir Khan Chowk is left open so the player can walk out
	{ w0: 56, w1: 66, side: 1, style: 'walled' },
	{ w0: 94, w1: 150, side: 1, style: 'walled' },
	{ w0: 94, w1: 150, side: -1, style: 'walled' },
	{ w0: 152, w1: 205, side: -1, style: 'mixed' },
	{ w0: 228, w1: 276, side: -1, style: 'mixed' },
	{ w0: 278, w1: 338, side: 1, style: 'food' },
	// south row stops short of the Gaddafi Stadium forecourt
	{ w0: 278, w1: 326, side: -1, style: 'food' }
];

/** Ground zones evaluated per ground triangle. */
export type GroundZone = 'city' | 'grass' | 'garden' | 'sand' | 'riverbed' | 'island';

export const RIVER = {
	bankStart: -50,
	bedStart: -56,
	islandStart: -81,
	bedDepth: 1.3,
	islandHeight: 0.35
};

export const NORTH_PARK_START = 50;

/** Gardens on the city band (w0, w1, t0, t1). */
export const GARDENS: [number, number, number, number][] = [
	[-27, -9, 4.5, 14],
	[-27, -9, -14, -4.5],
	[338, 351, -14, 14],
	[150, 205, -3.8, -3.6]
];

export function wrapW(w: number): number {
	let v = w % CIRCUMFERENCE;
	if (v < -CIRCUMFERENCE / 2) v += CIRCUMFERENCE;
	if (v > CIRCUMFERENCE / 2) v -= CIRCUMFERENCE;
	return v;
}

/** True when (w, t) falls inside a reserved landmark area (with margin). */
export function isReserved(w: number, t: number, margin = 0): boolean {
	for (const [w0, w1, t0, t1] of RESERVED) {
		for (const shift of [0, CIRCUMFERENCE, -CIRCUMFERENCE]) {
			const ww = w + shift;
			if (ww >= w0 - margin && ww <= w1 + margin && t >= t0 - margin && t <= t1 + margin) return true;
		}
	}
	return false;
}

export function inGarden(w: number, t: number): boolean {
	for (const [w0, w1, t0, t1] of GARDENS) {
		for (const shift of [0, CIRCUMFERENCE, -CIRCUMFERENCE]) {
			const ww = w + shift;
			if (ww >= w0 && ww <= w1 && t >= t0 && t <= t1) return true;
		}
	}
	return false;
}

/** Distance to the nearest street centreline in trail coordinates (approximate). */
export function streetDistance(w: number, t: number): number {
	let best = Math.abs(t) - TRAIL_WIDTH / 2;
	for (const s of STREETS) {
		for (let i = 0; i < s.points.length - 1; i++) {
			const [aw, at] = s.points[i];
			const [bw, bt] = s.points[i + 1];
			const dw = bw - aw;
			const dt = bt - at;
			const len2 = dw * dw + dt * dt;
			const ww = wrapW(w - aw) + aw;
			const k = Math.max(0, Math.min(1, ((ww - aw) * dw + (t - at) * dt) / len2));
			const d = Math.hypot(ww - (aw + dw * k), t - (at + dt * k)) - s.width / 2;
			best = Math.min(best, d);
		}
	}
	return best;
}
