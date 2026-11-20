import { BufferAttribute, IcosahedronGeometry, Vector3 } from 'three';
import { PLANET_RADIUS, WATER_LEVEL } from '../core/config';
import { mulberry32 } from '../core/math';
import { dirToTrail, trailDir } from '../core/planet';
import type { WorldChunk } from '../geometry/builder';
import { decorRect, type DecorKey } from '../render/decorAtlas';
import { paletteUV, type PaletteKey } from '../render/palette';
import {
	CIRCUMFERENCE,
	inGarden,
	NORTH_PARK_START,
	RIVER,
	STREETS,
	TRAIL_WIDTH
} from './layout';

/** Smooth value noise on the sphere (cheap, deterministic). */
function hash3(x: number, y: number, z: number): number {
	const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
	return s - Math.floor(s);
}

function valueNoise(p: Vector3, scale: number): number {
	const x = p.x * scale;
	const y = p.y * scale;
	const z = p.z * scale;
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const zi = Math.floor(z);
	const fx = x - xi;
	const fy = y - yi;
	const fz = z - zi;
	const sx = fx * fx * (3 - 2 * fx);
	const sy = fy * fy * (3 - 2 * fy);
	const sz = fz * fz * (3 - 2 * fz);
	let v = 0;
	for (let dz = 0; dz <= 1; dz++)
		for (let dy = 0; dy <= 1; dy++)
			for (let dx = 0; dx <= 1; dx++) {
				const w = (dx ? sx : 1 - sx) * (dy ? sy : 1 - sy) * (dz ? sz : 1 - sz);
				v += hash3(xi + dx, yi + dy, zi + dz) * w;
			}
	return v;
}

/** Ground height above PLANET_RADIUS at a unit direction. Flat in the city band. */
export function groundHeight(dir: Vector3): number {
	const { t } = dirToTrail(dir);
	if (t < RIVER.bankStart) {
		if (t < RIVER.islandStart) {
			const k = Math.min(1, (RIVER.islandStart - t) / 3);
			return -RIVER.bedDepth + (RIVER.bedDepth + RIVER.islandHeight) * k;
		}
		const k = Math.min(1, (RIVER.bankStart - t) / (RIVER.bankStart - RIVER.bedStart));
		const wobble = (valueNoise(dir, 9) - 0.5) * 0.25;
		return -RIVER.bedDepth * k * k * (3 - 2 * k) + wobble * k;
	}
	return 0;
}

function zoneLook(dir: Vector3, height: number): PaletteKey {
	const { w, t } = dirToTrail(dir);
	if (t < RIVER.islandStart) return height > 0 ? 'grass' : 'sand';
	if (t < RIVER.bedStart + 1.5) return 'riverbed';
	if (t < RIVER.bankStart) return PLANET_RADIUS + height > WATER_LEVEL ? 'sand' : 'riverbed';
	if (t > NORTH_PARK_START) return valueNoise(dir, 11) > 0.62 ? 'grassDark' : 'grass';
	if (inGarden(w, t)) return 'grass';
	if (t < RIVER.bankStart + 6) return 'dirt';
	if (t > NORTH_PARK_START - 5) return 'grassLight';
	return 'cityGround';
}

/** Planet ground (icosphere) baked into `chunk`, collidable. */
export function buildGround(chunk: WorldChunk, detail = 64) {
	const ico = new IcosahedronGeometry(1, detail);
	const pos = ico.getAttribute('position') as BufferAttribute;
	const count = pos.count;
	const a = new Vector3();
	const b = new Vector3();
	const c = new Vector3();
	const centroid = new Vector3();
	const n = new Vector3();
	const e1 = new Vector3();
	const e2 = new Vector3();
	const dirs = [a, b, c];
	const ids: Record<string, number> = {};
	const idRng = mulberry32(42);
	const pts = [new Vector3(), new Vector3(), new Vector3()];
	for (let i = 0; i < count; i += 3) {
		for (let k = 0; k < 3; k++) dirs[k].fromBufferAttribute(pos, i + k).normalize();
		for (let k = 0; k < 3; k++) pts[k].copy(dirs[k]).multiplyScalar(PLANET_RADIUS + groundHeight(dirs[k]));
		centroid.copy(a).add(b).add(c).normalize();
		const look = zoneLook(centroid, groundHeight(centroid));
		const [u, v] = paletteUV(look);
		ids[look] ??= 0.04 + idRng() * 0.9;
		e1.subVectors(pts[1], pts[0]);
		e2.subVectors(pts[2], pts[0]);
		n.crossVectors(e1, e2).normalize();
		if (n.dot(centroid) < 0) {
			n.negate();
			const tmp = pts[1].clone();
			pts[1].copy(pts[2]);
			pts[2].copy(tmp);
		}
		for (let k = 0; k < 3; k++) chunk.addVertex('palette', pts[k], n, u, v, ids[look], null, true);
	}
	ico.dispose();
}

/** Water caps for the Ravi (south) using the existing gameplay water material. */
export function buildRiverWater(): { positions: Float32Array; uvs: Float32Array; normals: Float32Array } {
	const ico = new IcosahedronGeometry(WATER_LEVEL, 40);
	const pos = ico.getAttribute('position') as BufferAttribute;
	const out: number[] = [];
	const uv: number[] = [];
	const nor: number[] = [];
	const v = new Vector3();
	const tri = [new Vector3(), new Vector3(), new Vector3()];
	for (let i = 0; i < pos.count; i += 3) {
		let keep = false;
		for (let k = 0; k < 3; k++) {
			tri[k].fromBufferAttribute(pos, i + k);
			const { t } = dirToTrail(tri[k]);
			if (t < RIVER.bankStart - 2) keep = true;
		}
		if (!keep) continue;
		for (let k = 0; k < 3; k++) {
			v.copy(tri[k]);
			out.push(v.x, v.y, v.z);
			const { w, t } = dirToTrail(v);
			uv.push(w / 20, t / 20);
			v.normalize();
			nor.push(v.x, v.y, v.z);
		}
	}
	ico.dispose();
	return { positions: new Float32Array(out), uvs: new Float32Array(uv), normals: new Float32Array(nor) };
}

/**
 * Paved ribbon following a polyline in trail coordinates, generated directly on the sphere.
 * Uses the decor atlas (tiled bricks) when `decor` is given.
 */
export function buildRibbon(
	chunk: WorldChunk,
	points: [number, number][],
	width: number,
	look: { decor: DecorKey; tile: number } | PaletteKey,
	height = 0.03,
	step = 1.5,
	collide = true
) {
	const isDecor = typeof look === 'object';
	const rect = isDecor ? decorRect(look.decor) : null;
	const sid = 0.5 + Math.random() * 0.01;
	const samples: { w: number; t: number; dist: number; side: [number, number] }[] = [];
	let dist = 0;
	for (let i = 0; i < points.length - 1; i++) {
		const [aw, at] = points[i];
		const [bw, bt] = points[i + 1];
		const len = Math.hypot(bw - aw, bt - at);
		const n = Math.max(1, Math.ceil(len / step));
		const sx = -(bt - at) / len;
		const sy = (bw - aw) / len;
		for (let k = i === 0 ? 0 : 1; k <= n; k++) {
			const f = k / n;
			samples.push({ w: aw + (bw - aw) * f, t: at + (bt - at) * f, dist: dist + len * f, side: [sx, sy] });
		}
		dist += len;
	}
	const p = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
	const nrm = new Vector3();
	const hw = width / 2;
	for (let i = 0; i < samples.length - 1; i++) {
		const s0 = samples[i];
		const s1 = samples[i + 1];
		const corner = (s: typeof s0, sign: number, out: Vector3) =>
			trailDir(s.w + s.side[0] * hw * sign, s.t + s.side[1] * hw * sign, out).multiplyScalar(PLANET_RADIUS + height);
		corner(s0, -1, p[0]);
		corner(s0, 1, p[1]);
		corner(s1, 1, p[2]);
		corner(s1, -1, p[3]);
		const uvs = isDecor
			? [
					[0, s0.dist / look.tile],
					[width / look.tile, s0.dist / look.tile],
					[width / look.tile, s1.dist / look.tile],
					[0, s1.dist / look.tile]
				]
			: (() => {
					const [u, v] = paletteUV(look);
					return [[u, v], [u, v], [u, v], [u, v]];
				})();
		const quad = [0, 1, 2, 0, 2, 3];
		nrm.copy(p[0]).add(p[2]).normalize();
		const e1 = p[1].clone().sub(p[0]);
		const e2 = p[2].clone().sub(p[0]);
		const facing = new Vector3().crossVectors(e1, e2).dot(nrm) > 0;
		const order = facing ? quad : [0, 2, 1, 0, 3, 2];
		for (const k of order) {
			chunk.addVertex(isDecor ? 'decor' : 'palette', p[k], nrm, uvs[k][0], uvs[k][1], sid, rect, collide);
		}
	}
}

export function buildStreets(chunk: WorldChunk) {
	// the royal trail: full loop around the equator, restored brick paving
	const loop: [number, number][] = [];
	for (let w = -27; w <= CIRCUMFERENCE - 27; w += 3) loop.push([w, 0]);
	loop.push([CIRCUMFERENCE - 27, 0]);
	buildRibbon(chunk, loop, TRAIL_WIDTH, { decor: 'pavingHerring', tile: 2.4 }, 0.03);
	// kerbs
	buildRibbon(chunk, loop.map(([w]) => [w, TRAIL_WIDTH / 2 + 0.25] as [number, number]), 0.5, 'curb', 0.06, 3);
	buildRibbon(chunk, loop.map(([w]) => [w, -TRAIL_WIDTH / 2 - 0.25] as [number, number]), 0.5, 'curb', 0.06, 3);
	for (const street of STREETS) {
		buildRibbon(chunk, street.points, street.width, { decor: 'pavingStone', tile: 1.8 }, 0.035);
	}
}
