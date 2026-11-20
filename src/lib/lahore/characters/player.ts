import {
	BoxGeometry,
	BufferAttribute,
	Matrix4,
	Mesh,
	Quaternion,
	Vector3,
	type Bone,
	type BufferGeometry,
	type Material,
	type Object3D
} from 'three';
import { clamp } from '../core/math';
import { paletteUV, type PaletteKey } from '../render/palette';
import type { CharacterPhysics } from '../controls/characterPhysics';
import { TOURIST } from './outfits';
import type { NpcLibrary, NpcRig } from './rigs';

function paint(g: BufferGeometry, key: PaletteKey, id: number): BufferGeometry {
	const uv = g.getAttribute('uv') as BufferAttribute;
	const [u, v] = paletteUV(key);
	for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
	g.setAttribute('surfaceId', new BufferAttribute(new Float32Array(uv.count).fill(id), 1));
	return g;
}

type Accessory = { bone: number; geometry: BufferGeometry; matrix: Matrix4 };

/** Two-bone chain solved each frame (shoulder-elbow-wrist or hip-knee-ankle). */
type Chain = { root: Bone; mid: Bone; end: Bone; base: [Quaternion, Quaternion]; l1: number; l2: number };

const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _q = new Quaternion();
const _q2 = new Quaternion();

/** Rotate `bone` so that the direction to `childWorld` points at `targetWorld`. */
function aim(bone: Bone, childWorld: Vector3, targetWorld: Vector3) {
	const origin = bone.getWorldPosition(_a);
	const cur = _b.subVectors(childWorld, origin).normalize();
	const want = _c.subVectors(targetWorld, origin).normalize();
	if (cur.lengthSq() < 1e-8 || want.lengthSq() < 1e-8) return;
	const delta = _q.setFromUnitVectors(cur, want);
	const world = bone.getWorldQuaternion(_q2).premultiply(delta);
	const parent = bone.parent!.getWorldQuaternion(new Quaternion()).invert();
	bone.quaternion.copy(parent.multiply(world));
	bone.updateMatrixWorld(true);
}

function solve(chain: Chain, target: Vector3, bendHint: Vector3) {
	chain.root.quaternion.copy(chain.base[0]);
	chain.mid.quaternion.copy(chain.base[1]);
	chain.root.updateMatrixWorld(true);
	const start = chain.root.getWorldPosition(new Vector3());
	const toTarget = target.clone().sub(start);
	const dist = clamp(toTarget.length(), 0.05, chain.l1 + chain.l2 - 0.002);
	const dir = toTarget.normalize();
	const along = (chain.l1 * chain.l1 - chain.l2 * chain.l2 + dist * dist) / (2 * dist);
	const h = Math.sqrt(Math.max(0, chain.l1 * chain.l1 - along * along));
	const hint = bendHint.clone().addScaledVector(dir, -bendHint.dot(dir));
	if (hint.lengthSq() < 1e-6) hint.set(0, 0, 1);
	hint.normalize();
	const joint = start.clone().addScaledVector(dir, along).addScaledVector(hint, h);
	aim(chain.root, chain.mid.getWorldPosition(new Vector3()), joint);
	const reach = start.clone().addScaledVector(dir, dist);
	aim(chain.mid, chain.end.getWorldPosition(new Vector3()), reach);
}

export type RideTargets = {
	vehicle: Object3D;
	hands: [Object3D, Object3D];
	feet: [Object3D, Object3D];
	seat: Vector3;
	kneeForward: number;
};

/**
 * The tourist exploring Lahore in plain casual clothes, no accessories.
 * Walking uses the Messenger office-worker rig and its original idle / walk / talk
 * clips; a second, seated copy of the rig rides the Sohrab cycle and rows the Ravi boat,
 * with two-bone IK keeping hands on the handlebar/oars and feet on the pedals.
 */
export class PlayerAvatar {
	rig!: NpcRig;
	rider!: NpcRig;
	private scaleY = 1;
	private scaleVel = 0;
	private chains: { lArm: Chain; rArm: Chain; lLeg: Chain; rLeg: Chain } | null = null;
	private riderOffset = new Vector3();
	talking = false;
	mode: 'walk' | 'ride' = 'walk';

	async load(library: NpcLibrary, accessoryMaterial: Material) {
		this.rig = await library.instance('office-worker', TOURIST, 0.37);
		const mesh = this.rig.mesh;
		mesh.name = 'Tourist';
		mesh.position.set(0, 0, 0);
		mesh.quaternion.identity();
		mesh.updateMatrixWorld(true);
		const accessories = this.attachAccessories();

		// seated rider: legs and arms solved by IK, the rest keeps the idle clip
		this.rider = await library.instance('office-worker', TOURIST, 0.37, true, ['bone_7', 'bone_11']);
		const rider = this.rider.mesh;
		rider.name = 'TouristRider';
		rider.position.set(0, 0, 0);
		rider.quaternion.identity();
		rider.updateMatrixWorld(true);
		const bones = rider.skeleton.bones;
		for (const a of accessories) {
			const m = new Mesh(a.geometry, accessoryMaterial);
			m.castShadow = true;
			a.matrix.decompose(m.position, m.quaternion, m.scale);
			bones[a.bone].add(m);
		}
		// segment lengths measured in world space (the rider mesh sits at the origin here)
		const wp = (i: number) => bones[i].getWorldPosition(new Vector3());
		const chain = (r: number, m: number, e: number): Chain => ({
			root: bones[r],
			mid: bones[m],
			end: bones[e],
			base: [bones[r].quaternion.clone(), bones[m].quaternion.clone()],
			l1: wp(r).distanceTo(wp(m)),
			l2: wp(m).distanceTo(wp(e))
		});
		this.chains = { lArm: chain(7, 8, 9), rArm: chain(11, 12, 13), lLeg: chain(14, 15, 16), rLeg: chain(18, 19, 20) };
		const hip = bones[14].getWorldPosition(new Vector3()).add(bones[18].getWorldPosition(new Vector3())).multiplyScalar(0.5);
		this.riderOffset.set(0, -hip.y + 0.06, -hip.z);
		rider.visible = false;
		this.rider.setState('idle');
		return this;
	}

	/** The tourist carries nothing and wears no accessories. */
	private attachAccessories(): Accessory[] {
		return [];
	}

	get mesh() {
		return this.rig.mesh;
	}

	onJump() {
		this.scaleVel = 2.6;
	}

	onLand(fall: number) {
		this.scaleVel = -clamp(1.6 + fall * 1.5, 1.6, 4.5);
	}

	/** Switch between walking and riding (bike or boat). */
	mount(targets: RideTargets | null) {
		if (targets) {
			this.mode = 'ride';
			targets.vehicle.add(this.rider.mesh);
			this.rider.mesh.position.copy(targets.seat).add(this.riderOffset);
			this.rider.mesh.quaternion.identity();
			this.rider.mesh.visible = true;
			this.rig.mesh.visible = false;
			this.rideTargets = targets;
		} else {
			this.mode = 'walk';
			this.rider.mesh.removeFromParent();
			this.rider.mesh.visible = false;
			this.rig.mesh.visible = true;
			this.rideTargets = null;
		}
	}

	private rideTargets: RideTargets | null = null;

	update(dt: number, physics: CharacterPhysics, elapsed: number) {
		if (this.mode === 'ride' && this.rideTargets && this.chains) {
			this.updateRider(dt, elapsed);
			return;
		}
		const mesh = this.rig.mesh;
		const up = physics.up;
		const f = physics.forward;
		const x = new Vector3().crossVectors(up, f).normalize();
		mesh.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(x, up, f));
		mesh.position.copy(physics.position);

		const speed = physics.speed;
		if (this.talking) this.rig.setState('talk');
		else if (physics.airborne) this.rig.setState('air');
		else if (speed > 0.35) this.rig.setState('walk');
		else this.rig.setState('idle');
		const walkScale = clamp(speed / 2.1, 0.7, 2.2);

		// squash & stretch spring
		const k = 120;
		const damping = 14;
		this.scaleVel += (-(this.scaleY - 1) * k - this.scaleVel * damping) * dt;
		this.scaleY += this.scaleVel * dt;
		const sy = clamp(this.scaleY, 0.8, 1.2);
		const sxz = 1 / Math.sqrt(sy);
		mesh.scale.set(sxz, sy, sxz);

		this.rig.material.uniforms.uTime.value = elapsed;
		this.rig.update(dt, walkScale);
	}

	private updateRider(dt: number, elapsed: number) {
		const t = this.rideTargets!;
		const chains = this.chains!;
		this.rider.material.uniforms.uTime.value = elapsed;
		this.rider.update(dt, 1);
		t.vehicle.updateMatrixWorld(true);
		this.rider.mesh.updateMatrixWorld(true);
		const q = t.vehicle.getWorldQuaternion(new Quaternion());
		const up = new Vector3(0, 1, 0).applyQuaternion(q);
		const fwd = new Vector3(0, 0, 1).applyQuaternion(q);
		const left = new Vector3(1, 0, 0).applyQuaternion(q);
		const p = (o: Object3D) => o.getWorldPosition(new Vector3());
		solve(chains.lLeg, p(t.feet[0]), fwd.clone().multiplyScalar(t.kneeForward).addScaledVector(left, 0.15));
		solve(chains.rLeg, p(t.feet[1]), fwd.clone().multiplyScalar(t.kneeForward).addScaledVector(left, -0.15));
		solve(chains.lArm, p(t.hands[0]), up.clone().multiplyScalar(-0.7).addScaledVector(left, 0.6).addScaledVector(fwd, -0.3));
		solve(chains.rArm, p(t.hands[1]), up.clone().multiplyScalar(-0.7).addScaledVector(left, -0.6).addScaledVector(fwd, -0.3));
	}
}
