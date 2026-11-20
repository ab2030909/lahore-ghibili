import { DoubleSide, PerspectiveCamera, Ray, Vector3 } from 'three';
import type { MeshBVH } from 'three-mesh-bvh';
import { CAMERA } from '../core/config';
import { clamp, fit, lerp, lerpCoefFPS } from '../core/math';
import { rotateAroundAxis } from '../core/planet';
import type { CharacterPhysics } from './characterPhysics';

/**
 * Port of Messenger's follow camera (followCamera mixin):
 *  - follows the capsule top plus a local offset (-0.65, 0, 1) that lerps very slowly
 *  - spherical placement from relativeCameraPosition (0, 1, 5), pitch limited to [π/4, 3π/4]
 *  - automatic centering behind the character while moving, scaled by how much the camera
 *    is behind/beside the character (no swing when running towards the camera)
 *  - manual drag disables centering, which then recovers slowly
 *  - camera collisions shrink the radius (raycast + closest point), radius lerps back
 * On the planet, "yaw" is a tangent vector parallel-transported with the character.
 */

const tmp = new Vector3();
const tmp2 = new Vector3();
const ray = new Ray();

function signedAngle(from: Vector3, to: Vector3, axis: Vector3): number {
	const cross = tmp2.crossVectors(from, to);
	return Math.atan2(cross.dot(axis), from.dot(to));
}

export class FollowCamera {
	readonly camera: PerspectiveCamera;
	private readonly bvh: MeshBVH;
	private readonly char: CharacterPhysics;

	/** Yaw frames: tangent "forward" directions of the camera rig. */
	private yawTarget = new Vector3(0, 0, -1);
	private yaw = new Vector3(0, 0, -1);
	private phiTarget: number;
	private phi: number;
	private radiusTarget: number;
	private radius: number;
	private readonly followDistance: number;
	private readonly followPhi: number;

	private offsetTarget = new Vector3();
	private followTarget = new Vector3();
	readonly target = new Vector3();
	readonly position = new Vector3();
	readonly up = new Vector3(0, 1, 0);

	private centering = 1;
	dragging = false;
	/** Extra zoom applied while talking or looking at a landmark (0..1). */
	focus = 0;
	/** Camera pulls back a little on the cycle and in the boat. */
	distanceScale = 1;
	private distanceScaleSmooth = 1;

	constructor(camera: PerspectiveCamera, bvh: MeshBVH, char: CharacterPhysics) {
		this.camera = camera;
		this.bvh = bvh;
		this.char = char;
		const [x, y, z] = CAMERA.relativeCameraPosition;
		this.followDistance = Math.hypot(x, y, z);
		this.followPhi = clamp(Math.acos(y / this.followDistance), CAMERA.sphericalVerticalMinLimit, CAMERA.sphericalVerticalMaxLimit);
		this.phi = this.phiTarget = this.followPhi;
		this.radius = this.radiusTarget = this.followDistance;
		this.reset();
	}

	reset() {
		const c = this.char;
		this.yaw.copy(c.forward);
		this.yawTarget.copy(c.forward);
		this.headPoint(this.followTarget);
		this.offsetTarget.copy(this.localOffset());
		this.followTarget.add(this.offsetTarget);
		this.target.copy(this.followTarget);
		this.up.copy(c.up);
		this.computePosition(this.position, this.yaw, this.phi, this.radius);
	}

	/** Capsule top minus radius, like the original `Ta` helper. */
	private headPoint(out: Vector3): Vector3 {
		const c = this.char;
		return out.copy(c.position).addScaledVector(c.up, c.height - c.radius);
	}

	private localOffset(): Vector3 {
		const c = this.char;
		const [ox, oy, oz] = CAMERA.relativeCameraOffset;
		const right = tmp.crossVectors(c.forward, c.up).normalize();
		// original local frame: forward = -Z, so +Z is behind and -X is the character's left
		return new Vector3().copy(right).multiplyScalar(ox).addScaledVector(c.up, oy).addScaledVector(c.forward, -oz);
	}

	private computePosition(out: Vector3, yaw: Vector3, phi: number, radius: number): Vector3 {
		return out
			.copy(this.target)
			.addScaledVector(yaw, -Math.sin(phi) * radius)
			.addScaledVector(this.up, Math.cos(phi) * radius);
	}

	/** Mouse/touch drag: dx, dy in screen pixels. */
	rotate(dx: number, dy: number) {
		const angle = -dx * 0.006;
		rotateAroundAxis(this.yawTarget, this.up, angle);
		this.phiTarget = clamp(this.phiTarget - dy * 0.004, CAMERA.sphericalVerticalMinLimit, CAMERA.sphericalVerticalMaxLimit);
	}

	/** Tangent forward of the camera at the character (used for movement input). */
	get forward(): Vector3 {
		return this.yaw;
	}

	update(dt: number) {
		const c = this.char;
		const up = c.up;

		// parallel transport the yaw frames to the new tangent plane
		for (const v of [this.yaw, this.yawTarget]) {
			v.addScaledVector(up, -v.dot(up));
			if (v.lengthSq() < 1e-8) v.copy(c.forward);
			v.normalize();
		}
		this.up.copy(up);

		// follow target with slow local offset and faster world lerp
		const head = this.headPoint(new Vector3());
		const offset = this.localOffset();
		ray.set(head, tmp.copy(offset).normalize());
		const hit = this.bvh.raycastFirst(ray, DoubleSide, 0, offset.length());
		if (hit && hit.distance < offset.length()) offset.set(0, 0, 0);
		if (this.radiusTarget < this.followDistance * 0.75) offset.set(0, 0, 0);
		this.offsetTarget.lerp(offset, lerpCoefFPS(CAMERA.cameraTargetLocalLerp, dt));
		this.followTarget.lerp(head.add(this.offsetTarget), lerpCoefFPS(CAMERA.cameraTargetWorldLerp, dt));
		this.target.copy(this.followTarget);

		// automatic centering behind the character
		const camHorizontal = tmp.copy(this.yaw).negate(); // camera sits behind the rig
		const behindFactor = fit(camHorizontal.dot(c.forward), 1, 0, 0, 1);
		const influence = c.isMoving ? behindFactor : CAMERA.cameraInactiveMultiplier;
		const centerTarget = this.dragging ? 0 : 1;
		this.centering = lerp(
			this.centering,
			centerTarget,
			lerpCoefFPS(this.dragging ? CAMERA.cameraAutomaticCenteringActiveLerp : CAMERA.cameraAutomaticCenteringInactiveLerp, dt)
		);
		const k = lerpCoefFPS(CAMERA.cameraRotationLerp * influence * this.centering, dt);
		const yawDelta = signedAngle(this.yawTarget, c.forward, up);
		rotateAroundAxis(this.yawTarget, up, yawDelta * k);
		this.phiTarget = lerp(this.phiTarget, this.followPhi, lerpCoefFPS(CAMERA.cameraRotationLerp * this.centering, dt));

		// collisions
		this.distanceScaleSmooth = lerp(this.distanceScaleSmooth, this.distanceScale, lerpCoefFPS(0.04, dt));
		const desiredRadius = this.followDistance * (1 - this.focus * 0.35) * this.distanceScaleSmooth;
		let radius = desiredRadius;
		const wanted = this.computePosition(new Vector3(), this.yawTarget, this.phiTarget, desiredRadius);
		const dir = tmp.subVectors(wanted, this.target);
		const dist = dir.length();
		ray.set(this.target, dir.normalize());
		const block = this.bvh.raycastFirst(ray, DoubleSide, 0, dist);
		let collided = false;
		if (block && block.distance < dist) {
			radius = Math.max(0.6, block.distance * 0.9);
			collided = true;
		}
		const increment = desiredRadius * CAMERA.cameraCollisionsIncrement;
		for (let i = 0; i < CAMERA.cameraCollisionsMaxIterations && radius > 0.6; i++) {
			const p = this.computePosition(new Vector3(), this.yawTarget, this.phiTarget, radius);
			const closest = this.bvh.closestPointToPoint(p, undefined, 0, CAMERA.cameraCollisionsMinDistance);
			if (closest && closest.distance < CAMERA.cameraCollisionsMinDistance) {
				radius = Math.max(0.6, radius - increment);
				collided = true;
			} else break;
		}
		if (!collided) radius = Math.min(desiredRadius, this.radiusTarget + increment * dt * 60);
		this.radiusTarget = lerp(this.radiusTarget, radius, lerpCoefFPS(CAMERA.cameraSphericalRadiusCollisionsLerp, dt));

		// smooth the actual spherical coordinates
		const rotLerp = lerpCoefFPS(this.dragging ? CAMERA.cameraSphericalRotationFastLerp : CAMERA.cameraSphericalRotationLerp, dt);
		const actualDelta = signedAngle(this.yaw, this.yawTarget, up);
		rotateAroundAxis(this.yaw, up, actualDelta * rotLerp);
		this.phi = lerp(this.phi, this.phiTarget, rotLerp);
		const radiusLerp = collided ? CAMERA.cameraSphericalRadiusCollisionsLerp : CAMERA.cameraSphericalRadiusLerp;
		this.radius = lerp(this.radius, this.radiusTarget, lerpCoefFPS(radiusLerp, dt));

		this.computePosition(this.position, this.yaw, this.phi, this.radius);
	}

	/** Write the computed pose into the three.js camera. */
	apply(camera = this.camera) {
		camera.position.copy(this.position);
		camera.up.copy(this.up);
		camera.lookAt(this.target);
		camera.updateMatrixWorld();
	}
}
