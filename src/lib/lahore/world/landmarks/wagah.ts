import { BSF, RANGER } from '../../characters/outfits';
import { PlanetFrame } from '../../core/planet';
import { Builder } from '../../geometry/builder';
import type { PaletteKey } from '../../render/palette';
import { lampPost, tree } from '../common';
import type { WorldContext } from '../context';
import { LANDMARKS } from '../layout';

/**
 * Local layout shared with the ceremony (game/wagah.ts).
 * -Z = Pakistan (the end you reach first along the trail), +Z = India.
 * -X = the city side (north), +X = the river side (south).
 */
export const WAGAH = {
	gateZ: 2.2, // the iron ceremony gates either side of the zero line
	hingeX: 4.2,
	flagPole: { x: -3.7, z: 3.2, height: 13 },
	homeZ: 12, // where the marching soldiers wait
	lineZ: 1.1
};

const ROAD_HALF = 4.2;
const STAND_IN = 4.9;
const TIERS = 10;
const RISE = 0.5;
const RUN = 0.85;
const STAND_FROM = 4.4;
const STAND_TO = 30;
const GATE_Z = 33;
const BACK = STAND_IN + TIERS * RUN + 0.3; // centre line of the stands' back walls
const WALL_H = 9.5;

/**
 * The Wagah–Attari border, where the Grand Trunk Road crosses from Pakistan into India and
 * the flag-lowering ceremony is held every evening. Pakistan: the white and green
 * Bab-e-Azadi, the Pakistan Rangers in black, ten tiers of green and white stands and the
 * giant national flag. India: the Swarna Jayanti Dwar, the BSF in khaki and stands in
 * saffron, white and green. The zero line is painted between the two pairs of iron gates.
 */
export function buildWagah(ctx: WorldContext) {
	const { w, t, facing } = LANDMARKS.wagah;
	const frame = PlanetFrame.trail(w, t, facing);
	const b = new Builder(1947);

	// ---- the Grand Trunk Road ----
	b.floor(44, 84, 'curb', { x: 0, y: 0.02, z: 0 }, { collide: false });
	b.floor(ROAD_HALF * 2, 92, 'shutterGrey', { x: 0, y: 0.045, z: 0 }, { collide: true });
	for (const x of [-ROAD_HALF + 0.18, ROAD_HALF - 0.18]) b.floor(0.14, 92, 'white', { x, y: 0.06, z: 0 }, { collide: false });
	for (let z = -44; z <= 44; z += 3.2) if (Math.abs(z) > 4) b.floor(0.14, 1.6, 'awningYellow', { x: 0, y: 0.06, z }, { collide: false });

	// ---- the zero line: white stripe, rope barrier, marble markers and the border fence ----
	b.floor(ROAD_HALF * 2 + 1.4, 0.36, 'white', { x: 0, y: 0.065, z: 0 }, { collide: false });
	for (let i = 0; i <= 8; i++) {
		const x = -ROAD_HALF + 0.3 + i * ((ROAD_HALF * 2 - 0.6) / 8);
		b.prism(0.07, 1.35, 6, 'white', { x, y: 0, z: 0 }, { upright: true });
		b.box(0.16, 0.12, 0.16, 'awningRed', { x, y: 1.35, z: 0 }, { collide: false });
	}
	for (const y of [0.6, 1.2]) b.box(ROAD_HALF * 2 - 0.6, 0.05, 0.05, 'awningRed', { x: 0, y, z: 0 }, { collide: true });
	const fenceTo = BACK + 8;
	for (const s of [-1, 1]) {
		const fx = s * (ROAD_HALF + 0.9 + (fenceTo - ROAD_HALF - 0.9) / 2);
		for (let x = ROAD_HALF + 0.9; x <= fenceTo; x += 1.6) b.box(0.1, 3.0, 0.1, 'iron', { x: s * x, y: 0, z: 0 }, { collide: false });
		for (const y of [0.3, 1.4, 2.5, 2.95]) b.box(fenceTo - ROAD_HALF - 0.9, 0.05, 0.05, 'iron', { x: fx, y, z: 0 }, { collide: false });
		b.box(fenceTo - ROAD_HALF - 0.9, 3.0, 0.04, 'steel', { x: fx, y: 0, z: 0 }, { collide: true });
		b.box(0.6, 1.5, 0.6, 'marble', { x: s * (ROAD_HALF + 0.45), y: 0, z: 0 }, { collide: true }, { top: 'marbleShade' });
	}
	b.panel(1.4, 0.7, { decor: 'signZeroLine' }, { x: -(ROAD_HALF + 0.45), y: 1.65, z: -0.31, ry: Math.PI }, { collide: false });
	b.panel(1.4, 0.7, { decor: 'signZeroLine' }, { x: -(ROAD_HALF + 0.45), y: 1.65, z: 0.31 }, { collide: false });

	for (const country of [-1, 1] as const) {
		const pk = country < 0;
		const tiersLook: PaletteKey[] = pk ? ['pakGreen', 'white'] : ['indiaSaffron', 'white', 'indiaGreen'];
		const wallLook: PaletteKey = pk ? 'plasterWhite' : 'paintCream';
		const band: PaletteKey = pk ? 'pakGreen' : 'indiaSaffron';
		const band2: PaletteKey = pk ? 'white' : 'indiaGreen';
		const flag = pk ? 'flagPakistan' : 'flagIndia';

		// ceremony gate pillars and the flag pole used for the lowering
		for (const s of [-1, 1]) {
			b.box(0.9, 3.2, 0.9, band, { x: s * (WAGAH.hingeX + 0.45), y: 0, z: country * WAGAH.gateZ }, { collide: true }, { top: band2 });
			b.box(1.05, 0.32, 1.05, band2, { x: s * (WAGAH.hingeX + 0.45), y: 3.2, z: country * WAGAH.gateZ }, { collide: false });
			b.sphere(0.3, 'gold', { x: s * (WAGAH.hingeX + 0.45), y: 3.75, z: country * WAGAH.gateZ }, { w: 10, hSeg: 6 });
		}
		b.prism(0.1, WAGAH.flagPole.height, 8, 'white', { x: WAGAH.flagPole.x, y: 0, z: country * WAGAH.flagPole.z }, { upright: true, rTop: 0.07 });
		b.dome(0.18, 0.22, 'hemi', 'gold', { x: WAGAH.flagPole.x, y: WAGAH.flagPole.height, z: country * WAGAH.flagPole.z });

		// ---- grandstands on both sides of the road: ten climbable tiers under a roof ----
		const zc = (country * (STAND_FROM + STAND_TO)) / 2;
		const len = STAND_TO - STAND_FROM;
		for (const s of [-1, 1]) {
			for (let k = 0; k < TIERS; k++) {
				b.box(RUN, RISE * (k + 1), len, 'plasterWhite', { x: s * (STAND_IN + k * RUN + RUN / 2), y: 0, z: zc }, { collide: true }, { top: tiersLook[k % tiersLook.length] });
			}
			b.box(0.06, 1.0, len, 'iron', { x: s * (STAND_IN - 0.05), y: 0.5, z: zc }, { collide: true });
			const wx = s * BACK;
			b.box(0.6, WALL_H, len + 0.6, wallLook, { x: wx, y: 0, z: zc }, { collide: true }, { top: band });
			b.box(0.8, 0.6, len + 0.8, band, { x: wx, y: WALL_H - 1.4, z: zc }, { collide: false });
			b.box(0.8, 0.35, len + 0.8, band2, { x: wx, y: WALL_H - 0.8, z: zc }, { collide: false });
			b.box(0.8, 0.45, len + 0.8, band, { x: wx, y: WALL_H, z: zc }, { collide: false });
			// cantilevered roof over the upper tiers on steel columns
			const roofX = s * (BACK - 2.9);
			b.box(5.8, 0.2, len + 0.4, 'plasterWhite', { x: roofX, y: WALL_H + 0.7, z: zc, rz: s * 0.1 }, { collide: false }, { bottom: 'steel' });
			for (let k = 0; k <= 5; k++) {
				const z = country * STAND_FROM + country * (k * len) / 5;
				b.prism(0.12, WALL_H + 0.5, 6, 'steel', { x: s * (BACK - 5.4), y: 0, z }, { upright: true });
			}
			// flag and slogan along the back wall, facing the road
			const ry = s > 0 ? -Math.PI / 2 : Math.PI / 2;
			const face = wx - s * 0.32;
			b.panel(6.6, 4.4, { decor: flag }, { x: face, y: 5.4, z: zc - country * 6.5, ry }, { collide: false });
			b.panel(9.0, 1.4, { decor: pk ? 'signZindabad' : 'signSwarnaJayanti' }, { x: face, y: 6.6, z: zc + country * 4.0, ry }, { collide: false });
			if (pk) b.panel(7.4, 1.1, { decor: 'signMotto' }, { x: face, y: 5.2, z: zc + country * 4.0, ry }, { collide: false });
			// stand end walls
			b.box(BACK - STAND_IN + 0.6, 4.0, 0.35, wallLook, { x: s * (STAND_IN + (BACK - STAND_IN) / 2), y: 0, z: country * (STAND_TO + 0.2) }, { collide: true }, { top: band });
			// floodlight towers behind the stands
			for (const zf of [0.3, 0.8]) {
				const z = country * (STAND_FROM + len * zf);
				const x = s * (BACK + 2.2);
				b.prism(0.22, 15, 6, 'steel', { x, y: 0, z }, { upright: true, rTop: 0.14 });
				b.box(2.2, 1.2, 0.3, 'iron', { x, y: 15, z, ry: s > 0 ? -Math.PI / 2 : Math.PI / 2 }, { collide: false, upright: true });
				for (let i = 0; i < 4; i++) b.box(0.42, 0.42, 0.08, 'bulb', { x: x - s * 0.2, y: 15.4, z: z + (i - 1.5) * 0.5 }, { collide: false, upright: true });
			}
		}

		// ---- the great gate at the end of each side ----
		const gz = country * GATE_Z;
		b.archWall(24, 15, 2.0, [{ x: 0, w: 9, h: 10.5, rise: 3.0 }], wallLook, { x: 0, y: 0, z: gz }, { sideLook: band });
		b.box(24.2, 0.7, 2.2, band, { x: 0, y: 11.2, z: gz }, { collide: false });
		b.box(24.6, 0.6, 2.4, pk ? 'pakGreen' : 'indiaGreen', { x: 0, y: 15, z: gz }, { collide: false });
		b.merlons(24, 1.0, pk ? 'pakGreen' : 'indiaSaffron', { x: 0, y: 15.6, z: gz + 1.1 });
		b.merlons(24, 1.0, pk ? 'pakGreen' : 'indiaSaffron', { x: 0, y: 15.6, z: gz - 1.1 });
		// gate name on both faces (the -Z face is turned by pi)
		for (const [zf, ryf] of [[gz - 1.03, Math.PI], [gz + 1.03, 0]] as const) {
			b.panel(12.5, 1.65, { decor: pk ? 'signBabEAzadi' : 'signSwarnaJayanti' }, { x: 0, y: 12.35, z: zf, ry: ryf }, { collide: false });
		}
		const outer = gz + country * 1.04;
		const outerRy = country < 0 ? Math.PI : 0;
		const inner = gz - country * 1.04;
		const innerRy = country < 0 ? 0 : Math.PI;
		b.panel(pk ? 8.0 : 2.6, 1.05, { decor: pk ? 'signRangers' : 'signIndiaGate' }, { x: 0, y: 10.55, z: outer, ry: outerRy }, { collide: false });
		if (pk) {
			b.panel(5.6, 1.4, { decor: 'signQuaid' }, { x: 0, y: 10.5, z: inner, ry: innerRy }, { collide: false });
			b.panel(3.6, 2.4, { decor: 'flagPakistan' }, { x: -7.8, y: 6.5, z: inner, ry: innerRy }, { collide: false });
			b.panel(3.6, 2.4, { decor: 'flagPakistan' }, { x: 7.8, y: 6.5, z: inner, ry: innerRy }, { collide: false });
		}
		for (const s of [-1, 1]) {
			const px = s * 13.6;
			b.box(3.2, 19, 3.2, wallLook, { x: px, y: 0, z: gz }, { collide: true, upright: true }, { top: band });
			for (const y of [5, 10, 15]) b.box(3.35, 0.4, 3.35, band, { x: px, y, z: gz }, { collide: false, upright: true });
			b.box(3.6, 0.5, 3.6, band, { x: px, y: 19, z: gz }, { collide: false, upright: true });
			b.dome(1.4, 1.8, pk ? 'onion' : 'hemi', pk ? 'white' : 'paintCream', { x: px, y: 19.5, z: gz });
			b.finial(1.0, 'gold', { x: px, y: 21.2, z: gz });
		}
		// the national flag over the gate
		b.prism(0.12, 9, 8, 'white', { x: 0, y: 15.6, z: gz }, { upright: true });
		// one double-sided panel: seen from behind it reads mirrored, like real cloth
		b.panel(4.8, 3.2, { decor: flag }, { x: 2.4, y: 21.4, z: gz }, { collide: false });

		// the road beyond the gate: palms and lamps
		for (const s of [-1, 1]) {
			for (const z of [37, 42]) tree(b, s * 7.5, country * z, 1.05, 'palm');
			tree(b, s * 16, country * 39, 1.25, pk ? 'neem' : 'peepal');
			lampPost(b, s * 4.7, country * 39.5, 4.4, { pole: 'iron', lamp: 'lantern' });
		}
	}

	// ---- the giant flags: Pakistan's on the city side, so it is the first thing you see ----
	for (const [x, z, h, fw, flag] of [
		[-(BACK + 5), -16, 52, 14, 'flagPakistan'],
		[BACK + 3.2, 16, 46, 12, 'flagIndia']
	] as const) {
		b.box(3.4, 1.2, 3.4, 'marble', { x, y: 0, z }, { collide: true }, { top: 'marbleShade' });
		b.prism(0.35, h, 10, 'white', { x, y: 1.2, z }, { upright: true, rTop: 0.2 });
		b.sphere(0.45, 'gold', { x, y: h + 1.5, z }, { w: 10, hSeg: 6 });
		const fh = (fw * 2) / 3;
		const along = Math.sign(z);
		// the hoist (panel's left edge) sits at the mast, the fly points away from the zero line
		b.panel(fw, fh, { decor: flag }, { x, y: h + 1.2 - fh, z: z + along * (fw / 2), ry: along > 0 ? -Math.PI / 2 : Math.PI / 2 }, { collide: false });
	}

	ctx.bake(b, frame, 'wagah-border');
	ctx.anchor('wagah-border', frame, 0, -20, [0, 8, 0], 7);

	// ---- soldiers: the ceremony (game/wagah.ts) marches the first two on each side ----
	const ranger = { models: [RANGER.model], outfit: RANGER };
	const bsf = { models: [BSF.model], outfit: BSF };
	ctx.spot(frame, -0.8, -WAGAH.homeZ, 0, 'guard', { ...ranger, dialogue: 'ranger', name: 'Ranger Haider' });
	ctx.spot(frame, 0.8, -WAGAH.homeZ, 0, 'guard', { ...ranger, dialogue: 'ranger', name: 'Ranger Akram' });
	ctx.spot(frame, 0.8, WAGAH.homeZ, 180, 'guard', { ...bsf, dialogue: 'bsf', name: 'BSF Jawan Gurpreet' });
	ctx.spot(frame, -0.8, WAGAH.homeZ, 180, 'guard', { ...bsf, dialogue: 'bsf', name: 'BSF Jawan Rajesh' });
	// honour guards lining the road
	const guards: [number, string, string][] = [
		[5.5, 'Ranger Sher Khan', 'BSF Jawan Harpreet'],
		[9, 'Ranger Nawaz', 'BSF Jawan Vikram'],
		[17, 'Ranger Iftikhar', 'BSF Jawan Manpreet'],
		[24, 'Ranger Saleem', 'BSF Jawan Sandeep']
	];
	guards.forEach(([z, rangerName, bsfName], i) => {
		const x = (i % 2 ? 1 : -1) * (ROAD_HALF - 0.9);
		const turn = x > 0 ? 270 : 90;
		ctx.spot(frame, x, -z, turn, 'guard', { ...ranger, dialogue: 'ranger', name: rangerName });
		ctx.spot(frame, -x, z, turn === 90 ? 270 : 90, 'guard', { ...bsf, dialogue: 'bsf', name: bsfName });
	});

	// ---- the crowds, cheering their side ----
	const fans = ['female-scientist', 'young-lady', 'male-scientist', 'boss', 'scout', 'factory-worker-b'] as const;
	const rng = b.rng;
	for (const country of [-1, 1] as const) {
		for (let i = 0; i < 14; i++) {
			const s = i % 2 ? 1 : -1;
			const k = 1 + Math.floor(rng() * (TIERS - 2));
			const z = country * (STAND_FROM + 1.4 + rng() * (STAND_TO - STAND_FROM - 2.8));
			const face = s > 0 ? 270 : 90;
			const dialogue = country < 0 ? (i === 0 ? 'wagahFan' : 'wagahCrowd') : undefined;
			ctx.spot(frame, s * (STAND_IN + k * RUN + RUN / 2), z, face, 'visitor', { sit: true, models: [...fans], dialogue }, RISE * (k + 1));
		}
	}
}
