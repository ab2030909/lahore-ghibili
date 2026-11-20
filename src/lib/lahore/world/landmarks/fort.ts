import { Shape, Vector2 } from 'three';
import { PlanetFrame } from '../../core/planet';
import { Builder, type Look } from '../../geometry/builder';
import type { PaletteKey } from '../../render/palette';
import { balustrade, lampPost, tree } from '../common';
import type { WorldContext } from '../context';
import { LANDMARKS } from '../layout';

/** Ring of merlons around a round bastion. */
function merlonRing(b: Builder, x: number, y: number, z: number, r: number, size: number, look: PaletteKey) {
	const n = Math.max(6, Math.round((2 * Math.PI * r) / (size * 1.3)));
	const shape = new Shape();
	const hw = size * 0.38;
	shape.moveTo(-hw, 0);
	shape.lineTo(hw, 0);
	shape.lineTo(hw, size * 0.55);
	shape.quadraticCurveTo(hw, size * 0.9, 0, size);
	shape.quadraticCurveTo(-hw, size * 0.9, -hw, size * 0.55);
	shape.closePath();
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2;
		b.extrude(shape, size * 0.22, look, { x: x + Math.sin(a) * r, y, z: z + Math.cos(a) * r, ry: a }, { collide: false, upright: true });
	}
}

/** Bengali (bangla) curved roof, as on the Naulakha Pavilion. */
function banglaRoof(b: Builder, w: number, d: number, rise: number, look: Look, at: { x: number; y: number; z: number }) {
	const s = new Shape();
	s.moveTo(-w / 2 - 0.4, 0);
	s.quadraticCurveTo(0, rise * 1.6, w / 2 + 0.4, 0);
	s.lineTo(w / 2 + 0.4, 0.22);
	s.quadraticCurveTo(0, rise * 1.6 + 0.3, -w / 2 - 0.4, 0.22);
	s.closePath();
	b.extrude(s, d + 0.8, look, { x: at.x, y: at.y, z: at.z }, { collide: false, upright: true });
	const top = new Shape();
	top.moveTo(-w / 2, 0);
	top.quadraticCurveTo(0, rise * 1.5, w / 2, 0);
	top.closePath();
	b.extrude(top, d, look, { x: at.x, y: at.y, z: at.z }, { collide: false, upright: true });
}

export function buildLahoreFort(ctx: WorldContext) {
	const { w, t, facing } = LANDMARKS.lahoreFort;
	const frame = PlanetFrame.trail(w, t, facing);
	const b = new Builder(1566);
	const wall: Look = { decor: 'brickDark', tile: 1.6 };
	const HX = 19;
	const HZ = 24;
	const wallH = 9;
	const T = 2.4;

	// inner ground
	b.floor(HX * 2 - T * 2, HZ * 2 - T * 2, 'grass', { x: 0, y: 0.03, z: 0 }, { collide: true });
	// paths (lime paving) crossing the gardens
	b.floor(4, HZ * 2 - T * 2, { decor: 'pavingStone', tile: 1.8 }, { x: 0, y: 0.06, z: 0 }, { collide: true });
	b.floor(HX * 2 - T * 2, 3.5, { decor: 'pavingStone', tile: 1.8 }, { x: 0, y: 0.06, z: 8 }, { collide: true });

	// --- perimeter walls with merlons ---
	const segments: { x: number; z: number; len: number; ry: number }[] = [
		{ x: HX - T / 2, z: 0, len: HZ * 2, ry: Math.PI / 2 },
		{ x: -HX + T / 2, z: 0, len: HZ * 2, ry: -Math.PI / 2 },
		{ x: 0, z: -HZ + T / 2, len: HX * 2, ry: Math.PI },
		{ x: -11.5, z: HZ - T / 2, len: 15, ry: 0 },
		{ x: 11.5, z: HZ - T / 2, len: 15, ry: 0 }
	];
	for (const s of segments) {
		b.archWall(s.len, wallH, T, [], wall, { x: s.x, y: 0, z: s.z, ry: s.ry }, {});
		const ox = s.x + Math.sin(s.ry) * (T / 2 - 0.1);
		const oz = s.z + Math.cos(s.ry) * (T / 2 - 0.1);
		b.merlons(s.len, 0.9, 'brickDark', { x: ox, y: wallH, z: oz, ry: s.ry });
		// blind arcade along the outer face (the long Picture Wall rhythm)
		const n = Math.floor(s.len / 3.4);
		const face = T / 2 + 0.04;
		for (let i = 0; i < n; i++) {
			const lx = -s.len / 2 + (i + 0.5) * (s.len / n);
			const px = s.x + Math.cos(s.ry) * lx + Math.sin(s.ry) * face;
			const pz = s.z - Math.sin(s.ry) * lx + Math.cos(s.ry) * face;
			b.panel(2.0, 2.6, 'brick', { x: px, y: 5.4, z: pz, ry: s.ry }, { arch: 0.8 });
			if (s.ry === Math.PI / 2 && i % 3 === 1) b.panel(1.7, 1.3, { decor: 'tileSquare' }, { x: px + 0.02, y: 3.0, z: pz, ry: s.ry }, { collide: false });
		}
	}
	// ramparts: stairs up the inside of the east and west walls to the wall walk
	b.stairs(1.6, 20, 0.45, 0.5, 'brickDark', { x: HX - T - 0.8, y: 0, z: -20 }, {});
	b.stairs(1.6, 20, 0.45, 0.5, 'brickDark', { x: -HX + T + 0.8, y: 0, z: 10, ry: Math.PI }, {});
	b.box(1.6, 9, 1.6, wall, { x: HX - T - 0.8, y: 0, z: -9.2 }, {}, { top: 'brickDark' });
	b.box(1.6, 9, 1.6, wall, { x: -HX + T + 0.8, y: 0, z: -0.8 }, {}, { top: 'brickDark' });

	// corner bastions
	for (const [x, z] of [[HX, HZ], [-HX, HZ], [HX, -HZ], [-HX, -HZ]] as const) {
		b.cylinder(3.2, wallH + 1, wall, { x, y: 0, z }, { segments: 20, upright: true });
		merlonRing(b, x, wallH + 1, z, 3.05, 0.9, 'brickDark');
	}

	// --- Alamgiri Gate on the west wall ---
	const gz = HZ + 0.8;
	const cream: Look = { decor: 'limePlaster', tile: 3 };
	for (const side of [-1, 1]) {
		b.box(2.6, 13, 5.2, cream, { x: side * 3.0, y: 0, z: gz - 1.2 }, {}, { top: 'limeDark' });
	}
	b.box(3.4, 13 - 6.6, 5.2, cream, { x: 0, y: 6.6, z: gz - 1.2 }, {}, { bottom: 'limeDark', top: 'limeDark' });
	b.archWall(8.6, 13, 0.3, [{ x: 0, w: 3.4, h: 6.6, rise: 1.9 }], cream, { x: 0, y: 0, z: gz + 1.45 }, { sideLook: 'limeDark' });
	b.archFrame(3.4, 6.6, 0.35, 'sandstone', { x: 0, y: 0, z: gz + 1.62 }, { rise: 1.9 });
	for (const [x, y] of [[-2.4, 8], [2.4, 8], [-1, 10.6], [1, 10.6], [-2.4, 10.6], [2.4, 10.6]] as const) {
		b.panel(0.6, 0.7, 'black', { x, y, z: gz + 1.64 }, { collide: false });
	}
	b.panel(4.6, 3.2, 'limeDark', { x: 0, y: 7.4, z: gz + 1.63 }, { arch: 1.5 });
	b.merlons(8.4, 0.85, 'lime', { x: 0, y: 13, z: gz + 1.4 });
	for (const side of [-1, 1]) {
		b.prism(0.3, 1.8, 8, 'lime', { x: side * 4.1, y: 13, z: gz + 1.3 }, { upright: true, collide: false });
		b.finial(0.8, 'lime', { x: side * 4.1, y: 14.8, z: gz + 1.3 });
	}
	b.floor(3.4, 6, 'pavingStone', { x: 0, y: 0.07, z: gz - 1 }, { collide: true });
	// the two fluted bastions with lotus-petal bases and chhatris
	for (const side of [-1, 1]) {
		const bx = side * 7.0;
		const bz = gz - 0.2;
		b.prism(3.3, 12.2, 20, cream, { x: bx, y: 1.4, z: bz }, { upright: true, perFaceIds: true, faceted: true });
		b.lathe(
			[
				[3.3, 0], [3.9, 0.1], [4.0, 0.55], [3.85, 1.0], [3.5, 1.3], [3.3, 1.45]
			].map(([r, y]) => new Vector2(r, y)),
			'lime',
			{ x: bx, y: 0, z: bz },
			{ segments: 20, collide: true, faceted: true }
		);
		b.prism(3.5, 0.5, 20, 'limeDark', { x: bx, y: 13.6, z: bz }, { upright: true, collide: false, rTop: 3.6 });
		merlonRing(b, bx, 14.1, bz, 3.3, 0.85, 'lime');
		b.chhatri(1.7, 5.4, { pillar: 'lime', roof: 'limeDark', dome: 'cream', finial: 'brass', base: 'limeDark' }, { x: bx, y: 14.1, z: bz }, { pillars: 8 });
	}

	// --- Diwan-e-Aam: raised platform and red sandstone pillared hall ---
	const dz = -9;
	b.box(22, 1.1, 11, 'sandstoneDark', { x: 0, y: 0, z: dz }, {}, { top: { decor: 'sandstoneSlabs', tile: 2 } });
	b.stairs(5, 4, 1.1 / 4, 0.5, 'sandstoneLight', { x: 0, y: 0, z: dz + 5.5 + 2.0, ry: Math.PI }, {});
	for (let i = 0; i < 10; i++) {
		for (let j = 0; j < 3; j++) {
			const px = -9 + i * 2;
			const pz = dz + 3.6 - j * 3.2;
			b.prism(0.32, 5.2, 8, 'sandstone', { x: px, y: 1.1, z: pz }, { upright: true });
			b.prism(0.48, 0.4, 8, 'sandstoneLight', { x: px, y: 6.0, z: pz }, { upright: true, collide: false, rTop: 0.34 });
			b.prism(0.48, 0.35, 8, 'sandstoneLight', { x: px, y: 1.1, z: pz }, { upright: true, collide: false, rTop: 0.34 });
		}
	}
	b.box(21, 0.7, 10, 'sandstone', { x: 0, y: 6.4, z: dz }, { collide: true }, { bottom: 'sandstoneLight' });
	b.box(22.6, 0.18, 11.6, 'sandstoneDark', { x: 0, y: 6.2, z: dz }, { collide: false });
	b.merlons(21, 0.7, 'sandstone', { x: 0, y: 7.1, z: dz + 4.9 });
	b.box(21, 6, 0.7, { decor: 'sandstoneInlay', tile: 2.4 }, { x: 0, y: 1.1, z: dz - 5.2 });
	// emperor's jharokha (white marble) at the back
	b.box(3.2, 2.6, 1.4, 'marble', { x: 0, y: 2.6, z: dz - 4.4 }, { collide: false });
	b.dome(1.2, 1.2, 'bulb', 'marble', { x: 0, y: 5.2, z: dz - 4.4 });
	b.panel(2.4, 1.8, { decor: 'jali' }, { x: 0, y: 2.9, z: dz - 3.68 }, { collide: false });

	// --- Naulakha Pavilion (white marble, curved roof) ---
	const nx = -10;
	const nz = 13;
	b.box(9, 0.8, 6.4, 'marble', { x: nx, y: 0, z: nz }, {}, { top: { decor: 'marbleSlabs', tile: 1.5 } });
	b.archWall(7, 4.2, 0.4, [{ x: 0, w: 2.2, h: 3.3, rise: 1.0 }, { x: -2.4, w: 1.0, h: 2.2, flat: true }, { x: 2.4, w: 1.0, h: 2.2, flat: true }], { decor: 'marbleInlay', tile: 2.2 }, { x: nx, y: 0.8, z: nz + 2.2 }, { sideLook: 'marbleShade' });
	b.box(7, 4.2, 0.4, 'marble', { x: nx, y: 0.8, z: nz - 2.2 });
	b.box(0.4, 4.2, 4.4, 'marble', { x: nx - 3.3, y: 0.8, z: nz });
	b.box(0.4, 4.2, 4.4, 'marble', { x: nx + 3.3, y: 0.8, z: nz });
	b.panel(2.0, 2.2, { decor: 'jali' }, { x: nx, y: 1.0, z: nz - 1.98 }, { collide: false });
	banglaRoof(b, 7.4, 4.8, 1.1, 'marble', { x: nx, y: 5.0, z: nz });
	b.box(7.6, 0.3, 5.0, 'marbleShade', { x: nx, y: 5.0, z: nz }, { collide: false });
	balustrade(b, nx - 4.4, nx + 4.4, nz + 3.0, 0.8, { rail: 'marble', post: 'marbleShade' }, 0.7);

	// --- Sheesh Mahal (mirror palace) ---
	const sx = -9;
	const sz = -9 - 9;
	b.box(14, 0.7, 6, 'marble', { x: sx + 2, y: 0, z: sz + 1.4 }, {}, { top: { decor: 'marbleSlabs', tile: 1.5 } });
	const cusps = [-4, -2, 0, 2, 4].map((x) => ({ x, w: 1.5, h: 3.0, rise: 0.75 }));
	b.archWall(11, 4.6, 0.5, cusps, { decor: 'marbleInlay', tile: 2 }, { x: sx + 2, y: 0.7, z: sz + 3.2 }, { sideLook: 'marbleShade' });
	b.box(11, 4.6, 0.5, { decor: 'mirrorMosaic', tile: 1.6 }, { x: sx + 2, y: 0.7, z: sz - 0.4 }, {}, { back: 'marble' });
	b.box(0.5, 4.6, 3.6, { decor: 'mirrorMosaic', tile: 1.6 }, { x: sx - 3.3, y: 0.7, z: sz + 1.4 });
	b.box(0.5, 4.6, 3.6, { decor: 'mirrorMosaic', tile: 1.6 }, { x: sx + 7.3, y: 0.7, z: sz + 1.4 });
	b.box(11.4, 0.4, 4.4, 'marble', { x: sx + 2, y: 5.3, z: sz + 1.4 }, { collide: true }, { bottom: { decor: 'mirrorMosaic', tile: 1.2 } });
	b.merlons(11.4, 0.5, 'marble', { x: sx + 2, y: 5.7, z: sz + 3.5 });

	// gardens, cypress-like ashoka trees, fountains
	for (const [x, z] of [[8, 14], [12, 6], [8, -2], [12, 16], [-12, 2], [-4, 2], [4, 19], [13, -16], [5, -18]] as const) tree(b, x, z, 1.0, 'ashoka');
	for (const [x, z] of [[9, 10], [-3, -2]] as const) tree(b, x, z, 1.2, 'neem');
	for (const z of [-15, 2, 17]) lampPost(b, 2.6, z, 3.8);
	b.prism(1.6, 0.4, 8, 'marble', { x: 6, y: 0, z: 8 }, { upright: true });
	b.prism(1.35, 0.42, 8, 'paintTurquoise', { x: 6, y: 0, z: 8 }, { upright: true, collide: false });

	ctx.bake(b, frame, 'lahore-fort');
	ctx.anchor('lahore-fort', frame, 0, 17.5, [0, 8, gz], 7);

	ctx.spot(frame, 2.6, gz + 3.4, 0, 'guard', { models: ['office-worker'], dialogue: 'fortGuard', name: 'Chowkidar Akram' });
	ctx.spot(frame, -2.0, 14.5, 120, 'visitor', { models: ['scout', 'female-scientist'], dialogue: 'fortGuide', name: 'Guide Sana' });
	ctx.spot(frame, -10, 17.6, 180, 'visitor', { models: ['young-lady', 'scout'], dialogue: 'naulakha' });
	ctx.spot(frame, -7, -14, 0, 'visitor', { models: ['male-scientist', 'female-scientist'], dialogue: 'sheeshMahal' });
	ctx.spot(frame, 3.5, dz + 1.5, 160, 'elder', { models: ['mountainman'], dialogue: 'diwanEAam' }, 1.1);
	ctx.path(frame, [[-1, 20], [-1, -3], [-14, -3], [-14, 8], [-1, 8]], true, 3, ['scout', 'young-lady', 'male-scientist', 'female-scientist']);

	buildHazuriBagh(ctx);
}

function buildHazuriBagh(ctx: WorldContext) {
	const { w, t, facing } = LANDMARKS.hazuriBagh;
	const frame = PlanetFrame.trail(w, t, facing);
	const b = new Builder(1818);
	const HX = 12;
	const HZ = 13;
	// paving and four lawns (charbagh)
	b.floor(HX * 2, HZ * 2, { decor: 'pavingStone', tile: 1.8 }, { x: 0, y: 0.04, z: 0 }, { collide: true });
	for (const sx of [-1, 1]) {
		for (const sz of [-1, 1]) {
			const cxp = sx * 6.2;
			const czp = sz * 6.7;
			b.box(9.6, 0.25, 10, 'curb', { x: cxp, y: 0, z: czp }, { collide: true });
			b.floor(9.2, 9.6, 'grass', { x: cxp, y: 0.26, z: czp }, { collide: true });
			for (let i = 0; i < 5; i++) b.box(1.2, 0.3, 0.5, i % 2 ? 'marigold' : 'flowerPink', { x: cxp - 3.6 + i * 1.8, y: 0.26, z: czp + sz * -4.4 }, { collide: false });
			tree(b, cxp + sx * 2.6, czp + sz * 2.6, 0.9, 'palm');
			tree(b, cxp - sx * 2.4, czp + sz * 2.4, 0.55, 'neem');
		}
	}
	// Baradari: white marble pavilion on a plinth
	b.box(10.4, 1.1, 10.4, 'marble', { x: 0, y: 0, z: 0 }, {}, { top: { decor: 'marbleSlabs', tile: 1.5 } });
	for (const side of [-1, 1]) b.stairs(2.6, 3, 1.1 / 3, 0.45, 'marbleShade', { x: 0, y: 0, z: side * (5.2 + 1.35), ry: side > 0 ? Math.PI : 0 }, {});
	const arches = [-2.6, 0, 2.6].map((x) => ({ x, w: 1.9, h: 3.0, rise: 0.8 }));
	for (const [ry, x, z] of [[0, 0, 4.4], [Math.PI, 0, -4.4], [Math.PI / 2, 4.4, 0], [-Math.PI / 2, -4.4, 0]] as const) {
		b.archWall(9.2, 4.4, 0.5, arches, { decor: 'marbleInlay', tile: 2 }, { x, y: 1.1, z, ry }, { sideLook: 'marbleShade' });
	}
	b.box(9.8, 0.4, 9.8, 'marble', { x: 0, y: 5.5, z: 0 }, { collide: true }, { bottom: { decor: 'marbleInlay', tile: 2.5 } });
	b.box(10.6, 0.15, 10.6, 'marbleShade', { x: 0, y: 5.35, z: 0 }, { collide: false });
	for (const side of [-1, 1]) {
		balustrade(b, -4.6, 4.6, side * 4.7, 5.9, { rail: 'marble', post: 'marbleShade' }, 0.7);
		balustrade(b, -4.6, 4.6, side * 4.7, 5.9, { rail: 'marble', post: 'marbleShade' }, 0.7, Math.PI / 2);
	}
	b.prism(1.2, 0.5, 8, 'marble', { x: 0, y: 1.1, z: 0 }, { upright: true });
	b.prism(0.95, 0.52, 8, 'paintTurquoise', { x: 0, y: 1.1, z: 0 }, { upright: true, collide: false });
	// lamp posts around the garden
	for (const [x, z] of [[-11, -12], [11, -12], [-11, 12], [11, 12], [0, -12], [0, 12]] as const) lampPost(b, x, z, 4.2, { pole: 'iron', lamp: 'lantern' });

	// Roshnai Gate on the south side (towards the royal trail)
	const rx = HX + 0.6;
	b.archWall(9, 7.6, 2.0, [{ x: 0, w: 3.0, h: 5.4, rise: 1.6 }], { decor: 'brickRed', tile: 1.5 }, { x: rx, y: 0, z: 0, ry: Math.PI / 2 }, { sideLook: 'brickDark' });
	b.archFrame(3.0, 5.4, 0.3, 'lime', { x: rx + 1.05, y: 0, z: 0, ry: Math.PI / 2 }, { rise: 1.6 });
	b.merlons(9, 0.7, 'brickDark', { x: rx, y: 7.6, z: 0, ry: Math.PI / 2 });
	b.floor(2.0, 3.0, 'pavingStone', { x: rx, y: 0.06, z: 0 }, { collide: true });
	for (const side of [-1, 1]) {
		b.archWall(HZ - 4.5, 2.2, 0.5, [], 'brick', { x: rx, y: 0, z: side * (4.5 + (HZ - 4.5) / 2), ry: Math.PI / 2 }, {});
	}
	// north low wall
	b.archWall(HZ * 2, 2.2, 0.5, [], 'brick', { x: -HX - 0.3, y: 0, z: 0, ry: Math.PI / 2 }, {});

	// Allama Iqbal's tomb by the Badshahi steps (red sandstone)
	const ix = 7.5;
	const iz = 10.2;
	b.box(5, 0.6, 5, 'sandstoneDark', { x: ix, y: 0, z: iz }, {});
	b.box(4.2, 3.6, 4.2, { decor: 'sandstoneInlay', tile: 2 }, { x: ix, y: 0.6, z: iz });
	for (const [ry, ox, oz] of [[0, 0, 2.12], [Math.PI / 2, 2.12, 0], [-Math.PI / 2, -2.12, 0]] as const) {
		b.panel(1.4, 2.4, 'recessStone', { x: ix + ox, y: 0.7, z: iz + oz, ry }, { arch: 0.7 });
	}
	b.merlons(4.2, 0.5, 'sandstone', { x: ix, y: 4.2, z: iz + 2.0 });
	b.box(4.4, 0.25, 4.4, 'sandstoneDark', { x: ix, y: 4.2, z: iz }, { collide: false });

	ctx.bake(b, frame, 'hazuri-bagh');
	ctx.spot(frame, -1.6, -6.6, 60, 'elder', { models: ['mountainman', 'oldwoman'], dialogue: 'hazuriBagh', sit: true }, 0.3);
	ctx.spot(frame, ix - 2.8, iz + 0.4, 90, 'visitor', { models: ['male-scientist', 'scout'], dialogue: 'iqbal' });
	ctx.spot(frame, rx - 2.2, 1.8, 270, 'vendor', { models: ['boss'], dialogue: 'chanaSeller' });
	ctx.path(frame, [[-10.6, -11.6], [10.6, -11.6], [10.6, 11.6], [-10.6, 11.6]], true, 3, ['young-lady', 'male-scientist', 'threekid', 'female-scientist']);
	ctx.path(frame, [[rx + 4, 0.8], [rx - 1, 0.8], [0, 6.5], [-12, 6.5]], false, 1);
}
