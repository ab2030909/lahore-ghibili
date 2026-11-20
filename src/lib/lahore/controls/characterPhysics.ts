import { Box3, DoubleSide, Line3, Ray, Vector3 } from 'three';
import type { MeshBVH } from 'three-mesh-bvh';
import { PHYSICS } from '../core/config';
import { fit, lerp } from '../core/math';

/**
 * Port of Messenger's character collision physics:
 *  - fixed 60 Hz steps with an accumulator and render interpolation
 *  - capsule (radius = 20% of height) resolved against a BVH with `shapecast`, 3 substeps
 *  - acceleration from input x positionForce, gravity along the local up (planet radius)
 *  - damping lerps between `dampIdle` and `damp`, velocity clamped to the capsule size
 *  - floor detection by contact normal (> floorDetectInclination), auto-step, jump force
 *  - rotation follows input direction, then the horizontal velocity
 */

export type PhysicsEvents = {
	onJump?: () => void;
	onLand?: (fallHeight: number) => void;
};

const MEDIUM_GROUND = 0;
const MEDIUM_AIR = 1;

const v1 = new Vector3();
const v2 = new Vector3();
const v3 = new Vector3();
const triPoint = new Vector3();
const capPoint = new Vector3();
const triNormal = new Vector3();
const tmpBox = new Box3();
const tmpSegment = new Line3();
const startBefore = new Vector3();
const ray = new Ray();

export class CharacterPhysics {
	readonly bvh: MeshBVH;
	readonly height: number;
	readonly radius: number;
	readonly segmentLength: number;

	position = new Vector3();
	positionPrev = new Vector3();
	positionNext = new Vector3();
	velocity = new Vector3();
	/** Facing (unit tangent). */
	forward = new Vector3(0, 0, -1);
	forwardPrev = new Vector3(0, 0, -1);
	forwardNext = new Vector3(0, 0, -1);
	up = new Vector3(0, 1, 0);

	isOnFloor = true;
	isMoving = false;
	medium = MEDIUM_GROUND;
	needsToLand = false;
	jumpRequested = false;
	sprinting = false;
	/** Vehicle tuning: the Sohrab cycle is faster, turns wider and hops lower. */
	forceScale = 1;
	turnScale = 1;
	jumpScale = 1;
	horizontalSpeed = 0;
	/** Smoothed distance travelled per second (units/s). */
	speed = 0;

	private accumulator = 0;
	private dampInterpolation = 1;
	private velocityVariation = 0;
	private lastFloorHeight = 0;
	private airTime = 0;
	private isAutoStepping = false;
	private events: PhysicsEvents;
	private spawn: { position: Vector3; forward: Vector3 } | null = null;

	constructor(bvh: MeshBVH, height: number, events: PhysicsEvents = {}) {
		this.bvh = bvh;
		this.height = height;
		this.radius = height * PHYSICS.capsuleRadiusPercentage;
		this.segmentLength = height - this.radius * 2;
		this.events = events;
	}

	setSpawn(position: Vector3, forward: Vector3) {
		this.spawn = { position: position.clone(), forward: forward.clone() };
		this.snap(position, forward);
	}

	snap(position: Vector3, forward: Vector3) {
		this.position.copy(position);
		this.positionPrev.copy(position);
		this.positionNext.copy(position);
		this.up.copy(position).normalize();
		this.forward.copy(forward).addScaledVector(this.up, -forward.dot(this.up)).normalize();
		this.forwardPrev.copy(this.forward);
		this.forwardNext.copy(this.forward);
		this.velocity.set(0, 0, 0);
		this.isOnFloor = true;
		this.medium = MEDIUM_GROUND;
		this.needsToLand = false;
		this.lastFloorHeight = position.length();
	}

	requestJump() {
		this.jumpRequested = true;
	}

	/** Externally driven pose (boat): no collisions, the camera still follows. */
	drive(position: Vector3, forward: Vector3, speed: number) {
		this.position.copy(position);
		this.positionPrev.copy(position);
		this.positionNext.copy(position);
		this.up.copy(position).normalize();
		this.forward.copy(forward).addScaledVector(this.up, -forward.dot(this.up)).normalize();
		this.forwardPrev.copy(this.forward);
		this.forwardNext.copy(this.forward);
		this.velocity.set(0, 0, 0);
		this.isMoving = Math.abs(speed) > 0.05;
		this.speed = Math.abs(speed);
		this.isOnFloor = true;
		this.medium = MEDIUM_GROUND;
		this.needsToLand = false;
		this.lastFloorHeight = position.length();
	}

	get airborne(): boolean {
		return this.medium === MEDIUM_AIR;
	}

	/**
	 * Advance physics. `input` is in the camera frame: x = right, z = back (W = -1).
	 * `camForward` is the camera's forward tangent at the character.
	 */
	update(dt: number, input: { x: number; z: number }, camForward: Vector3, dynamicObstacles?: Vector3[]) {
		this.accumulator += Math.min(dt, 0.1) * 60;
		while (this.accumulator >= 1) {
			this.accumulator -= 1;
			this.step(input, camForward, dynamicObstacles);
		}
		const a = this.accumulator;
		this.position.lerpVectors(this.positionPrev, this.positionNext, a);
		this.up.copy(this.position).normalize();
		this.forward.lerpVectors(this.forwardPrev, this.forwardNext, a);
		this.forward.addScaledVector(this.up, -this.forward.dot(this.up)).normalize();
	}

	private step(input: { x: number; z: number }, camForward: Vector3, obstacles?: Vector3[]) {
		const up = v3.copy(this.positionNext).normalize();
		this.positionPrev.copy(this.positionNext);
		this.forwardPrev.copy(this.forwardNext);
		this.isAutoStepping = false;

		let ix = input.x;
		let iz = input.z;
		const len = Math.hypot(ix, iz);
		if (len > 1) {
			ix /= len;
			iz /= len;
		}
		const sprint = this.sprinting ? PHYSICS.sprintSpeed : 1;
		ix *= sprint;
		iz *= sprint;
		this.isMoving = len > 1e-5;

		const acc = new Vector3();
		if (this.isMoving) {
			const fwd = v1.copy(camForward).addScaledVector(up, -camForward.dot(up)).normalize();
			const right = v2.crossVectors(fwd, up).normalize();
			acc.copy(fwd).multiplyScalar(-iz).addScaledVector(right, ix).multiplyScalar(PHYSICS.positionForce * this.forceScale);

			if (PHYSICS.autoStep && this.isOnFloor) this.tryAutoStep(acc, up);

			// rotate towards the input direction
			const desired = v1.copy(acc).normalize();
			if (desired.lengthSq() > 0.5) {
				this.forwardNext.lerp(desired, PHYSICS.directionLerp * this.turnScale).addScaledVector(up, -this.forwardNext.dot(up)).normalize();
			}
		}
		if (!this.isOnFloor) acc.addScaledVector(up, PHYSICS.gravity);
		this.velocity.add(acc);

		const idle = !this.isMoving && this.medium === MEDIUM_GROUND && !this.needsToLand;
		this.dampInterpolation = idle ? lerp(this.dampInterpolation, 0, 0.05) : 1;
		this.velocity.multiplyScalar(lerp(PHYSICS.dampIdle, PHYSICS.damp, this.dampInterpolation));
		this.velocity.clampLength(0, this.radius * 0.9 * PHYSICS.substeps);

		if (!this.isAutoStepping) this.isOnFloor = false;

		const pos = this.positionNext;
		for (let s = 0; s < PHYSICS.substeps; s++) {
			pos.addScaledVector(this.velocity, 1 / PHYSICS.substeps);
			const push = this.shapecast(pos);
			if (!this.isAutoStepping && push.lengthSq() > 0) {
				const n = push.normalize();
				const vn = n.dot(this.velocity);
				if (vn < 0) this.velocity.addScaledVector(n, -vn);
			}
		}
		if (obstacles) this.pushFromObstacles(pos, obstacles);

		const moved = v1.subVectors(this.positionNext, this.positionPrev);
		this.velocityVariation = this.velocityVariation * 0.8 + moved.length();
		const upNow = v2.copy(pos).normalize();
		const vertical = moved.dot(upNow);
		const horizontal = moved.addScaledVector(upNow, -vertical);
		this.horizontalSpeed = horizontal.length();
		this.speed = lerp(this.speed, this.horizontalSpeed * 60, 0.2);

		// rotation follows horizontal velocity
		if (this.horizontalSpeed > PHYSICS.rotVelocityMin) {
			const k = PHYSICS.directionLerp * this.turnScale * fit(this.horizontalSpeed, PHYSICS.rotVelocityMin, PHYSICS.rotVelocityMax, 0, 1);
			this.forwardNext.lerp(horizontal.normalize(), k);
		}
		this.forwardNext.addScaledVector(upNow, -this.forwardNext.dot(upNow)).normalize();

		this.detectFloorAndJump(pos, upNow);

		if (this.spawn && pos.length() < this.spawn.position.length() - PHYSICS.fallLimitDistance) {
			this.snap(this.spawn.position, this.spawn.forward);
		}
	}

	private tryAutoStep(acc: Vector3, up: Vector3) {
		const dir = v1.copy(acc).normalize();
		const steps = 3;
		const reach = this.radius * 2;
		for (let i = 0; i < steps; i++) {
			const d = ((i + 1) / steps) * reach;
			const probe = v2.copy(this.positionPrev).addScaledVector(dir, d);
			const origin = probe.clone().addScaledVector(up, this.radius * 2);
			ray.set(origin, up.clone().negate());
			const hit = this.bvh.raycastFirst(ray, DoubleSide, 0, this.radius * 4);
			if (!hit) continue;
			const stepHeight = hit.point.length() - this.positionPrev.length();
			const min = this.radius * 0.1;
			const max = this.radius * 1.5;
			const normal = hit.face ? hit.face.normal.clone() : up.clone();
			if (normal.dot(up) < 0) normal.negate();
			if (stepHeight > min && stepHeight < max && normal.dot(up) > PHYSICS.floorDetectInclination) {
				this.isAutoStepping = true;
				const target = hit.point.clone().addScaledVector(up, stepHeight * 0.5);
				const l = acc.length();
				acc.copy(target.sub(this.positionPrev).normalize()).multiplyScalar(l + PHYSICS.positionForce * 0.05);
				break;
			}
		}
	}

	/** Resolve capsule penetration; returns the push vector. */
	private shapecast(pos: Vector3): Vector3 {
		const up = v3.copy(pos).normalize();
		const r = this.radius;
		tmpSegment.start.copy(pos).addScaledVector(up, r);
		tmpSegment.end.copy(pos).addScaledVector(up, r + this.segmentLength);
		startBefore.copy(tmpSegment.start);
		tmpBox.makeEmpty();
		tmpBox.expandByPoint(tmpSegment.start);
		tmpBox.expandByPoint(tmpSegment.end);
		tmpBox.min.addScalar(-r);
		tmpBox.max.addScalar(r);

		const floorInclination = PHYSICS.floorDetectInclination;
		this.bvh.shapecast({
			intersectsBounds: (box) => box.intersectsBox(tmpBox),
			intersectsTriangle: (tri) => {
				const distance = tri.closestPointToSegment(tmpSegment, triPoint, capPoint);
				if (distance < r) {
					const depth = r - distance;
					const direction = capPoint.clone().sub(triPoint);
					if (direction.lengthSq() < 1e-12) {
						tri.getNormal(direction);
					}
					direction.normalize();
					const atBottom = capPoint.distanceToSquared(tmpSegment.start) < 1e-8;
					tmpSegment.start.addScaledVector(direction, depth);
					tmpSegment.end.addScaledVector(direction, depth);
					if (atBottom || direction.dot(up) > floorInclination) {
						tri.getNormal(triNormal);
						if (triNormal.dot(direction) < 0) triNormal.negate();
						if (triNormal.dot(up) > floorInclination) this.isOnFloor = true;
					}
				}
				return false;
			}
		});

		const delta = new Vector3().subVectors(tmpSegment.start, startBefore);
		const offset = Math.max(0, delta.length() - 1e-5);
		if (offset > 0) pos.addScaledVector(delta.clone().normalize(), offset);
		return delta;
	}

	private pushFromObstacles(pos: Vector3, obstacles: Vector3[]) {
		const minDist = this.radius * 1.9;
		for (const o of obstacles) {
			const d = v1.subVectors(pos, o);
			const up = v2.copy(pos).normalize();
			d.addScaledVector(up, -d.dot(up));
			const l = d.length();
			if (l > 1e-4 && l < minDist) pos.addScaledVector(d.normalize(), (minDist - l) * 0.5);
		}
	}

	private detectFloorAndJump(pos: Vector3, upIn: Vector3) {
		const up = upIn.clone();
		ray.set(pos.clone().addScaledVector(up, 0.005), up.clone().negate());
		const hit = this.bvh.raycastFirst(ray, DoubleSide, 0, 50);
		const floorDistance = hit ? hit.distance : Infinity;
		const farFromFloor = floorDistance > 0.25;

		if (!this.isOnFloor && this.velocityVariation < 0.01) this.isOnFloor = true;

		if (this.isOnFloor) {
			if (this.medium === MEDIUM_AIR) {
				const fall = this.lastFloorHeight - pos.length();
				if (this.needsToLand || fall > 0.3) this.events.onLand?.(fall);
				this.needsToLand = false;
			}
			this.medium = MEDIUM_GROUND;
			this.airTime = 0;
			if (this.jumpRequested) {
				this.jumpRequested = false;
				this.velocity.addScaledVector(up, PHYSICS.jumpForce * this.jumpScale);
				this.needsToLand = true;
				this.isOnFloor = false;
				this.medium = MEDIUM_AIR;
				this.events.onJump?.();
			}
			this.lastFloorHeight = pos.length();
		} else {
			this.airTime += 1 / 60;
			if (this.medium === MEDIUM_GROUND && this.airTime > 0.045 && farFromFloor) this.medium = MEDIUM_AIR;
		}
	}
}
