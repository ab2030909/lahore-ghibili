import {
	BoxGeometry,
	BufferAttribute,
	CanvasTexture,
	CylinderGeometry,
	Group,
	Matrix4,
	Mesh,
	Object3D,
	PlaneGeometry,
	SphereGeometry,
	SRGBColorSpace,
	TorusGeometry,
	Vector3,
	type BufferGeometry,
	type Material,
	type Texture
} from 'three';
import { paletteUV, type PaletteKey } from '../render/palette';
import { createToonMaterial } from '../render/toonMaterial';

let idCounter = 0;

function painted(g: BufferGeometry, key: PaletteKey): BufferGeometry {
	const uv = g.getAttribute('uv') as BufferAttribute;
	const [u, v] = paletteUV(key);
	for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
	const id = 0.55 + ((idCounter++ * 37) % 40) * 0.01;
	g.setAttribute('surfaceId', new BufferAttribute(new Float32Array(uv.count).fill(id), 1));
	return g;
}

function part(parent: Object3D, g: BufferGeometry, key: PaletteKey, mat: Material, pos?: [number, number, number], rot?: [number, number, number]): Mesh {
	const m = new Mesh(painted(g, key), mat);
	if (pos) m.position.set(...pos);
	if (rot) m.rotation.set(...rot);
	m.castShadow = true;
	parent.add(m);
	return m;
}

function tube(parent: Object3D, a: [number, number, number], b: [number, number, number], r: number, key: PaletteKey, mat: Material): Mesh {
	const va = new Vector3(...a);
	const vb = new Vector3(...b);
	const m = new Mesh(painted(new CylinderGeometry(r, r, va.distanceTo(vb), 6), key), mat);
	m.position.copy(va).add(vb).multiplyScalar(0.5);
	m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), vb.clone().sub(va).normalize());
	m.castShadow = true;
	parent.add(m);
	return m;
}

function marker(parent: Object3D, pos: [number, number, number]): Object3D {
	const o = new Object3D();
	o.position.set(...pos);
	parent.add(o);
	return o;
}

/** Place a vehicle group on the planet: origin on the surface, +Y up, +Z forward. */
export function orient(group: Object3D, position: Vector3, up: Vector3, forward: Vector3) {
	const f = forward.clone().addScaledVector(up, -forward.dot(up)).normalize();
	const x = new Vector3().crossVectors(up, f).normalize();
	group.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(x, up, f));
	group.position.copy(position);
}

function decalTexture(): Texture {
	const c = document.createElement('canvas');
	c.width = 512;
	c.height = 128;
	const ctx = c.getContext('2d')!;
	ctx.fillStyle = '#1f1f22';
	ctx.fillRect(0, 0, 512, 128);
	ctx.strokeStyle = '#d8a83c';
	ctx.lineWidth = 6;
	ctx.strokeRect(8, 8, 496, 112);
	ctx.fillStyle = '#e8bf55';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.font = '64px "Bungee", "Arial Black", sans-serif';
	ctx.fillText('SOHRAB', 200, 68);
	ctx.direction = 'rtl';
	ctx.font = '700 52px "Noto Nastaliq Urdu", "Noto Naskh Arabic", sans-serif';
	ctx.fillText('سہراب', 420, 64);
	const tex = new CanvasTexture(c);
	tex.colorSpace = SRGBColorSpace;
	tex.needsUpdate = true;
	return tex;
}

/**
 * The Sohrab roadster: Pakistan's classic black bicycle (made in Lahore since 1953), the
 * postman's ride. Built facing +Z with the ground at y = 0.
 */
export class SohrabCycle {
	readonly group = new Group();
	readonly body = new Group();
	readonly fork = new Group();
	readonly frontWheel = new Group();
	readonly rearWheel = new Group();
	readonly crank = new Group();
	readonly seat = new Vector3(0, 1.08, -0.26);
	readonly grips: [Object3D, Object3D];
	readonly pedals: [Object3D, Object3D];
	readonly kickstand: Mesh;
	readonly materials: Material[];
	private readonly wheelR = 0.4;
	lean = 0;
	steer = 0;
	crankAngle = 0;

	constructor(palette: Texture, noise: Texture) {
		const mat = createToonMaterial({ colors: palette, noise, character: true, doubleSide: false, name: 'Sohrab' });
		const decal = createToonMaterial({ colors: decalTexture(), noise, character: true, doubleSide: false, name: 'SohrabDecal' });
		mat.uniforms.uNoiseDetail.value = 0;
		this.materials = [mat, decal];
		this.group.name = 'SohrabCycle';
		this.group.add(this.body);

		const frame: PaletteKey = 'black';
		// wheels
		const wheel = (g: Group, z: number) => {
			g.position.set(0, this.wheelR, z);
			part(g, new TorusGeometry(this.wheelR - 0.02, 0.035, 6, 22), 'charcoal', mat, [0, 0, 0], [0, Math.PI / 2, 0]);
			part(g, new TorusGeometry(this.wheelR - 0.07, 0.012, 4, 22), 'steel', mat, [0, 0, 0], [0, Math.PI / 2, 0]);
			for (let i = 0; i < 6; i++) part(g, new BoxGeometry(0.008, (this.wheelR - 0.07) * 2, 0.008), 'steel', mat, [0, 0, 0], [(i / 6) * Math.PI, 0, 0]);
			part(g, new CylinderGeometry(0.03, 0.03, 0.12, 8), 'steel', mat, [0, 0, 0], [0, 0, Math.PI / 2]);
		};
		wheel(this.rearWheel, -0.64);
		this.body.add(this.rearWheel);

		// frame tubes (classic double top-tube roadster)
		const R: [number, number, number] = [0, this.wheelR, -0.64];
		const BB: [number, number, number] = [0, 0.33, -0.05];
		const S: [number, number, number] = [0, 0.96, -0.22];
		const H: [number, number, number] = [0, 0.98, 0.46];
		const Hb: [number, number, number] = [0, 0.76, 0.5];
		tube(this.body, S, BB, 0.025, frame, mat);
		tube(this.body, BB, Hb, 0.028, frame, mat);
		tube(this.body, S, H, 0.024, frame, mat);
		tube(this.body, [0, 0.88, -0.2], [0, 0.88, 0.48], 0.018, frame, mat);
		tube(this.body, H, Hb, 0.032, frame, mat);
		for (const x of [-0.06, 0.06]) {
			tube(this.body, [x, R[1], R[2]], BB, 0.015, frame, mat);
			tube(this.body, [x, R[1], R[2]], S, 0.014, frame, mat);
		}
		// seat post, sprung leather saddle
		tube(this.body, S, [0, 1.02, -0.24], 0.016, 'steel', mat);
		part(this.body, new BoxGeometry(0.2, 0.06, 0.28), 'woodDark', mat, [0, 1.05, -0.26]);
		for (const x of [-0.06, 0.06]) part(this.body, new CylinderGeometry(0.018, 0.018, 0.07, 6), 'steel', mat, [x, 1.0, -0.33]);
		// rear carrier with the mail bag
		part(this.body, new BoxGeometry(0.3, 0.025, 0.5), 'steel', mat, [0, 0.86, -0.62]);
		for (const x of [-0.13, 0.13]) tube(this.body, [x, 0.86, -0.82], [0.06 * Math.sign(x), this.wheelR, -0.64], 0.01, 'steel', mat);
		part(this.body, new BoxGeometry(0.36, 0.24, 0.34), 'wood', mat, [0, 1.0, -0.64]);
		part(this.body, new BoxGeometry(0.37, 0.08, 0.35), 'woodDark', mat, [0, 1.1, -0.64]);
		part(this.body, new BoxGeometry(0.12, 0.08, 0.02), 'postRed', mat, [0, 1.0, -0.47]);
		// mudguards
		part(this.body, new TorusGeometry(this.wheelR + 0.04, 0.03, 4, 12, Math.PI * 0.75), frame, mat, [0, this.wheelR, -0.64], [0, Math.PI / 2, Math.PI * 0.12]);
		// chain guard with the SOHRAB decal (drive side is the rider's right, -X)
		part(this.body, new BoxGeometry(0.02, 0.13, 0.66), frame, mat, [-0.09, 0.36, -0.33]);
		const decalPlane = new PlaneGeometry(0.5, 0.11);
		decalPlane.setAttribute('surfaceId', new BufferAttribute(new Float32Array(decalPlane.getAttribute('position').count).fill(0.71), 1));
		const d = new Mesh(decalPlane, decal);
		d.position.set(-0.102, 0.36, -0.33);
		d.rotation.y = -Math.PI / 2;
		this.body.add(d);
		const d2 = new Mesh(decalPlane.clone(), decal);
		d2.position.set(0.03, 0.62, 0.2);
		d2.rotation.set(0, Math.PI / 2, -0.32);
		d2.scale.setScalar(0.62);
		this.body.add(d2);
		// head badge
		part(this.body, new BoxGeometry(0.06, 0.09, 0.02), 'gold', mat, [0, 0.88, 0.5]);

		// crank and pedals
		this.crank.position.set(...BB);
		part(this.crank, new CylinderGeometry(0.08, 0.08, 0.02, 14), 'charcoal', mat, [-0.07, 0, 0], [0, 0, Math.PI / 2]);
		const arm = (side: number) => {
			const g = new Group();
			g.position.set(side * 0.1, 0, 0);
			part(g, new BoxGeometry(0.02, 0.17, 0.025), 'steel', mat, [0, side * 0.085, 0]);
			part(g, new BoxGeometry(0.1, 0.02, 0.06), 'charcoal', mat, [side * 0.05, side * 0.17, 0]);
			this.crank.add(g);
			return marker(g, [side * 0.06, side * 0.17, 0]);
		};
		this.pedals = [arm(1), arm(-1)];
		this.body.add(this.crank);

		// fork, handlebar, front wheel
		this.fork.position.set(0, 0.88, 0.48);
		this.body.add(this.fork);
		for (const x of [-0.06, 0.06]) tube(this.fork, [x * 0.6, -0.1, 0.02], [x, this.wheelR - 0.88, 0.17], 0.014, frame, mat);
		tube(this.fork, [0, 0.1, -0.02], [0, 0.24, -0.04], 0.016, 'steel', mat);
		tube(this.fork, [-0.28, 0.24, -0.16], [0, 0.24, -0.04], 0.013, 'steel', mat);
		tube(this.fork, [0.28, 0.24, -0.16], [0, 0.24, -0.04], 0.013, 'steel', mat);
		for (const x of [-0.3, 0.3]) part(this.fork, new CylinderGeometry(0.022, 0.022, 0.1, 8), 'charcoal', mat, [x, 0.24, -0.17], [0, 0, Math.PI / 2]);
		this.grips = [marker(this.fork, [0.29, 0.25, -0.17]), marker(this.fork, [-0.29, 0.25, -0.17])];
		part(this.fork, new SphereGeometry(0.035, 8, 6), 'steel', mat, [0.2, 0.27, -0.13]);
		part(this.fork, new CylinderGeometry(0.05, 0.04, 0.08, 10), 'steel', mat, [0, 0.0, 0.08], [Math.PI / 2, 0, 0]);
		part(this.fork, new CylinderGeometry(0.04, 0.04, 0.01, 10), 'bulb', mat, [0, 0.0, 0.125], [Math.PI / 2, 0, 0]);
		wheel(this.frontWheel, 0);
		this.frontWheel.position.set(0, this.wheelR - 0.88, 0.17);
		this.fork.add(this.frontWheel);
		part(this.fork, new TorusGeometry(this.wheelR + 0.04, 0.03, 4, 10, Math.PI * 0.55), frame, mat, [0, this.wheelR - 0.88, 0.17], [0, Math.PI / 2, Math.PI * 0.3]);

		// kickstand
		this.kickstand = part(this.body, new BoxGeometry(0.02, 0.36, 0.02), 'steel', mat, [0.08, 0.17, -0.12], [0, 0, 0.35]);
		this.body.traverse((o) => {
			if ((o as Mesh).isMesh) (o as Mesh).castShadow = true;
		});
	}

	/** Spin wheels and pedals by distance travelled; lean into turns. */
	animate(dt: number, distance: number, yawRate: number, riding: boolean) {
		const spin = distance / this.wheelR;
		this.frontWheel.rotation.x += spin;
		this.rearWheel.rotation.x += spin;
		this.crankAngle += spin * 0.45;
		this.crank.rotation.x = this.crankAngle;
		// parked: rest on the kickstand (it splays to +X, so lean that way)
		const targetLean = riding ? Math.max(-0.32, Math.min(0.32, -yawRate * 0.18)) : -0.09;
		const targetSteer = riding ? Math.max(-0.4, Math.min(0.4, yawRate * 0.25)) : 0.3;
		const k = 1 - Math.exp(-dt * 6);
		this.lean += (targetLean - this.lean) * k;
		this.steer += (targetSteer - this.steer) * k;
		this.body.rotation.z = this.lean;
		this.fork.rotation.y = this.steer;
		this.kickstand.visible = !riding;
	}
}

/**
 * Painted rowing boat of the Ravi boatmen, with a raised prow and two oars.
 * Origin at the water surface, +Z forward.
 */
export class RaviBoat {
	readonly group = new Group();
	readonly hull = new Group();
	readonly oars: [Group, Group];
	readonly handles: [Object3D, Object3D];
	readonly feet: [Object3D, Object3D];
	readonly seat = new Vector3(0, 0.34, -0.5);
	readonly material: Material;
	rowPhase = 0;

	constructor(palette: Texture, noise: Texture) {
		const mat = createToonMaterial({ colors: palette, noise, doubleSide: false, name: 'RaviBoat' });
		this.material = mat;
		this.group.name = 'RaviBoat';
		this.group.add(this.hull);
		const h = this.hull;
		part(h, new BoxGeometry(1.0, 0.18, 3.0), 'woodDark', mat, [0, -0.2, 0]);
		for (const side of [-1, 1]) {
			part(h, new BoxGeometry(0.08, 0.55, 3.1), 'wood', mat, [side * 0.58, 0.02, 0], [0, 0, side * -0.12]);
			part(h, new BoxGeometry(0.1, 0.08, 3.2), 'paintTurquoise', mat, [side * 0.62, 0.3, 0]);
			part(h, new BoxGeometry(0.06, 0.1, 3.0), 'awningRed', mat, [side * 0.635, 0.16, 0]);
			// bow and stern planks converging
			part(h, new BoxGeometry(0.08, 0.5, 0.9), 'wood', mat, [side * 0.33, 0.02, 1.85], [0, side * -0.62, 0]);
			part(h, new BoxGeometry(0.08, 0.5, 0.8), 'wood', mat, [side * 0.35, 0.02, -1.82], [0, side * 0.6, 0]);
		}
		// raised prow and stern posts
		part(h, new BoxGeometry(0.12, 1.0, 0.16), 'woodDark', mat, [0, 0.35, 2.15], [0.35, 0, 0]);
		part(h, new BoxGeometry(0.14, 0.12, 0.3), 'paintTurquoise', mat, [0, 0.82, 2.33], [0.35, 0, 0]);
		part(h, new BoxGeometry(0.12, 0.7, 0.16), 'woodDark', mat, [0, 0.2, -2.1], [-0.3, 0, 0]);
		// thwarts and floor boards
		for (const z of [-0.5, 0.7, 1.4]) part(h, new BoxGeometry(1.1, 0.06, 0.28), 'woodLight', mat, [0, 0.26, z]);
		part(h, new BoxGeometry(0.8, 0.04, 2.4), 'woodLight', mat, [0, -0.1, 0]);
		// stern lantern pole
		part(h, new CylinderGeometry(0.025, 0.025, 1.2, 6), 'wood', mat, [0.35, 0.65, -1.6]);
		part(h, new BoxGeometry(0.14, 0.18, 0.14), 'lantern', mat, [0.35, 1.2, -1.6]);
		// oars
		const oar = (side: number): [Group, Object3D] => {
			const g = new Group();
			g.position.set(side * 0.64, 0.36, 0.05);
			part(g, new CylinderGeometry(0.025, 0.025, 2.1, 6), 'woodLight', mat, [side * 0.6, 0, 0], [0, 0, Math.PI / 2]);
			part(g, new BoxGeometry(0.5, 0.02, 0.16), 'paintTurquoise', mat, [side * 1.5, 0, 0]);
			part(g, new CylinderGeometry(0.03, 0.03, 0.12, 6), 'woodDark', mat, [side * -0.42, 0, 0], [0, 0, Math.PI / 2]);
			h.add(g);
			return [g, marker(g, [side * -0.42, 0.02, 0])];
		};
		const [l, lh] = oar(1);
		const [r, rh] = oar(-1);
		this.oars = [l, r];
		this.handles = [lh, rh];
		this.feet = [marker(h, [0.13, -0.08, 0.32]), marker(h, [-0.13, -0.08, 0.32])];
		h.traverse((o) => {
			if ((o as Mesh).isMesh) (o as Mesh).castShadow = true;
		});
	}

	animate(dt: number, elapsed: number, effort: number) {
		this.rowPhase += dt * (1.2 + effort * 2.2) * (effort > 0.05 ? 1 : 0.15);
		const sweep = Math.sin(this.rowPhase) * (0.15 + effort * 0.45);
		const lift = 0.22 + Math.cos(this.rowPhase) * 0.12 * effort;
		this.oars[0].rotation.set(0, sweep, -lift);
		this.oars[1].rotation.set(0, -sweep, lift);
		this.hull.position.y = Math.sin(elapsed * 1.7) * 0.035;
		this.hull.rotation.z = Math.sin(elapsed * 1.25) * 0.025;
		this.hull.rotation.x = Math.sin(elapsed * 0.9 + 1) * 0.02;
	}
}
