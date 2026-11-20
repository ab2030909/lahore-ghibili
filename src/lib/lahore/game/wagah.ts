import {
	BoxGeometry,
	BufferAttribute,
	CanvasTexture,
	CircleGeometry,
	CylinderGeometry,
	Group,
	Matrix4,
	Mesh,
	PlaneGeometry,
	Quaternion,
	SRGBColorSpace,
	Vector3,
	type BufferGeometry,
	type ShaderMaterial,
	type Texture
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { NpcAgent } from '../characters/npcSystem';
import { PlanetFrame } from '../core/planet';
import { drawFlagIndia, drawFlagPakistan } from '../render/decorAtlas';
import { paletteUV, type PaletteKey } from '../render/palette';
import { createToonMaterial } from '../render/toonMaterial';
import { LANDMARKS } from '../world/layout';
import { WAGAH } from '../world/landmarks/wagah';

function painted(g: BufferGeometry, key: PaletteKey, id: number): BufferGeometry {
	const uv = g.getAttribute('uv') as BufferAttribute;
	const [u, v] = paletteUV(key);
	for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
	g.setAttribute('surfaceId', new BufferAttribute(new Float32Array(uv.count).fill(id), 1));
	return g;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, key: PaletteKey, id: number) {
	const g = new BoxGeometry(w, h, d);
	g.translate(x, y, z);
	return painted(g, key, id);
}

function flagTexture(draw: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void): Texture {
	const c = document.createElement('canvas');
	c.width = 384;
	c.height = 256;
	const ctx = c.getContext('2d')!;
	draw(ctx, 0, 0, 384, 256);
	const tex = new CanvasTexture(c);
	tex.colorSpace = SRGBColorSpace;
	tex.needsUpdate = true;
	return tex;
}

const smooth = (k: number) => {
	const c = Math.min(1, Math.max(0, k));
	return c * c * (3 - 2 * c);
};

/** One evening's ceremony, looped. */
const T = 44;
const PHASE = {
	gatesOpen: [3, 5.5],
	marchIn: [5, 11.5],
	kicks: [11.6, 14.1],
	lowerFlags: [14, 26],
	marchOut: [28, 34],
	gatesClose: [34, 36.5],
	raiseFlags: [37, 43]
} as const;

/**
 * The Wagah–Attari "beating retreat": the iron gates swing open, the Rangers and the BSF
 * march to the zero line and face each other, both flags are lowered together, the soldiers
 * march back and the gates close. Also gives every soldier the fan-crested turban (turra).
 */
export class WagahCeremony {
	readonly group = new Group();
	readonly materials: ShaderMaterial[] = [];
	private frame: PlanetFrame;
	private basis = new Quaternion();
	private gates: { pivot: Group; base: number; sign: number; z: number; x: number }[] = [];
	private flags: { mesh: Mesh; z: number; turn: number }[] = [];
	private marchers: { agent: NpcAgent; x: number; country: -1 | 1 }[] = [];
	private time = 0;
	private accessory: ShaderMaterial;

	constructor(palette: Texture, noise: Texture) {
		const { w, t, facing } = LANDMARKS.wagah;
		this.frame = PlanetFrame.trail(w, t, facing);
		const X = this.frame.dir(1, 0, 0);
		const Y = this.frame.dir(0, 1, 0);
		const Z = this.frame.dir(0, 0, 1);
		this.basis.setFromRotationMatrix(new Matrix4().makeBasis(X, Y, Z));

		const mat = createToonMaterial({ colors: palette, noise, name: 'WagahGates' });
		this.accessory = createToonMaterial({ colors: palette, noise, character: true, doubleSide: true, name: 'Turra' });
		this.materials.push(mat, this.accessory);

		// four iron gate leaves, hinged at the pillars, closed across the road
		for (const country of [-1, 1] as const) {
			const color: PaletteKey = country < 0 ? 'pakGreen' : 'indiaSaffron';
			const len = WAGAH.hingeX - 0.02;
			const parts: BufferGeometry[] = [
				box(len, 0.14, 0.1, len / 2, 2.75, 0, color, 0.61),
				box(len, 0.1, 0.1, len / 2, 0.15, 0, color, 0.61),
				box(len, 0.08, 0.08, len / 2, 1.45, 0, color, 0.61),
				box(0.14, 2.85, 0.12, 0.07, 1.42, 0, color, 0.62)
			];
			for (let i = 1; i <= 11; i++) parts.push(box(0.045, 2.6, 0.045, (i / 12) * len, 1.45, 0, 'charcoal', 0.63));
			// spear tips along the top
			for (let i = 1; i <= 11; i++) parts.push(box(0.07, 0.18, 0.07, (i / 12) * len, 2.92, 0, 'gold', 0.64));
			const leaf = mergeGeometries(parts, false)!;
			for (const s of [-1, 1] as const) {
				const pivot = new Group();
				pivot.add(new Mesh(leaf, mat));
				pivot.traverse((o) => ((o as Mesh).castShadow = true));
				this.group.add(pivot);
				// south leaf (s = -1) points to +X, north leaf to -X
				// leaves swing away from the zero line, into their own country
				this.gates.push({ pivot, base: s < 0 ? 0 : Math.PI, sign: s * country, z: country * WAGAH.gateZ, x: s * WAGAH.hingeX });
			}
		}

		// the two flags that are lowered at the same moment
		for (const country of [-1, 1] as const) {
			const tex = flagTexture(country < 0 ? drawFlagPakistan : drawFlagIndia);
			const fm = createToonMaterial({ colors: tex, noise, doubleSide: true, name: country < 0 ? 'FlagPakistan' : 'FlagIndia' });
			fm.uniforms.uNoiseDetail.value = 0;
			this.materials.push(fm);
			const g = new PlaneGeometry(3.3, 2.2, 6, 1);
			g.translate(1.65, -1.1, 0);
			g.setAttribute('surfaceId', new BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(country < 0 ? 0.71 : 0.72), 1));
			const mesh = new Mesh(g, fm);
			mesh.castShadow = true;
			this.group.add(mesh);
			// Pakistan's flag flies towards Pakistan (-Z), India's towards India (+Z)
			this.flags.push({ mesh, z: country * WAGAH.flagPole.z, turn: country < 0 ? Math.PI / 2 : -Math.PI / 2 });
		}
	}

	/** Take the marching soldiers and give every Ranger and BSF jawan a turra. */
	bind(agents: NpcAgent[]) {
		for (const a of agents) {
			const ranger = a.name?.startsWith('Ranger');
			const bsf = a.name?.startsWith('BSF');
			if (!ranger && !bsf) continue;
			this.turra(a, ranger ? 'ranger' : 'bsf');
			if (['Ranger Haider', 'Ranger Akram', 'BSF Jawan Gurpreet', 'BSF Jawan Rajesh'].includes(a.name!)) {
				a.scripted = { walkSpeed: 1 };
				const local = this.toLocalX(a.position);
				this.marchers.push({ agent: a, x: local, country: ranger ? -1 : 1 });
			}
		}
	}

	private toLocalX(p: Vector3): number {
		return Math.sign(p.clone().sub(this.frame.point(0, 0, 0)).dot(this.frame.dir(1, 0, 0))) * 0.8;
	}

	/** Turban with the tall starched fan: black and green for the Rangers, red and gold for the BSF. */
	private turra(agent: NpcAgent, force: 'ranger' | 'bsf') {
		const mesh = agent.rig.mesh;
		const bones = mesh.skeleton.bones;
		const head = bones[5] ?? bones[bones.length - 1];
		const pos = mesh.geometry.getAttribute('position');
		let top = 0;
		let minZ = Infinity;
		let maxZ = -Infinity;
		for (let i = 0; i < pos.count; i++) {
			const y = pos.getY(i);
			if (y > top) top = y;
		}
		for (let i = 0; i < pos.count; i++) {
			if (pos.getY(i) > top - 0.3) {
				minZ = Math.min(minZ, pos.getZ(i));
				maxZ = Math.max(maxZ, pos.getZ(i));
			}
		}
		const cz = Number.isFinite(minZ) ? (minZ + maxZ) / 2 : 0;
		const wrap: PaletteKey = force === 'ranger' ? 'charcoal' : 'awningRed';
		const fan: PaletteKey = force === 'ranger' ? 'pakGreen' : 'awningYellow';
		const edge: PaletteKey = force === 'ranger' ? 'white' : 'awningRed';
		const parts: BufferGeometry[] = [];
		const band = new CylinderGeometry(0.17, 0.19, 0.16, 14);
		band.translate(0, top - 0.04, cz);
		parts.push(painted(band, wrap, 0.81));
		const crown = new CylinderGeometry(0.15, 0.17, 0.08, 14);
		crown.translate(0, top + 0.07, cz);
		parts.push(painted(crown, wrap, 0.81));
		// the starched fan stands above the turban, spread across the front like a half wheel
		const rim = new CircleGeometry(0.33, 14, 0, Math.PI);
		rim.translate(0.05, top + 0.05, cz - 0.04);
		parts.push(painted(rim, edge, 0.83));
		const fanGeo = new CircleGeometry(0.29, 14, 0, Math.PI);
		fanGeo.translate(0.05, top + 0.06, cz - 0.02);
		parts.push(painted(fanGeo, fan, 0.82));
		const tail = new BoxGeometry(0.03, 0.42, 0.12);
		tail.translate(-0.05, top - 0.25, cz - 0.16);
		parts.push(painted(tail, fan, 0.84));
		const m = new Mesh(mergeGeometries(parts.map((p) => p.toNonIndexed()), false)!, this.accessory);
		m.castShadow = true;
		// attach in model space, then hand over to the head bone so it follows the animation
		const parent = mesh.parent;
		const saved = { p: mesh.position.clone(), q: mesh.quaternion.clone() };
		mesh.position.set(0, 0, 0);
		mesh.quaternion.identity();
		mesh.updateMatrixWorld(true);
		mesh.add(m);
		m.updateMatrixWorld(true);
		head.attach(m);
		mesh.position.copy(saved.p);
		mesh.quaternion.copy(saved.q);
		mesh.updateMatrixWorld(true);
		void parent;
	}

	private placeLocal(obj: Group | Mesh, x: number, y: number, z: number, ry: number) {
		this.frame.point(x, y, z, obj.position);
		obj.quaternion.copy(this.basis).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), ry));
	}

	update(dt: number) {
		this.time = (this.time + dt) % T;
		const t = this.time;
		const open = smooth((t - PHASE.gatesOpen[0]) / (PHASE.gatesOpen[1] - PHASE.gatesOpen[0])) * (1 - smooth((t - PHASE.gatesClose[0]) / (PHASE.gatesClose[1] - PHASE.gatesClose[0])));
		for (const g of this.gates) this.placeLocal(g.pivot, g.x, 0.02, g.z, g.base + g.sign * open * 1.45);

		// flags: high, lowered slowly together, raised again for the next evening
		const lowered = smooth((t - PHASE.lowerFlags[0]) / (PHASE.lowerFlags[1] - PHASE.lowerFlags[0])) * (1 - smooth((t - PHASE.raiseFlags[0]) / (PHASE.raiseFlags[1] - PHASE.raiseFlags[0])));
		const top = WAGAH.flagPole.height - 0.15;
		const y = top - lowered * (top - 2.4);
		for (const f of this.flags) {
			const wave = Math.sin(this.time * 2.1 + f.z) * 0.12 * (1 - lowered * 0.7);
			this.placeLocal(f.mesh, WAGAH.flagPole.x, y, f.z, f.turn + wave);
		}

		// the soldiers' march to the zero line and back
		for (const m of this.marchers) {
			const c = m.country;
			const home = c * WAGAH.homeZ;
			const line = c * WAGAH.lineZ;
			let z = home;
			let face = -c; // towards the line
			let speed = 0;
			if (t >= PHASE.marchIn[0] && t < PHASE.marchIn[1]) {
				const k = (t - PHASE.marchIn[0]) / (PHASE.marchIn[1] - PHASE.marchIn[0]);
				z = home + (line - home) * smooth(k);
				speed = 3;
			} else if (t >= PHASE.marchIn[1] && t < PHASE.marchOut[0]) {
				z = line;
			} else if (t >= PHASE.marchOut[0] && t < PHASE.marchOut[1]) {
				const k = (t - PHASE.marchOut[0]) / (PHASE.marchOut[1] - PHASE.marchOut[0]);
				z = line + (home - line) * smooth(k);
				face = c;
				speed = 3;
			}
			const a = m.agent;
			if (a.talking || !a.scripted) continue;
			this.frame.point(m.x, 0, z, a.position);
			const f = this.frame.dir(0, 0, face);
			a.forward.copy(f);
			a.homeForward.copy(f);
			a.scripted.walkSpeed = speed > 0 ? 2.2 : 1;
			a.rig.setState(speed > 0 ? 'walk' : 'idle');
			// at the line: two high kicks, the boot rising to head height
			if (t >= PHASE.kicks[0] && t < PHASE.kicks[1] && a.visible) {
				const k = ((t - PHASE.kicks[0]) / (PHASE.kicks[1] - PHASE.kicks[0])) * 2;
				this.kick(a, Math.sin(Math.PI * (k % 1)) * 1.75);
			}
		}
	}

	/** Swing the right leg forward from the hip (applied after the animation mixer). */
	private kick(agent: NpcAgent, angle: number) {
		const thigh = agent.rig.mesh.skeleton.bones[18];
		if (!thigh || !thigh.parent || angle <= 0) return;
		const up = agent.position.clone().normalize();
		const left = new Vector3().crossVectors(up, agent.forward).normalize();
		const parentQ = thigh.parent.getWorldQuaternion(new Quaternion());
		const worldQ = thigh.getWorldQuaternion(new Quaternion());
		const r = new Quaternion().setFromAxisAngle(left, -angle);
		thigh.quaternion.copy(parentQ.invert().multiply(r.multiply(worldQ)));
	}
}
