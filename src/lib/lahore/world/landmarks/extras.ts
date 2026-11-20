import { Vector2 } from 'three';
import { PLANET_RADIUS, WATER_LEVEL } from '../../core/config';
import { dirToTrail, PlanetFrame, trailPoint } from '../../core/planet';
import { Builder } from '../../geometry/builder';
import { balustrade, lampPost, tree } from '../common';
import type { WorldContext } from '../context';
import { isReserved, JETTIES, LANDMARKS, wrapW } from '../layout';

/** Sunehri Masjid (Golden Mosque, 1753) on its raised platform in the bazaar. */
export function buildSunehriMasjid(ctx: WorldContext) {
	const { w, t, facing } = LANDMARKS.sunehriMasjid;
	const frame = PlanetFrame.trail(w, t, facing);
	const b = new Builder(1753);
	b.box(13, 2.4, 9, { decor: 'brickRed', tile: 1.4 }, { x: 0, y: 0, z: 0 }, {}, { top: { decor: 'marbleSlabs', tile: 1.5 } });
	// shops in the platform base (the mosque stands above a row of shops)
	for (const x of [-4.4, -1.5, 1.5, 4.4]) {
		b.panel(2.2, 1.9, 'interior', { x, y: 0.15, z: 4.52 }, { arch: 0.7 });
		b.panel(2.0, 1.7, { decor: 'shopShutter' }, { x, y: 0.2, z: 4.55 }, { collide: false });
	}
	b.stairs(2.4, 6, 0.4, 0.45, 'brickLight', { x: 6.9, y: 0, z: 3.4, ry: -Math.PI / 2 }, {});
	b.archWall(10, 4.6, 0.5, [-3, 0, 3].map((x) => ({ x, w: 2.0, h: 3.2, rise: 1.0 })), { decor: 'marbleInlay', tile: 2 }, { x: 0, y: 2.4, z: 1.4 }, { sideLook: 'marbleShade' });
	b.box(10, 4.6, 3.2, 'cream', { x: 0, y: 2.4, z: -0.6 }, {}, { front: 'creamDark' });
	b.box(10.4, 0.3, 4.4, 'creamDark', { x: 0, y: 7.0, z: 0 }, { collide: true });
	for (const x of [-3.3, 0, 3.3]) {
		b.cylinder(1.3, 0.6, 'cream', { x, y: 7.3, z: 0 }, { segments: 18 });
		b.dome(1.4, 2.2, 'onion', 'gold', { x, y: 7.9, z: 0 }, { segments: 20 });
		b.finial(0.9, 'gold', { x, y: 10.0, z: 0 });
	}
	for (const x of [-5.2, 5.2]) {
		b.prism(0.45, 7.2, 8, 'cream', { x, y: 2.4, z: 1.6 }, { upright: true });
		b.dome(0.55, 0.8, 'onion', 'gold', { x, y: 9.6, z: 1.6 });
	}
	balustrade(b, -6, 6, 4.3, 2.4, { rail: 'creamDark', post: 'cream' }, 0.8);
	ctx.bake(b, frame, 'sunehri');
	ctx.spot(frame, -3, 3.4, 0, 'worshipper', { models: ['mountainman', 'male-scientist'], dialogue: 'sunehri' }, 2.4);
}

/** Minar-e-Pakistan in Greater Iqbal Park, crowning the north pole. */
export function buildMinarEPakistan(ctx: WorldContext) {
	const { w, t, facing } = LANDMARKS.minarEPakistan;
	const frame = PlanetFrame.trail(w, t - 0.0001, facing);
	const b = new Builder(1960);
	// star-shaped base platforms (lotus petals)
	for (const [r, h, y] of [[9, 0.8, 0], [7, 0.8, 0.8], [5.2, 0.9, 1.6]] as const) {
		b.prism(r, h, 10, y === 0 ? 'marbleShade' : 'marble', { x: 0, y, z: 0 }, { upright: true, perFaceIds: true });
	}
	// the flower-like base: curved petal walls opening outwards around the tower
	for (let i = 0; i < 5; i++) {
		const a = (i / 5) * Math.PI * 2;
		const petal = [new Vector2(0.01, 0), new Vector2(1.5, 0.3), new Vector2(1.9, 2.4), new Vector2(1.4, 5.2), new Vector2(0.01, 6.4)];
		b.lathe(petal, 'marble', { x: Math.sin(a) * 4.0, y: 2.5, z: Math.cos(a) * 4.0, ry: a, rx: 0.35 }, { segments: 10, collide: true, upright: false });
	}
	ctx.anchor('minar-e-pakistan', frame, 0, 10.5, [0, 18, 0], 7);
	// tapering tower
	const profile = [
		[2.4, 0], [2.3, 4], [1.95, 9], [1.6, 14], [1.35, 18], [1.2, 21], [1.6, 21.3], [1.6, 22.2], [1.15, 22.5], [1.0, 25]
	].map(([r, y]) => new Vector2(r, y));
	b.lathe(profile, 'marble', { x: 0, y: 2.5, z: 0 }, { segments: 16, collide: true, faceted: false });
	for (const y of [6, 12, 17]) b.prism(2.0 - y * 0.035, 0.25, 16, 'marbleShade', { x: 0, y: 2.5 + y, z: 0 }, { upright: true, collide: false, faceted: false });
	b.dome(1.05, 1.8, 'onion', 'marble', { x: 0, y: 27.5, z: 0 });
	b.finial(1.6, 'steel', { x: 0, y: 29.1, z: 0 });
	// park around
	const rng = b.rng;
	for (let i = 0; i < 26; i++) {
		const a = rng() * Math.PI * 2;
		const d = 14 + rng() * 18;
		const kind = rng() < 0.2 ? 'gulmohar' : rng() < 0.3 ? 'jacaranda' : 'neem';
		const scale = 0.9 + rng() * 0.5;
		// keep the park trees off the Wagah border ground
		const { w: tw, t: tt } = dirToTrail(frame.point(Math.sin(a) * d, 0, Math.cos(a) * d));
		if (isReserved(wrapW(tw), tt, 2)) continue;
		tree(b, Math.sin(a) * d, Math.cos(a) * d, scale, kind);
	}
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2;
		lampPost(b, Math.sin(a) * 11.5, Math.cos(a) * 11.5, 4, { pole: 'iron', lamp: 'lantern' });
	}
	ctx.bake(b, frame, 'minar-e-pakistan');
	ctx.spot(frame, 6, 9, 200, 'visitor', { models: ['scout', 'male-scientist'], dialogue: 'minar' });
	ctx.spot(frame, -10, 4, 120, 'child', { models: ['threekid'], dialogue: 'kite' });
	ctx.spot(frame, -9, -8, 60, 'elder', { models: ['mountainman'], dialogue: 'parkElder', sit: true }, 0);
	ctx.path(frame, [[0, 11], [11, 0], [0, -11], [-11, 0]], true, 4, ['young-lady', 'male-scientist', 'female-scientist', 'threekid']);
	for (let i = 0; i < 6; i++) {
		const a = (i / 6) * Math.PI * 2 + 0.4;
		ctx.kites.push({ anchor: frame.point(Math.sin(a) * 22, 14 + (i % 3) * 3, Math.cos(a) * 22), color: ['#e2573f', '#f2c14f', '#2fa3a8', '#c6417f', '#6fae6b', '#5f93c5'][i], phase: i * 1.3 });
	}
}

/** Wooden jetties on both banks of the Ravi, and the boat docks. */
export function buildRaviJetties(ctx: WorldContext) {
	const { w, north, island } = JETTIES;
	for (const [name, j, facing] of [['City bank', north, 180], ['Kamran\u2019s Baradari', island, 0]] as const) {
		const mid = (j.deckFrom + j.deckTo) / 2;
		const len = Math.abs(j.deckTo - j.deckFrom);
		// facing 180 = south: local +Z points towards the river from the city bank
		const frame = PlanetFrame.trail(w, mid, facing);
		const b = new Builder(name.length * 97);
		b.box(2.2, 0.12, len, 'woodLight', { x: 0, y: j.deckY - 0.12, z: 0 }, { collide: true });
		for (let z = -len / 2 + 0.3; z <= len / 2; z += 1.1) {
			for (const x of [-1.0, 1.0]) b.prism(0.09, 2.4, 6, 'woodDark', { x, y: j.deckY - 2.4, z }, { upright: true, collide: false });
			b.box(2.3, 0.04, 0.16, 'wood', { x: 0, y: j.deckY + 0.001, z }, { collide: false });
		}
		for (const x of [-1.05, 1.05]) {
			b.box(0.08, 0.8, len, 'wood', { x, y: j.deckY, z: 0 }, { collide: true });
			b.prism(0.1, 1.3, 6, 'woodDark', { x, y: j.deckY - 0.3, z: len / 2 - 0.2 }, { upright: true, collide: false });
		}
		b.box(0.6, 0.6, 0.6, 'wood', { x: 0.6, y: j.deckY, z: -len / 2 + 0.6 }, { collide: true });
		b.panel(1.8, 0.5, { decor: 'signWelcome' }, { x: 0, y: j.deckY + 1.5, z: -len / 2 + 0.05 }, { collide: false });
		b.box(0.08, 1.6, 0.08, 'woodDark', { x: -0.8, y: j.deckY, z: -len / 2 }, { collide: false });
		b.box(0.08, 1.6, 0.08, 'woodDark', { x: 0.8, y: j.deckY, z: -len / 2 }, { collide: false });
		lampPost(b, 1.4, -len / 2 - 0.5, 3.4, { pole: 'iron', lamp: 'lantern' });
		ctx.bake(b, frame, 'ravi-jetties');
		const water = trailPoint(w, j.dock, WATER_LEVEL - PLANET_RADIUS);
		const shore = frame.point(0, j.deckY + 0.05, len / 2 - 0.9);
		const forward = frame.dir(0, 0, 1);
		ctx.docks.push({ name, water, shore, forward });
	}
	const nf = PlanetFrame.trail(w, north.deckFrom - 1.2, 180);
	ctx.spot(nf, 1.7, 0.4, 210, 'elder', { models: ['mountainman'], dialogue: 'ferryman', name: 'Mallah Bashir' });
}

/** Kamran's Baradari on its island in the Ravi, at the south pole. */
export function buildKamranBaradari(ctx: WorldContext) {
	const { w, t, facing } = LANDMARKS.kamranBaradari;
	const frame = PlanetFrame.trail(w, t + 0.0001, facing, 0.35);
	const b = new Builder(1540);
	b.box(12, 1.0, 12, { decor: 'brickRed', tile: 1.4 }, { x: 0, y: 0, z: 0 }, {}, { top: { decor: 'brickRed', tile: 1.4 } });
	const arches = [-3, 0, 3].map((x) => ({ x, w: 2.1, h: 2.8, rise: 0.9 }));
	for (const [ry, x, z] of [[0, 0, 4.5], [Math.PI, 0, -4.5], [Math.PI / 2, 4.5, 0], [-Math.PI / 2, -4.5, 0]] as const) {
		b.archWall(9.4, 4.0, 0.6, arches, { decor: 'brickRed', tile: 1.4 }, { x, y: 1.0, z, ry }, { sideLook: 'brickDark' });
	}
	b.box(10.2, 0.4, 10.2, 'brickDark', { x: 0, y: 5.0, z: 0 }, { collide: true });
	for (const [x, z] of [[4.6, 4.6], [-4.6, 4.6], [4.6, -4.6], [-4.6, -4.6]] as const) b.chhatri(0.8, 2.8, { pillar: 'brick', roof: 'brickDark', dome: 'lime', finial: 'brass' }, { x, y: 5.4, z }, { pillars: 6 });
	for (const [x, z] of [[-9, 6], [8, -9], [9, 8], [-8, -9]] as const) tree(b, x, z, 1.1, 'palm');
	ctx.bake(b, frame, 'kamran-baradari');
	ctx.spot(frame, 2, 7.5, 0, 'elder', { models: ['mountainman'], dialogue: 'boatman', name: 'Mallah Shareef' }, 0);
}
