import {
	BoxGeometry,
	BufferAttribute,
	BufferGeometry,
	CylinderGeometry,
	ExtrudeGeometry,
	LatheGeometry,
	Matrix4,
	Path,
	PlaneGeometry,
	Shape,
	ShapeGeometry,
	SphereGeometry,
	Vector2,
	Vector3,
	Euler,
	Quaternion
} from 'three';
import { PLANET_RADIUS } from '../core/config';
import { mulberry32, type Rng } from '../core/math';
import { PlanetFrame } from '../core/planet';
import { decorRect, type DecorKey } from '../render/decorAtlas';
import { paletteUV, type PaletteKey } from '../render/palette';
import { FloatBuffer } from './buffers';

/**
 * Landmarks are authored in a flat local frame (+Y up, +Z = facade direction, +X = right
 * when facing the facade), then baked onto the planet:
 *  - "radial" parts are tessellated and bent with the planet curvature (courtyards, walls,
 *    streets) so their verticals stay perpendicular to the ground
 *  - "upright" parts (minarets, domes, pillars, trees) are placed rigidly on the curved
 *    ground at their pivot so slender shapes keep their proportions
 * Everything is merged per chunk into two meshes (palette + decor atlas) and the collidable
 * parts feed one BVH collider, mirroring how the original merges its planet geometry.
 */

export type Look = PaletteKey | { decor: DecorKey; tile?: number; tileY?: number };

export type Placement = {
	x?: number;
	y?: number;
	z?: number;
	ry?: number;
	rx?: number;
	rz?: number;
};

export type PartOptions = {
	collide?: boolean;
	upright?: boolean;
	perFaceIds?: boolean;
	faceted?: boolean;
	shadow?: boolean;
	id?: number;
	tessellate?: number;
};

export type BoxFaces = Partial<Record<'top' | 'bottom' | 'front' | 'back' | 'left' | 'right', Look>>;

type Kind = 'palette' | 'decor';

type Part = {
	geometry: BufferGeometry;
	kind: Kind;
	collide: boolean;
	upright: boolean;
	pivot: [number, number];
	shadow: boolean;
	tessellate: number;
};

const isDecor = (look: Look): look is { decor: DecorKey; tile?: number; tileY?: number } => typeof look === 'object';

// ------------------------------------------------------------------------------------------
// attribute helpers

function prepare(geometry: BufferGeometry): BufferGeometry {
	const g = geometry.index ? geometry.toNonIndexed() : geometry;
	for (const name of Object.keys(g.attributes)) {
		if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
	}
	if (!g.getAttribute('normal')) g.computeVertexNormals();
	if (!g.getAttribute('uv')) g.setAttribute('uv', new BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
	g.clearGroups();
	return g;
}

function ensureLookAttributes(g: BufferGeometry, decor: boolean) {
	const count = g.getAttribute('position').count;
	if (!g.getAttribute('surfaceId')) g.setAttribute('surfaceId', new BufferAttribute(new Float32Array(count), 1));
	if (decor && !g.getAttribute('uvRect')) g.setAttribute('uvRect', new BufferAttribute(new Float32Array(count * 4), 4));
}

/** Paint vertices [start, start+count) with a palette cell. */
function paintPalette(g: BufferGeometry, key: PaletteKey, start: number, count: number) {
	const uv = g.getAttribute('uv') as BufferAttribute;
	const [u, v] = paletteUV(key);
	for (let i = start; i < start + count; i++) uv.setXY(i, u, v);
}

/** Assign a decor region; uvs are scaled by `scale` for tiling. */
function paintDecor(g: BufferGeometry, key: DecorKey, start: number, count: number, scaleU: number, scaleV: number) {
	const uv = g.getAttribute('uv') as BufferAttribute;
	const rect = g.getAttribute('uvRect') as BufferAttribute;
	const [x, y, w, h] = decorRect(key);
	for (let i = start; i < start + count; i++) {
		uv.setXY(i, uv.getX(i) * scaleU, uv.getY(i) * scaleV);
		rect.setXYZW(i, x, y, w, h);
	}
}

function setIds(g: BufferGeometry, id: number, start = 0, count = g.getAttribute('position').count) {
	const attr = g.getAttribute('surfaceId') as BufferAttribute;
	for (let i = start; i < start + count; i++) attr.setX(i, id);
}

/** Remap shape-space uvs (ShapeGeometry/Extrude caps) into 0..1 using the bounding box. */
function normalizeUVs(g: BufferGeometry) {
	const uv = g.getAttribute('uv') as BufferAttribute;
	let minU = Infinity;
	let minV = Infinity;
	let maxU = -Infinity;
	let maxV = -Infinity;
	for (let i = 0; i < uv.count; i++) {
		minU = Math.min(minU, uv.getX(i));
		maxU = Math.max(maxU, uv.getX(i));
		minV = Math.min(minV, uv.getY(i));
		maxV = Math.max(maxV, uv.getY(i));
	}
	const du = maxU - minU || 1;
	const dv = maxV - minV || 1;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - minU) / du, (uv.getY(i) - minV) / dv);
}

// ------------------------------------------------------------------------------------------
// tessellation (longest-edge bisection, all attributes interpolated)

function tessellate(g: BufferGeometry, maxEdge: number): BufferGeometry {
	const pos = g.getAttribute('position') as BufferAttribute;
	g.computeBoundingBox();
	const bb = g.boundingBox!;
	if (bb.max.x - bb.min.x <= maxEdge && bb.max.z - bb.min.z <= maxEdge && bb.max.y - bb.min.y <= maxEdge * 4) return g;

	const names = ['position', ...Object.keys(g.attributes).filter((n) => n !== 'position')];
	const attrs = names.map((n) => g.getAttribute(n) as BufferAttribute);
	const sizes = attrs.map((a) => a.itemSize);
	const stride = sizes.reduce((a, b) => a + b, 0);
	const normalOffset = (() => {
		let o = 0;
		for (let i = 0; i < names.length; i++) {
			if (names[i] === 'normal') return o;
			o += sizes[i];
		}
		return -1;
	})();

	const readVertex = (index: number, out: Float32Array, offset: number) => {
		let o = offset;
		for (let a = 0; a < attrs.length; a++) {
			const attr = attrs[a];
			const arr = attr.array as Float32Array;
			const s = sizes[a];
			for (let k = 0; k < s; k++) out[o++] = arr[index * s + k];
		}
	};

	const out = new FloatBuffer(pos.count * stride * 3);
	const tri = new Float32Array(stride * 3);
	const stack: Float32Array[] = [];
	const triCount = pos.count / 3;
	const lenSq = (t: Float32Array, a: number, b: number) => {
		const dx = t[a * stride] - t[b * stride];
		const dy = t[a * stride + 1] - t[b * stride + 1];
		const dz = t[a * stride + 2] - t[b * stride + 2];
		return dx * dx + dy * dy + dz * dz;
	};
	const maxSq = maxEdge * maxEdge;

	for (let t = 0; t < triCount; t++) {
		readVertex(t * 3, tri, 0);
		readVertex(t * 3 + 1, tri, stride);
		readVertex(t * 3 + 2, tri, stride * 2);
		stack.push(tri.slice());
		let guard = 0;
		while (stack.length) {
			const cur = stack.pop()!;
			const e0 = lenSq(cur, 0, 1);
			const e1 = lenSq(cur, 1, 2);
			const e2 = lenSq(cur, 2, 0);
			const longest = Math.max(e0, e1, e2);
			if (longest <= maxSq || guard++ > 4096) {
				for (let i = 0; i < stride * 3; i++) out.push1(cur[i]);
				continue;
			}
			// split edge (a, b), opposite vertex c
			const [a, b, c] = e0 === longest ? [0, 1, 2] : e1 === longest ? [1, 2, 0] : [2, 0, 1];
			const mid = new Float32Array(stride);
			for (let i = 0; i < stride; i++) mid[i] = (cur[a * stride + i] + cur[b * stride + i]) * 0.5;
			if (normalOffset >= 0) {
				const nx = mid[normalOffset];
				const ny = mid[normalOffset + 1];
				const nz = mid[normalOffset + 2];
				const l = Math.hypot(nx, ny, nz) || 1;
				mid[normalOffset] = nx / l;
				mid[normalOffset + 1] = ny / l;
				mid[normalOffset + 2] = nz / l;
			}
			const t1 = new Float32Array(stride * 3);
			const t2 = new Float32Array(stride * 3);
			// keep winding: (a, mid, c) and (mid, b, c)
			t1.set(cur.subarray(a * stride, a * stride + stride), 0);
			t1.set(mid, stride);
			t1.set(cur.subarray(c * stride, c * stride + stride), stride * 2);
			t2.set(mid, 0);
			t2.set(cur.subarray(b * stride, b * stride + stride), stride);
			t2.set(cur.subarray(c * stride, c * stride + stride), stride * 2);
			// the original vertex order was (0,1,2); rotate so winding matches
			stack.push(t1, t2);
		}
	}

	const data = out.toArray();
	const vertexCount = data.length / stride;
	const result = new BufferGeometry();
	let offset = 0;
	for (let a = 0; a < names.length; a++) {
		const s = sizes[a];
		const arr = new Float32Array(vertexCount * s);
		for (let v = 0; v < vertexCount; v++) {
			for (let k = 0; k < s; k++) arr[v * s + k] = data[v * stride + offset + k];
		}
		result.setAttribute(names[a], new BufferAttribute(arr, s));
		offset += s;
	}
	return result;
}

// ------------------------------------------------------------------------------------------
// arch shapes

/** Pointed (two-centred) Mughal arch outline points from left spring to right spring. */
export function archCurve(cx: number, springY: number, width: number, rise: number, segments = 8): Vector2[] {
	const hw = width / 2;
	const r = (hw * hw + rise * rise) / (2 * hw);
	const phi1 = Math.atan2(rise, r - hw);
	const pts: Vector2[] = [];
	// left arc: centre (cx - hw + r, springY), from angle PI down to PI - phi1
	for (let i = 0; i <= segments; i++) {
		const a = Math.PI - (i / segments) * phi1;
		pts.push(new Vector2(cx - hw + r + Math.cos(a) * r, springY + Math.sin(a) * r));
	}
	// right arc: centre (cx + hw - r, springY), from phi1 down to 0
	for (let i = 1; i <= segments; i++) {
		const a = phi1 - (i / segments) * phi1;
		pts.push(new Vector2(cx + hw - r + Math.cos(a) * r, springY + Math.sin(a) * r));
	}
	return pts;
}

export type Opening = { x: number; y?: number; w: number; h: number; rise?: number; flat?: boolean };

function openingPath(o: Opening): Path {
	const y0 = o.y ?? 0;
	const rise = o.flat ? 0 : (o.rise ?? o.w * 0.62);
	const path = new Path();
	const hw = o.w / 2;
	path.moveTo(o.x - hw, y0);
	path.lineTo(o.x + hw, y0);
	if (rise <= 0.001) {
		path.lineTo(o.x + hw, y0 + o.h);
		path.lineTo(o.x - hw, y0 + o.h);
	} else {
		const spring = y0 + o.h - rise;
		path.lineTo(o.x + hw, spring);
		const curve = archCurve(o.x, spring, o.w, rise, 8).reverse();
		for (const p of curve) path.lineTo(p.x, p.y);
	}
	path.closePath();
	return path;
}

function archShape(width: number, height: number, rise: number): Shape {
	const s = new Shape();
	const hw = width / 2;
	const spring = height - rise;
	s.moveTo(-hw, 0);
	s.lineTo(hw, 0);
	s.lineTo(hw, spring);
	const curve = archCurve(0, spring, width, rise, 10).reverse();
	for (const p of curve) s.lineTo(p.x, p.y);
	s.closePath();
	return s;
}

// ------------------------------------------------------------------------------------------
// dome profiles

export type DomeStyle = 'onion' | 'hemi' | 'shallow' | 'bulb' | 'kalash';

function domeProfile(radius: number, height: number, style: DomeStyle): Vector2[] {
	const table: Record<DomeStyle, [number, number][]> = {
		onion: [
			[1.0, 0], [1.05, 0.06], [1.1, 0.16], [1.12, 0.26], [1.09, 0.38], [0.99, 0.5], [0.82, 0.62],
			[0.6, 0.73], [0.4, 0.82], [0.24, 0.89], [0.12, 0.95], [0.0, 1.0]
		],
		bulb: [
			[1.0, 0], [1.12, 0.12], [1.18, 0.28], [1.12, 0.46], [0.92, 0.62], [0.62, 0.77], [0.34, 0.88],
			[0.14, 0.96], [0.0, 1.0]
		],
		hemi: [
			[1.0, 0], [0.98, 0.18], [0.92, 0.38], [0.81, 0.58], [0.64, 0.76], [0.42, 0.9], [0.2, 0.98], [0.0, 1.0]
		],
		shallow: [[1.0, 0], [0.95, 0.3], [0.82, 0.58], [0.6, 0.82], [0.32, 0.96], [0.0, 1.0]],
		kalash: [
			[0.32, 0], [0.5, 0.06], [0.52, 0.14], [0.3, 0.22], [0.22, 0.28], [0.62, 0.38], [0.66, 0.5],
			[0.42, 0.6], [0.18, 0.66], [0.3, 0.72], [0.12, 0.8], [0.05, 0.9], [0.0, 1.0]
		]
	};
	return table[style].map(([r, y]) => new Vector2(Math.max(0.0001, r * radius), y * height));
}

// ------------------------------------------------------------------------------------------

const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpE = new Euler();
const tmpV = new Vector3();

export class Builder {
	readonly parts: Part[] = [];
	readonly rng: Rng;
	private idRng: Rng;

	constructor(seed = 1) {
		this.rng = mulberry32(seed);
		this.idRng = mulberry32(seed * 7919 + 13);
	}

	nextId(): number {
		return 0.04 + this.idRng() * 0.92;
	}

	private place(g: BufferGeometry, at: Placement) {
		tmpE.set(at.rx ?? 0, at.ry ?? 0, at.rz ?? 0, 'YXZ');
		tmpQ.setFromEuler(tmpE);
		tmpM.compose(tmpV.set(at.x ?? 0, at.y ?? 0, at.z ?? 0), tmpQ, new Vector3(1, 1, 1));
		g.applyMatrix4(tmpM);
	}

	/** Add a prepared geometry (local coords already applied) as a part. */
	addPart(g: BufferGeometry, kind: Kind, at: Placement, opts: PartOptions, defaults: { collide: boolean; upright: boolean }) {
		const upright = opts.upright ?? defaults.upright;
		this.parts.push({
			geometry: g,
			kind,
			collide: opts.collide ?? defaults.collide,
			upright,
			pivot: [at.x ?? 0, at.z ?? 0],
			shadow: opts.shadow ?? true,
			tessellate: opts.tessellate ?? 2.5
		});
	}

	private finish(g: BufferGeometry, look: Look, opts: PartOptions, faceVertexRanges?: [number, number, number, number][]) {
		const decor = isDecor(look);
		ensureLookAttributes(g, decor);
		const count = g.getAttribute('position').count;
		if (decor) {
			if (!faceVertexRanges) {
				const t = look.tile;
				paintDecor(g, look.decor, 0, count, t ? 1 / t : 1, t ? 1 / (look.tileY ?? t) : 1);
			}
		} else {
			paintPalette(g, look, 0, count);
		}
		if (opts.perFaceIds && faceVertexRanges) {
			for (const [start, n] of faceVertexRanges) setIds(g, this.nextId(), start, n);
		} else {
			setIds(g, opts.id ?? this.nextId());
		}
		return decor ? 'decor' : 'palette';
	}

	// --------------------------------------------------------------------------------------
	// primitives (bottom of the shape sits at `at.y`)

	box(w: number, h: number, d: number, look: Look, at: Placement = {}, opts: PartOptions = {}, faces?: BoxFaces): this {
		const g = prepare(new BoxGeometry(w, h, d));
		g.translate(0, h / 2, 0);
		const faceDims: [number, number][] = [
			[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]
		];
		const faceNames = ['right', 'left', 'top', 'bottom', 'front', 'back'] as const;
		const ranges: [number, number, number, number][] = faceDims.map((dims, i) => [i * 6, 6, dims[0], dims[1]]);
		const anyDecor = isDecor(look) || (faces && Object.values(faces).some((f) => f && isDecor(f)));
		ensureLookAttributes(g, !!anyDecor);
		// palette faces inside a decor part keep palette uvs with a zero uvRect; the decor
		// shader then samples the palette texture instead of the atlas
		ranges.forEach(([start, n, du, dv], i) => {
			const faceLook = faces?.[faceNames[i]] ?? look;
			if (isDecor(faceLook)) {
				const t = faceLook.tile;
				paintDecor(g, faceLook.decor, start, n, t ? du / t : 1, t ? dv / (faceLook.tileY ?? t) : 1);
			} else {
				paintPalette(g, faceLook, start, n);
			}
		});
		if (opts.perFaceIds ?? true) {
			for (const [start, n] of ranges) setIds(g, this.nextId(), start, n);
		} else setIds(g, opts.id ?? this.nextId());
		this.place(g, at);
		this.addPart(g, anyDecor ? 'decor' : 'palette', at, opts, { collide: true, upright: false });
		return this;
	}

	/** n-sided prism or cylinder; `rTop` defaults to `r`. */
	prism(r: number, h: number, sides: number, look: Look, at: Placement = {}, opts: PartOptions & { rTop?: number; open?: boolean; capLook?: Look } = {}): this {
		const g0 = new CylinderGeometry(opts.rTop ?? r, r, h, sides, 1, opts.open ?? false, sides <= 12 ? Math.PI / sides : 0);
		const g = prepare(g0);
		g.translate(0, h / 2, 0);
		const faceted = opts.faceted ?? sides <= 12;
		if (faceted) g.computeVertexNormals();
		if (isDecor(look) && look.tile) {
			// world-scale uvs (circumference x height) before finish() divides by the tile size
			const uv = g.getAttribute('uv') as BufferAttribute;
			const circ = 2 * Math.PI * r;
			for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * h);
		}
		const kind = this.finish(g, look, opts);
		if (faceted && (opts.perFaceIds ?? false)) {
			for (let s = 0; s < sides; s++) setIds(g, this.nextId(), s * 6, 6);
		}
		this.place(g, at);
		this.addPart(g, kind, at, opts, { collide: true, upright: r < 4 });
		return this;
	}

	cylinder(r: number, h: number, look: Look, at: Placement = {}, opts: PartOptions & { rTop?: number; segments?: number; open?: boolean } = {}): this {
		return this.prism(r, h, opts.segments ?? 16, look, at, { faceted: false, ...opts });
	}

	lathe(profile: Vector2[], look: Look, at: Placement = {}, opts: PartOptions & { segments?: number } = {}): this {
		const g = prepare(new LatheGeometry(profile, opts.segments ?? 20));
		if (opts.faceted) g.computeVertexNormals();
		const kind = this.finish(g, look, opts);
		this.place(g, at);
		this.addPart(g, kind, at, opts, { collide: false, upright: true });
		return this;
	}

	dome(radius: number, height: number, style: DomeStyle, look: Look, at: Placement = {}, opts: PartOptions & { segments?: number } = {}): this {
		return this.lathe(domeProfile(radius, height, style), look, at, { segments: opts.segments ?? 24, ...opts });
	}

	sphere(r: number, look: Look, at: Placement = {}, opts: PartOptions & { w?: number; hSeg?: number; sy?: number } = {}): this {
		const g = prepare(new SphereGeometry(r, opts.w ?? 10, opts.hSeg ?? 7));
		if (opts.sy) g.scale(1, opts.sy, 1);
		if (opts.faceted ?? true) g.computeVertexNormals();
		const kind = this.finish(g, look, opts);
		this.place(g, at);
		this.addPart(g, kind, at, opts, { collide: false, upright: true });
		return this;
	}

	/** Vertical quad facing +Z (before rotation), bottom edge at at.y. */
	panel(w: number, h: number, look: Look, at: Placement = {}, opts: PartOptions & { arch?: number } = {}): this {
		let g: BufferGeometry;
		if (opts.arch) {
			g = prepare(new ShapeGeometry(archShape(w, h, opts.arch), 10));
			normalizeUVs(g);
		} else {
			g = prepare(new PlaneGeometry(w, h));
			g.translate(0, h / 2, 0);
		}
		ensureLookAttributes(g, isDecor(look));
		if (isDecor(look)) {
			const t = look.tile;
			paintDecor(g, look.decor, 0, g.getAttribute('position').count, t ? w / t : 1, t ? h / (look.tileY ?? t) : 1);
			setIds(g, opts.id ?? this.nextId());
		} else {
			paintPalette(g, look, 0, g.getAttribute('position').count);
			setIds(g, opts.id ?? this.nextId());
		}
		this.place(g, at);
		this.addPart(g, isDecor(look) ? 'decor' : 'palette', at, opts, { collide: false, upright: false });
		return this;
	}

	/** Horizontal quad facing up, centred at (x, z). */
	floor(w: number, d: number, look: Look, at: Placement = {}, opts: PartOptions = {}): this {
		const g = prepare(new PlaneGeometry(w, d));
		g.rotateX(-Math.PI / 2);
		ensureLookAttributes(g, isDecor(look));
		if (isDecor(look)) {
			const t = look.tile;
			paintDecor(g, look.decor, 0, g.getAttribute('position').count, t ? w / t : 1, t ? d / (look.tileY ?? t) : 1);
		} else paintPalette(g, look, 0, g.getAttribute('position').count);
		setIds(g, opts.id ?? this.nextId());
		this.place(g, at);
		this.addPart(g, isDecor(look) ? 'decor' : 'palette', at, opts, { collide: true, upright: false });
		return this;
	}

	/**
	 * Wall of width `w`, height `h`, thickness `depth` centred on z, with arched openings.
	 * `sideLook` colours the opening reveals and wall edges.
	 */
	archWall(w: number, h: number, depth: number, openings: Opening[], look: Look, at: Placement = {}, opts: PartOptions & { sideLook?: PaletteKey } = {}): this {
		const shape = new Shape();
		shape.moveTo(-w / 2, 0);
		shape.lineTo(w / 2, 0);
		shape.lineTo(w / 2, h);
		shape.lineTo(-w / 2, h);
		shape.closePath();
		for (const o of openings) shape.holes.push(openingPath(o));
		const raw = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8, steps: 1 });
		const groups = raw.groups.map((gr) => ({ ...gr }));
		const g = prepare(raw);
		g.translate(0, 0, -depth / 2);
		const count = g.getAttribute('position').count;
		const decor = isDecor(look);
		ensureLookAttributes(g, decor);
		// uv from shape coordinates for caps (front/back)
		const uv = g.getAttribute('uv') as BufferAttribute;
		const pos = g.getAttribute('position') as BufferAttribute;
		for (let i = 0; i < count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, pos.getY(i) / h);
		if (decor) {
			const t = look.tile;
			paintDecor(g, look.decor, 0, count, t ? w / t : 1, t ? h / (look.tileY ?? t) : 1);
		} else paintPalette(g, look, 0, count);
		const sideGroup = groups.find((gr) => gr.materialIndex === 1);
		if (sideGroup && opts.sideLook) {
			paintPalette(g, opts.sideLook, sideGroup.start, sideGroup.count);
			if (decor) {
				const rect = g.getAttribute('uvRect') as BufferAttribute;
				for (let i = sideGroup.start; i < sideGroup.start + sideGroup.count; i++) rect.setXYZW(i, 0, 0, 0, 0);
			}
		}
		setIds(g, opts.id ?? this.nextId());
		if (sideGroup) setIds(g, this.nextId(), sideGroup.start, sideGroup.count);
		this.place(g, at);
		this.addPart(g, decor ? 'decor' : 'palette', at, opts, { collide: true, upright: false });
		return this;
	}

	/** Extruded custom shape in the XY plane, extruded along Z (centred). */
	extrude(shape: Shape, depth: number, look: Look, at: Placement = {}, opts: PartOptions = {}): this {
		const g = prepare(new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }));
		g.translate(0, 0, -depth / 2);
		normalizeUVs(g);
		const kind = this.finish(g, look, opts);
		this.place(g, at);
		this.addPart(g, kind, at, opts, { collide: false, upright: false });
		return this;
	}

	/** Free-form geometry already authored in local space (applied after `at`). */
	custom(geometry: BufferGeometry, look: Look, at: Placement = {}, opts: PartOptions = {}): this {
		const g = prepare(geometry);
		if (opts.faceted) g.computeVertexNormals();
		const kind = this.finish(g, look, opts);
		this.place(g, at);
		this.addPart(g, kind, at, opts, { collide: false, upright: false });
		return this;
	}

	// --------------------------------------------------------------------------------------
	// composite helpers shared by many landmarks

	/** Row of kanguras (merlons) along local X, centred at `at`. */
	merlons(length: number, size: number, look: Look, at: Placement = {}, opts: PartOptions = {}): this {
		const count = Math.max(1, Math.floor(length / (size * 1.25)));
		const step = length / count;
		const shape = new Shape();
		const hw = size * 0.38;
		shape.moveTo(-hw, 0);
		shape.lineTo(hw, 0);
		shape.lineTo(hw, size * 0.55);
		shape.quadraticCurveTo(hw, size * 0.9, 0, size);
		shape.quadraticCurveTo(-hw, size * 0.9, -hw, size * 0.55);
		shape.closePath();
		const ry = at.ry ?? 0;
		const cos = Math.cos(ry);
		const sin = Math.sin(ry);
		for (let i = 0; i < count; i++) {
			const lx = -length / 2 + step * (i + 0.5);
			this.extrude(shape, size * 0.22, look, {
				x: (at.x ?? 0) + lx * cos,
				y: at.y ?? 0,
				z: (at.z ?? 0) - lx * sin,
				ry
			}, { collide: false, upright: true, ...opts });
		}
		return this;
	}

	/** Mughal kalash finial. */
	finial(height: number, look: PaletteKey, at: Placement = {}): this {
		return this.lathe(domeProfile(height * 0.16, height, 'kalash'), look, at, { segments: 10, collide: false, upright: true });
	}

	/** Open domed pavilion on pillars (chhatri). */
	chhatri(radius: number, height: number, look: {
		pillar: PaletteKey;
		roof: PaletteKey;
		dome: PaletteKey;
		finial?: PaletteKey;
		base?: PaletteKey;
	}, at: Placement = {}, opts: { pillars?: number; domeStyle?: DomeStyle; domeScale?: number } = {}): this {
		const x = at.x ?? 0;
		const y = at.y ?? 0;
		const z = at.z ?? 0;
		const n = opts.pillars ?? 8;
		const baseH = height * 0.08;
		if (look.base) this.prism(radius * 1.05, baseH, 8, look.base, { x, y, z }, { upright: true, collide: true });
		const pillarH = height * 0.42;
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2 + Math.PI / n;
			this.prism(radius * 0.09, pillarH, 6, look.pillar, {
				x: x + Math.sin(a) * radius * 0.82,
				y: y + baseH,
				z: z + Math.cos(a) * radius * 0.82
			}, { upright: true, collide: false });
		}
		const eaveY = y + baseH + pillarH;
		this.prism(radius * 1.32, height * 0.05, 8, look.roof, { x, y: eaveY, z }, { upright: true, collide: false, rTop: radius * 1.05 });
		this.prism(radius * 0.98, height * 0.08, 8, look.roof, { x, y: eaveY + height * 0.05, z }, { upright: true, collide: false });
		const domeY = eaveY + height * 0.13;
		const scale = opts.domeScale ?? 1;
		this.dome(radius * 0.95 * scale, height * 0.42 * scale, opts.domeStyle ?? 'onion', look.dome, { x, y: domeY, z }, { upright: true });
		this.finial(height * 0.2, look.finial ?? 'gold', { x, y: domeY + height * 0.4 * scale, z });
		return this;
	}

	/** Pointed arch outline frame (thin band) on a facade facing +Z. */
	archFrame(w: number, h: number, band: number, look: Look, at: Placement = {}, opts: PartOptions & { rise?: number } = {}): this {
		const rise = opts.rise ?? w * 0.62;
		const outer = archShape(w + band * 2, h + band, rise + band * 0.6);
		const inner = new Path(archShape(w, h, rise).getPoints(10));
		outer.holes.push(inner);
		const g = prepare(new ExtrudeGeometry(outer, { depth: band * 0.5, bevelEnabled: false, curveSegments: 10 }));
		normalizeUVs(g);
		const kind = this.finish(g, look, opts);
		this.place(g, at);
		this.addPart(g, kind, at, opts, { collide: false, upright: false });
		return this;
	}

	/** Steps rising along +Z, centred on x, starting at z0. */
	stairs(width: number, stepCount: number, rise: number, run: number, look: Look, at: Placement = {}, opts: PartOptions = {}): this {
		const ry = at.ry ?? 0;
		const cos = Math.cos(ry);
		const sin = Math.sin(ry);
		for (let i = 0; i < stepCount; i++) {
			const lz = i * run + run / 2;
			this.box(width, rise * (i + 1), run, look, {
				x: (at.x ?? 0) + lz * sin,
				y: at.y ?? 0,
				z: (at.z ?? 0) + lz * cos,
				ry
			}, { collide: true, ...opts });
		}
		return this;
	}

	// --------------------------------------------------------------------------------------

	/** Bake all parts onto the planet through `frame` into `chunk`. */
	bake(frame: PlanetFrame, chunk: WorldChunk) {
		for (const part of this.parts) chunk.addPart(part, frame);
		this.parts.length = 0;
	}
}

// ------------------------------------------------------------------------------------------

/** Accumulates baked geometry for one chunk of the world. */
export class WorldChunk {
	readonly name: string;
	readonly palette = { pos: new FloatBuffer(), nor: new FloatBuffer(), uv: new FloatBuffer(), sid: new FloatBuffer() };
	readonly decor = { pos: new FloatBuffer(), nor: new FloatBuffer(), uv: new FloatBuffer(), sid: new FloatBuffer(), rect: new FloatBuffer() };
	readonly collider: FloatBuffer;
	castShadow = true;

	constructor(name: string, collider: FloatBuffer) {
		this.name = name;
		this.collider = collider;
	}

	addPart(part: Part, frame: PlanetFrame) {
		let g = part.geometry;
		if (!part.upright && part.tessellate > 0) g = tessellate(g, part.tessellate);
		const pos = g.getAttribute('position') as BufferAttribute;
		const nor = g.getAttribute('normal') as BufferAttribute;
		const uv = g.getAttribute('uv') as BufferAttribute;
		const sid = g.getAttribute('surfaceId') as BufferAttribute;
		const rect = g.getAttribute('uvRect') as BufferAttribute | undefined;
		const target = part.kind === 'decor' ? this.decor : this.palette;
		const count = pos.count;
		const p = new Vector3();
		const n = new Vector3();
		const axis = new Vector3();
		const dirT = new Vector3();
		const base = frame.baseRadius;

		// upright: rigid transform at pivot
		let uprightMatrix: Matrix4 | null = null;
		let uprightNormal: Matrix4 | null = null;
		if (part.upright) {
			const [px, pz] = part.pivot;
			uprightMatrix = frame.uprightMatrix(px, 0, pz);
			// translate so the pivot maps to the matrix origin
			uprightMatrix.multiply(new Matrix4().makeTranslation(-px, 0, -pz));
			uprightNormal = new Matrix4().extractRotation(uprightMatrix);
		}

		for (let i = 0; i < count; i++) {
			const lx = pos.getX(i);
			const ly = pos.getY(i);
			const lz = pos.getZ(i);
			const nx = nor.getX(i);
			const ny = nor.getY(i);
			const nz = nor.getZ(i);
			if (uprightMatrix && uprightNormal) {
				p.set(lx, ly, lz).applyMatrix4(uprightMatrix);
				n.set(nx, ny, nz).applyMatrix4(uprightNormal).normalize();
			} else {
				const s = Math.hypot(lx, lz);
				n.copy(frame.x).multiplyScalar(nx).addScaledVector(frame.up, ny).addScaledVector(frame.z, nz);
				if (s < 1e-7) {
					p.copy(frame.up).multiplyScalar(base + ly);
				} else {
					const ang = s / PLANET_RADIUS;
					dirT.copy(frame.x).multiplyScalar(lx / s).addScaledVector(frame.z, lz / s);
					p.copy(frame.up).multiplyScalar(Math.cos(ang)).addScaledVector(dirT, Math.sin(ang)).multiplyScalar(base + ly);
					axis.crossVectors(frame.up, dirT).normalize();
					// Rodrigues rotation of the normal
					const c = Math.cos(ang);
					const sn = Math.sin(ang);
					const dot = axis.dot(n);
					const cx = axis.y * n.z - axis.z * n.y;
					const cy = axis.z * n.x - axis.x * n.z;
					const cz = axis.x * n.y - axis.y * n.x;
					n.set(
						n.x * c + cx * sn + axis.x * dot * (1 - c),
						n.y * c + cy * sn + axis.y * dot * (1 - c),
						n.z * c + cz * sn + axis.z * dot * (1 - c)
					);
				}
			}
			target.pos.push3(p.x, p.y, p.z);
			target.nor.push3(n.x, n.y, n.z);
			target.uv.push2(uv.getX(i), uv.getY(i));
			target.sid.push1(sid ? sid.getX(i) : 0);
			if (part.kind === 'decor') {
				if (rect) this.decor.rect.push4(rect.getX(i), rect.getY(i), rect.getZ(i), rect.getW(i));
				else this.decor.rect.push4(0, 0, 0, 0);
			}
			if (part.collide) this.collider.push3(p.x, p.y, p.z);
		}
		g.dispose();
		if (g !== part.geometry) part.geometry.dispose();
	}

	/** Append one world-space vertex (geometry generated directly on the planet). */
	addVertex(kind: Kind, p: Vector3, n: Vector3, u: number, v: number, sid: number, rect: [number, number, number, number] | null, collide: boolean) {
		const target = kind === 'decor' ? this.decor : this.palette;
		target.pos.push3(p.x, p.y, p.z);
		target.nor.push3(n.x, n.y, n.z);
		target.uv.push2(u, v);
		target.sid.push1(sid);
		if (kind === 'decor') {
			const r = rect ?? [0, 0, 0, 0];
			this.decor.rect.push4(r[0], r[1], r[2], r[3]);
		}
		if (collide) this.collider.push3(p.x, p.y, p.z);
	}

	/** Convert accumulated data into geometries (null when empty). */
	build(): { palette: BufferGeometry | null; decor: BufferGeometry | null } {
		const make = (src: typeof this.palette, rect?: FloatBuffer): BufferGeometry | null => {
			if (src.pos.length === 0) return null;
			const g = new BufferGeometry();
			g.setAttribute('position', new BufferAttribute(src.pos.toArray(), 3));
			g.setAttribute('normal', new BufferAttribute(src.nor.toArray(), 3));
			g.setAttribute('uv', new BufferAttribute(src.uv.toArray(), 2));
			g.setAttribute('surfaceId', new BufferAttribute(src.sid.toArray(), 1));
			if (rect) g.setAttribute('uvRect', new BufferAttribute(rect.toArray(), 4));
			g.computeBoundingSphere();
			g.computeBoundingBox();
			return g;
		};
		return { palette: make(this.palette), decor: make(this.decor, this.decor.rect) };
	}
}
