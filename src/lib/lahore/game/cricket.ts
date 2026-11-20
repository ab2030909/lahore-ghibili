import { BoxGeometry, BufferAttribute, Group, Matrix4, Mesh, SphereGeometry, Vector3, type BufferGeometry, type Material } from 'three';
import type { NpcAgent } from '../characters/npcSystem';
import { mulberry32 } from '../core/math';
import { PlanetFrame } from '../core/planet';
import { paletteUV, type PaletteKey } from '../render/palette';
import { LANDMARKS } from '../world/layout';

function painted(g: BufferGeometry, key: PaletteKey, id: number): BufferGeometry {
	const uv = g.getAttribute('uv') as BufferAttribute;
	const [u, v] = paletteUV(key);
	for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
	g.setAttribute('surfaceId', new BufferAttribute(new Float32Array(uv.count).fill(id), 1));
	return g;
}

type Vec = [number, number, number];

const lerp3 = (a: Vec, b: Vec, k: number): Vec => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const smooth = (k: number) => k * k * (3 - 2 * k);

/** One ball lasts this long (seconds). */
const T = 7.2;
const STRIKER_END: Vec = [2.5, 0, 0.25];
const NON_STRIKER_END: Vec = [-2.9, 0, -0.65];
const BOWLER_MARK: Vec = [-9, 0, 0.3];
const RELEASE_AT: Vec = [-3.8, 0, 0.3];
const FOLLOW_THROUGH: Vec = [-2.4, 0, 0.6];

/**
 * A match that never ends at the Gaddafi. Every ball: Shaheen runs in from his mark and
 * bowls, the ball bounces on the pitch, the striker swings and drives it into the outfield,
 * both batters run one, and the fielder's throw goes back to the bowler walking to his mark.
 * Positions are in the stadium's local frame (pitch along x).
 */
export class CricketMatch {
	readonly group = new Group();
	private frame: PlanetFrame;
	private ball: Mesh;
	private bat: Mesh;
	private time = 0;
	private rng = mulberry32(2024);
	private shot = { land: [8, 0.08, 4] as Vec, peak: 3, rollTo: [10, 0.08, 5] as Vec };
	private hitFired = false;
	private bowler: NpcAgent | null = null;
	/** [striker, non-striker]; they swap after every run. */
	private batters: NpcAgent[] = [];

	private readonly release: Vec = [-3.4, 2.1, 0.25];
	private readonly bounce: Vec = [1.2, 0.09, 0.15];
	private readonly contact: Vec = [2.25, 0.6, 0.35];

	constructor(material: Material) {
		const { w, t, facing } = LANDMARKS.gaddafiStadium;
		this.frame = PlanetFrame.trail(w, t, facing);
		this.ball = new Mesh(painted(new SphereGeometry(0.075, 10, 8), 'white', 0.97), material);
		this.ball.castShadow = true;
		const batGeo = painted(new BoxGeometry(0.11, 0.8, 0.035), 'woodLight', 0.96);
		batGeo.translate(0, -0.42, 0);
		const handle = painted(new BoxGeometry(0.035, 0.22, 0.035), 'charcoal', 0.95);
		handle.translate(0, -0.02, 0);
		this.bat = new Mesh(batGeo, material);
		this.bat.add(new Mesh(handle, material));
		this.bat.castShadow = true;
		this.group.add(this.ball, this.bat);
		this.newShot();
	}

	/** Take control of the batters and the bowler (found by name among the NPCs). */
	bind(agents: NpcAgent[]) {
		const byName = (n: string) => agents.find((a) => a.name === n) ?? null;
		this.bowler = byName('Shaheen');
		this.batters = [byName('Chhota Babar'), byName('Fakhar')].filter((a): a is NpcAgent => !!a);
		for (const a of [this.bowler, ...this.batters]) if (a) a.scripted = { walkSpeed: 1 };
	}

	private newShot() {
		const a = Math.PI + (this.rng() - 0.5) * 2.4;
		const d = 6 + this.rng() * 5;
		const sx = this.contact[0] + Math.cos(a) * d * 0.9;
		const sz = this.contact[2] + Math.sin(a) * d * 0.75;
		const roll = 1.5 + this.rng() * 2;
		this.shot = {
			land: [sx, 0.08, sz],
			peak: 1.2 + this.rng() * 4,
			rollTo: [sx + Math.cos(a) * roll, 0.08, sz + Math.sin(a) * roll * 0.8]
		};
	}

	private local(p: Vec, out = new Vector3()) {
		return this.frame.point(p[0], p[1], p[2], out);
	}

	/** Put a scripted NPC at a local point facing a local direction, walking or standing. */
	private pose(agent: NpcAgent | null, p: Vec, face: [number, number], speed: number) {
		if (!agent || agent.talking || !agent.scripted) return;
		this.local(p, agent.position);
		const f = this.frame.dir(face[0], 0, face[1]);
		agent.forward.copy(f);
		agent.homeForward.copy(f);
		agent.scripted.walkSpeed = speed > 0.1 ? Math.min(2.4, speed / 1.6) : 1;
		agent.rig.setState(speed > 0.1 ? 'walk' : 'idle');
	}

	/** Advance the match; returns true on the frame the bat meets the ball. */
	update(dt: number): boolean {
		this.time += dt;
		if (this.time > T) {
			this.time -= T;
			this.newShot();
			this.hitFired = false;
			// they ran one: the batters have swapped ends
			if (this.batters.length === 2) this.batters.reverse();
		}
		const t = this.time;
		let swing = 1.15; // back-lift
		let hit = false;
		let ballInHand = false;
		if (t < 0.6) {
			const k = t / 0.6;
			const p = lerp3(this.release, this.bounce, k);
			p[1] = this.release[1] + (this.bounce[1] - this.release[1]) * k * k;
			this.local(p, this.ball.position);
		} else if (t < 0.85) {
			const k = (t - 0.6) / 0.25;
			const p = lerp3(this.bounce, this.contact, k);
			p[1] = this.bounce[1] + (this.contact[1] - this.bounce[1]) * Math.sin((k * Math.PI) / 2);
			this.local(p, this.ball.position);
			swing = 1.15 - k * 1.2;
		} else if (t < 2.45) {
			if (!this.hitFired) {
				this.hitFired = true;
				hit = true;
			}
			const k = (t - 0.85) / 1.6;
			const p = lerp3(this.contact, this.shot.land, k);
			p[1] = this.contact[1] + (this.shot.land[1] - this.contact[1]) * k + this.shot.peak * 4 * k * (1 - k);
			this.local(p, this.ball.position);
			swing = Math.max(-1.7, -0.05 - (t - 0.85) * 6);
		} else if (t < 3.45) {
			const k = (t - 2.45) / 1.0;
			this.local(lerp3(this.shot.land, this.shot.rollTo, 1 - (1 - k) * (1 - k)), this.ball.position);
			swing = -0.6;
		} else if (t < 4.2) {
			this.local(this.shot.rollTo, this.ball.position);
			swing = -0.6;
		} else if (t < 5.5) {
			// the throw goes to the bowler, back at his mark
			const k = (t - 4.2) / 1.3;
			const to: Vec = [BOWLER_MARK[0] + 0.3, 1.3, BOWLER_MARK[2]];
			const p = lerp3(this.shot.rollTo, to, k);
			p[1] = this.shot.rollTo[1] + (to[1] - this.shot.rollTo[1]) * k + 2.2 * 4 * k * (1 - k);
			this.local(p, this.ball.position);
			swing = -0.6;
		} else {
			ballInHand = true;
			swing = 1.15;
		}

		// ---- bowler: walk back, turn, run in, deliver, follow through ----
		let bowlerAt: Vec = BOWLER_MARK;
		if (t < 0.8) {
			bowlerAt = lerp3(RELEASE_AT, FOLLOW_THROUGH, smooth(t / 0.8));
			this.pose(this.bowler, bowlerAt, [1, 0], (1 - t / 0.8) * 3);
		} else if (t < 5.6) {
			const k = (t - 0.8) / 4.8;
			bowlerAt = lerp3(FOLLOW_THROUGH, BOWLER_MARK, k);
			const moving = k < 0.97;
			this.pose(this.bowler, bowlerAt, moving ? [-1, -0.05] : [1, 0], moving ? 1.4 : 0);
		} else {
			const k = (t - 5.6) / 1.6;
			bowlerAt = lerp3(BOWLER_MARK, RELEASE_AT, k * k * 0.6 + k * 0.4);
			this.pose(this.bowler, bowlerAt, [1, 0], 2.2 + k * 3);
		}
		if (ballInHand && this.bowler) {
			this.ball.position.copy(this.bowler.position).addScaledVector(this.bowler.position.clone().normalize(), 1.15);
		}

		// ---- batters: stance, then run one between the wickets ----
		const [striker, runner] = this.batters;
		if (t > 1.0 && t < 2.8) {
			const k = smooth((t - 1.0) / 1.8);
			const speed = 5.4 / 1.8 * 1.5 * Math.sin(Math.PI * ((t - 1.0) / 1.8));
			this.pose(striker ?? null, lerp3(STRIKER_END, NON_STRIKER_END, k), [-1, 0], speed);
			this.pose(runner ?? null, lerp3(NON_STRIKER_END, STRIKER_END, k), [1, 0], speed);
		} else if (t >= 2.8) {
			// made their ground: the new striker takes guard facing the bowler
			this.pose(striker ?? null, NON_STRIKER_END, [1, 0], 0);
			this.pose(runner ?? null, STRIKER_END, [-1, 0], 0);
		} else {
			this.pose(striker ?? null, STRIKER_END, [-1, 0], 0);
			this.pose(runner ?? null, NON_STRIKER_END, [1, 0], 0);
		}

		// ---- the bat: held by whoever is at the striker's end, swung in the plane of the pitch ----
		const holder = t > 1.0 && t < 2.8 ? striker : t >= 2.8 ? runner : striker;
		const pivot = holder ? holder.position.clone() : this.local(STRIKER_END);
		const up = pivot.clone().normalize();
		pivot.addScaledVector(up, 0.95).addScaledVector(this.frame.dir(0, 0, 1), 0.2);
		const x = this.frame.dir(1, 0, 0);
		x.addScaledVector(up, -x.dot(up)).normalize();
		const z = new Vector3().crossVectors(x, up).normalize();
		const m = new Matrix4().makeBasis(x, up, z).multiply(new Matrix4().makeRotationZ(t > 1.0 && t < 2.8 ? 0.5 : swing));
		this.bat.quaternion.setFromRotationMatrix(m);
		this.bat.position.copy(pivot);
		return hit;
	}

	/** Centre of the pitch in world space (for sound distance). */
	get centre(): Vector3 {
		return this.frame.point(0, 0, 0);
	}
}
