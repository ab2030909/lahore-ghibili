import { Vector2 } from 'three';
import { PlanetFrame } from '../core/planet';
import { Builder } from '../geometry/builder';
import type { LandmarkId } from '../heritage/landmarks';
import type { DecorKey } from '../render/decorAtlas';
import type { PaletteKey } from '../render/palette';
import type { WorldContext } from './context';

type Dish = 'karahi' | 'nihari' | 'paye' | 'tikka' | 'biryani' | 'pulao' | 'golgappay' | 'lassi';

/** The famous stalls of Fort Road Food Street, alternating sides of the street. */
export const FOOD_STALLS: { w: number; side: 1 | -1; dish: Dish; sign: DecorKey; card: LandmarkId; dialogue: string; cook: string; awning: PaletteKey }[] = [
	{ w: 283, side: 1, dish: 'nihari', sign: 'signNihari', card: 'food-nihari', dialogue: 'nihariWala', cook: 'Haji Sahib', awning: 'awningRed' },
	{ w: 289.5, side: -1, dish: 'paye', sign: 'signPhajja', card: 'food-paye', dialogue: 'phajja', cook: 'Phajja Paye', awning: 'awningGreen' },
	{ w: 296, side: 1, dish: 'lassi', sign: 'signMalaiLassi', card: 'food-lassi', dialogue: 'lassiWala', cook: 'Lassi Wala', awning: 'awningBlue' },
	{ w: 302.5, side: -1, dish: 'golgappay', sign: 'signGolgappay', card: 'food-golgappay', dialogue: 'golgappay', cook: 'Golgappay Wala', awning: 'awningYellow' },
	{ w: 314, side: 1, dish: 'biryani', sign: 'signBiryani', card: 'food-biryani', dialogue: 'biryaniWala', cook: 'Biryani Wala', awning: 'awningOrange' },
	{ w: 320.5, side: -1, dish: 'pulao', sign: 'signPulao', card: 'food-pulao', dialogue: 'pulaoWala', cook: 'Pulao Wala', awning: 'awningGreen' },
	{ w: 327, side: 1, dish: 'tikka', sign: 'signTikkaHouse', card: 'food-tikka', dialogue: 'tikkaWala', cook: 'Tikka Master Javed', awning: 'awningRed' },
	{ w: 333.5, side: -1, dish: 'karahi', sign: 'signButtKarahi', card: 'food-karahi', dialogue: 'buttKarahi', cook: 'Ustad Butt', awning: 'awningYellow' }
];

const TOP = 0.9; // counter height

/** Copper deg with its contents heaped inside. */
function deg(b: Builder, x: number, z: number, r: number, h: number, fill: PaletteKey) {
	b.cylinder(r, h, 'copper', { x, y: TOP, z }, { rTop: r * 0.86, segments: 16, collide: false });
	b.cylinder(r * 0.9, 0.05, 'brass', { x, y: TOP + h - 0.02, z }, { segments: 16, collide: false });
	b.dome(r * 0.78, 0.14, 'hemi', fill, { x, y: TOP + h - 0.06, z }, { segments: 14 });
}

/** A plate with a little heap of food. */
function plate(b: Builder, x: number, z: number, fill: PaletteKey, r = 0.17) {
	b.cylinder(r, 0.025, 'white', { x, y: TOP, z }, { segments: 12, collide: false });
	b.dome(r * 0.65, 0.07, 'hemi', fill, { x, y: TOP + 0.02, z }, { segments: 10 });
}

function bowl(b: Builder, x: number, z: number, fill: PaletteKey, outside: PaletteKey = 'potClay') {
	b.cylinder(0.13, 0.08, outside, { x, y: TOP, z }, { rTop: 0.16, segments: 12, collide: false });
	b.cylinder(0.14, 0.015, fill, { x, y: TOP + 0.07, z }, { segments: 12, collide: false });
}

function sprinkle(b: Builder, rng: () => number, x: number, y: number, z: number, r: number, look: PaletteKey, count: number, size = 0.035) {
	for (let i = 0; i < count; i++) {
		const a = rng() * Math.PI * 2;
		const d = Math.sqrt(rng()) * r;
		b.box(size, size * 0.6, size, look, { x: x + Math.cos(a) * d, y, z: z + Math.sin(a) * d, ry: rng() * 3 }, { collide: false, upright: true });
	}
}

function naanStack(b: Builder, x: number, z: number, n = 3) {
	for (let i = 0; i < n; i++) b.box(0.42, 0.025, 0.3, 'naan', { x, y: TOP + i * 0.03, z, ry: i * 0.25 }, { collide: false, upright: true });
}

const KARAHI_PROFILE = [new Vector2(0.02, 0), new Vector2(0.2, 0.02), new Vector2(0.31, 0.08), new Vector2(0.36, 0.16)];

function display(b: Builder, dish: Dish, rng: () => number) {
	switch (dish) {
		case 'nihari': {
			deg(b, -0.55, -0.05, 0.42, 0.42, 'niharyRed');
			b.box(0.05, 0.05, 0.6, 'steel', { x: -0.4, y: TOP + 0.5, z: 0.15, rx: 0.5 }, { collide: false });
			plate(b, 0.35, 0.15, 'niharyRed', 0.2);
			sprinkle(b, rng, 0.35, TOP + 0.08, 0.15, 0.1, 'ginger', 6, 0.03);
			sprinkle(b, rng, 0.35, TOP + 0.09, 0.15, 0.1, 'chilliGreen', 3, 0.03);
			naanStack(b, 0.95, 0.05);
			break;
		}
		case 'paye': {
			deg(b, -0.55, -0.05, 0.4, 0.4, 'gravyBrown');
			for (const [x, z] of [[0.25, 0.2], [0.6, -0.1]] as const) {
				bowl(b, x, z, 'gravyBrown');
				sprinkle(b, rng, x, TOP + 0.09, z, 0.08, 'coriander', 4, 0.03);
			}
			naanStack(b, 1.0, 0.15, 4);
			break;
		}
		case 'lassi': {
			b.cylinder(0.3, 0.55, 'potClay', { x: -0.7, y: TOP, z: -0.1 }, { rTop: 0.2, segments: 14, collide: false });
			b.cylinder(0.21, 0.02, 'lassi', { x: -0.7, y: TOP + 0.55, z: -0.1 }, { segments: 12, collide: false });
			b.prism(0.025, 0.9, 6, 'woodDark', { x: -0.7, y: TOP + 0.3, z: -0.1 }, { collide: false, upright: true });
			for (let i = 0; i < 4; i++) {
				const x = -0.15 + i * 0.32;
				b.cylinder(0.08, 0.3, 'steel', { x, y: TOP, z: 0.15 }, { rTop: 0.095, segments: 12, collide: false });
				b.cylinder(0.088, 0.01, 'lassi', { x, y: TOP + 0.3, z: 0.15 }, { segments: 12, collide: false });
				b.dome(0.07, 0.06, 'hemi', 'yogurt', { x, y: TOP + 0.3, z: 0.15 }, { segments: 10 });
			}
			b.box(0.3, 0.2, 0.3, 'glassLight', { x: 1.05, y: TOP, z: -0.15 }, { collide: false });
			break;
		}
		case 'golgappay': {
			b.box(0.9, 0.48, 0.5, 'glassLight', { x: -0.6, y: TOP, z: -0.05 }, { collide: false });
			for (let i = 0; i < 14; i++) b.sphere(0.06, 'puri', { x: -0.95 + (i % 7) * 0.11, y: TOP + 0.07 + Math.floor(i / 7) * 0.1, z: -0.05 + (i % 2 ? 0.06 : -0.06) }, { w: 6, hSeg: 4 });
			for (const [x, fill] of [[0.25, 'mintWater'], [0.75, 'tamarind']] as const) {
				b.cylinder(0.2, 0.32, 'potClay', { x, y: TOP, z: -0.1 }, { rTop: 0.14, segments: 12, collide: false });
				b.cylinder(0.15, 0.015, fill, { x, y: TOP + 0.32, z: -0.1 }, { segments: 12, collide: false });
			}
			b.cylinder(0.18, 0.025, 'white', { x: 0.5, y: TOP, z: 0.3 }, { segments: 12, collide: false });
			for (let i = 0; i < 5; i++) b.sphere(0.05, 'puri', { x: 0.5 + Math.cos(i * 1.25) * 0.09, y: TOP + 0.06, z: 0.3 + Math.sin(i * 1.25) * 0.09 }, { w: 6, hSeg: 4 });
			break;
		}
		case 'biryani': {
			deg(b, -0.55, -0.05, 0.46, 0.4, 'biryaniRice');
			sprinkle(b, rng, -0.55, TOP + 0.47, -0.05, 0.3, 'saffron', 10);
			sprinkle(b, rng, -0.55, TOP + 0.47, -0.05, 0.3, 'rice', 10);
			sprinkle(b, rng, -0.55, TOP + 0.48, -0.05, 0.25, 'gravyBrown', 5, 0.06);
			for (const [x, z] of [[0.3, 0.2], [0.75, -0.05]] as const) {
				plate(b, x, z, 'biryaniRice');
				sprinkle(b, rng, x, TOP + 0.08, z, 0.07, 'saffron', 3, 0.03);
			}
			bowl(b, 1.1, 0.2, 'yogurt', 'white');
			break;
		}
		case 'pulao': {
			deg(b, -0.55, -0.05, 0.46, 0.4, 'pulaoRice');
			sprinkle(b, rng, -0.55, TOP + 0.47, -0.05, 0.3, 'naan', 10, 0.04);
			sprinkle(b, rng, -0.55, TOP + 0.47, -0.05, 0.3, 'gravyBrown', 5, 0.06);
			plate(b, 0.3, 0.2, 'pulaoRice');
			b.cylinder(0.17, 0.025, 'white', { x: 0.75, y: TOP, z: -0.05 }, { segments: 12, collide: false });
			for (let i = 0; i < 3; i++) b.cylinder(0.055, 0.035, 'gravyBrown', { x: 0.7 + i * 0.05, y: TOP + 0.025, z: -0.1 + i * 0.06 }, { segments: 10, collide: false });
			bowl(b, 1.1, 0.2, 'yogurt', 'white');
			break;
		}
		case 'tikka': {
			b.box(1.7, 0.3, 0.55, 'coal', { x: -0.35, y: TOP, z: -0.05 }, { collide: false });
			b.box(1.6, 0.04, 0.45, 'ember', { x: -0.35, y: TOP + 0.3, z: -0.05 }, { collide: false });
			for (let i = 0; i < 6; i++) {
				const x = -1.05 + i * 0.28;
				b.box(0.03, 0.03, 0.75, 'steel', { x, y: TOP + 0.36, z: -0.05 }, { collide: false, upright: true });
				for (let k = 0; k < 4; k++) b.box(0.1, 0.09, 0.1, 'tikkaRed', { x, y: TOP + 0.33, z: -0.26 + k * 0.14, ry: k }, { collide: false, upright: true });
			}
			plate(b, 0.85, 0.2, 'tikkaRed', 0.2);
			for (let i = 0; i < 3; i++) b.cylinder(0.05, 0.015, 'onionPink', { x: 0.8 + i * 0.05, y: TOP + 0.09, z: 0.15 + i * 0.04 }, { segments: 10, collide: false });
			b.dome(0.05, 0.05, 'hemi', 'lemon', { x: 0.98, y: TOP + 0.03, z: 0.3 });
			break;
		}
		case 'karahi': {
			for (const [x, z, flame] of [[-0.55, -0.05, true], [0.35, 0.05, false]] as const) {
				if (flame) b.cylinder(0.22, 0.12, 'ember', { x, y: TOP, z }, { segments: 10, collide: false });
				const y = TOP + (flame ? 0.12 : 0);
				b.lathe(KARAHI_PROFILE, 'karahi', { x, y, z }, { segments: 16, collide: false });
				b.cylinder(0.31, 0.02, 'gravyRed', { x, y: y + 0.11, z }, { segments: 16, collide: false });
				sprinkle(b, rng, x, y + 0.13, z, 0.22, 'chilliGreen', 6, 0.04);
				sprinkle(b, rng, x, y + 0.13, z, 0.2, 'tikkaRed', 5, 0.06);
				for (const s of [-1, 1]) b.box(0.1, 0.03, 0.04, 'karahi', { x: x + s * 0.4, y: y + 0.15, z }, { collide: false });
			}
			naanStack(b, 1.05, 0.1);
			break;
		}
	}
}

/** The famous stalls: counter with the dish on display, cook, sign, awning, lights, card. */
export function buildFoodStalls(ctx: WorldContext) {
	for (const s of FOOD_STALLS) {
		const frame = PlanetFrame.trail(s.w, s.side * 2.4, s.side > 0 ? 180 : 0);
		const b = new Builder(Math.round(s.w * 11));
		// counter with a tiled front, shelf behind
		b.box(2.8, TOP, 1.0, 'woodLight', { x: 0, y: 0, z: 0 }, { collide: true }, { front: { decor: 'tileBand', tile: 0.9 }, top: 'steel' });
		b.box(2.8, 1.5, 0.3, 'woodDark', { x: 0, y: 0, z: -1.55 }, { collide: true });
		for (let i = 0; i < 4; i++) b.cylinder(0.08, 0.22, i % 2 ? 'brass' : 'glassLight', { x: -1.0 + i * 0.65, y: 1.5, z: -1.55 }, { segments: 8, collide: false });
		display(b, s.dish, b.rng);
		// posts, awning and the sign
		for (const x of [-1.35, 1.35]) b.box(0.09, 3.2, 0.09, 'wood', { x, y: 0, z: 0.45 }, { collide: false });
		b.box(3.2, 0.07, 1.9, s.awning, { x: 0, y: 3.2, z: 0.05, rx: -0.08 }, { collide: false });
		b.box(3.2, 0.25, 0.05, s.awning, { x: 0, y: 2.98, z: 1.0 }, { collide: false });
		b.panel(2.6, 0.65, { decor: s.sign }, { x: 0, y: 2.3, z: 0.5 }, { collide: false });
		ctx.bake(b, frame, 'food-street');
		ctx.stringLights(frame.point(-1.55, 2.95, 1.05), frame.point(1.55, 2.95, 1.05), 0.12, 0.32, 'bulb');
		ctx.spot(frame, 0, -0.95, 0, 'vendor', { models: ['chef'], dialogue: s.dialogue, name: s.cook });
		ctx.anchor(s.card, frame, 2.0, 1.3, [0, 1.2, 0], 2.3);
	}
}
