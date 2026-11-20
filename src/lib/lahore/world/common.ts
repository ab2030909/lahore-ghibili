import { Shape } from 'three';
import type { Builder, Look } from '../geometry/builder';
import type { PaletteKey } from '../render/palette';

/** Balustrade (low wall, balusters, rail) along local X at depth z. */
export function balustrade(b: Builder, x0: number, x1: number, z: number, y: number, look: { rail: PaletteKey; post: PaletteKey }, height = 0.9, ry = 0) {
	const len = x1 - x0;
	const cx = (x0 + x1) / 2;
	const rot = (lx: number) => ({ x: cx + lx * Math.cos(ry) + 0 * Math.sin(ry), z: z - lx * Math.sin(ry) });
	const c = rot(0);
	b.box(len, 0.18, 0.32, look.rail, { x: c.x, y, z: c.z, ry }, { collide: true });
	b.box(len, 0.12, 0.36, look.rail, { x: c.x, y: y + height - 0.12, z: c.z, ry }, { collide: false });
	const count = Math.max(2, Math.floor(len / 0.36));
	for (let i = 0; i < count; i++) {
		const lx = -len / 2 + (i + 0.5) * (len / count);
		const p = rot(lx);
		b.prism(0.08, height - 0.3, 6, look.post, { x: p.x, y: y + 0.18, z: p.z }, { collide: false, rTop: 0.06 });
	}
}

/** Triangular pediment above a window, facing +Z. */
export function pediment(b: Builder, w: number, h: number, look: Look, at: { x: number; y: number; z: number; ry?: number }) {
	const s = new Shape();
	s.moveTo(-w / 2, 0);
	s.lineTo(w / 2, 0);
	s.lineTo(0, h);
	s.closePath();
	b.extrude(s, 0.18, look, at, { collide: false });
}

/** Window with frame, shutters panel and sill, on a facade facing +Z (rotated by ry). */
export function window(b: Builder, w: number, h: number, at: { x: number; y: number; z: number; ry?: number }, look: { frame: PaletteKey; fill: Look; arch?: boolean }) {
	const ry = at.ry ?? 0;
	const off = (d: number) => ({ x: at.x + Math.sin(ry) * d, z: at.z + Math.cos(ry) * d });
	const f = off(0.03);
	b.panel(w + 0.24, h + 0.24, look.frame, { x: f.x, y: at.y - 0.12, z: f.z, ry }, { arch: look.arch ? w * 0.55 : undefined });
	const p = off(0.06);
	b.panel(w, h, look.fill, { x: p.x, y: at.y, z: p.z, ry }, { arch: look.arch ? w * 0.5 : undefined });
	const s = off(0.12);
	b.box(w + 0.4, 0.1, 0.24, look.frame, { x: s.x, y: at.y - 0.18, z: s.z, ry }, { collide: false });
}

/** Wooden jharokha (projecting balcony window with lattice and canopy), facing +Z. */
export function jharokha(b: Builder, w: number, at: { x: number; y: number; z: number; ry?: number }, look: { wood: PaletteKey; canopy: PaletteKey; screen?: Look }) {
	const ry = at.ry ?? 0;
	const fwd = (d: number, side = 0) => ({ x: at.x + Math.sin(ry) * d + Math.cos(ry) * side, z: at.z + Math.cos(ry) * d - Math.sin(ry) * side });
	const depth = 0.7;
	const h = 1.6;
	const c = fwd(depth / 2);
	// floor slab and brackets
	b.box(w + 0.2, 0.16, depth + 0.1, look.wood, { x: c.x, y: at.y, z: c.z, ry }, { collide: false });
	for (const side of [-w / 2 + 0.15, w / 2 - 0.15]) {
		const p = fwd(0.25, side);
		b.box(0.14, 0.5, 0.5, look.wood, { x: p.x, y: at.y - 0.5, z: p.z, ry }, { collide: false });
	}
	// front lattice and side panels
	const front = fwd(depth);
	b.panel(w, h, look.screen ?? { decor: 'woodJali' }, { x: front.x, y: at.y + 0.16, z: front.z, ry }, { collide: false });
	for (const side of [-1, 1]) {
		const p = fwd(depth / 2, (side * w) / 2);
		b.panel(depth, h, look.screen ?? { decor: 'woodJali' }, { x: p.x, y: at.y + 0.16, z: p.z, ry: ry + (side * Math.PI) / 2 }, { collide: false });
	}
	// pillars
	for (const side of [-w / 2, w / 2]) {
		const p = fwd(depth, side);
		b.box(0.12, h, 0.12, look.wood, { x: p.x, y: at.y + 0.16, z: p.z, ry }, { collide: false });
	}
	// canopy (chajja)
	const cc = fwd(depth / 2 + 0.05);
	b.box(w + 0.5, 0.14, depth + 0.45, look.canopy, { x: cc.x, y: at.y + h + 0.16, z: cc.z, ry }, { collide: false });
	b.box(w + 0.2, 0.22, depth + 0.2, look.wood, { x: cc.x, y: at.y + h + 0.3, z: cc.z, ry }, { collide: false });
}

/** Awning sloping out from a facade facing +Z. */
export function awning(b: Builder, w: number, depth: number, at: { x: number; y: number; z: number; ry?: number }, look: PaletteKey) {
	const ry = at.ry ?? 0;
	const c = { x: at.x + Math.sin(ry) * depth * 0.5, z: at.z + Math.cos(ry) * depth * 0.5 };
	b.box(w, 0.06, depth, look, { x: c.x, y: at.y, z: c.z, ry, rx: 0.32 }, { collide: false });
	const f = { x: at.x + Math.sin(ry) * depth * 0.95, z: at.z + Math.cos(ry) * depth * 0.95 };
	b.panel(w, 0.22, look, { x: f.x, y: at.y - 0.36, z: f.z, ry }, { collide: false });
}

/** Tile panel set into a wall facing +Z. */
export function tilePanel(b: Builder, w: number, h: number, decor: Look, at: { x: number; y: number; z: number; ry?: number }, frame: PaletteKey = 'tileWhite', arch = 0) {
	const ry = at.ry ?? 0;
	const o = (d: number) => ({ x: at.x + Math.sin(ry) * d, z: at.z + Math.cos(ry) * d });
	const f = o(0.02);
	b.panel(w + 0.16, h + 0.16, frame, { x: f.x, y: at.y - 0.08, z: f.z, ry }, { arch: arch ? arch + 0.08 : undefined });
	const p = o(0.04);
	b.panel(w, h, decor, { x: p.x, y: at.y, z: p.z, ry }, { arch: arch || undefined });
}

/** Street lamp post (Walled City style, green with lantern). */
export function lampPost(b: Builder, x: number, z: number, height = 3.6, look: { pole: PaletteKey; lamp: PaletteKey } = { pole: 'woodGreen', lamp: 'lantern' }) {
	b.prism(0.12, height, 8, look.pole, { x, y: 0, z }, { collide: true, rTop: 0.08 });
	b.prism(0.22, 0.3, 8, look.pole, { x, y: 0, z }, { collide: false });
	b.box(0.9, 0.08, 0.08, look.pole, { x, y: height - 0.2, z }, { collide: false, upright: true });
	for (const side of [-0.42, 0.42]) {
		b.prism(0.14, 0.32, 6, look.lamp, { x: x + side, y: height - 0.55, z }, { collide: false, rTop: 0.2 });
		b.prism(0.22, 0.06, 6, look.pole, { x: x + side, y: height - 0.23, z }, { collide: false });
	}
	b.finial(0.4, 'brass', { x, y: height - 0.12, z });
}

/** Simple neem/peepal tree: trunk + clustered canopy blobs. */
export function tree(b: Builder, x: number, z: number, scale = 1, kind: 'neem' | 'peepal' | 'gulmohar' | 'jacaranda' | 'ashoka' | 'palm' = 'neem') {
	const rng = b.rng;
	if (kind === 'palm') {
		const h = 4.5 * scale;
		b.prism(0.18 * scale, h, 7, 'trunk', { x, y: 0, z }, { collide: true, rTop: 0.13 * scale });
		for (let i = 0; i < 7; i++) {
			const a = (i / 7) * Math.PI * 2;
			b.box(0.25 * scale, 0.06, 1.9 * scale, i % 2 ? 'leaf' : 'leafDark', {
				x: x + Math.sin(a) * 0.8 * scale,
				y: h - 0.2,
				z: z + Math.cos(a) * 0.8 * scale,
				ry: a,
				rx: 0.55
			}, { collide: false, upright: true });
		}
		return;
	}
	if (kind === 'ashoka') {
		const h = 5.5 * scale;
		b.prism(0.14 * scale, h * 0.4, 7, 'trunk', { x, y: 0, z }, { collide: true });
		b.cylinder(0.7 * scale, h * 0.75, 'leafDark', { x, y: h * 0.25, z }, { rTop: 0.12 * scale, segments: 9, collide: false, faceted: true });
		return;
	}
	const trunkH = 1.8 * scale;
	b.prism(0.2 * scale, trunkH, 7, 'trunk', { x, y: 0, z }, { collide: true, rTop: 0.15 * scale });
	const canopy: Record<string, PaletteKey[]> = {
		neem: ['leaf', 'leafDark', 'leafLight'],
		peepal: ['leafDark', 'leaf', 'leafOlive'],
		gulmohar: ['gulmohar', 'leaf', 'gulmohar'],
		jacaranda: ['jacaranda', 'jacaranda', 'leafLight']
	};
	const colors = canopy[kind];
	const blobs = 4 + Math.floor(rng() * 3);
	for (let i = 0; i < blobs; i++) {
		const a = rng() * Math.PI * 2;
		const d = i === 0 ? 0 : (0.6 + rng() * 0.7) * scale;
		const r = (i === 0 ? 1.25 : 0.75 + rng() * 0.45) * scale;
		b.sphere(r, colors[i % colors.length], {
			x: x + Math.sin(a) * d,
			y: trunkH + (i === 0 ? 0.6 : 0.3 + rng() * 0.9) * scale,
			z: z + Math.cos(a) * d
		}, { w: 7, hSeg: 5, sy: 0.8, collide: false });
	}
}

/** Market cart with goods (fruit, vegetables, flowers). */
export function cart(b: Builder, x: number, z: number, ry: number, goods: PaletteKey[]) {
	const s = Math.sin(ry);
	const c = Math.cos(ry);
	b.box(1.8, 0.12, 1.0, 'woodLight', { x, y: 0.7, z, ry }, { collide: true });
	b.box(1.8, 0.7, 0.08, 'wood', { x: x - s * 0, y: 0, z, ry }, { collide: false });
	for (const side of [-0.6, 0.6]) b.cylinder(0.32, 0.08, 'woodDark', { x: x + c * side, y: 0.32, z: z - s * side, rx: Math.PI / 2, ry }, { collide: false, segments: 10, upright: false });
	const n = 8;
	for (let i = 0; i < n; i++) {
		const lx = -0.7 + (i % 4) * 0.46;
		const lz = -0.25 + Math.floor(i / 4) * 0.5;
		b.sphere(0.2, goods[i % goods.length], { x: x + c * lx + s * lz, y: 0.92, z: z - s * lx + c * lz }, { w: 6, hSeg: 4, collide: false });
	}
	b.box(0.08, 1.3, 0.08, 'wood', { x: x + c * -0.85, y: 0.8, z: z - s * -0.85, ry }, { collide: false });
	b.box(0.08, 1.3, 0.08, 'wood', { x: x + c * 0.85, y: 0.8, z: z - s * 0.85, ry }, { collide: false });
	b.box(2.1, 0.05, 1.3, 'awningRed', { x, y: 2.1, z, ry }, { collide: false });
}

/** Charpai (woven bed) or table with stools. */
export function tableSet(b: Builder, x: number, z: number, ry: number, cloth: PaletteKey = 'fabricWhite') {
	b.box(1.2, 0.06, 0.8, cloth, { x, y: 0.72, z, ry }, { collide: false });
	b.prism(0.06, 0.72, 6, 'iron', { x, y: 0, z }, { collide: true });
	b.prism(0.3, 0.04, 8, 'iron', { x, y: 0, z }, { collide: false });
	const s = Math.sin(ry);
	const c = Math.cos(ry);
	for (const side of [-1, 1]) {
		const px = x + s * side * 0.85;
		const pz = z + c * side * 0.85;
		b.box(0.5, 0.06, 0.46, 'woodLight', { x: px, y: 0.44, z: pz, ry }, { collide: false });
		b.prism(0.04, 0.44, 4, 'wood', { x: px, y: 0, z: pz }, { collide: false });
	}
}

export function charpai(b: Builder, x: number, z: number, ry: number) {
	const s = Math.sin(ry);
	const c = Math.cos(ry);
	b.box(1.9, 0.1, 0.95, 'cloth', { x, y: 0.42, z, ry }, { collide: true });
	for (const [lx, lz] of [[-0.85, -0.4], [0.85, -0.4], [-0.85, 0.4], [0.85, 0.4]]) {
		b.prism(0.06, 0.48, 6, 'woodLight', { x: x + c * lx + s * lz, y: 0, z: z - s * lx + c * lz }, { collide: false });
	}
}

/** Pakistan Post letterbox on the street corner. */
export function letterbox(b: Builder, x: number, z: number) {
	b.cylinder(0.32, 1.2, 'postRed', { x, y: 0, z }, { segments: 14 });
	b.dome(0.34, 0.22, 'hemi', 'postRed', { x, y: 1.2, z });
	b.box(0.36, 0.05, 0.08, 'black', { x, y: 0.95, z: z + 0.29 }, { collide: false, upright: true });
	b.box(0.3, 0.16, 0.04, 'white', { x, y: 0.68, z: z + 0.31 }, { collide: false, upright: true });
}
