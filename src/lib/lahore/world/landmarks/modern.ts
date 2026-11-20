import { PlanetFrame } from '../../core/planet';
import { Builder, type Look } from '../../geometry/builder';
import type { PaletteKey } from '../../render/palette';
import { lampPost, tree } from '../common';
import type { WorldContext } from '../context';
import { LANDMARKS } from '../layout';

/**
 * Lahore Junction railway station (1859–60): the red-brick fortified station in the
 * Mughal-Gothic style. Two massive crenellated towers with turrets flank an arched porch
 * and a walk-through booking hall under the clock tower; long two-storey wings end in
 * smaller towers. Behind it: two platforms under green canopies, a footbridge, three tracks,
 * a Pakistan Railways express at platform 1 and goods wagons on the far line.
 * Local frame: +Z faces south (the Delhi Gate chowk), the tracks run along X.
 */
export function buildRailwayStation(ctx: WorldContext) {
	const { w, t, facing } = LANDMARKS.railwayStation;
	const frame = PlanetFrame.trail(w, t, facing);
	const b = new Builder(1860);
	const brick: Look = { decor: 'brickRed', tile: 1.5 };
	const D = 10; // depth of the main range (z -5..5)
	const WING_H = 9;

	// ---- forecourt (stops at the Delhi Gate chowk garden) ----
	b.floor(56, 5.0, { decor: 'pavingStone', tile: 1.8 }, { x: 0, y: 0.03, z: D / 2 + 2.5 }, { collide: true });
	for (const side of [-1, 1]) {
		tree(b, side * 24, 8.6, 1.0, 'palm');
		for (const x of [5.2, 11, 19]) lampPost(b, side * x, 9.0, 4.2);
		b.box(2.2, 0.45, 0.55, 'woodDark', { x: side * 13.6, y: 0, z: 6.4 }, { collide: true });
	}
	// a pair of rickshaws waiting for passengers
	for (const [x, ry, color] of [[-17.5, 1.45, 'rickshawGreen'], [-21, 1.6, 'rickshawYellow']] as const) {
		b.box(1.3, 1.0, 2.2, color, { x, y: 0.35, z: 8.2, ry }, { collide: true });
		b.box(1.4, 0.1, 2.0, 'black', { x, y: 1.85, z: 8.2, ry }, { collide: false });
		b.box(1.2, 0.5, 0.9, 'black', { x: x + Math.sin(ry) * 0.4, y: 1.35, z: 8.2 + Math.cos(ry) * 0.4, ry }, { collide: false });
		for (const [lx, lz] of [[-0.6, -0.7], [0.6, -0.7], [0, 0.95]]) {
			b.cylinder(0.3, 0.12, 'charcoal', { x: x + Math.cos(ry) * lx + Math.sin(ry) * lz, y: 0.05, z: 8.2 - Math.sin(ry) * lx + Math.cos(ry) * lz, rz: Math.PI / 2, ry }, { segments: 10, collide: false, upright: false });
		}
	}

	// ---- wings: two storeys of arches, battlements ----
	for (const side of [-1, 1]) {
		const cx = side * 16;
		b.box(13, WING_H, D, brick, { x: cx, y: 0, z: 0 }, {}, { top: 'brickDark' });
		for (let i = 0; i < 4; i++) {
			const x = cx + (i - 1.5) * 3.1;
			b.panel(2.1, 3.3, 'recess', { x, y: 0.2, z: D / 2 + 0.02 }, { arch: 0.9 });
			b.archFrame(2.1, 3.3, 0.2, 'lime', { x, y: 0.2, z: D / 2 + 0.05 }, { rise: 0.9 });
			b.panel(1.3, 1.9, { decor: 'windowArched' }, { x, y: 5.2, z: D / 2 + 0.03 }, { arch: 0.55 });
			b.panel(1.3, 1.9, { decor: 'windowArched' }, { x, y: 5.2, z: -D / 2 - 0.03, ry: Math.PI }, { arch: 0.55 });
		}
		b.box(13.1, 0.3, 0.3, 'lime', { x: cx, y: 4.3, z: D / 2 + 0.1 }, { collide: false });
		b.box(13.4, 0.4, D + 0.4, 'lime', { x: cx, y: WING_H - 0.4, z: 0 }, { collide: false });
		b.merlons(13, 0.9, 'brickDark', { x: cx, y: WING_H, z: D / 2 - 0.1 });
		b.merlons(13, 0.9, 'brickDark', { x: cx, y: WING_H, z: -D / 2 + 0.1 });

		// end towers with two turrets
		const ex = side * 24.75;
		b.box(4.5, 13, D + 1, brick, { x: ex, y: 0, z: 0 }, {}, { top: 'brickDark' });
		for (const y of [2.5, 6.5, 10]) b.panel(1.1, 1.8, { decor: 'windowArched' }, { x: ex, y, z: D / 2 + 0.52 }, { arch: 0.45 });
		b.box(4.9, 0.4, D + 1.4, 'lime', { x: ex, y: 13, z: 0 }, { collide: false });
		b.merlons(4.6, 0.9, 'brickDark', { x: ex, y: 13.4, z: D / 2 + 0.4 });
		for (const tz of [D / 2 + 0.5, -D / 2 - 0.5]) {
			const tx = ex + side * 2.25;
			b.prism(0.6, 15, 8, brick, { x: tx, y: 0, z: tz }, { upright: true });
			b.prism(0.78, 0.35, 8, 'lime', { x: tx, y: 15, z: tz }, { upright: true, collide: false });
			b.dome(0.65, 0.95, 'hemi', 'brickLight', { x: tx, y: 15.35, z: tz });
			b.finial(0.5, 'brass', { x: tx, y: 16.3, z: tz });
		}
	}

	// ---- the twin towers that make the station a fortress ----
	for (const side of [-1, 1]) {
		const tx = side * 7;
		b.box(5, 17, D + 1, brick, { x: tx, y: 0, z: 0 }, {}, { top: 'brickDark' });
		for (const y of [6, 12]) b.box(5.2, 0.3, D + 1.2, 'lime', { x: tx, y, z: 0 }, { collide: false });
		for (const y of [2.6, 7.6, 12.8]) {
			b.panel(1.3, 2.1, { decor: 'windowArched' }, { x: tx, y, z: D / 2 + 0.52 }, { arch: 0.55 });
			b.panel(1.3, 2.1, { decor: 'windowArched' }, { x: tx + side * 2.52, y, z: 0, ry: side * Math.PI / 2 }, { arch: 0.55 });
		}
		// loopholes
		for (const lx of [-1.6, 1.6]) for (const y of [9.6, 14.8]) b.panel(0.22, 1.0, 'recess', { x: tx + lx, y, z: D / 2 + 0.52 }, { collide: false });
		b.box(5.4, 0.45, D + 1.4, 'lime', { x: tx, y: 17, z: 0 }, { collide: false });
		b.merlons(5.2, 1.0, 'brickDark', { x: tx, y: 17.45, z: D / 2 + 0.4 });
		b.merlons(5.2, 1.0, 'brickDark', { x: tx, y: 17.45, z: -D / 2 - 0.4 });
		for (const [cx, cz] of [[-2.5, D / 2 + 0.5], [2.5, D / 2 + 0.5], [-2.5, -D / 2 - 0.5], [2.5, -D / 2 - 0.5]] as const) {
			b.prism(0.78, 19.5, 8, brick, { x: tx + cx, y: 0, z: cz }, { upright: true });
			b.prism(0.98, 0.4, 8, 'lime', { x: tx + cx, y: 19.5, z: cz }, { upright: true, collide: false });
			b.dome(0.85, 1.2, 'hemi', 'brickLight', { x: tx + cx, y: 19.9, z: cz });
			b.finial(0.7, 'brass', { x: tx + cx, y: 21.1, z: cz });
		}
	}

	// ---- porch and the walk-through booking hall ----
	const pz = D / 2 + 3.4;
	b.archWall(9, 7, 0.6, [
		{ x: -3, w: 2.1, h: 4.4, rise: 1.0 },
		{ x: 0, w: 2.7, h: 5.2, rise: 1.3 },
		{ x: 3, w: 2.1, h: 4.4, rise: 1.0 }
	], brick, { x: 0, y: 0, z: pz }, { sideLook: 'lime' });
	for (const side of [-1, 1]) b.archWall(3.4, 7, 0.5, [{ x: 0, w: 1.9, h: 4.2, rise: 0.9 }], brick, { x: side * 4.25, y: 0, z: D / 2 + 1.7, ry: Math.PI / 2 }, { sideLook: 'lime' });
	b.box(9.2, 0.5, 3.9, 'brickDark', { x: 0, y: 7, z: D / 2 + 1.75 }, { collide: true }, { top: 'lime' });
	b.merlons(9, 0.8, 'brickDark', { x: 0, y: 7.5, z: pz });
	b.panel(7.4, 0.95, { decor: 'stationSign' }, { x: 0, y: 5.95, z: pz + 0.32 }, { collide: false });
	b.floor(9, 3.4, { decor: 'pavingStone', tile: 1.4 }, { x: 0, y: 0.05, z: D / 2 + 1.7 }, { collide: false });
	// hall: front and back walls with tall arches, roof, ticket windows inside
	for (const z of [D / 2 - 0.3, -D / 2 + 0.3]) b.archWall(9, WING_H, 0.6, [{ x: 0, w: 4.0, h: 5.6, rise: 1.6 }], brick, { x: 0, y: 0, z }, { sideLook: 'lime' });
	b.box(9, 0.6, D, 'brickDark', { x: 0, y: WING_H, z: 0 }, { collide: true }, { bottom: 'lime' });
	b.floor(9, D, { decor: 'marbleSlabs', tile: 1.5 }, { x: 0, y: 0.05, z: 0 }, { collide: false });
	b.box(0.6, 1.15, 3.6, 'woodDark', { x: -3.9, y: 0, z: 0 }, { collide: true }, { top: 'woodLight' });
	b.panel(2.6, 0.62, { decor: 'signTickets' }, { x: -4.48, y: 2.5, z: 0, ry: Math.PI / 2 }, { collide: false });
	b.box(0.5, 0.45, 2.6, 'woodDark', { x: 3.6, y: 0, z: 0 }, { collide: true });
	b.box(3.6, 1.0, 0.12, 'charcoal', { x: 0, y: 6.6, z: -D / 2 + 0.7 }, { collide: false });
	b.panel(3.3, 0.7, { decor: 'platformSign' }, { x: 0, y: 6.75, z: -D / 2 + 0.77 }, { collide: false });

	// clock tower over the hall
	b.box(5, 6.5, 5, brick, { x: 0, y: WING_H + 0.6, z: 0.4 }, {}, { top: 'brickDark' });
	for (const [z, ry] of [[2.92, 0], [-2.12, Math.PI]] as const) {
		b.cylinder(1.35, 0.15, 'white', { x: 0, y: WING_H + 4.2, z, rx: Math.PI / 2, ry }, { segments: 20, collide: false, upright: false });
		const dz = ry ? -0.09 : 0.09;
		b.box(0.12, 1.0, 0.06, 'black', { x: 0, y: WING_H + 4.2, z: z + dz }, { collide: false });
		b.box(0.75, 0.12, 0.06, 'black', { x: 0.32, y: WING_H + 4.15, z: z + dz }, { collide: false });
	}
	b.merlons(5, 0.7, 'brickDark', { x: 0, y: WING_H + 7.1, z: 2.85 });
	b.chhatri(1.5, 3.8, { pillar: 'lime', roof: 'brickDark', dome: 'brickLight', finial: 'brass' }, { x: 0, y: WING_H + 7.1, z: 0.4 }, { pillars: 8 });

	// ---- platforms, canopies, footbridge ----
	const P_H = 0.45; // one easy step up from the tracks
	const platforms = [
		{ z: -7.25, d: 4.5 },
		{ z: -15.2, d: 4.0 }
	];
	const tracks = [-11.3, -19.1, -22.6];
	for (const p of platforms) {
		b.box(54, P_H, p.d, 'curb', { x: 0, y: 0, z: p.z }, { collide: true }, { top: { decor: 'pavingStone', tile: 1.6 } });
		for (const edge of [p.z - p.d / 2 + 0.2, p.z + p.d / 2 - 0.2]) b.floor(54, 0.22, 'awningYellow', { x: 0, y: P_H + 0.01, z: edge }, { collide: false });
		// canopy on cast-iron columns (clear of the footbridge stairs)
		const cz = p.z - (p === platforms[0] ? 0.3 : 0);
		for (let x = -24; x <= 12; x += 4.5) {
			b.prism(0.12, 3.9, 8, 'iron', { x, y: P_H, z: cz }, { upright: true });
			b.box(0.5, 0.3, 0.5, 'iron', { x, y: P_H + 3.6, z: cz }, { collide: false });
		}
		for (const s of [-1, 1]) {
			b.box(39, 0.14, p.d * 0.62, 'shutterGrey', { x: -6, y: P_H + 3.95, z: cz + s * p.d * 0.27, rx: s * 0.12 }, { collide: false }, { bottom: 'paintGreen' });
		}
		b.box(39, 0.3, 0.3, 'paintGreen', { x: -6, y: P_H + 3.85, z: cz }, { collide: false });
		// hanging boards and the yellow station name boards
		for (const x of [-18, -4]) b.panel(3.0, 0.62, { decor: 'platformSign' }, { x, y: P_H + 2.85, z: cz + 0.05 }, { collide: false });
		for (const x of [-22, 6]) {
			for (const dx of [-1.6, 1.6]) b.box(0.1, 2.4, 0.1, 'iron', { x: x + dx, y: P_H, z: p.z }, { collide: false });
			b.panel(3.4, 0.75, { decor: 'stationSign' }, { x, y: P_H + 1.9, z: p.z + 0.06 }, { collide: false });
			b.panel(3.4, 0.75, { decor: 'stationSign' }, { x, y: P_H + 1.9, z: p.z - 0.06, ry: Math.PI }, { collide: false });
		}
		// benches
		for (const x of [-15, -9, 0]) b.box(2.0, 0.45, 0.5, 'woodDark', { x, y: P_H, z: p.z + p.d / 2 - 1.0 }, { collide: true }, { top: 'woodLight' });
		// footbridge stairs
		b.stairs(1.6, 12, 0.45, 0.5, 'curb', { x: 15, y: P_H, z: p.z, ry: Math.PI / 2 }, {});
		b.box(1.8, 12 * 0.45, 1.8, 'curb', { x: 21.9, y: P_H, z: p.z }, { collide: true }, { top: { decor: 'pavingStone', tile: 1.2 } });
	}
	const deckY = P_H + 12 * 0.45;
	b.box(1.8, 0.3, platforms[0].z - platforms[1].z, 'curb', { x: 21.9, y: deckY - 0.3, z: (platforms[0].z + platforms[1].z) / 2 }, { collide: true }, { bottom: 'iron' });
	for (const s of [-1, 1]) b.box(0.08, 1.0, platforms[0].z - platforms[1].z + 1.8, 'iron', { x: 21.9 + s * 0.88, y: deckY, z: (platforms[0].z + platforms[1].z) / 2 }, { collide: true });
	b.box(2.2, 0.15, platforms[0].z - platforms[1].z + 2.2, 'paintGreen', { x: 21.9, y: deckY + 2.2, z: (platforms[0].z + platforms[1].z) / 2 }, { collide: false });
	// chai stall and a water cooler on platform 1
	b.box(2.2, 2.0, 1.2, 'woodDark', { x: -11.5, y: P_H, z: -6.0 }, { collide: true }, { front: 'paintCream' });
	b.box(2.6, 0.12, 1.7, 'awningRed', { x: -11.5, y: P_H + 2.1, z: -5.9 }, { collide: false });
	b.panel(1.9, 0.48, { decor: 'signChai' }, { x: -11.5, y: P_H + 1.4, z: -5.38 }, { collide: false });
	b.cylinder(0.32, 1.1, 'steel', { x: 8, y: P_H, z: -5.8 }, { segments: 10 });

	// ---- tracks: ballast, sleepers and broad-gauge rails ----
	for (const z of tracks) {
		b.floor(58, 3.0, 'dirt', { x: 0, y: 0.02, z }, { collide: false });
		for (let x = -28.5; x <= 28.5; x += 0.95) b.box(0.28, 0.07, 2.5, 'woodDark', { x, y: 0.02, z }, { collide: false });
		for (const r of [-0.84, 0.84]) b.box(58, 0.14, 0.09, 'steel', { x: 0, y: 0.08, z: z + r }, { collide: false });
	}
	b.box(58, 1.3, 0.3, brick, { x: 0, y: 0, z: -24.6 }, { collide: true }, { top: 'lime' });

	// ---- the Green Line Express at platform 1 ----
	const tz = tracks[0];
	locomotive(b, 13, tz);
	for (let i = 0; i < 3; i++) coach(b, 6.55 - i * 12.15, tz);
	// goods wagons on the far line
	for (let i = 0; i < 3; i++) wagon(b, -14 + i * 9.4, tracks[2], i);

	ctx.bake(b, frame, 'railway-station');
	ctx.anchor('railway-station', frame, 0, D / 2 + 4.2, [0, 10, 3], 6.5);
	ctx.spot(frame, 2.6, 6.6, 180, 'guard', { models: ['office-worker'], dialogue: 'stationMaster', name: 'Station Master Iqbal' });
	ctx.spot(frame, -6.5, -6.4, 160, 'shopkeeper', { models: ['factory-worker-c'], dialogue: 'coolie', name: 'Coolie Rasheed' }, P_H);
	ctx.spot(frame, -11.5, -5.0, 0, 'vendor', { models: ['boss'], dialogue: 'chai' }, P_H);
	ctx.shop(frame, -11.5, -4.8, 'Station chai stall', 'چائے', 'Doodh patti in a clay cup while you wait for the Karachi Express.');
	ctx.spot(frame, 19.5, -8.4, 270, 'guard', { models: ['office-worker', 'male-scientist'], dialogue: 'trainGuard', name: 'Guard Sahib' }, P_H);
	for (const [x, z, f, sit] of [
		[4, -6.0, 200, false],
		[-1.0, -8.3, 0, false],
		[-15, -5.5, 180, true],
		[-9, -5.5, 180, true],
		[2.5, -14.3, 20, false],
		[-6, -16.3, 160, false],
		[0, -14.2, 0, true]
	] as const) {
		ctx.spot(frame, x, z, f, 'visitor', { models: ['female-scientist', 'male-scientist', 'scout', 'boss', 'factory-worker-b'], dialogue: 'passenger', sit }, P_H);
	}
	ctx.path(frame, [[-24, 8.6], [24, 8.6]], false, 3);
	ctx.path(frame, [[-24, -6.8], [12, -6.8]], false, 3, ['male-scientist', 'female-scientist', 'office-worker'], P_H + 0.03);
}

/** Pakistan Railways diesel-electric: long hood, cab, short nose, two three-axle bogies. Front at +X. */
function locomotive(b: Builder, x0: number, z: number) {
	const L = 13;
	const cx = x0 + L / 2;
	b.box(L, 0.5, 2.8, 'charcoal', { x: cx, y: 0.75, z }, { collide: true });
	b.box(L + 0.1, 0.12, 2.9, 'awningYellow', { x: cx, y: 1.22, z }, { collide: false });
	b.box(4.2, 0.6, 2.0, 'charcoal', { x: cx - 0.4, y: 0.2, z }, { collide: false });
	// long hood with the livery, cab, nose
	b.box(8.4, 2.3, 2.2, 'flagGreen', { x: x0 + 4.5, y: 1.25, z }, { collide: true }, { front: { decor: 'locoSide' }, back: { decor: 'locoSide' }, top: 'charcoal' });
	b.box(2.7, 2.85, 2.85, 'flagGreen', { x: x0 + 10.1, y: 1.25, z }, { collide: true }, { top: 'charcoal', front: 'flagGreen' });
	b.box(2.9, 0.18, 3.0, 'charcoal', { x: x0 + 10.1, y: 4.1, z }, { collide: false });
	for (const s of [-1, 1]) {
		b.panel(1.5, 0.85, 'glass', { x: x0 + 10.3, y: 2.95, z: z + s * 1.44, ry: s > 0 ? 0 : Math.PI }, { collide: false });
		b.box(2.75, 0.18, 0.04, 'awningYellow', { x: x0 + 10.1, y: 2.6, z: z + s * 1.44 }, { collide: false });
		b.box(8.4, 0.05, 0.05, 'steel', { x: x0 + 4.5, y: 2.3, z: z + s * 1.36 }, { collide: false });
		for (let k = 0; k < 5; k++) b.box(0.05, 1.0, 0.05, 'steel', { x: x0 + 0.6 + k * 1.95, y: 1.3, z: z + s * 1.36 }, { collide: false });
	}
	for (const dz of [-0.6, 0.6]) b.panel(0.95, 0.8, 'glass', { x: x0 + 11.47, y: 2.95, z: z + dz, ry: Math.PI / 2 }, { collide: false });
	b.box(1.7, 1.6, 2.3, 'flagGreen', { x: x0 + 12.3, y: 1.25, z }, { collide: true }, { top: 'charcoal' });
	b.panel(2.2, 1.1, { decor: 'truckChevron' }, { x: x0 + 13.16, y: 1.4, z, ry: Math.PI / 2 }, { collide: false });
	for (const dz of [-0.75, 0.75]) b.cylinder(0.14, 0.12, 'bulb', { x: x0 + 13.2, y: 2.55, z: z + dz, rz: Math.PI / 2 }, { segments: 10, collide: false, upright: false });
	b.cylinder(0.18, 0.12, 'bulb', { x: x0 + 11.5, y: 3.85, z, rz: Math.PI / 2 }, { segments: 10, collide: false, upright: false });
	// roof: radiator fans, exhaust and horn
	for (const fx of [x0 + 1.2, x0 + 2.6]) b.cylinder(0.5, 0.14, 'charcoal', { x: fx, y: 3.55, z }, { segments: 12, collide: false });
	b.box(0.5, 0.45, 0.35, 'charcoal', { x: x0 + 6.4, y: 3.55, z }, { collide: false });
	b.cylinder(0.08, 0.5, 'steel', { x: x0 + 9.4, y: 4.28, z: z + 0.4, rz: Math.PI / 2 }, { segments: 6, collide: false, upright: false });
	// pilot, buffers, coupler
	b.box(0.3, 0.55, 2.6, 'awningYellow', { x: x0 + L - 0.1, y: 0.25, z }, { collide: false });
	for (const end of [x0 - 0.1, x0 + L + 0.1]) {
		for (const dz of [-0.85, 0.85]) b.cylinder(0.17, 0.4, 'steel', { x: end, y: 0.95, z: z + dz, rz: Math.PI / 2 }, { segments: 8, collide: false, upright: false });
		b.box(0.35, 0.25, 0.35, 'charcoal', { x: end, y: 0.85, z }, { collide: false });
	}
	// two three-axle bogies
	for (const bx of [x0 + 2.4, x0 + L - 2.6]) {
		b.box(3.6, 0.5, 2.5, 'iron', { x: bx, y: 0.3, z }, { collide: false });
		for (const ax of [-1.2, 0, 1.2]) for (const s of [-1, 1]) b.cylinder(0.48, 0.14, 'steel', { x: bx + ax, y: 0.48, z: z + s * 0.92, rx: Math.PI / 2 }, { segments: 12, collide: false, upright: false });
	}
}

/** Pakistan Railways passenger coach (green and yellow livery), centred at x. */
function coach(b: Builder, x: number, z: number) {
	const L = 11.6;
	b.box(L, 2.75, 2.85, 'flagGreen', { x, y: 1.0, z }, { collide: true }, { front: { decor: 'coachSide' }, back: { decor: 'coachSide' }, left: 'charcoal', right: 'charcoal', top: 'shutterGrey' });
	b.box(L - 0.2, 0.25, 2.55, 'shutterGrey', { x, y: 3.75, z }, { collide: false });
	b.box(L - 0.6, 0.18, 1.8, 'shutterGrey', { x, y: 4.0, z }, { collide: false });
	for (let k = 0; k < 4; k++) b.box(0.5, 0.2, 0.5, 'charcoal', { x: x - 4.2 + k * 2.8, y: 4.18, z }, { collide: false });
	b.box(L - 1.2, 0.4, 2.3, 'charcoal', { x, y: 0.6, z }, { collide: false });
	b.box(2.6, 0.45, 1.6, 'iron', { x, y: 0.2, z }, { collide: false });
	for (const s of [-1, 1]) {
		b.box(0.55, 2.2, 1.6, 'charcoal', { x: x + s * (L / 2 + 0.25), y: 1.15, z }, { collide: false });
		for (const dx of [-L / 2 + 0.35, L / 2 - 0.35]) b.box(0.55, 0.06, 0.3, 'steel', { x: x + dx, y: 0.75, z: z + s * 1.55 }, { collide: false });
	}
	for (const bx of [x - 3.9, x + 3.9]) {
		b.box(2.6, 0.4, 2.3, 'iron', { x: bx, y: 0.3, z }, { collide: false });
		for (const ax of [-0.75, 0.75]) for (const s of [-1, 1]) b.cylinder(0.45, 0.12, 'steel', { x: bx + ax, y: 0.45, z: z + s * 0.92, rx: Math.PI / 2 }, { segments: 12, collide: false, upright: false });
	}
}

/** Covered goods wagon on the far line. */
function wagon(b: Builder, x: number, z: number, i: number) {
	b.box(8.2, 2.5, 2.7, i % 2 ? 'brickDark' : 'woodDark', { x, y: 0.9, z }, { collide: true }, { top: 'shutterGrey' });
	for (const s of [-1, 1]) {
		b.box(1.8, 2.0, 0.06, 'charcoal', { x, y: 1.1, z: z + s * 1.37 }, { collide: false });
		for (const dx of [-3, 3]) b.box(0.08, 2.3, 0.06, 'iron', { x: x + dx, y: 1.0, z: z + s * 1.37 }, { collide: false });
	}
	b.box(7.6, 0.35, 2.2, 'charcoal', { x, y: 0.55, z }, { collide: false });
	for (const bx of [x - 2.6, x + 2.6]) {
		for (const ax of [-0.7, 0.7]) for (const s of [-1, 1]) b.cylinder(0.42, 0.12, 'steel', { x: bx + ax, y: 0.42, z: z + s * 0.92, rx: Math.PI / 2 }, { segments: 10, collide: false, upright: false });
	}
}

/**
 * Gaddafi Stadium (1959): a bowl of seven climbable tiers in coloured enclosures behind
 * Nayyar Ali Dada's two-storey red-brick arcade, a cantilevered roof and the glass-fronted
 * pavilion on the south stand, a scoreboard, four floodlight masts, and the main gate with a
 * tunnel straight onto the outfield. Local frame: +Z faces north (towards Delhi Gate chowk).
 */
export function buildGaddafiStadium(ctx: WorldContext) {
	const { w, t, facing } = LANDMARKS.gaddafiStadium;
	const frame = PlanetFrame.trail(w, t, facing);
	const b = new Builder(1959);
	const A = 12.5; // boundary semi-axes (east-west, north-south)
	const B = 9.5;
	const N = 56;
	const tiers = 7;
	const rise = 0.5; // climbable steps
	const run = 0.85;
	const gap0 = 1.0; // walkway between the boundary boards and the first tier
	const conc = 1.2; // concourse behind the top tier
	const wallOff = gap0 + tiers * run + conc + 0.3;
	const topH = tiers * rise;
	const brick: Look = { decor: 'brickRed', tile: 1.5 };
	const sectors: PaletteKey[] = ['paintGreen', 'awningYellow', 'paintBlue', 'awningRed', 'paintGreen', 'paintOrange', 'tileTurquoise'];
	const ads: PaletteKey[] = ['paintBlue', 'awningRed', 'awningYellow', 'paintGreen', 'white'];
	const step = (Math.PI * 2) / N;
	const gateHalf = 0.17; // north gap for the gate tunnel
	const pavilionHalf = 0.3; // south: the pavilion replaces the tiers

	/** Point on the boundary ellipse at parameter `a`, pushed out along the normal by `d`. */
	const at = (a: number, d: number) => {
		const nx = Math.cos(a) / A;
		const nz = Math.sin(a) / B;
		const nl = Math.hypot(nx, nz);
		return { x: Math.cos(a) * A + (nx / nl) * d, z: Math.sin(a) * B + (nz / nl) * d, nx: nx / nl, nz: nz / nl };
	};
	/** A ring piece centred at parameter `a`, offset `d`: position, rotation and arc length. */
	const piece = (a: number, d: number) => {
		const p0 = at(a - step / 2, d);
		const p1 = at(a + step / 2, d);
		const c = at(a, d);
		const tx = p1.x - p0.x;
		const tz = p1.z - p0.z;
		return { x: c.x, z: c.z, ry: Math.atan2(-tz, tx), len: Math.hypot(tx, tz) * 1.04 + 0.04, nx: c.nx, nz: c.nz };
	};
	const near = (a: number, centre: number, half: number) => Math.abs(Math.atan2(Math.sin(a - centre), Math.cos(a - centre))) < half;

	// outfield with mowing stripes, the pitch along the east-west axis, sight screens
	b.floor(A * 2 + 1.5, B * 2 + 1.5, 'grass', { x: 0, y: 0.03, z: 0 }, { collide: true });
	for (let i = 0; i < 8; i++) b.floor((A * 2) / 16, B * 2, i % 2 ? 'grassDark' : 'grass', { x: -A + ((i * 2 + 0.5) * A * 2) / 16, y: 0.04, z: 0 }, { collide: false });
	b.floor(6.4, 1.5, 'dirt', { x: 0, y: 0.05, z: 0 }, { collide: false });
	for (const x of [-2.5, 2.5]) b.floor(0.07, 1.5, 'white', { x, y: 0.06, z: 0 }, { collide: false });
	for (const x of [-2.9, 2.9]) {
		for (const z of [-0.16, 0, 0.16]) b.prism(0.03, 0.7, 4, 'white', { x, y: 0.05, z }, { collide: false });
		b.box(0.36, 0.03, 0.03, 'woodLight', { x, y: 0.72, z: 0, ry: Math.PI / 2 }, { collide: false });
	}
	for (const x of [-(A - 0.6), A - 0.6]) b.box(0.25, 2.6, 4.2, 'white', { x, y: 0, z: 0 }, { collide: true });

	for (let i = 0; i < N; i++) {
		const a = i * step;
		const gate = near(a, Math.PI / 2, gateHalf);
		const pavilion = near(a, -Math.PI / 2, pavilionHalf);
		const sector = sectors[Math.floor(i / 4) % sectors.length];
		if (!gate) {
			// advertising boards along the boundary (low enough to step over)
			const ad = piece(a, 0.45);
			b.box(ad.len, 0.42, 0.1, ads[i % ads.length], { x: ad.x, y: 0, z: ad.z, ry: ad.ry }, { collide: true }, { back: 'charcoal' });
		}
		if (!gate && !pavilion) {
			// seven tiers: coloured seats on the treads, white concrete risers
			for (let k = 0; k < tiers; k++) {
				const p = piece(a, gap0 + k * run + run / 2);
				b.box(p.len, rise * (k + 1), run, 'plasterWhite', { x: p.x, y: 0, z: p.z, ry: p.ry }, { collide: true }, { top: sector });
			}
			const c = piece(a, gap0 + tiers * run + conc / 2);
			b.box(c.len, topH, conc, 'curb', { x: c.x, y: 0, z: c.z, ry: c.ry }, { collide: true }, { back: 'brickDark' });
		}
		if (gate) continue;
		// outer façade: lower arcade, parapet, upper arcade, cornice
		const o = piece(a, wallOff);
		const place = { x: o.x, z: o.z, ry: o.ry };
		b.archWall(o.len, topH, 0.6, [{ x: 0, w: o.len * 0.62, h: topH - 0.6, rise: 0.8 }], brick, { ...place, y: 0 }, { sideLook: 'brickDark' });
		b.box(o.len, 1.0, 0.6, brick, { ...place, y: topH }, { collide: true }, { top: 'lime' });
		b.archWall(o.len, 2.3, 0.6, [{ x: 0, w: o.len * 0.5, h: 1.7, rise: 0.55 }], brick, { ...place, y: topH + 1.0 }, { sideLook: 'brickDark' });
		b.box(o.len + 0.1, 0.3, 0.9, 'lime', { ...place, y: topH + 3.3 }, { collide: false });
		// cantilevered roof over the south stands
		if (Math.sin(a) < -0.45 && !pavilion) {
			const r = piece(a, wallOff - 3.4);
			b.box(r.len, 0.22, 7.2, 'plasterWhite', { x: r.x, y: topH + 3.6, z: r.z, ry: r.ry }, { collide: false }, { bottom: 'steel' });
		}
	}

	// ---- main gate on the north, with the tunnel onto the outfield ----
	const gz = B + wallOff; // façade line at the north tip
	b.archWall(11, 9.4, 1.2, [{ x: 0, w: 4.4, h: 6.0, rise: 2.0 }], brick, { x: 0, y: 0, z: gz }, { sideLook: 'lime' });
	b.box(11.6, 0.5, 1.6, 'lime', { x: 0, y: 9.4, z: gz }, { collide: false });
	b.panel(8.4, 1.35, { decor: 'stadiumBanner' }, { x: 0, y: 6.85, z: gz + 0.62 }, { collide: false });
	b.panel(8.4, 1.35, { decor: 'stadiumBanner' }, { x: 0, y: 6.85, z: gz - 0.62, ry: Math.PI }, { collide: false });
	b.panel(2.6, 0.65, { decor: 'signEnclosure' }, { x: 0, y: 6.05, z: gz + 0.63 }, { collide: false });
	for (const s of [-1, 1]) {
		// pylons with flags
		b.box(2.0, 11.2, 2.0, brick, { x: s * 6.4, y: 0, z: gz }, { collide: true, upright: true }, { top: 'lime' });
		b.box(2.4, 0.4, 2.4, 'lime', { x: s * 6.4, y: 11.2, z: gz }, { collide: false, upright: true });
		b.prism(0.06, 3.4, 5, 'steel', { x: s * 6.4, y: 11.6, z: gz }, { upright: true, collide: false });
		b.panel(1.5, 0.95, 'flagGreen', { x: s * 6.4 + 0.75, y: 13.9, z: gz }, { collide: false });
		b.panel(0.38, 0.95, 'white', { x: s * 6.4 + 0.19, y: 13.9, z: gz + 0.01 }, { collide: false });
		// tunnel side walls (hide the ends of the tiers)
		b.box(1.3, topH + 0.1, gz - B - 1.4, 'plasterWhite', { x: s * 2.85, y: 0, z: (gz + B + 0.8) / 2 }, { collide: true }, { top: 'curb' });
		// ticket booths on the forecourt
		b.box(2.0, 2.4, 1.5, 'paintCream', { x: s * 7.2, y: 0, z: gz + 3.4 }, { collide: true }, { front: 'glass' });
		b.box(2.4, 0.18, 1.9, 'flagGreen', { x: s * 7.2, y: 2.4, z: gz + 3.4 }, { collide: false });
		b.panel(1.9, 0.48, { decor: 'signTickets' }, { x: s * 7.2, y: 1.85, z: gz + 4.16 }, { collide: false });
		lampPost(b, s * 9.6, gz + 5.2, 4.2, { pole: 'iron', lamp: 'lantern' });
		tree(b, s * 12.5, gz + 4.2, 1.0, 'palm');
		tree(b, s * 15.5, gz + 2.0, 1.05, 'neem');
	}
	// tunnel roof carries the concourse over the gate, paving through to the grass
	b.box(4.4, 0.3, 5.0, 'curb', { x: 0, y: topH, z: gz - 3.0 }, { collide: true }, { bottom: 'steel' });
	b.floor(4.4, gz - B + 0.4, { decor: 'pavingStone', tile: 1.4 }, { x: 0, y: 0.07, z: (gz + B) / 2 }, { collide: false });
	b.floor(16, 7.5, { decor: 'pavingStone', tile: 1.6 }, { x: 0, y: 0.04, z: gz + 4.2 }, { collide: false });

	// ---- pavilion on the south stand ----
	const pz = -(B + gap0 + (wallOff - gap0) / 2);
	const pd = wallOff - gap0 - 0.3;
	b.box(8.6, 9.0, pd, 'plasterWhite', { x: 0, y: 0, z: pz }, { collide: true }, { front: 'plasterWhite' });
	for (let f = 0; f < 3; f++) {
		const y = 0.4 + f * 2.9;
		b.panel(7.4, 2.0, f === 0 ? { decor: 'doorGreen' } : 'glass', { x: 0, y, z: pz + pd / 2 + 0.02 }, { collide: false });
		if (f > 0) {
			b.box(9.0, 0.18, 1.3, 'curb', { x: 0, y: y - 0.3, z: pz + pd / 2 + 0.65 }, { collide: true });
			b.box(9.0, 0.7, 0.06, 'iron', { x: 0, y: y - 0.12, z: pz + pd / 2 + 1.28 }, { collide: true });
		}
	}
	b.box(9.6, 0.4, pd + 1.6, 'flagGreen', { x: 0, y: 9.0, z: pz + 0.4 }, { collide: false });
	b.panel(7.6, 1.2, { decor: 'stadiumBanner' }, { x: 0, y: 9.45, z: pz + pd / 2 + 1.25 }, { collide: false });
	b.stairs(2.2, 3, 0.4, 0.5, 'curb', { x: 0, y: 0, z: pz + pd / 2 + 0.75 }, {});

	// ---- scoreboard on the west stand ----
	const sx = A + wallOff - 0.9;
	for (const z of [-2.6, 2.6]) b.box(0.3, 0.8, 0.3, 'iron', { x: sx, y: topH, z }, { collide: false });
	b.box(7.0, 3.6, 0.45, 'charcoal', { x: sx, y: topH + 0.8, z: 0, ry: -Math.PI / 2 }, { collide: false }, { front: { decor: 'scoreboard' } });

	// ---- floodlight masts behind the stands ----
	for (const a of [0.7, Math.PI - 0.7, Math.PI + 0.7, -0.7]) {
		const m = at(a, wallOff + 2.0);
		const len = Math.hypot(m.x, m.z);
		const dx = -m.x / len;
		const dz = -m.z / len;
		const ry = Math.atan2(dx, dz);
		b.prism(0.45, 23, 6, 'steel', { x: m.x, y: 0, z: m.z }, { upright: true, rTop: 0.25 });
		b.box(4.6, 2.8, 0.45, 'iron', { x: m.x, y: 22.6, z: m.z, ry }, { collide: false, upright: true });
		for (let i = 0; i < 5; i++) {
			for (let j = 0; j < 2; j++) {
				const o = (i - 2) * 0.82;
				b.box(0.62, 0.62, 0.12, 'bulb', { x: m.x + dz * o + dx * 0.28, y: 23.1 + j * 1.0, z: m.z - dx * o + dz * 0.28, ry }, { collide: false, upright: true });
			}
		}
	}

	ctx.bake(b, frame, 'gaddafi-stadium');
	ctx.anchor('gaddafi-stadium', frame, 0, gz + 4.6, [0, 7, gz], 7);

	// cricket in progress (the batters and bowler are driven by game/cricket.ts); only players on the field
	const players = ['scout', 'male-scientist', 'factory-worker-b', 'female-scientist'] as const;
	ctx.spot(frame, 2.5, 0.25, 270, 'visitor', { models: ['factory-worker-b'], dialogue: 'batsman', name: 'Chhota Babar' });
	ctx.spot(frame, -2.9, -0.65, 90, 'visitor', { models: ['male-scientist'], dialogue: 'batsman', name: 'Fakhar' });
	ctx.spot(frame, -9, 0.3, 90, 'visitor', { models: ['office-worker'], dialogue: 'bowler', name: 'Shaheen' });
	ctx.spot(frame, 4.1, 0.25, 270, 'visitor', { models: ['scout'], dialogue: 'fielder', name: 'Wicket-keeper' });
	ctx.spot(frame, -4.7, 0.75, 90, 'visitor', { models: ['boss'], name: 'Umpire sahib' });
	for (const [x, z, f] of [
		[7.5, 4.5, 240],
		[7.5, -4.5, 300],
		[-0.5, -6.8, 0],
		[-8.5, 4.2, 120],
		[-8.8, -3.6, 60],
		[2.5, 6.2, 200],
		[-1, 5, 180]
	] as const) {
		ctx.spot(frame, x, z, f, 'visitor', { models: [...players], dialogue: 'fielder' });
	}
	ctx.spot(frame, -7.2, gz + 4.6, 0, 'vendor', { models: ['boss', 'mountainman'], dialogue: 'ticket' });
	const rng = b.rng;
	for (let i = 0; i < 10; i++) {
		const a = (i / 10) * Math.PI * 2 + 0.2;
		if (near(a, Math.PI / 2, gateHalf + 0.1) || near(a, -Math.PI / 2, pavilionHalf + 0.1)) continue;
		const k = 1 + Math.floor(rng() * (tiers - 2));
		const p = at(a, gap0 + k * run + run / 2);
		const face = (Math.atan2(-p.nx, -p.nz) * 180) / Math.PI;
		ctx.spot(frame, p.x, p.z, face, 'visitor', { sit: true, models: ['young-lady', 'male-scientist', 'mountainman', 'threekid'] }, rise * (k + 1));
	}
}
