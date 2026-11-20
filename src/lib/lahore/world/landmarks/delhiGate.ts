import { PlanetFrame } from '../../core/planet';
import { Builder } from '../../geometry/builder';
import { balustrade, cart, lampPost, letterbox, pediment, tree, window } from '../common';
import type { WorldContext } from '../context';
import { LANDMARKS } from '../layout';

/**
 * Delhi Gate (Dehli Darwaza), after the reference photograph: a wide two-storey gatehouse
 * in buff brick, paired pilasters framing a recessed pointed arch, pedimented windows in
 * the side bays, a balustraded parapet with the green calligraphy board at its centre and
 * slightly taller end blocks. The passage keeps shops in its niches.
 * Local frame: +Z faces east (Delhi Gate chowk / spawn), the trail runs along Z.
 */
export function buildDelhiGate(ctx: WorldContext) {
	const { w, t, facing } = LANDMARKS.delhiGate;
	const frame = PlanetFrame.trail(w, t, facing);
	const b = new Builder(11);
	const brick = { decor: 'brickTan' as const, tile: 1.4 };
	const H = 8.6;
	const D = 6;
	const passageW = 4.4;
	const passageH = 6.4;

	// side masses and passage vault
	for (const side of [-1, 1]) {
		b.box(9.9, H, D, brick, { x: side * 7.15, y: 0, z: 0 }, {}, { top: 'brickTanDark' });
		b.box(2.6, H + 1.6, D + 1.2, brick, { x: side * 13.3, y: 0, z: 0 }, {}, { top: 'brickTanDark' });
		b.box(2.9, 0.4, D + 1.5, 'brickTanLight', { x: side * 13.3, y: H + 1.6, z: 0 }, { collide: false });
	}
	b.box(passageW, H - passageH, D, brick, { x: 0, y: passageH, z: 0 }, {}, { bottom: 'brickTanDark' });

	// façades with the central pointed arch (east and west)
	for (const zSide of [1, -1]) {
		const z = zSide * (D / 2 + 0.25);
		b.archWall(24.4, H, 0.5, [{ x: 0, w: passageW, h: passageH, rise: 2.5 }], brick, { x: 0, y: 0, z, ry: zSide > 0 ? 0 : Math.PI }, { sideLook: 'brickTanDark' });
		const front = zSide * (D / 2 + 0.5);
		// recessed frame around the arch
		b.box(0.35, 7.6, 0.25, 'brickTanLight', { x: -3.1, y: 0, z: front, ry: 0 }, { collide: false });
		b.box(0.35, 7.6, 0.25, 'brickTanLight', { x: 3.1, y: 0, z: front, ry: 0 }, { collide: false });
		b.box(6.55, 0.35, 0.25, 'brickTanLight', { x: 0, y: 7.4, z: front }, { collide: false });
		b.archFrame(passageW, passageH, 0.35, 'brickTanLight', { x: 0, y: 0, z: front - zSide * 0.1, ry: zSide > 0 ? 0 : Math.PI }, { rise: 2.5 });
		// paired pilasters with capitals
		for (const px of [-4.0, -4.7, 4.0, 4.7, -10.6, -11.3, 10.6, 11.3]) {
			b.box(0.5, H - 0.4, 0.45, 'brickTanLight', { x: px, y: 0, z: front + zSide * 0.05 }, { collide: false });
			b.box(0.75, 0.4, 0.6, 'brickTanLight', { x: px, y: H - 0.85, z: front + zSide * 0.08 }, { collide: false });
		}
		// cornice
		b.box(24.8, 0.4, 0.9, 'brickTanLight', { x: 0, y: H, z: front - zSide * 0.2 }, { collide: false });
		// side bays: pedimented upper windows, blind arches below
		for (const side of [-1, 1]) {
			const wx = side * 7.4;
			const ry = zSide > 0 ? 0 : Math.PI;
			window(b, 1.3, 1.9, { x: wx, y: 4.6, z: front, ry }, { frame: 'brickTanLight', fill: { decor: 'windowShutter' } });
			pediment(b, 2.3, 0.55, 'brickTanLight', { x: wx, y: 6.8, z: front + zSide * 0.1, ry });
			b.panel(2.6, 2.6, 'recess', { x: wx, y: 0.6, z: front + zSide * 0.02, ry }, { arch: 1.2 });
			b.panel(2.0, 2.2, { decor: 'doorStudded' }, { x: wx, y: 0.6, z: front + zSide * 0.04, ry }, { arch: 0.9 });
		}
	}

	// parapet: balustrades, calligraphy board, Urdu name over the arch
	const top = H + 0.4;
	balustrade(b, -11.9, -3.6, D / 2 + 0.2, top, { rail: 'brickTanLight', post: 'white' });
	balustrade(b, 3.6, 11.9, D / 2 + 0.2, top, { rail: 'brickTanLight', post: 'white' });
	balustrade(b, -11.9, -3.6, -D / 2 - 0.2, top, { rail: 'brickTanLight', post: 'white' });
	balustrade(b, 3.6, 11.9, -D / 2 - 0.2, top, { rail: 'brickTanLight', post: 'white' });
	b.box(7.4, 1.5, 0.4, 'brickTanLight', { x: 0, y: top, z: D / 2 + 0.2 }, { collide: false });
	b.panel(7.0, 1.2, { decor: 'signCalligraphy' }, { x: 0, y: top + 0.15, z: D / 2 + 0.42 }, { collide: false });
	b.panel(3.0, 0.75, { decor: 'signDelhiGate' }, { x: 0, y: 6.75, z: D / 2 + 0.53 }, { collide: false });
	b.panel(3.0, 0.75, { decor: 'signDelhiGate' }, { x: 0, y: 6.75, z: -D / 2 - 0.53, ry: Math.PI }, { collide: false });

	// staircase up the west face to the roof terrace over the passage
	b.stairs(1.6, 19, 0.45, 0.5, 'brickTanDark', { x: 12.2, y: 0, z: -D / 2 - 1.3, ry: -Math.PI / 2 }, {});

	// shops in the passage niches
	for (const side of [-1, 1]) {
		for (const z of [-1.6, 1.4]) {
			b.panel(1.7, 2.2, 'interior', { x: side * (passageW / 2 - 0.02), y: 0, z, ry: -side * Math.PI / 2 }, { arch: 0.6 });
			b.box(1.4, 0.8, 0.45, 'woodLight', { x: side * (passageW / 2 - 0.3), y: 0, z, ry: -side * Math.PI / 2 }, { collide: true });
			b.box(1.1, 0.3, 0.3, side > 0 ? 'fabricSaffron' : 'brass', { x: side * (passageW / 2 - 0.3), y: 0.8, z, ry: -side * Math.PI / 2 }, { collide: false });
		}
		ctx.spot(frame, side * 1.55, side > 0 ? 1.4 : -1.6, side > 0 ? 270 : 90, 'shopkeeper', { models: ['boss', 'mountainman'], dialogue: 'gateShop' });
	}
	ctx.shop(frame, 1.3, 1.4, 'Gateway stall', 'دکان', 'Traders have sold from the niches of this passage for generations: cloth, brassware, sweets.');

	// ---- Delhi Gate chowk (east, the spawn plaza) ----
	b.floor(26, 22, { decor: 'pavingStone', tile: 1.8 }, { x: 0, y: 0.02, z: 15 }, { collide: true });
	for (const side of [-1, 1]) {
		// garden beds with trees
		b.box(8, 0.35, 16, 'curb', { x: side * 16.5, y: 0, z: 15 }, { collide: true });
		b.floor(7.4, 15.4, 'grass', { x: side * 16.5, y: 0.36, z: 15 }, { collide: true });
		tree(b, side * 15.2, 10, 1.15, 'neem');
		tree(b, side * 17.6, 18.5, 1.25, side > 0 ? 'gulmohar' : 'peepal');
		tree(b, side * 16, 24, 1.0, 'neem');
		lampPost(b, side * 11.6, 6.5);
		lampPost(b, side * 11.6, 21);
	}
	letterbox(b, -4.2, 18.6);
	// clear of the nani's bench and the letterbox so the "Ride" prompt is not crowded out
	ctx.bikeSpot = { position: frame.point(-6.6, 0.03, 14.6), forward: frame.dir(0.35, 0, -1).normalize() };
	cart(b, 5.4, 11, 0.4, ['marigold', 'gulmohar', 'leafLight']);
	cart(b, -6.2, 23, -0.3, ['paintOrange', 'paintYellow', 'paintGreen']);
	ctx.spot(frame, 5.2, 12.6, 200, 'vendor', { models: ['mountainman', 'boss'], dialogue: 'fruitCart' });
	ctx.spot(frame, -6.0, 24.6, 160, 'vendor', { models: ['male-scientist', 'mountainman'], dialogue: 'fruitCart' });
	ctx.spot(frame, -2.6, 18.4, 120, 'elder', { models: ['oldwoman'], dialogue: 'nani' });

	ctx.bake(b, frame, 'delhi-gate');
	ctx.anchor('delhi-gate', frame, 0, 9.5, [0, 6, 3.5], 6.5);

	// pedestrians through the gate and around the chowk
	ctx.path(frame, [[-1.2, 25], [-1.2, -14]], false, 3);
	ctx.path(frame, [[1.4, -14], [1.4, 25]], false, 3);
	ctx.path(frame, [[-9, 8], [9, 8], [9, 24], [-9, 24]], true, 3);
}
