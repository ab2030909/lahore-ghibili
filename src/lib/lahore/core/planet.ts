import { Matrix4, Quaternion, Vector3 } from 'three';
import { PLANET_RADIUS } from './config';
import { DEG } from './math';

/**
 * The Lahore planet is centred at the origin with +Y as the north pole, like the original
 * Messenger planet. Landmarks are laid out along the "Shahi Guzargah" (royal trail), which
 * follows the equator westwards from Delhi Gate.
 *
 * Trail coordinates:
 *   w = arc distance west of Delhi Gate (ground units)
 *   t = arc distance north of the trail (ground units)
 */
export function trailDir(w: number, t: number, out = new Vector3()): Vector3 {
	const lon = -w / PLANET_RADIUS;
	const lat = t / PLANET_RADIUS;
	const c = Math.cos(lat);
	return out.set(c * Math.sin(lon), Math.sin(lat), c * Math.cos(lon)).normalize();
}

export function trailPoint(w: number, t: number, height = 0, out = new Vector3()): Vector3 {
	return trailDir(w, t, out).multiplyScalar(PLANET_RADIUS + height);
}

/** Inverse of `trailDir`. */
export function dirToTrail(dir: Vector3): { w: number; t: number } {
	const d = dir.clone().normalize();
	const lat = Math.asin(Math.max(-1, Math.min(1, d.y)));
	const lon = Math.atan2(d.x, d.z);
	return { w: -lon * PLANET_RADIUS, t: lat * PLANET_RADIUS };
}

/** Local north/east tangents at a surface direction. */
export function northEast(up: Vector3): { north: Vector3; east: Vector3 } {
	const north = new Vector3(0, 1, 0).addScaledVector(up, -up.y);
	if (north.lengthSq() < 1e-8) north.set(0, 0, -1).addScaledVector(up, -up.z);
	north.normalize();
	const east = new Vector3().crossVectors(north, up).normalize();
	return { north, east };
}

const tmpAxis = new Vector3();
const tmpV = new Vector3();

/** Rotate `v` around unit `axis` by `angle` (Rodrigues), in place. */
export function rotateAroundAxis(v: Vector3, axis: Vector3, angle: number): Vector3 {
	if (Math.abs(angle) < 1e-9) return v;
	const c = Math.cos(angle);
	const s = Math.sin(angle);
	const dot = axis.dot(v);
	tmpV.crossVectors(axis, v);
	return v
		.multiplyScalar(c)
		.addScaledVector(tmpV, s)
		.addScaledVector(axis, dot * (1 - c));
}

/**
 * A tangent frame on the planet used to author a landmark as if the ground were flat.
 * Local axes: +Y up, +Z = facade direction (heading), +X = right when looking at the facade.
 * `bend()` wraps local coordinates onto the sphere with the exponential map, so wide parts
 * follow the curvature (verticals stay perpendicular to the ground, like a tiny planet).
 */
export class PlanetFrame {
	readonly up: Vector3;
	readonly x: Vector3;
	readonly z: Vector3;
	readonly baseRadius: number;

	constructor(dir: Vector3, headingRad: number, baseHeight = 0) {
		this.up = dir.clone().normalize();
		const { north, east } = northEast(this.up);
		this.z = north.multiplyScalar(Math.cos(headingRad)).addScaledVector(east, Math.sin(headingRad)).normalize();
		this.x = new Vector3().crossVectors(this.up, this.z).normalize();
		this.baseRadius = PLANET_RADIUS + baseHeight;
	}

	/**
	 * Frame on the trail. `facing` is the compass direction the facade looks at, in degrees
	 * (0 = north, 90 = east, 180 = south, 270 = west).
	 */
	static trail(w: number, t: number, facingDeg: number, baseHeight = 0): PlanetFrame {
		return new PlanetFrame(trailDir(w, t), facingDeg * DEG, baseHeight);
	}

	/** Direction of the surface normal under local (lx, lz). */
	surfaceDir(lx: number, lz: number, out = new Vector3()): Vector3 {
		const s = Math.hypot(lx, lz);
		if (s < 1e-7) return out.copy(this.up);
		const angle = s / PLANET_RADIUS;
		tmpAxis.copy(this.x).multiplyScalar(lx / s).addScaledVector(this.z, lz / s);
		return out.copy(this.up).multiplyScalar(Math.cos(angle)).addScaledVector(tmpAxis, Math.sin(angle)).normalize();
	}

	/** Bend a local point onto the planet. */
	point(lx: number, ly: number, lz: number, out = new Vector3()): Vector3 {
		return this.surfaceDir(lx, lz, out).multiplyScalar(this.baseRadius + ly);
	}

	/** Rotation that carries the frame's up to the surface normal under (lx, lz). */
	bendRotation(lx: number, lz: number, out = new Quaternion()): Quaternion {
		const s = Math.hypot(lx, lz);
		if (s < 1e-7) return out.identity();
		tmpAxis.copy(this.x).multiplyScalar(lx / s).addScaledVector(this.z, lz / s);
		const axis = new Vector3().crossVectors(this.up, tmpAxis).normalize();
		return out.setFromAxisAngle(axis, s / PLANET_RADIUS);
	}

	/** Inverse of `surfaceDir`: local ground coordinates (lx, lz) of a world direction/point. */
	toLocal(world: Vector3): { x: number; z: number; height: number } {
		const len = world.length();
		const d = tmpV.copy(world).divideScalar(len || 1);
		const cos = Math.max(-1, Math.min(1, d.dot(this.up)));
		const angle = Math.acos(cos);
		tmpAxis.copy(d).addScaledVector(this.up, -cos);
		const tl = tmpAxis.length();
		const s = angle * PLANET_RADIUS;
		if (tl < 1e-9) return { x: 0, z: 0, height: len - this.baseRadius };
		tmpAxis.divideScalar(tl);
		return { x: s * tmpAxis.dot(this.x), z: s * tmpAxis.dot(this.z), height: len - this.baseRadius };
	}

	/** Local direction (in frame axes) to world direction at the frame origin. */
	dir(lx: number, ly: number, lz: number, out = new Vector3()): Vector3 {
		return out.copy(this.x).multiplyScalar(lx).addScaledVector(this.up, ly).addScaledVector(this.z, lz);
	}

	/** World matrix for a rigid (upright) object standing at local (lx, ly, lz) rotated by `rotY`. */
	uprightMatrix(lx: number, ly: number, lz: number, rotY = 0, out = new Matrix4()): Matrix4 {
		const q = this.bendRotation(lx, lz);
		const xAxis = this.x.clone().applyQuaternion(q);
		const up = this.up.clone().applyQuaternion(q);
		const zAxis = this.z.clone().applyQuaternion(q);
		if (rotY !== 0) {
			rotateAroundAxis(xAxis, up, rotY);
			rotateAroundAxis(zAxis, up, rotY);
		}
		const pos = this.point(lx, ly, lz);
		return out.makeBasis(xAxis, up, zAxis).setPosition(pos);
	}

	/** A sub-frame whose origin is local (lx, lz) and heading is rotated by `rotY`. */
	subFrame(lx: number, lz: number, rotY = 0, baseHeight = this.baseRadius - PLANET_RADIUS): PlanetFrame {
		const dir = this.surfaceDir(lx, lz);
		const q = this.bendRotation(lx, lz);
		const zAxis = this.z.clone().applyQuaternion(q);
		const up = this.up.clone().applyQuaternion(q);
		if (rotY !== 0) rotateAroundAxis(zAxis, up, rotY);
		const frame = Object.create(PlanetFrame.prototype) as PlanetFrame;
		(frame as { up: Vector3 }).up = dir;
		(frame as { z: Vector3 }).z = zAxis.normalize();
		(frame as { x: Vector3 }).x = new Vector3().crossVectors(dir, zAxis).normalize();
		(frame as { baseRadius: number }).baseRadius = PLANET_RADIUS + baseHeight;
		return frame;
	}
}

/** Great-circle interpolation between two surface directions. */
export function slerpDir(a: Vector3, b: Vector3, t: number, out = new Vector3()): Vector3 {
	const dot = Math.max(-1, Math.min(1, a.dot(b)));
	const omega = Math.acos(dot);
	if (omega < 1e-6) return out.copy(a);
	const so = Math.sin(omega);
	return out
		.copy(a)
		.multiplyScalar(Math.sin((1 - t) * omega) / so)
		.addScaledVector(b, Math.sin(t * omega) / so)
		.normalize();
}

/** Arc length on the ground between two directions. */
export const arcDistance = (a: Vector3, b: Vector3): number =>
	Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * PLANET_RADIUS;
