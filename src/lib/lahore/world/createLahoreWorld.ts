import {
	BufferAttribute,
	BufferGeometry,
	CatmullRomCurve3,
	Group,
	Mesh,
	SphereGeometry,
	TubeGeometry,
	Vector3,
	type ShaderMaterial,
	type Texture
} from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createGameplayWaterMaterial } from '$lib/engine/gameplayWater';
import { createPropMaterial } from '$lib/engine/propMaterial';
import { paletteUV } from '../render/palette';
import { createToonMaterial } from '../render/toonMaterial';
import { WorldContext } from './context';
import { buildGround, buildRiverWater, buildStreets } from './ground';
import { buildBazaars } from './havelis';
import { buildLandmarks } from './landmarks/index';
import { buildFiller } from './filler';

export type WorldTextures = {
	palette: Texture;
	decor: Texture;
	noiseTerrain: Texture;
	waterNoise: Texture;
	cloudNoise: Texture;
};

export type LahoreWorld = {
	group: Group;
	bvh: MeshBVH;
	ctx: WorldContext;
	materials: {
		palette: ShaderMaterial;
		decor: ShaderMaterial;
		water: ShaderMaterial;
		cables: ShaderMaterial;
		bulbs: ShaderMaterial;
		all: ShaderMaterial[];
	};
	stats: { triangles: number; colliderTriangles: number; chunks: number };
};

function buildCables(ctx: WorldContext, material: ShaderMaterial): Mesh | null {
	if (!ctx.wires.length) return null;
	const geos: BufferGeometry[] = [];
	for (const pts of ctx.wires) {
		const curve = new CatmullRomCurve3(pts);
		const tube = new TubeGeometry(curve, Math.max(6, pts.length), 0.022, 3, false);
		tube.deleteAttribute('uv');
		geos.push(tube);
	}
	const merged = mergeGeometries(geos, false);
	geos.forEach((g) => g.dispose());
	if (!merged) return null;
	const mesh = new Mesh(merged, material);
	mesh.name = 'Cables';
	mesh.frustumCulled = true;
	merged.computeBoundingSphere();
	return mesh;
}

function buildBulbs(ctx: WorldContext, material: ShaderMaterial): Mesh | null {
	if (!ctx.bulbs.length) return null;
	const base = new SphereGeometry(0.075, 6, 4);
	const geos: BufferGeometry[] = [];
	for (const bulb of ctx.bulbs) {
		const g = base.clone();
		g.translate(bulb.position.x, bulb.position.y, bulb.position.z);
		const [u, v] = paletteUV(bulb.color);
		const uv = g.getAttribute('uv') as BufferAttribute;
		for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
		g.setAttribute('surfaceId', new BufferAttribute(new Float32Array(uv.count).fill(0.97), 1));
		geos.push(g);
	}
	const merged = mergeGeometries(geos, false);
	geos.forEach((g) => g.dispose());
	base.dispose();
	if (!merged) return null;
	const mesh = new Mesh(merged, material);
	mesh.name = 'StringLights';
	return mesh;
}

function poolGeometry(ctx: WorldContext): { positions: number[]; normals: number[]; uvs: number[] } {
	const positions: number[] = [];
	const normals: number[] = [];
	const uvs: number[] = [];
	for (const pool of ctx.pools) {
		const nx = Math.max(1, Math.ceil(pool.w / 1.5));
		const nz = Math.max(1, Math.ceil(pool.d / 1.5));
		const p = (i: number, j: number) => pool.frame.point(pool.x - pool.w / 2 + (pool.w * i) / nx, pool.y, pool.z - pool.d / 2 + (pool.d * j) / nz);
		for (let i = 0; i < nx; i++) {
			for (let j = 0; j < nz; j++) {
				const quad = [p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)];
				for (const k of [0, 2, 1, 0, 3, 2]) {
					const v = quad[k];
					positions.push(v.x, v.y, v.z);
					const n = v.clone().normalize();
					normals.push(n.x, n.y, n.z);
					uvs.push((i + (k === 1 || k === 2 ? 1 : 0)) / nx, (j + (k >= 2 ? 1 : 0)) / nz);
				}
			}
		}
	}
	return { positions, normals, uvs };
}

function buildWater(textures: WorldTextures, ctx: WorldContext): { mesh: Mesh; material: ShaderMaterial } {
	const material = createGameplayWaterMaterial(textures.waterNoise, new Vector3(10, 16, 6), 0.1, 600);
	const river = buildRiverWater();
	const pools = poolGeometry(ctx);
	const g = new BufferGeometry();
	g.setAttribute('position', new BufferAttribute(Float32Array.from([...river.positions, ...pools.positions]), 3));
	g.setAttribute('normal', new BufferAttribute(Float32Array.from([...river.normals, ...pools.normals]), 3));
	g.setAttribute('uv', new BufferAttribute(Float32Array.from([...river.uvs, ...pools.uvs]), 2));
	g.computeBoundingSphere();
	const mesh = new Mesh(g, material);
	mesh.name = 'RiverRavi';
	mesh.renderOrder = 2;
	return { mesh, material };
}

export async function createLahoreWorld(textures: WorldTextures, onStep?: (label: string) => void): Promise<LahoreWorld> {
	const ctx = new WorldContext();
	const step = async (label: string, fn: () => void) => {
		onStep?.(label);
		await new Promise((r) => setTimeout(r, 0));
		fn();
	};

	await step('Laying the ground', () => buildGround(ctx.chunk('ground')));
	await step('Paving the Shahi Guzargah', () => buildStreets(ctx.chunk('streets')));
	await step('Raising the monuments', () => buildLandmarks(ctx));
	await step('Opening the bazaars', () => buildBazaars(ctx));
	await step('Planting the gardens', () => buildFiller(ctx));

	const palette = createToonMaterial({ colors: textures.palette, noise: textures.noiseTerrain, lineFade: true, name: 'LahorePalette' });
	const decor = createToonMaterial({
		colors: textures.decor,
		palette: textures.palette,
		noise: textures.noiseTerrain,
		atlasRect: true,
		lineFade: true,
		name: 'LahoreDecor'
	});
	const bulbs = createToonMaterial({ colors: textures.palette, noise: textures.noiseTerrain, name: 'LahoreBulbs' });
	const cables = createPropMaterial('#3a3d40', textures.cloudNoise);

	const group = new Group();
	group.name = 'LahorePlanet';
	let triangles = 0;
	for (const [name, chunk] of ctx.chunks) {
		const { palette: pg, decor: dg } = chunk.build();
		for (const [geo, mat, kind] of [
			[pg, palette, 'palette'],
			[dg, decor, 'decor']
		] as const) {
			if (!geo) continue;
			const mesh = new Mesh(geo, mat);
			mesh.name = `${name}-${kind}`;
			mesh.castShadow = name !== 'ground' && name !== 'streets';
			mesh.receiveShadow = true;
			triangles += geo.getAttribute('position').count / 3;
			group.add(mesh);
		}
	}

	const cableMesh = buildCables(ctx, cables);
	if (cableMesh) group.add(cableMesh);
	const bulbMesh = buildBulbs(ctx, bulbs);
	if (bulbMesh) group.add(bulbMesh);
	const water = buildWater(textures, ctx);
	group.add(water.mesh);

	onStep?.('Building collisions');
	await new Promise((r) => setTimeout(r, 0));
	const colliderGeometry = new BufferGeometry();
	colliderGeometry.setAttribute('position', new BufferAttribute(ctx.collider.toArray(), 3));
	const bvh = new MeshBVH(colliderGeometry);

	return {
		group,
		bvh,
		ctx,
		materials: { palette, decor, water: water.material, cables, bulbs, all: [palette, decor, bulbs] },
		stats: { triangles, colliderTriangles: ctx.collider.length / 9, chunks: ctx.chunks.size }
	};
}
