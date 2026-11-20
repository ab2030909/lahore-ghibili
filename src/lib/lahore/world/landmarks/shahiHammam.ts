import { Path, Shape } from 'three';
import { PlanetFrame } from '../../core/planet';
import { Builder } from '../../geometry/builder';
import { tilePanel } from '../common';
import type { WorldContext } from '../context';
import { LANDMARKS } from '../layout';

/**
 * Shahi Hammam (Wazir Khan's royal bath, 1634): low brick block on the royal trail with a
 * flat roof and domes. The street façade is a row of arched shop bays around the entrance.
 * Inside: vestibule -> central hall under a frescoed dome with a pool (after the reference
 * photograph of the central dome), flanked by warm and hot chambers with painted walls.
 * Local frame: +Z faces north (the trail), building spans x -11..11, z -7..7.
 */
export function buildShahiHammam(ctx: WorldContext) {
	const { w, t, facing } = LANDMARKS.shahiHammam;
	const frame = PlanetFrame.trail(w, t, facing);
	const b = new Builder(1634);
	const brick = { decor: 'brickRed' as const, tile: 1.5 };
	const H = 4.4;
	const T = 0.6;
	const W = 22;
	const D = 14;

	// floor inside (lime) and a raised plinth step
	b.floor(W, D, { decor: 'limePlaster', tile: 3 }, { x: 0, y: 0.04, z: 0 }, { collide: true });

	// front façade: entrance + shop bays
	const shopBays = [-8.4, -5.2, 5.2, 8.4];
	b.archWall(W, H, T, [{ x: 0, w: 2.2, h: 3.3, rise: 1.2 }], brick, { x: 0, y: 0, z: D / 2 - T / 2 }, { sideLook: 'brickDark' });
	for (const x of shopBays) {
		b.panel(2.4, 2.9, 'recess', { x, y: 0.2, z: D / 2 + 0.02 }, { arch: 1.0 });
		b.archFrame(2.4, 2.9, 0.22, 'brickLight', { x, y: 0.2, z: D / 2 + 0.05 }, { rise: 1.0 });
		b.panel(2.0, 2.3, { decor: 'shopShutter' }, { x, y: 0.25, z: D / 2 + 0.05 }, { collide: false });
	}
	b.archFrame(2.2, 3.3, 0.3, 'brickLight', { x: 0, y: 0, z: D / 2 + 0.05 }, { rise: 1.2 });
	b.panel(4.2, 0.9, { decor: 'signHammam' }, { x: 0, y: 3.45, z: D / 2 + 0.06 }, { collide: false });
	b.box(W + 0.3, 0.3, 0.5, 'brickLight', { x: 0, y: H, z: D / 2 - 0.1 }, { collide: false });

	// back and side walls
	b.box(W, H, T, brick, { x: 0, y: 0, z: -D / 2 + T / 2 });
	b.box(T, H, D, brick, { x: -W / 2 + T / 2, y: 0, z: 0 });
	b.box(T, H, D, brick, { x: W / 2 - T / 2, y: 0, z: 0 });

	// interior partitions: vestibule wall (z = 3.8) and chamber walls (x = +-5)
	const fresco = { decor: 'limePlaster' as const, tile: 3 };
	b.archWall(10, H, 0.45, [{ x: 0, w: 2.0, h: 3.0, rise: 1.1 }], fresco, { x: 0, y: 0, z: 3.8 }, { sideLook: 'lime' });
	for (const side of [-1, 1]) {
		b.archWall(D - T * 2, H, 0.45, [{ x: -1.0, w: 2.0, h: 3.0, rise: 1.1 }, { x: 4.6, w: 1.6, h: 2.6, rise: 0.9 }], fresco, { x: side * 5, y: 0, z: 0, ry: Math.PI / 2 }, { sideLook: 'lime' });
	}

	// frescoes: central hall walls and chamber walls
	const hallPanels: [number, number, number, number][] = [
		// x, z, ry, decor index
		[-2.6, -6.66, 0, 0],
		[2.6, -6.66, 0, 1],
		[0, -6.66, 0, 2],
		[-4.76, -3.6, Math.PI / 2, 1],
		[4.76, -3.6, -Math.PI / 2, 0],
		[-4.76, 1.9, Math.PI / 2, 2],
		[4.76, 1.9, -Math.PI / 2, 2]
	];
	const frescoKeys = ['frescoVase', 'frescoBird', 'frescoVase'] as const;
	for (const [x, z, ry, k] of hallPanels) {
		b.panel(1.7, 2.6, { decor: frescoKeys[k] }, { x, y: 0.8, z, ry }, { collide: false });
	}
	for (const side of [-1, 1]) {
		for (const z of [-4.2, 1.2]) b.panel(1.6, 2.4, { decor: frescoKeys[(z > 0 ? 1 : 0)] }, { x: side * 10.66, y: 0.8, z, ry: -side * Math.PI / 2 }, { collide: false });
		b.panel(3.4, 2.4, { decor: 'frescoVase' }, { x: side * 8, y: 0.8, z: -6.66 }, { collide: false });
	}
	// painted frieze bands near the ceiling
	b.panel(9.4, 0.5, { decor: 'tileBand', tile: 2 }, { x: 0, y: 3.6, z: -6.68 }, { collide: false });
	b.panel(9.4, 0.5, { decor: 'tileBand', tile: 2 }, { x: 0, y: 3.6, z: 3.55, ry: Math.PI }, { collide: false });

	// central pool (octagonal) with marble rim
	b.prism(2.2, 0.35, 8, 'marble', { x: 0, y: 0, z: -1.3 }, { collide: true });
	b.prism(1.85, 0.37, 8, 'paintTurquoise', { x: 0, y: 0, z: -1.3 }, { collide: false });
	b.prism(0.25, 0.9, 8, 'marble', { x: 0, y: 0, z: -1.3 }, { collide: true });
	// warm-room platforms (benches)
	for (const side of [-1, 1]) {
		b.box(4.4, 0.55, 1.4, 'marbleShade', { x: side * 8, y: 0, z: -5.6 }, { collide: true });
		b.box(1.4, 0.55, 4.0, 'marbleShade', { x: side * 10, y: 0, z: -1.0 }, { collide: true });
	}

	// roof with circular openings under the domes
	const domes: [number, number, number][] = [
		[0, -1.3, 4.3],
		[-8, -2.2, 2.4],
		[8, -2.2, 2.4],
		[-8, 4.6, 1.6],
		[8, 4.6, 1.6],
		[0, 5.5, 1.5]
	];
	const roof = new Shape();
	roof.moveTo(-W / 2, -D / 2);
	roof.lineTo(W / 2, -D / 2);
	roof.lineTo(W / 2, D / 2);
	roof.lineTo(-W / 2, D / 2);
	roof.closePath();
	for (const [x, z, r] of domes) {
		const hole = new Path();
		hole.absarc(x, -z, r, 0, Math.PI * 2, true);
		roof.holes.push(hole);
	}
	b.extrude(roof, 0.45, 'brickDark', { x: 0, y: H + 0.22, z: 0, rx: -Math.PI / 2 }, { collide: true, tessellate: 2.5, upright: false });
	b.box(W + 0.2, 0.5, 0.3, 'brickLight', { x: 0, y: H + 0.45, z: D / 2 - 0.15 }, { collide: true });
	b.box(W + 0.2, 0.5, 0.3, 'brickLight', { x: 0, y: H + 0.45, z: -D / 2 + 0.15 }, { collide: true });
	b.box(0.3, 0.5, D, 'brickLight', { x: W / 2 - 0.15, y: H + 0.45, z: 0 }, { collide: true });
	b.box(0.3, 0.5, D, 'brickLight', { x: -W / 2 + 0.15, y: H + 0.45, z: 0 }, { collide: true });

	// domes: lime exterior, frescoed interior shell, drum and oculus lantern
	for (const [x, z, r] of domes) {
		const drumH = r > 3 ? 1.1 : 0.5;
		b.cylinder(r + 0.25, drumH, 'lime', { x, y: H + 0.45, z }, { segments: 24, open: true, collide: true });
		b.dome(r + 0.25, r * 0.95, 'hemi', 'lime', { x, y: H + 0.45 + drumH, z }, { segments: 24 });
		b.dome(r, r * 0.88, 'hemi', { decor: r > 3 ? 'frescoDome' : 'frescoNet' }, { x, y: H + 0.45 + drumH - 0.02, z }, { segments: 24 });
		b.cylinder(r - 0.02, drumH + 0.02, { decor: 'frescoNet', tile: 1.2 }, { x, y: H + 0.44, z }, { segments: 24, open: true, collide: false });
		b.cylinder(r * 0.22, 0.45, 'lime', { x, y: H + 0.45 + drumH + r * 0.86, z }, { segments: 10 });
		b.dome(r * 0.24, r * 0.2, 'hemi', 'lime', { x, y: H + 0.9 + drumH + r * 0.86, z });
	}
	// central hanging lamp ring (from the photograph)
	b.cylinder(1.9, 0.08, 'iron', { x: 0, y: 3.9, z: -1.3 }, { segments: 24, open: true, collide: false });

	// outside stair to the domed roof
	b.stairs(1.5, 12, 0.45, 0.5, 'brickDark', { x: W / 2 + 0.8, y: 0, z: 6.5, ry: Math.PI }, {});

	// small tile accent by the door
	tilePanel(b, 0.8, 1.2, { decor: 'tileSquare' }, { x: -1.9, y: 1.2, z: D / 2 + 0.03 });
	tilePanel(b, 0.8, 1.2, { decor: 'tileSquare' }, { x: 1.9, y: 1.2, z: D / 2 + 0.03 });

	ctx.bake(b, frame, 'shahi-hammam');
	ctx.anchor('shahi-hammam', frame, 0, -1.3, [0, 5, -1.3], 3.8);

	ctx.spot(frame, 2.6, 1.2, 225, 'visitor', { models: ['female-scientist', 'scout'], dialogue: 'hammamGuide', name: 'Guide Rubina' });
	ctx.spot(frame, -8, -3.6, 90, 'elder', { models: ['mountainman'], dialogue: 'hammamElder', sit: true }, 0.55);
	ctx.spot(frame, 6.5, 7.9, 0, 'vendor', { models: ['boss'], dialogue: 'attar' });
	ctx.shop(frame, 6.5, 7.6, 'Attar stall', 'عطر', 'Rose and motia attar, the perfume oils Lahore has distilled since Mughal times.');
}
