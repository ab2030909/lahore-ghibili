import { Vector3 } from 'three';
import { PlanetFrame, trailPoint } from '../core/planet';
import { Builder, WorldChunk } from '../geometry/builder';
import { FloatBuffer } from '../geometry/buffers';
import type { NpcModel, Outfit } from '../characters/outfits';
import type { LandmarkId } from '../heritage/landmarks';

export type NpcRole = 'shopkeeper' | 'vendor' | 'visitor' | 'diner' | 'elder' | 'child' | 'musician' | 'worshipper' | 'guard' | 'craftsman';

export type NpcSpot = {
	position: Vector3;
	forward: Vector3;
	role: NpcRole;
	models?: NpcModel[];
	sit?: boolean;
	dialogue?: string;
	name?: string;
	/** Fixed uniform (e.g. Pakistan Rangers, BSF) instead of a random outfit for the model. */
	outfit?: Outfit;
};

export type WalkPath = { points: Vector3[]; loop: boolean; walkers: number; models?: NpcModel[] };

export type Anchor = {
	id: LandmarkId;
	/** Where the postcard marker floats and the discovery prompt triggers. */
	position: Vector3;
	radius: number;
	/** Point of interest the camera can glance at. */
	focus: Vector3;
};

export type ShopSpot = { position: Vector3; radius: number; label: string; urdu: string; info: string };

export type Pool = { frame: PlanetFrame; x: number; z: number; w: number; d: number; y: number };

/** Boat dock: where the boat waits on the water and where the rider steps ashore. */
export type Dock = { name: string; water: Vector3; shore: Vector3; forward: Vector3 };

export class WorldContext {
	readonly chunks = new Map<string, WorldChunk>();
	readonly collider = new FloatBuffer(1 << 20);
	readonly anchors: Anchor[] = [];
	readonly npcSpots: NpcSpot[] = [];
	readonly walkPaths: WalkPath[] = [];
	readonly shops: ShopSpot[] = [];
	readonly pools: Pool[] = [];
	readonly docks: Dock[] = [];
	/** Parking spot of the dakiya's Sohrab cycle. */
	bikeSpot: { position: Vector3; forward: Vector3 } | null = null;
	/** Thin cable polylines (world points) drawn with the existing cable prop material. */
	readonly wires: Vector3[][] = [];
	/** Bulbs of string lights (world points) for the lights mesh. */
	readonly bulbs: { position: Vector3; color: 'bulb' | 'lantern' | 'lanternRed' | 'neonPink' | 'neonGreen' }[] = [];
	/** Kites flying over rooftops. */
	readonly kites: { anchor: Vector3; color: string; phase: number }[] = [];

	chunk(name: string): WorldChunk {
		let c = this.chunks.get(name);
		if (!c) {
			c = new WorldChunk(name, this.collider);
			this.chunks.set(name, c);
		}
		return c;
	}

	/** Bake a builder at a frame into a named chunk. */
	bake(builder: Builder, frame: PlanetFrame, chunk: string) {
		builder.bake(frame, this.chunk(chunk));
	}

	/** NPC spot from local landmark coordinates. */
	spot(frame: PlanetFrame, x: number, z: number, faceDeg: number, role: NpcRole, extra: Partial<NpcSpot> = {}, y = 0) {
		const position = frame.point(x, y, z);
		const up = position.clone().normalize();
		const a = (faceDeg * Math.PI) / 180;
		// local facing: 0 = +Z (facade direction), 90 = +X
		const q = frame.bendRotation(x, z);
		const forward = frame.dir(Math.sin(a), 0, Math.cos(a)).applyQuaternion(q);
		forward.addScaledVector(up, -forward.dot(up)).normalize();
		this.npcSpots.push({ position, forward, role, ...extra });
	}

	/** Walk path from local points of a frame. */
	path(frame: PlanetFrame, pts: [number, number][], loop: boolean, walkers: number, models?: NpcModel[], y = 0.03) {
		// densify so walkers follow the curved ground
		const dense: [number, number][] = [];
		const all = loop ? [...pts, pts[0]] : pts;
		for (let i = 0; i < all.length - 1; i++) {
			const [ax, az] = all[i];
			const [bx, bz] = all[i + 1];
			const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2));
			for (let k = 0; k < n; k++) dense.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
		}
		if (!loop) dense.push(pts[pts.length - 1]);
		this.walkPaths.push({ points: dense.map(([x, z]) => frame.point(x, y, z)), loop, walkers, models });
	}

	/** Walk path in trail coordinates. */
	trailPath(pts: [number, number][], loop: boolean, walkers: number, models?: NpcModel[]) {
		const dense: [number, number][] = [];
		const all = loop ? [...pts, pts[0]] : pts;
		for (let i = 0; i < all.length - 1; i++) {
			const [aw, at] = all[i];
			const [bw, bt] = all[i + 1];
			const n = Math.max(1, Math.ceil(Math.hypot(bw - aw, bt - at) / 2));
			for (let k = 0; k < n; k++) dense.push([aw + ((bw - aw) * k) / n, at + ((bt - at) * k) / n]);
		}
		if (!loop) dense.push(pts[pts.length - 1]);
		this.walkPaths.push({ points: dense.map(([w, t]) => trailPoint(w, t, 0.03)), loop, walkers, models });
	}

	anchor(id: LandmarkId, frame: PlanetFrame, x: number, z: number, focus: [number, number, number], radius = 7, y = 0) {
		this.anchors.push({ id, position: frame.point(x, y, z), radius, focus: frame.point(focus[0], focus[1], focus[2]) });
	}

	shop(frame: PlanetFrame, x: number, z: number, label: string, urdu: string, info: string) {
		this.shops.push({ position: frame.point(x, 0, z), radius: 2.6, label, urdu, info });
	}

	/** Catenary wire between two world points. */
	wire(a: Vector3, b: Vector3, sag = 0.6, segments = 10) {
		const pts: Vector3[] = [];
		for (let i = 0; i <= segments; i++) {
			const t = i / segments;
			const p = a.clone().lerp(b, t);
			const up = p.clone().normalize();
			p.addScaledVector(up, -sag * 4 * t * (1 - t));
			pts.push(p);
		}
		this.wires.push(pts);
	}

	/** String lights between two world points. */
	stringLights(a: Vector3, b: Vector3, sag: number, spacing: number, color: 'bulb' | 'lantern' | 'lanternRed' | 'neonPink' | 'neonGreen' = 'bulb') {
		const len = a.distanceTo(b);
		const count = Math.max(2, Math.floor(len / spacing));
		this.wire(a, b, sag, Math.max(8, count));
		for (let i = 1; i < count; i++) {
			const t = i / count;
			const p = a.clone().lerp(b, t);
			const up = p.clone().normalize();
			p.addScaledVector(up, -sag * 4 * t * (1 - t) - 0.08);
			this.bulbs.push({ position: p, color });
		}
	}
}
