import { Group, Matrix4, Vector3 } from 'three';
import { TALK_DISTANCE } from '../core/config';
import { mulberry32, pick, randRange } from '../core/math';
import type { SoundName } from '../audio/audio';
import type { NpcRole, WalkPath, WorldContext } from '../world/context';
import { outfitFor, type NpcModel } from './outfits';
import { canWalk, type NpcLibrary, type NpcRig } from './rigs';

const ROLE_MODELS: Record<NpcRole, NpcModel[]> = {
	shopkeeper: ['boss', 'male-scientist', 'mountainman'],
	vendor: ['chef', 'boss', 'mountainman'],
	visitor: ['scout', 'female-scientist', 'young-lady'],
	diner: ['male-scientist', 'female-scientist', 'office-worker', 'young-lady'],
	elder: ['mountainman', 'oldwoman'],
	child: ['threekid'],
	musician: ['musician'],
	worshipper: ['male-scientist', 'mountainman'],
	guard: ['office-worker'],
	craftsman: ['factory-worker-c', 'mountainman']
};

const WALKER_MODELS: NpcModel[] = ['male-scientist', 'young-lady', 'female-scientist', 'office-worker', 'threekid', 'mountainman', 'factory-worker-b', 'oldwoman', 'male-scientist', 'young-lady'];

export type NpcAgent = {
	id: number;
	rig: NpcRig;
	model: NpcModel;
	position: Vector3;
	forward: Vector3;
	homeForward: Vector3;
	dialogue?: string;
	name?: string;
	voice: SoundName;
	role: NpcRole | 'walker';
	talking: boolean;
	visible: boolean;
	sit: boolean;
	// walkers
	path?: { points: Vector3[]; lengths: number[]; total: number; loop: boolean };
	s: number;
	dir: 1 | -1;
	speed: number;
	pause: number;
	musician?: boolean;
	/** Moved by a script (the cricket match): position, facing and walk speed are set externally. */
	scripted?: { walkSpeed: number };
};

const tmp = new Vector3();
const tmp2 = new Vector3();
const basis = new Matrix4();

function preparePath(path: WalkPath) {
	const points = path.points;
	const lengths = [0];
	for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
	let total = lengths[lengths.length - 1];
	if (path.loop) total += points[points.length - 1].distanceTo(points[0]);
	return { points, lengths, total, loop: path.loop };
}

function samplePath(p: NonNullable<NpcAgent['path']>, s: number, outPos: Vector3, outDir: Vector3) {
	const n = p.points.length;
	let seg = 0;
	let local = s;
	if (p.loop && s >= p.lengths[n - 1]) {
		const a = p.points[n - 1];
		const b = p.points[0];
		const len = a.distanceTo(b) || 1;
		const k = (s - p.lengths[n - 1]) / len;
		outPos.lerpVectors(a, b, k);
		outDir.subVectors(b, a).normalize();
		return;
	}
	while (seg < n - 2 && p.lengths[seg + 1] < s) seg++;
	local = s - p.lengths[seg];
	const a = p.points[seg];
	const b = p.points[Math.min(n - 1, seg + 1)];
	const len = a.distanceTo(b) || 1;
	outPos.lerpVectors(a, b, Math.min(1, local / len));
	outDir.subVectors(b, a).normalize();
}

export class NpcSystem {
	readonly group = new Group();
	readonly agents: NpcAgent[] = [];
	private library: NpcLibrary;
	private time = 0;

	constructor(library: NpcLibrary) {
		this.library = library;
		this.group.name = 'LahoriNPCs';
	}

	async spawn(ctx: WorldContext, onProgress?: (done: number, total: number) => void) {
		const rng = mulberry32(2024);
		const jobs: (() => Promise<void>)[] = [];
		let id = 0;
		const usedModels = new Set<NpcModel>();

		ctx.npcSpots.forEach((spot, index) => {
			const candidates = (spot.models ?? ROLE_MODELS[spot.role]).filter((m) => !spot.sit || m !== 'chef');
			const model = spot.outfit?.model ?? candidates[index % candidates.length];
			usedModels.add(model);
			const agentId = id++;
			jobs.push(async () => {
				const outfit = spot.outfit ?? outfitFor(model, index);
				const rig = await this.library.instance(model, outfit, rng(), !!spot.sit);
				const agent: NpcAgent = {
					id: agentId,
					rig,
					model,
					position: spot.position.clone(),
					forward: spot.forward.clone(),
					homeForward: spot.forward.clone(),
					dialogue: spot.dialogue,
					name: spot.name,
					voice: outfit.voice,
					role: spot.role,
					talking: false,
					visible: true,
					sit: !!spot.sit,
					s: 0,
					dir: 1,
					speed: 0,
					pause: 0,
					musician: spot.role === 'musician'
				};
				this.place(agent);
				this.group.add(rig.mesh);
				this.agents.push(agent);
			});
		});

		for (const path of ctx.walkPaths) {
			const prepared = preparePath(path);
			if (prepared.total < 2) continue;
			const pool = (path.models ?? WALKER_MODELS).filter(canWalk);
			for (let i = 0; i < path.walkers; i++) {
				const model = pick(rng, pool.length ? pool : WALKER_MODELS);
				const seedIndex = id;
				const agentId = id++;
				const s = (prepared.total * (i + rng() * 0.5)) / Math.max(1, path.walkers);
				jobs.push(async () => {
					const outfit = outfitFor(model, seedIndex * 3 + 1);
					const rig = await this.library.instance(model, outfit, rng());
					const agent: NpcAgent = {
						id: agentId,
						rig,
						model,
						position: new Vector3(),
						forward: new Vector3(),
						homeForward: new Vector3(),
						voice: outfit.voice,
						role: 'walker',
						talking: false,
						visible: true,
						sit: false,
						path: prepared,
						s: s % prepared.total,
						dir: rng() < 0.5 || prepared.loop ? 1 : -1,
						speed: randRange(rng, 1.0, 1.35),
						pause: 0,
						dialogue: undefined
					};
					samplePath(prepared, agent.s, agent.position, agent.forward);
					agent.homeForward.copy(agent.forward);
					rig.setState('walk');
					this.place(agent);
					this.group.add(rig.mesh);
					this.agents.push(agent);
				});
			}
		}

		// load rigs first (shared templates), then instance in small batches
		await Promise.all([...usedModels, ...WALKER_MODELS].map((m) => this.library.template(m)));
		let done = 0;
		const batch = 8;
		for (let i = 0; i < jobs.length; i += batch) {
			await Promise.all(jobs.slice(i, i + batch).map((job) => job().catch((error) => console.warn('NPC spawn failed', error))));
			done = Math.min(jobs.length, i + batch);
			onProgress?.(done, jobs.length);
		}
	}

	private place(agent: NpcAgent) {
		const up = tmp.copy(agent.position).normalize();
		const f = tmp2.copy(agent.forward).addScaledVector(up, -agent.forward.dot(up));
		if (f.lengthSq() < 1e-6) f.set(1, 0, 0).addScaledVector(up, -up.x);
		f.normalize();
		const x = new Vector3().crossVectors(up, f).normalize();
		basis.makeBasis(x, up, f);
		agent.rig.mesh.quaternion.setFromRotationMatrix(basis);
		agent.rig.mesh.position.copy(agent.position);
	}

	/** Positions of nearby NPCs, used as soft obstacles by the player physics. */
	obstacles(near: Vector3, radius = 6): Vector3[] {
		const out: Vector3[] = [];
		for (const a of this.agents) if (a.visible && !a.sit && a.position.distanceToSquared(near) < radius * radius) out.push(a.position);
		return out;
	}

	nearestTalkable(player: Vector3, facing: Vector3): NpcAgent | null {
		let best: NpcAgent | null = null;
		let bestScore = Infinity;
		for (const a of this.agents) {
			if (!a.visible) continue;
			const d = a.position.distanceTo(player);
			if (d > TALK_DISTANCE + (a.sit ? 0.6 : 0)) continue;
			const toNpc = tmp.subVectors(a.position, player).normalize();
			const score = d - toNpc.dot(facing) * 0.8;
			if (score < bestScore) {
				bestScore = score;
				best = a;
			}
		}
		return best;
	}

	startTalk(agent: NpcAgent) {
		agent.talking = true;
		agent.rig.setState('talk');
	}

	stopTalk(agent: NpcAgent) {
		agent.talking = false;
		agent.rig.setState(agent.role === 'walker' ? 'walk' : 'idle');
		agent.pause = agent.role === 'walker' ? 1.2 : 0;
	}

	update(dt: number, player: Vector3, cameraPos: Vector3, elapsed: number) {
		this.time += dt;
		for (const agent of this.agents) {
			const dist = agent.position.distanceTo(player);
			const camDist = agent.position.distanceTo(cameraPos);
			// planet curvature hides anything far along the surface
			const visible = dist < 40 || camDist < 34;
			if (visible !== agent.visible) {
				agent.visible = visible;
				agent.rig.mesh.visible = visible;
			}
			agent.rig.material.uniforms.uTime.value = elapsed;
			if (!visible) {
				// keep walkers moving slowly while hidden, without animating
				if (agent.path && !agent.talking) this.advance(agent, dt, player);
				continue;
			}

			let walkSpeed = 1;
			if (agent.path) {
				if (agent.talking) {
					this.faceTowards(agent, player, dt * 6);
				} else {
					walkSpeed = this.advance(agent, dt, player);
				}
			} else if (agent.scripted && !agent.talking) {
				walkSpeed = agent.scripted.walkSpeed;
			} else {
				// static NPCs turn towards the player when close (alwaysFaceCharacter)
				const target = dist < 4.2 || agent.talking ? player : null;
				if (target && !agent.sit) this.faceTowards(agent, target, dt * 4);
				else agent.forward.lerp(agent.homeForward, 1 - Math.exp(-dt * 2)).normalize();
			}
			this.place(agent);
			agent.rig.update(dt, walkSpeed);
		}
	}

	private faceTowards(agent: NpcAgent, target: Vector3, k: number) {
		const up = tmp.copy(agent.position).normalize();
		const dir = tmp2.subVectors(target, agent.position);
		dir.addScaledVector(up, -dir.dot(up));
		if (dir.lengthSq() < 1e-4) return;
		dir.normalize();
		agent.forward.lerp(dir, 1 - Math.exp(-k)).normalize();
	}

	/** Move a walker along its path; returns the walk animation time scale. */
	private advance(agent: NpcAgent, dt: number, player: Vector3): number {
		const path = agent.path!;
		if (agent.pause > 0) {
			agent.pause -= dt;
			agent.rig.setState(agent.pause > 0 ? 'idle' : 'walk');
			return 1;
		}
		// wait if the player blocks the way
		const ahead = tmp.copy(agent.forward).multiplyScalar(1.1).add(agent.position);
		if (ahead.distanceTo(player) < 0.9) {
			agent.rig.setState('idle');
			return 1;
		}
		agent.rig.setState('walk');
		agent.s += agent.speed * dt * agent.dir;
		if (path.loop) {
			agent.s = ((agent.s % path.total) + path.total) % path.total;
		} else if (agent.s > path.total || agent.s < 0) {
			agent.s = Math.max(0, Math.min(path.total, agent.s));
			agent.dir = (agent.dir * -1) as 1 | -1;
			agent.pause = 1.5 + Math.random() * 2.5;
		}
		const dir = new Vector3();
		samplePath(path, agent.s, agent.position, dir);
		if (agent.dir < 0) dir.negate();
		agent.forward.lerp(dir, 1 - Math.exp(-dt * 6)).normalize();
		return agent.speed / 1.15;
	}

	dispose() {
		for (const a of this.agents) a.rig.dispose();
		this.agents.length = 0;
		this.group.clear();
	}
}
