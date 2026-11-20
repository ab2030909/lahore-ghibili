import { Vector2 } from 'three';
import { pick } from '../../core/math';
import { PlanetFrame, trailPoint } from '../../core/planet';
import { Builder } from '../../geometry/builder';
import type { PaletteKey } from '../../render/palette';
import { lampPost, tableSet, tree } from '../common';
import type { WorldContext } from '../context';
import { buildFoodStalls } from '../foodStalls';
import { LANDMARKS } from '../layout';

/**
 * Fort Road Food Street: the haveli rows come from the bazaar generator (painted façades,
 * jharokhas, food signs, string lights). This adds the life of the street itself: tables
 * down the middle, tandoor and karahi stalls, lantern posts, the entrance banner and a
 * rooftop terrace looking towards the Badshahi domes.
 */
export function buildFoodStreet(ctx: WorldContext) {
	const { w: w0 } = LANDMARKS.foodStreet;
	const b = new Builder(2012);
	const rng = b.rng;
	const start = 280;
	const end = 336;

	// entrance banner arches at both ends
	for (const [w, facing] of [[start - 1, 90], [end + 1, 270]] as const) {
		const f = PlanetFrame.trail(w, 0, facing);
		const g = new Builder(Math.round(w));
		for (const side of [-1, 1]) {
			g.prism(0.25, 5.4, 8, 'iron', { x: side * 3.2, y: 0, z: 0 }, { upright: true });
			g.finial(0.6, 'brass', { x: side * 3.2, y: 5.4, z: 0 });
		}
		g.box(7.0, 0.25, 0.25, 'iron', { x: 0, y: 5.1, z: 0 }, { collide: false });
		g.panel(5.6, 1.1, { decor: 'foodStreetBanner' }, { x: 0, y: 3.8, z: 0.05 }, { collide: false });
		g.panel(5.6, 1.1, { decor: 'foodStreetBanner' }, { x: 0, y: 3.8, z: -0.05, ry: Math.PI }, { collide: false });
		ctx.bake(g, f, 'food-street');
		const a = f.point(-3.2, 5.0, 0);
		const c = f.point(3.2, 5.0, 0);
		ctx.stringLights(a, c, 0.3, 0.45, 'lanternRed');
	}

	// tables down the middle of the street with diners
	for (let w = start + 3; w < end - 2; w += 5.2) {
		const frame = PlanetFrame.trail(w, 0, 270);
		const t = new Builder(Math.round(w * 13));
		const cloth = pick(rng, ['fabricWhite', 'awningRed', 'paintCream', 'fabricTeal'] as PaletteKey[]);
		tableSet(t, -1.1, 0, Math.PI / 2, cloth);
		tableSet(t, 1.3, 1.6, Math.PI / 2, cloth);
		// food on the tables
		t.cylinder(0.24, 0.12, 'karahi', { x: -1.1, y: 0.78, z: 0 }, { segments: 10, collide: false });
		t.cylinder(0.2, 0.06, 'gulmohar', { x: -1.1, y: 0.86, z: 0 }, { segments: 10, collide: false });
		t.box(0.4, 0.05, 0.3, 'naan', { x: 1.3, y: 0.78, z: 1.6 }, { collide: false, upright: true });
		ctx.bake(t, frame, 'food-street');
		if (rng() < 0.85) ctx.spot(frame, -1.1, -0.85, 0, 'diner', { sit: true, models: ['male-scientist', 'office-worker', 'female-scientist', 'young-lady', 'mountainman'], dialogue: 'diner' }, 0.02);
		if (rng() < 0.6) ctx.spot(frame, -1.1, 0.85, 180, 'diner', { sit: true, models: ['female-scientist', 'young-lady', 'threekid', 'male-scientist'], dialogue: 'diner' }, 0.02);
		if (rng() < 0.5) ctx.spot(frame, 1.3, 2.45, 180, 'diner', { sit: true, models: ['office-worker', 'mountainman', 'male-scientist'], dialogue: 'diner' }, 0.02);
	}

	// the famous food stalls (dish on display, cook, food card) line both curbs
	buildFoodStalls(ctx);

	// lantern posts and potted plants
	for (let w = start + 1; w < end; w += 8) {
		const f = PlanetFrame.trail(w, 0, 270);
		const t = new Builder(Math.round(w * 7));
		for (const side of [-1, 1]) lampPost(t, side * 3.25, 0, 3.8, { pole: 'iron', lamp: 'lantern' });
		t.cylinder(0.32, 0.6, 'potClay', { x: 3.25, y: 0, z: 2.2 }, { rTop: 0.4, segments: 10 });
		t.sphere(0.5, 'leaf', { x: 3.25, y: 0.9, z: 2.2 }, { w: 6, hSeg: 4 });
		ctx.bake(t, f, 'food-street');
	}

	// rooftop terrace overlooking the Badshahi domes (north side)
	{
		const f = PlanetFrame.trail(286, 8.2, 180);
		const t = new Builder(286);
		t.box(7, 13.0, 6, { decor: 'brickRed', tile: 1.6 }, { x: 0, y: 0, z: 0 }, {}, { front: 'paintTurquoise' });
		t.box(7.4, 0.25, 6.4, 'woodLight', { x: 0, y: 13.0, z: 0 }, { collide: true });
		for (let i = 0; i < 3; i++) {
			tableSet(t, -2 + i * 2, 0.5, 0, 'fabricWhite');
		}
		for (const [x, z] of [[-3.5, 0], [3.5, 0]] as const) t.box(0.2, 0.9, 6.2, 'wood', { x, y: 13.25, z }, { collide: true });
		t.box(7.2, 0.9, 0.2, 'wood', { x: 0, y: 13.25, z: -3.0 }, { collide: true });
		t.box(7.2, 0.9, 0.2, 'wood', { x: 0, y: 13.25, z: 3.0 }, { collide: true });
		// staircase up the side
		for (let i = 0; i < 29; i++) t.box(1.2, 0.45, 0.42, 'brickDark', { x: 4.2, y: i * 0.45, z: 2.8 - i * 0.22 }, { collide: true });
		ctx.bake(t, f, 'food-street');
		const a = f.point(-3.5, 15.6, -3);
		const c = f.point(3.5, 15.6, 3);
		ctx.stringLights(a, c, 0.4, 0.5, 'bulb');
		ctx.spot(f, -2, 1.4, 180, 'diner', { sit: true, models: ['young-lady', 'female-scientist'], dialogue: 'rooftop' }, 13.27);
	}

	// trees at the west end
	{
		const f = PlanetFrame.trail(343, 0, 270);
		const t = new Builder(343);
		for (const [x, z, k] of [[-8, -2, 'gulmohar'], [8, 3, 'neem'], [-9, 6, 'jacaranda'], [9, -5, 'peepal']] as const) tree(t, x, z, 1.2, k);
		ctx.bake(t, f, 'food-street');
	}

	ctx.anchor('food-street', PlanetFrame.trail(w0, 0, 270), 0, 0, [0, 4, 0], 6);
	ctx.trailPath([[start, 1.9], [end, 1.9]], false, 4, ['male-scientist', 'young-lady', 'female-scientist', 'office-worker', 'threekid']);
	ctx.trailPath([[end, -1.9], [start, -1.9]], false, 4, ['male-scientist', 'young-lady', 'female-scientist', 'office-worker', 'scout']);
	void trailPoint;
	void Vector2;
}
