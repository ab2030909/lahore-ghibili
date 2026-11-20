import { PlanetFrame } from '../../core/planet';
import { Builder, type Look } from '../../geometry/builder';
import { lampPost, tree } from '../common';
import type { WorldContext } from '../context';
import { LANDMARKS } from '../layout';

/**
 * Badshahi Mosque (Aurangzeb, 1673), following the reference photographs and the aerial
 * view: a square courtyard of red sandstone paving enclosed by arcades and merlons, four
 * tall octagonal minarets at the corners (red sandstone banded with white marble, open
 * chhatri tops with marble cupolas), the monumental gateway on the east reached by steps,
 * and the prayer hall on the west: central pishtaq, five cusped arches each side outlined
 * in white marble inlay, small corner minarets and three white marble domes.
 * Local frame: +Z faces east (Hazuri Bagh), +X is north.
 */
export function buildBadshahi(ctx: WorldContext) {
	const { w, t, facing } = LANDMARKS.badshahi;
	const frame = PlanetFrame.trail(w, t, facing);
	const b = new Builder(1673);
	const stone: Look = { decor: 'sandstoneInlay', tile: 2.4 };
	const plain: Look = 'sandstone';
	const plinth = 1.4;
	const half = 22;

	// raised platform
	b.box(half * 2 + 1, plinth, half * 2 + 1, 'sandstoneDark', { x: 0, y: 0, z: 0 }, {}, { top: { decor: 'sandstoneSlabs', tile: 2.2 } });
	// grand stairs to the gateway
	b.stairs(10, 7, plinth / 7, 0.55, 'sandstoneLight', { x: 0, y: 0, z: half + 0.5 + 7 * 0.55, ry: Math.PI }, {});

	const y0 = plinth;
	const cz0 = -9;
	const cz1 = 19;
	const cx = 19;
	// courtyard floor and central pool
	b.floor(cx * 2, cz1 - cz0, { decor: 'sandstoneSlabs', tile: 2.4 }, { x: 0, y: y0 + 0.02, z: (cz0 + cz1) / 2 }, { collide: true });
	ctx.pools.push({ frame, x: 0, z: 4, w: 5, d: 5, y: y0 + 0.24 });
	for (const [dx, dz, lw, ld] of [[0, 2.7, 5.8, 0.4], [0, -2.7, 5.8, 0.4], [2.7, 0, 0.4, 5.8], [-2.7, 0, 0.4, 5.8]] as const) {
		b.box(lw, 0.4, ld, 'marble', { x: dx, y: y0, z: 4 + dz }, { collide: true });
	}
	b.floor(5, 5, 'riverbed', { x: 0, y: y0 - 0.4, z: 4 }, { collide: false });

	// --- perimeter arcades (north, south, east) ---
	const arcadeH = 5.2;
	const sides: { x: number; z: number; len: number; ry: number }[] = [
		{ x: cx + 0.3, z: (cz0 + cz1) / 2, len: cz1 - cz0, ry: -Math.PI / 2 },
		{ x: -cx - 0.3, z: (cz0 + cz1) / 2, len: cz1 - cz0, ry: Math.PI / 2 },
		{ x: -11, z: cz1 + 0.3, len: 16, ry: Math.PI },
		{ x: 11, z: cz1 + 0.3, len: 16, ry: Math.PI }
	];
	for (const s of sides) {
		const n = Math.max(3, Math.round(s.len / 3.2));
		const openings = [];
		for (let i = 0; i < n; i++) openings.push({ x: -s.len / 2 + (i + 0.5) * (s.len / n), w: 2.1, h: 3.6, rise: 1.1 });
		b.archWall(s.len, arcadeH, 0.6, openings, stone, { x: s.x, y: y0, z: s.z, ry: s.ry }, { sideLook: 'sandstoneDark' });
		// outer wall behind the dalan
		const ox = s.x + Math.sin(s.ry) * -2.6;
		const oz = s.z + Math.cos(s.ry) * -2.6;
		b.archWall(s.len + 2, arcadeH + 0.6, 0.8, [], plain, { x: ox, y: y0, z: oz, ry: s.ry }, {});
		b.box(s.len + 2, 0.4, 3.0, 'sandstoneDark', { x: (s.x + ox) / 2, y: y0 + arcadeH, z: (s.z + oz) / 2, ry: s.ry }, { collide: true });
		b.merlons(s.len + 2, 0.7, 'sandstone', { x: ox, y: y0 + arcadeH + 0.6, z: oz, ry: s.ry });
		b.merlons(s.len, 0.55, 'marble', { x: s.x, y: y0 + arcadeH, z: s.z, ry: s.ry });
	}

	// stairs from the courtyard to the roof of the north and south arcades
	b.stairs(2.2, 13, 0.43, 0.5, 'sandstoneLight', { x: cx - 1.1, y: y0, z: 7 }, {});
	b.stairs(2.2, 13, 0.43, 0.5, 'sandstoneLight', { x: -cx + 1.1, y: y0, z: 13.5, ry: Math.PI }, {});
	b.box(2.2, 5.6, 1.6, 'sandstoneDark', { x: cx - 1.1, y: y0, z: 14.3 }, {}, { top: 'sandstoneLight' });
	b.box(2.2, 5.6, 1.6, 'sandstoneDark', { x: -cx + 1.1, y: y0, z: 6.2 }, {}, { top: 'sandstoneLight' });

	// --- gateway (east) ---
	const gz = cz1 + 1.5;
	const gH = 12;
	const gateW = 12;
	for (const side of [-1, 1]) {
		b.box(4.4, gH, 6, stone, { x: side * 3.8, y: y0, z: gz }, { collide: true }, { top: 'sandstoneDark' });
	}
	b.box(3.2, gH - 7.6, 6, plain, { x: 0, y: y0 + 7.6, z: gz }, { collide: true }, { bottom: { decor: 'inlayNiche' } });
	for (const zSide of [1, -1]) {
		const face = gz + zSide * 3.05;
		const ry = zSide > 0 ? 0 : Math.PI;
		b.archWall(gateW, gH, 0.3, [{ x: 0, w: 3.2, h: 7.6, rise: 2.0 }], stone, { x: 0, y: y0, z: face - zSide * 0.1, ry }, { sideLook: 'sandstoneDark' });
		b.archFrame(3.2, 7.6, 0.3, 'marble', { x: 0, y: y0, z: face + zSide * 0.06, ry }, { rise: 2.0 });
		b.archFrame(4.6, 9.4, 0.25, 'marble', { x: 0, y: y0, z: face + zSide * 0.05, ry }, { rise: 2.5 });
		b.panel(6.6, 0.8, { decor: 'inlayBand', tile: 3.3 }, { x: 0, y: y0 + 10.4, z: face + zSide * 0.08, ry }, { collide: false });
		for (const side of [-1, 1]) {
			b.panel(1.6, 2.6, { decor: 'inlayNiche' }, { x: side * 4.2, y: y0 + 1.4, z: face + zSide * 0.06, ry }, { collide: false });
			b.panel(1.6, 2.6, { decor: 'inlayNiche' }, { x: side * 4.2, y: y0 + 5.6, z: face + zSide * 0.06, ry }, { collide: false });
		}
	}
	b.floor(3.2, 6.4, { decor: 'sandstoneSlabs', tile: 2 }, { x: 0, y: y0 + 0.03, z: gz }, { collide: true });
	b.merlons(gateW, 0.8, 'sandstone', { x: 0, y: y0 + gH, z: gz + 3.0 });
	b.merlons(gateW, 0.8, 'sandstone', { x: 0, y: y0 + gH, z: gz - 3.0 });
	for (const [x, z] of [[-5.8, gz + 2.6], [5.8, gz + 2.6], [-5.8, gz - 2.6], [5.8, gz - 2.6]] as const) {
		b.prism(0.55, 2.0, 8, 'sandstone', { x, y: y0 + gH, z }, { upright: true, collide: false });
		b.chhatri(0.7, 2.6, { pillar: 'sandstone', roof: 'sandstoneDark', dome: 'marble', finial: 'gold' }, { x, y: y0 + gH + 2.0, z }, { pillars: 6 });
	}
	b.chhatri(1.3, 3.6, { pillar: 'sandstone', roof: 'sandstoneDark', dome: 'marble', finial: 'gold' }, { x: 0, y: y0 + gH, z: gz }, { pillars: 8 });

	// --- great minarets at the courtyard corners ---
	const minarets: [number, number][] = [
		[cx + 1.5, cz1 + 1.5],
		[-cx - 1.5, cz1 + 1.5],
		[cx + 1.5, cz0 - 1.0],
		[-cx - 1.5, cz0 - 1.0]
	];
	for (const [mx, mz] of minarets) {
		const stages = [6.4, 6.0, 5.4];
		let y = y0;
		let r = 1.75;
		b.prism(2.2, 1.2, 8, 'sandstoneDark', { x: mx, y, z: mz }, { upright: true });
		y += 1.2;
		for (let s = 0; s < stages.length; s++) {
			const h = stages[s];
			b.prism(r, h, 8, plain, { x: mx, y, z: mz }, { upright: true, rTop: r - 0.12, perFaceIds: true });
			for (const band of [0.2, 0.5, 0.82]) b.prism(r + 0.02, 0.12, 8, 'marble', { x: mx, y: y + h * band, z: mz }, { upright: true, collide: false, rTop: r - 0.1 });
			y += h;
			// balcony on brackets
			b.prism(r + 0.55, 0.3, 8, 'sandstoneDark', { x: mx, y, z: mz }, { upright: true, collide: false, rTop: r + 0.7 });
			b.prism(r + 0.62, 0.55, 8, 'sandstoneLight', { x: mx, y: y + 0.3, z: mz }, { upright: true, collide: false, open: true });
			r -= 0.22;
		}
		b.chhatri(r + 0.25, 4.0, { pillar: 'sandstone', roof: 'sandstoneDark', dome: 'marble', finial: 'gold', base: 'sandstoneDark' }, { x: mx, y, z: mz }, { pillars: 8 });
	}

	// --- prayer hall (west) ---
	const hz1 = cz0;
	const hz0 = -half;
	const hallH = 10.5;
	const hallMid = (hz0 + hz1) / 2;
	const openings = [{ x: 0, w: 5.0, h: 9.0, rise: 2.8 }];
	for (let i = 1; i <= 5; i++) {
		const x = 4.6 + (i - 1) * 2.9;
		openings.push({ x, w: 2.0, h: 4.6, rise: 1.1 }, { x: -x, w: 2.0, h: 4.6, rise: 1.1 });
	}
	b.archWall(cx * 2 + 2, hallH, 0.8, openings, stone, { x: 0, y: y0, z: hz1 - 0.4 }, { sideLook: 'sandstoneDark' });
	for (const o of openings) {
		b.archFrame(o.w, o.h, 0.18, 'marble', { x: o.x, y: y0, z: hz1 + 0.03 }, { rise: o.rise });
		if (o.x !== 0) b.panel(o.w + 0.6, 1.4, { decor: 'inlayNiche' }, { x: o.x, y: y0 + o.h + 0.9, z: hz1 + 0.02 }, { collide: false });
	}
	b.merlons(cx * 2 + 2, 0.75, 'sandstone', { x: 0, y: y0 + hallH, z: hz1 - 0.1 });
	// central pishtaq
	b.box(11, 15.5, 1.6, stone, { x: 0, y: y0, z: hz1 - 0.3 }, { collide: true }, { back: 'sandstoneDark', top: 'sandstoneDark' });
	b.panel(5.6, 9.6, 'recessStone', { x: 0, y: y0, z: hz1 + 0.51 }, { arch: 3.0 });
	b.archFrame(5.2, 9.3, 0.35, 'marble', { x: 0, y: y0, z: hz1 + 0.55 }, { rise: 2.9 });
	b.archFrame(7.0, 11.4, 0.3, 'marble', { x: 0, y: y0, z: hz1 + 0.52 }, { rise: 3.4 });
	b.panel(9.6, 1.0, { decor: 'inlayBand', tile: 3.2 }, { x: 0, y: y0 + 13.6, z: hz1 + 0.53 }, { collide: false });
	b.panel(2.2, 4.2, { decor: 'doorStudded' }, { x: 0, y: y0, z: hz1 + 0.54 }, { arch: 1.0 });
	b.merlons(11, 0.75, 'sandstone', { x: 0, y: y0 + 15.5, z: hz1 + 0.45 });
	for (const side of [-1, 1]) {
		b.prism(0.42, 16.4, 8, 'sandstone', { x: side * 5.7, y: y0, z: hz1 + 0.5 }, { upright: true, collide: false });
		b.chhatri(0.6, 2.4, { pillar: 'sandstone', roof: 'sandstoneDark', dome: 'marble', finial: 'gold' }, { x: side * 5.7, y: y0 + 16.4, z: hz1 + 0.5 }, { pillars: 6 });
	}
	// hall volume, interior, roof
	b.box(cx * 2 + 2, hallH, 0.8, plain, { x: 0, y: y0, z: hz0 + 0.4 });
	b.box(0.8, hallH, hz1 - hz0, plain, { x: cx + 0.6, y: y0, z: hallMid });
	b.box(0.8, hallH, hz1 - hz0, plain, { x: -cx - 0.6, y: y0, z: hallMid });
	b.floor(cx * 2, hz1 - hz0 - 1.6, { decor: 'marbleSlabs', tile: 1.8 }, { x: 0, y: y0 + 0.03, z: hallMid }, { collide: true });
	b.box(cx * 2 + 2, 0.6, hz1 - hz0, 'sandstoneDark', { x: 0, y: y0 + hallH, z: hallMid }, { collide: true }, { bottom: { decor: 'marbleInlay', tile: 3 } });
	b.archWall(cx * 2, hallH, 0.7, [
		{ x: 0, w: 4.4, h: 8, rise: 2.4 },
		{ x: -8, w: 3.4, h: 6.6, rise: 1.8 },
		{ x: 8, w: 3.4, h: 6.6, rise: 1.8 },
		{ x: -14.5, w: 3.0, h: 6.0, rise: 1.6 },
		{ x: 14.5, w: 3.0, h: 6.0, rise: 1.6 }
	], { decor: 'marbleInlay', tile: 3 }, { x: 0, y: y0, z: hallMid }, { sideLook: 'marbleShade' });
	b.panel(3.2, 5.4, { decor: 'inlayNiche' }, { x: 0, y: y0 + 0.4, z: hz0 + 0.82 }, { collide: false });
	b.panel(cx * 2 - 2, 0.9, { decor: 'calligraphyBand' }, { x: 0, y: y0 + 8.4, z: hz0 + 0.83 }, { collide: false });

	// corner minarets of the prayer hall
	for (const [mx, mz] of [[cx + 0.6, hz1 - 0.4], [-cx - 0.6, hz1 - 0.4], [cx + 0.6, hz0 + 0.4], [-cx - 0.6, hz0 + 0.4]] as const) {
		b.prism(0.85, hallH + 3.0, 8, plain, { x: mx, y: y0, z: mz }, { upright: true });
		b.prism(0.86, 0.12, 8, 'marble', { x: mx, y: y0 + hallH, z: mz }, { upright: true, collide: false });
		b.chhatri(0.9, 3.2, { pillar: 'sandstone', roof: 'sandstoneDark', dome: 'marble', finial: 'gold' }, { x: mx, y: y0 + hallH + 3.0, z: mz }, { pillars: 8 });
	}

	// three marble domes on drums
	const domeY = y0 + hallH + 0.6;
	for (const [dx, r, h, drum] of [[0, 5.0, 8.4, 2.2], [-10.5, 3.8, 6.6, 1.6], [10.5, 3.8, 6.6, 1.6]] as const) {
		b.cylinder(r * 0.98, drum, 'marbleShade', { x: dx, y: domeY, z: hallMid }, { segments: 28 });
		b.prism(r * 1.02, 0.25, 28, 'marble', { x: dx, y: domeY + drum - 0.1, z: hallMid }, { upright: true, collide: false, faceted: false });
		b.dome(r, h, 'onion', 'marble', { x: dx, y: domeY + drum, z: hallMid }, { segments: 32 });
		b.dome(r * 0.34, h * 0.14, 'hemi', 'marbleShade', { x: dx, y: domeY + drum + h * 0.94, z: hallMid }, { segments: 14 });
		b.finial(h * 0.36, 'gold', { x: dx, y: domeY + drum + h * 0.98, z: hallMid });
	}

	// grounds around the platform
	for (const [x, z] of [[-26, 10], [-26, -6], [26, -12], [-26, -20], [26, 16]] as const) tree(b, x, z, 1.25, 'neem');
	for (const x of [-8, 8]) lampPost(b, x, half + 6.5, 4);

	ctx.bake(b, frame, 'badshahi');
	ctx.anchor('badshahi', frame, 0, 8, [0, 12, -15], 7, y0);

	ctx.spot(frame, -3.5, 13, 160, 'visitor', { models: ['scout', 'female-scientist', 'young-lady'], dialogue: 'badshahiVisitor' }, y0);
	ctx.spot(frame, 4.0, -6.5, 200, 'worshipper', { models: ['male-scientist', 'mountainman'], dialogue: 'badshahiImam', name: 'Khateeb Sahib' }, y0);
	ctx.spot(frame, 9, 7, 250, 'guard', { models: ['office-worker'], dialogue: 'badshahiGuard' }, y0);
	ctx.spot(frame, -8, 1, 90, 'child', { models: ['threekid'], dialogue: 'kidCourtyard' }, y0);
	ctx.spot(frame, 3.6, half + 5, 170, 'vendor', { models: ['boss', 'mountainman'], dialogue: 'topiSeller' });
	ctx.path(frame, [[-14, 16], [14, 16], [14, -6], [-14, -6]], true, 4, ['male-scientist', 'young-lady', 'female-scientist', 'scout', 'mountainman'], y0 + 0.03);
}
