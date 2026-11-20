import { PlanetFrame } from '../../core/planet';
import { Builder, type Look } from '../../geometry/builder';
import type { PaletteKey } from '../../render/palette';
import { balustrade, lampPost, tilePanel, tree } from '../common';
import type { WorldContext } from '../context';
import { LANDMARKS } from '../layout';

/**
 * Wazir Khan Mosque (1634–41), from the reference photographs: terracotta brick and ochre
 * plaster carrying kashi tile panels (vase niches, cypress panels, cobalt spandrels,
 * calligraphy bands); a tall entrance portal topped by two chhatris; a courtyard with an
 * ablution pool; four octagonal tiled minarets with balconies and ribbed tile cupolas;
 * the prayer hall with a tiled iwan and five domes. Shops line the outer north wall.
 * Local frame: +Z faces east (Wazir Khan Chowk), +X is north (the royal trail).
 */
export function buildWazirKhan(ctx: WorldContext) {
	const { w, t, facing } = LANDMARKS.wazirKhan;
	const frame = PlanetFrame.trail(w, t, facing);
	const b = new Builder(1641);
	const brick = { decor: 'brickRed' as const, tile: 1.4 };
	const ochre: Look = { decor: 'ochrePlaster', tile: 3 };
	const WX = 12.5;
	const Z0 = -20;
	const Z1 = 20.5;
	const wallH = 6.5;

	// --- courtyard ---
	const cz0 = -9;
	const cz1 = 15.4;
	const cx = 10.4;
	b.floor(cx * 2, cz1 - cz0, { decor: 'pavingHerring', tile: 2.2 }, { x: 0, y: 0.06, z: (cz0 + cz1) / 2 }, { collide: true });
	// ablution pool
	ctx.pools.push({ frame, x: 0, z: 3.5, w: 6.8, d: 4.2, y: 0.24 });
	b.box(7.6, 0.35, 0.4, 'marble', { x: 0, y: 0, z: 3.5 + 2.3 }, { collide: true });
	b.box(7.6, 0.35, 0.4, 'marble', { x: 0, y: 0, z: 3.5 - 2.3 }, { collide: true });
	b.box(0.4, 0.35, 4.2, 'marble', { x: 3.6, y: 0, z: 3.5 }, { collide: true });
	b.box(0.4, 0.35, 4.2, 'marble', { x: -3.6, y: 0, z: 3.5 }, { collide: true });
	b.floor(6.8, 4.2, 'riverbed', { x: 0, y: -0.5, z: 3.5 }, { collide: false });
	for (let i = 0; i < 9; i++) b.box(0.34, 0.34, 0.34, 'marble', { x: -3.6 + i * 0.9, y: 0.35, z: 3.5 + 2.3 }, { collide: false });
	b.stairs(1.4, 3, 0.18, 0.35, 'marble', { x: 0, y: -0.2, z: 3.5 - 1.6 }, { collide: false });
	// central lamp post like the photograph
	lampPost(b, 0, 7.2, 4.2, { pole: 'woodGreen', lamp: 'lantern' });

	// --- outer walls ---
	// north wall (faces the trail) with the mosque's own bazaar shops
	b.archWall(Z1 - Z0, wallH, 0.7, [], brick, { x: WX - 0.35, y: 0, z: (Z0 + Z1) / 2, ry: Math.PI / 2 }, { sideLook: 'brickDark' });
	for (let z = -17; z <= 13; z += 3.4) {
		b.panel(2.4, 2.8, 'interior', { x: WX + 0.03, y: 0.2, z, ry: Math.PI / 2 }, { arch: 0.9 });
		b.archFrame(2.4, 2.8, 0.22, 'terracotta', { x: WX + 0.06, y: 0.2, z, ry: Math.PI / 2 }, { rise: 0.9 });
		b.box(2.1, 0.8, 0.55, 'woodLight', { x: WX + 0.3, y: 0.2, z, ry: Math.PI / 2 }, { collide: true });
		tilePanel(b, 1.4, 0.9, { decor: 'tileSquare' }, { x: WX + 0.04, y: 3.9, z, ry: Math.PI / 2 }, 'tileWhite');
	}
	b.panel(Z1 - Z0, 0.6, { decor: 'tileBand', tile: 2.2 }, { x: WX + 0.05, y: wallH - 0.8, z: (Z0 + Z1) / 2, ry: Math.PI / 2 }, { collide: false });
	ctx.spot(frame, WX + 1.0, -3.4, 90, 'craftsman', { models: ['mountainman', 'male-scientist'], dialogue: 'calligrapher', name: 'Ustad Rafiq' });
	ctx.shop(frame, WX + 0.9, -3.4, 'Calligraphers\u2019 bazaar', 'خطاط', 'Since Wazir Khan\u2019s day, calligraphers and book-binders have rented these shops. Their rent kept the mosque alive.');
	ctx.spot(frame, WX + 1.0, 6.8, 90, 'shopkeeper', { models: ['boss'], dialogue: 'signKitab' });
	// south wall
	b.box(0.7, wallH, Z1 - Z0, brick, { x: -WX + 0.35, y: 0, z: (Z0 + Z1) / 2 });
	b.panel(Z1 - Z0, 0.6, { decor: 'tileBand', tile: 2.2 }, { x: -WX - 0.05, y: wallH - 0.8, z: (Z0 + Z1) / 2, ry: -Math.PI / 2 }, { collide: false });
	// parapets
	for (const side of [-1, 1]) b.box(0.9, 0.5, Z1 - Z0, 'terracotta', { x: side * (WX - 0.35), y: wallH, z: (Z0 + Z1) / 2 }, { collide: true });

	// --- courtyard arcades (hujras) on both long sides ---
	for (const side of [-1, 1]) {
		const openings = [];
		const len = cz1 - cz0;
		for (let i = 0; i < 7; i++) openings.push({ x: -len / 2 + 1.75 + i * ((len - 3.5) / 6), w: 2.2, h: 3.4, rise: 1.1 });
		const xFace = side * cx;
		b.archWall(len, 5.4, 0.5, openings, ochre, { x: xFace, y: 0, z: (cz0 + cz1) / 2, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 }, { sideLook: 'terracotta' });
		// cells behind the arches
		b.floor(1.6, len, 'brickDark', { x: side * (cx + 0.9), y: 0.08, z: (cz0 + cz1) / 2 }, { collide: true });
		b.box(1.9, 0.3, len, 'terracotta', { x: side * (cx + 0.95), y: 5.4, z: (cz0 + cz1) / 2 }, { collide: true });
		for (let i = 0; i < 7; i++) {
			const z = (cz0 + cz1) / 2 + (-len / 2 + 1.75 + i * ((len - 3.5) / 6)) * -1;
			tilePanel(b, 1.6, 1.0, { decor: i % 2 ? 'tileSpandrel' : 'tileSpandrelGold' }, { x: xFace - side * 0.27, y: 3.8, z, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 }, 'tileWhite');
		}
		b.panel(len, 0.5, { decor: 'tileBand', tile: 2.2 }, { x: xFace - side * 0.27, y: 5.0, z: (cz0 + cz1) / 2, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 }, { collide: false });
	}

	// stairs up to the roof of the north arcade
	b.stairs(2.2, 13, 0.44, 0.48, 'terracotta', { x: cx - 1.2, y: 0, z: 5.8 }, {});
	b.box(2.2, 5.72, 1.4, 'terracotta', { x: cx - 1.2, y: 0, z: 12.75 }, {}, { top: 'brickDark' });

	// --- entrance portal (east) ---
	const pz = 18;
	const portalH = 12.5;
	// hollow portal: two side blocks and a lintel block leave a walkable passage
	const passW = 4.2;
	const passH = 7.6;
	for (const side of [-1, 1]) {
		b.box((12 - passW) / 2, portalH, 4.4, ochre, { x: side * (passW / 2 + (12 - passW) / 4), y: 0, z: pz }, { collide: true }, {
			top: 'terracotta',
			[side > 0 ? 'left' : 'right']: { decor: 'frescoNet', tile: 1.6 }
		});
	}
	b.box(passW, portalH - passH, 4.4, ochre, { x: 0, y: passH, z: pz }, { collide: true }, { top: 'terracotta', bottom: { decor: 'frescoNet', tile: 1.6 } });
	for (const zSide of [1, -1]) {
		const face = pz + zSide * 2.35;
		const ry = zSide > 0 ? 0 : Math.PI;
		b.archWall(12, portalH, 0.3, [{ x: 0, w: passW, h: passH, rise: 2.4 }], ochre, { x: 0, y: 0, z: face - zSide * 0.15, ry }, { sideLook: 'terracotta' });
		b.archFrame(passW, passH, 0.4, { decor: 'tileSpandrel', tile: 1.2 }, { x: 0, y: 0, z: face, ry }, { rise: 2.4 });
		tilePanel(b, 7.6, 2.4, { decor: 'tileSpandrel' }, { x: 0, y: 8.6, z: face, ry }, 'tileWhite');
		b.panel(10.6, 0.8, { decor: 'calligraphyBand' }, { x: 0, y: 11.2, z: face + zSide * 0.04, ry }, { collide: false });
		for (const side of [-1, 1]) {
			tilePanel(b, 1.6, 2.6, { decor: 'tileVaseNiche' }, { x: side * 4.2, y: 1.2, z: face, ry }, 'tileCobalt', 0.8);
			tilePanel(b, 1.6, 2.6, { decor: 'tileCypress' }, { x: side * 4.2, y: 5.0, z: face, ry }, 'tileCobalt', 0.8);
		}
	}
	b.floor(passW, 5.2, 'brickDark', { x: 0, y: 0.07, z: pz }, { collide: true });
	ctx.spot(frame, 3.0, pz + 3.6, 20, 'visitor', { models: ['scout', 'female-scientist'], dialogue: 'tiles' });
	// chhatris on the portal roof
	for (const side of [-1, 1]) {
		b.box(3.2, 2.6, 3.2, ochre, { x: side * 4.0, y: portalH, z: pz }, { collide: false });
		tilePanel(b, 2.2, 1.2, { decor: 'tileSquare' }, { x: side * 4.0, y: portalH + 0.6, z: pz + 1.62 }, 'tileWhite');
		b.chhatri(1.5, 4.6, { pillar: 'ochre', roof: 'terracotta', dome: 'tileCobalt', finial: 'brass', base: 'terracotta' }, { x: side * 4.0, y: portalH + 2.6, z: pz }, { domeStyle: 'onion' });
	}
	b.merlons(11.6, 0.6, 'terracotta', { x: 0, y: portalH, z: pz + 2.45 });
	// calligraphers' bazaar wings flanking the portal
	for (const side of [-1, 1]) {
		const xc = side * 9.2;
		b.box(6.6, 6.0, 4.5, brick, { x: xc, y: 0, z: pz }, { collide: true }, { top: 'terracotta' });
		for (const dx of [-1.6, 1.6]) {
			b.panel(2.2, 2.7, 'interior', { x: xc + dx, y: 0.2, z: pz + 2.27 }, { arch: 0.9 });
			b.archFrame(2.2, 2.7, 0.2, 'terracotta', { x: xc + dx, y: 0.2, z: pz + 2.3 }, { rise: 0.9 });
			tilePanel(b, 1.6, 1.4, { decor: dx > 0 ? 'tileVaseNiche' : 'tileCypress' }, { x: xc + dx, y: 3.4, z: pz + 2.27 }, 'tileWhite', 0.6);
		}
		b.panel(6.6, 0.5, { decor: 'tileBand', tile: 2 }, { x: xc, y: 5.4, z: pz + 2.27 }, { collide: false });
	}

	// --- minarets at the courtyard corners ---
	const minarets: [number, number][] = [
		[11.4, 15.6],
		[-11.4, 15.6],
		[11.4, -9.4],
		[-11.4, -9.4]
	];
	for (const [mx, mz] of minarets) {
		const baseH = 7.2;
		b.prism(1.75, baseH, 8, brick, { x: mx, y: 0, z: mz }, { upright: true });
		b.prism(1.82, 0.5, 8, { decor: 'tileBand', tile: 1.4 }, { x: mx, y: baseH - 0.5, z: mz }, { upright: true, collide: false });
		const shaftH = 10.8;
		const circ = 2 * Math.PI * 1.3;
		b.prism(1.3, shaftH, 8, { decor: 'tileVaseNiche', tile: circ / 8, tileY: shaftH / 3 }, { x: mx, y: baseH, z: mz }, { upright: true, rTop: 1.22 });
		const top = baseH + shaftH;
		b.prism(1.9, 0.45, 8, { decor: 'tileBand', tile: 1.4 }, { x: mx, y: top, z: mz }, { upright: true, collide: false, rTop: 1.7 });
		b.prism(1.8, 0.25, 8, 'terracotta', { x: mx, y: top + 0.45, z: mz }, { upright: true, collide: false });
		b.prism(1.78, 0.8, 8, 'tileWhite', { x: mx, y: top + 0.7, z: mz }, { upright: true, collide: false, open: true });
		b.chhatri(1.1, 3.8, { pillar: 'ochre', roof: 'terracotta', dome: 'tileCobalt', finial: 'brass' }, { x: mx, y: top + 0.7, z: mz }, { domeStyle: 'onion' });
	}

	// --- prayer hall (west) ---
	const hz0 = Z0;
	const hz1 = cz0;
	const hallH = 9.6;
	const hallLen = hz1 - hz0;
	const hallMid = (hz0 + hz1) / 2;
	// facade facing the courtyard
	const facadeOpenings = [
		{ x: 0, w: 4.6, h: 8.4, rise: 2.6 },
		{ x: -6.0, w: 3.0, h: 5.4, rise: 1.5 },
		{ x: 6.0, w: 3.0, h: 5.4, rise: 1.5 },
		{ x: -9.9, w: 2.4, h: 4.6, rise: 1.2 },
		{ x: 9.9, w: 2.4, h: 4.6, rise: 1.2 }
	];
	b.archWall(WX * 2, hallH, 0.8, facadeOpenings, ochre, { x: 0, y: 0, z: hz1 - 0.4 }, { sideLook: 'terracotta' });
	for (const o of facadeOpenings) {
		b.archFrame(o.w, o.h, 0.32, { decor: 'tileSpandrel', tile: 1.2 }, { x: o.x, y: 0, z: hz1 + 0.02 }, { rise: o.rise });
		if (o.x !== 0) tilePanel(b, o.w + 0.6, 1.8, { decor: 'tileSpandrelGold' }, { x: o.x, y: o.h + 0.6, z: hz1 + 0.01 }, 'tileWhite');
	}
	// central pishtaq rising above the hall
	b.box(9, 13.2, 1.4, ochre, { x: 0, y: 0, z: hz1 - 0.5 }, { collide: true }, { back: 'terracotta' });
	b.panel(5.0, 8.8, 'recessStone', { x: 0, y: 0, z: hz1 + 0.21 }, { arch: 2.8 });
	b.archFrame(4.6, 8.4, 0.5, { decor: 'tileSpandrel', tile: 1.2 }, { x: 0, y: 0, z: hz1 + 0.25 }, { rise: 2.6 });
	tilePanel(b, 8.2, 3.2, { decor: 'tileSpandrel' }, { x: 0, y: 8.9, z: hz1 + 0.22 }, 'tileWhite');
	b.panel(8.6, 0.9, { decor: 'calligraphyBand' }, { x: 0, y: 12.15, z: hz1 + 0.25 }, { collide: false });
	b.merlons(8.6, 0.55, 'terracotta', { x: 0, y: 13.2, z: hz1 - 0.1 });
	for (const side of [-1, 1]) {
		b.prism(0.4, 15, 8, 'terracotta', { x: side * 4.6, y: 0, z: hz1 + 0.1 }, { upright: true, collide: false });
		b.finial(1.3, 'brass', { x: side * 4.6, y: 15, z: hz1 + 0.1 });
	}
	// hall body, interior and roof
	b.box(WX * 2, hallH, 0.8, brick, { x: 0, y: 0, z: hz0 + 0.4 });
	b.floor(WX * 2 - 1.4, hallLen - 1.6, { decor: 'marbleSlabs', tile: 1.6 }, { x: 0, y: 0.08, z: hallMid }, { collide: true });
	b.box(WX * 2, 0.5, hallLen, 'terracotta', { x: 0, y: hallH, z: hallMid }, { collide: true }, { bottom: 'lime' });
	b.archWall(WX * 2 - 1.4, hallH, 0.6, [
		{ x: -5.5, w: 3.4, h: 6.4, rise: 1.7 },
		{ x: 5.5, w: 3.4, h: 6.4, rise: 1.7 },
		{ x: 0, w: 4.0, h: 7.0, rise: 2.0 }
	], { decor: 'limePlaster', tile: 3 }, { x: 0, y: 0, z: hallMid }, { sideLook: 'lime' });
	// mihrab and frescoes on the qibla wall
	tilePanel(b, 2.2, 3.8, { decor: 'tileVaseNiche' }, { x: 0, y: 0.6, z: hz0 + 0.82 }, 'tileCobalt', 1.0);
	for (const x of [-7.5, -3.6, 3.6, 7.5]) b.panel(2.0, 3.0, { decor: x < 0 ? 'frescoVase' : 'frescoBird' }, { x, y: 1.0, z: hz0 + 0.82 }, { collide: false });
	b.box(1.4, 1.8, 1.0, 'woodDark', { x: 2.4, y: 0, z: hz0 + 1.5 }, { collide: true });
	// five domes
	const domes: [number, number][] = [
		[0, 3.3],
		[-6.4, 2.3],
		[6.4, 2.3],
		[-10.4, 1.4],
		[10.4, 1.4]
	];
	for (const [dx, r] of domes) {
		const drum = r > 3 ? 1.6 : 0.9;
		b.cylinder(r + 0.2, drum, 'ochreLight', { x: dx, y: hallH + 0.5, z: hallMid }, { segments: 20 });
		b.dome(r + 0.2, r * (r > 3 ? 1.15 : 1.0), r > 3 ? 'onion' : 'hemi', 'lime', { x: dx, y: hallH + 0.5 + drum, z: hallMid }, { segments: 22 });
		b.finial(r * 0.55, 'brass', { x: dx, y: hallH + 0.5 + drum + r * (r > 3 ? 1.12 : 0.97), z: hallMid });
	}
	b.merlons(WX * 2, 0.55, 'terracotta', { x: 0, y: hallH + 0.5, z: hz1 - 0.2 });

	// courtyard trees and life
	tree(b, -8.4, 12.6, 0.8, 'neem');
	tree(b, 8.4, -6.4, 0.75, 'neem');
	balustrade(b, -9.6, -5.6, 11.4, 0, { rail: 'terracotta', post: 'tileWhite' });

	ctx.bake(b, frame, 'wazir-khan');
	ctx.anchor('wazir-khan', frame, 0, 7.0, [0, 9, -10], 6);

	ctx.spot(frame, -2.6, 0.6, 30, 'worshipper', { models: ['male-scientist', 'mountainman'], dialogue: 'wudu' });
	ctx.spot(frame, 2.4, -6.0, 180, 'worshipper', { models: ['male-scientist'], dialogue: 'imam', name: 'Maulvi Sahib' });
	ctx.spot(frame, -6.2, 9.0, 120, 'craftsman', { models: ['factory-worker-c', 'office-worker'], dialogue: 'tileRestorer', name: 'Naqqash Bilal' });
	ctx.spot(frame, 5.2, 11.4, 200, 'child', { models: ['threekid'], dialogue: 'kidPigeons' });
	ctx.spot(frame, 8.6, 2.6, 270, 'visitor', { models: ['scout', 'young-lady'], dialogue: 'tourist' });
	ctx.path(frame, [[-7.6, 13.8], [7.6, 13.8], [7.6, -7.2], [-7.6, -7.2]], true, 2, ['male-scientist', 'young-lady', 'office-worker']);

	// ---- Wazir Khan Chowk (east of the portal) ----
	const chowk = PlanetFrame.trail(LANDMARKS.wazirKhanChowk.w, LANDMARKS.wazirKhanChowk.t, LANDMARKS.wazirKhanChowk.facing);
	const c = new Builder(1642);
	c.floor(19, 22, { decor: 'pavingHerring', tile: 2.2 }, { x: 0, y: 0.05, z: -2 }, { collide: true });
	// the chowk well and benches
	c.prism(1.3, 0.8, 8, 'brickLight', { x: -2, z: -4 }, { upright: true });
	c.prism(1.05, 0.82, 8, 'black', { x: -2, z: -4 }, { upright: true, collide: false });
	for (const [x, z, ry] of [[-6.5, 2, 0], [5, -9, 1.2], [6, 4, -0.5]] as const) c.box(2.2, 0.45, 0.6, 'woodLight', { x, y: 0, z, ry }, { collide: true });
	lampPost(c, 3, -1, 3.8);
	lampPost(c, -6, -10, 3.8);
	tree(c, 7, -12, 1.1, 'peepal');
	ctx.bake(c, chowk, 'wazir-khan-chowk');
	ctx.spot(chowk, 5.6, -8.4, 280, 'elder', { models: ['mountainman'], dialogue: 'chowkElder', sit: true }, 0.45);
	ctx.spot(chowk, -1.0, -6.2, 0, 'musician', { models: ['musician'], dialogue: 'musician', name: 'Saeen' });
	ctx.trailPath([[38, -2], [46, -8], [46, -20], [52, -24]], false, 2);
}

export type _Unused = PaletteKey;
