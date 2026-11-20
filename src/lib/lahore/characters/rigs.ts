import {
	AnimationClip,
	AnimationMixer,
	AnimationUtils,
	DataTexture,
	NearestFilter,
	Quaternion,
	QuaternionKeyframeTrack,
	RGBAFormat,
	RepeatWrapping,
	SRGBColorSpace,
	UnsignedByteType,
	Vector3,
	VectorKeyframeTrack,
	type AnimationAction,
	type Bone,
	type BufferGeometry,
	type ShaderMaterial,
	type SkinnedMesh,
	type Texture
} from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { createSkin, createSkinAnimation } from '$lib/engine/skinMesh';
import { loadDracoMesh } from '../assets/draco';
import { createToonMaterial } from '../render/toonMaterial';
import { skinCell, type NpcModel, type Outfit } from './outfits';

const NPC_ROOT = '/game/geometries/npcs/present';

/** Which original clips exist per model, and the donor rig used for retargeting. */
const ANIMATIONS: Record<NpcModel, { idle: string; walk?: string; talk?: string; idleTalk?: string }> = {
	'office-worker': { idle: 'idle', walk: 'walk', talk: 'talk', idleTalk: 'idle-talk' },
	'young-lady': { idle: 'idle', talk: 'talk', idleTalk: 'talk-idle' },
	musician: { idle: 'idle', talk: 'talk' },
	mountainman: { idle: 'idle' },
	oldwoman: { idle: 'idle' },
	threekid: { idle: 'idle' },
	'male-scientist': { idle: 'idle' },
	'female-scientist': { idle: 'idle' },
	'factory-worker-b': { idle: 'talk', walk: 'walk', talk: 'talk' },
	'factory-worker-c': { idle: 'idle' },
	chef: { idle: 'idle' },
	boss: { idle: 'idle' },
	scout: { idle: 'idle' }
};

const GROUP_22: NpcModel[] = ['office-worker', 'young-lady', 'musician', 'mountainman', 'oldwoman', 'threekid'];
const GROUP_27: NpcModel[] = ['factory-worker-b', 'factory-worker-c', 'male-scientist', 'female-scientist'];

function donorFor(model: NpcModel): NpcModel | null {
	if (GROUP_22.includes(model)) return 'office-worker';
	if (GROUP_27.includes(model)) return 'factory-worker-b';
	return null;
}

export function canWalk(model: NpcModel): boolean {
	return !!ANIMATIONS[model].walk || donorFor(model) !== null;
}

type RestPose = { quats: Quaternion[]; positions: Vector3[] };

export type RigTemplate = {
	model: NpcModel;
	mesh: SkinnedMesh;
	rest: RestPose;
	clips: { idle: AnimationClip; walk?: AnimationClip; talk?: AnimationClip; idleTalk?: AnimationClip };
	height: number;
};

function restFromBones(bones: BufferGeometry): RestPose {
	const q = bones.getAttribute('quaternion');
	const p = bones.getAttribute('position');
	const quats: Quaternion[] = [];
	const positions: Vector3[] = [];
	for (let i = 0; i < q.count; i++) {
		quats.push(new Quaternion(q.getX(i), q.getY(i), q.getZ(i), q.getW(i)).normalize());
		positions.push(new Vector3(p.getX(i), p.getY(i), p.getZ(i)));
	}
	return { quats, positions };
}

/** Delta retarget between rigs with identical hierarchy (bone_i names). */
function retarget(clip: AnimationClip, src: RestPose, dst: RestPose, name: string): AnimationClip {
	const tracks = [];
	const scale = dst.positions[0].y / Math.max(0.001, src.positions[0].y);
	const q = new Quaternion();
	for (const track of clip.tracks) {
		const [bone, prop] = track.name.split('.');
		const index = Number.parseInt(bone.slice(5), 10);
		if (!(index < dst.quats.length)) continue;
		if (prop === 'quaternion') {
			const values = Float32Array.from(track.values);
			const inv = src.quats[index].clone().invert();
			for (let i = 0; i < values.length; i += 4) {
				q.fromArray(values, i).premultiply(inv).premultiply(dst.quats[index]).normalize();
				q.toArray(values, i);
			}
			tracks.push(new QuaternionKeyframeTrack(track.name, Array.from(track.times), Array.from(values)));
		} else if (prop === 'position' && index === 0) {
			const values = Float32Array.from(track.values);
			const s = src.positions[0];
			const d = dst.positions[0];
			for (let i = 0; i < values.length; i += 3) {
				values[i] = d.x + (values[i] - s.x) * scale;
				values[i + 1] = d.y + (values[i + 1] - s.y) * scale;
				values[i + 2] = d.z + (values[i + 2] - s.z) * scale;
			}
			tracks.push(new VectorKeyframeTrack(track.name, Array.from(track.times), Array.from(values)));
		}
	}
	return new AnimationClip(name, clip.duration, tracks);
}

export class NpcLibrary {
	private templates = new Map<NpcModel, Promise<RigTemplate>>();
	private atlasPixels: Uint8ClampedArray | null = null;
	private paletteCache = new Map<string, DataTexture>();
	readonly eye: Texture;
	readonly mouth: Texture;
	readonly noise: Texture;

	constructor(eye: Texture, mouth: Texture, noise: Texture) {
		eye.wrapS = eye.wrapT = RepeatWrapping;
		mouth.wrapS = mouth.wrapT = RepeatWrapping;
		eye.needsUpdate = true;
		mouth.needsUpdate = true;
		this.eye = eye;
		this.mouth = mouth;
		this.noise = noise;
	}

	async loadAtlas(url = '/game/images/atlas.png') {
		if (this.atlasPixels) return;
		const img = new Image();
		img.src = url;
		await img.decode();
		const canvas = document.createElement('canvas');
		canvas.width = 16;
		canvas.height = 16;
		const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
		ctx.drawImage(img, 0, 0, 16, 16);
		this.atlasPixels = ctx.getImageData(0, 0, 16, 16).data;
	}

	/** Atlas copy with garment cells replaced by the outfit colours. */
	paletteFor(outfit: Outfit): DataTexture {
		const key = JSON.stringify([outfit.cells, outfit.skin]);
		const hit = this.paletteCache.get(key);
		if (hit) return hit;
		if (!this.atlasPixels) throw new Error('NPC atlas not loaded');
		const data = new Uint8Array(16 * 16 * 4);
		for (let row = 0; row < 16; row++) {
			for (let col = 0; col < 16; col++) {
				const src = (row * 16 + col) * 4;
				const dst = ((15 - row) * 16 + col) * 4;
				data[dst] = this.atlasPixels[src];
				data[dst + 1] = this.atlasPixels[src + 1];
				data[dst + 2] = this.atlasPixels[src + 2];
				data[dst + 3] = 255;
			}
		}
		const cells = { ...outfit.cells };
		if (outfit.skin) cells[skinCell] = outfit.skin;
		for (const [cell, hex] of Object.entries(cells)) {
			const [col, row] = cell.split(',').map(Number);
			const v = Number.parseInt(hex.slice(1), 16);
			const dst = ((15 - row) * 16 + col) * 4;
			data[dst] = (v >> 16) & 255;
			data[dst + 1] = (v >> 8) & 255;
			data[dst + 2] = v & 255;
		}
		const tex = new DataTexture(data, 16, 16, RGBAFormat, UnsignedByteType);
		tex.colorSpace = SRGBColorSpace;
		tex.magFilter = NearestFilter;
		tex.minFilter = NearestFilter;
		tex.generateMipmaps = false;
		tex.needsUpdate = true;
		this.paletteCache.set(key, tex);
		return tex;
	}

	template(model: NpcModel): Promise<RigTemplate> {
		const hit = this.templates.get(model);
		if (hit) return hit;
		const promise = this.buildTemplate(model);
		this.templates.set(model, promise);
		return promise;
	}

	private async buildTemplate(model: NpcModel): Promise<RigTemplate> {
		const base = `${NPC_ROOT}/${model}/${model}`;
		const anims = ANIMATIONS[model];
		const [geometry, bones, idleGeo] = await Promise.all([
			loadDracoMesh(`${base}.drc`),
			loadDracoMesh(`${base}-bones.drc`),
			loadDracoMesh(`${base}-${anims.idle}.drc`)
		]);
		geometry.computeBoundingBox();
		const height = geometry.boundingBox ? geometry.boundingBox.max.y - Math.max(0, geometry.boundingBox.min.y) : 1.9;
		const placeholder = createToonMaterial({ colors: this.eye, noise: this.noise, character: true });
		const mesh = createSkin(geometry, bones, placeholder);
		mesh.frustumCulled = false;
		const rest = restFromBones(bones);
		const clips: RigTemplate['clips'] = { idle: createSkinAnimation(`${model}-idle`, idleGeo) };

		const own = async (suffix?: string) => (suffix ? createSkinAnimation(`${model}-${suffix}`, await loadDracoMesh(`${base}-${suffix}.drc`)) : undefined);
		clips.talk = await own(anims.talk);
		clips.idleTalk = await own(anims.idleTalk);
		clips.walk = await own(anims.walk);

		const donor = donorFor(model);
		if (donor && donor !== model) {
			const donorTemplate = await this.template(donor);
			if (!clips.walk && donorTemplate.clips.walk) clips.walk = retarget(donorTemplate.clips.walk, donorTemplate.rest, rest, `${model}-walk`);
			if (!clips.talk && donorTemplate.clips.talk) clips.talk = retarget(donorTemplate.clips.talk, donorTemplate.rest, rest, `${model}-talk`);
		}
		return { model, mesh, rest, clips, height };
	}

	async instance(model: NpcModel, outfit: Outfit, seed: number, sitting = false, freeBones: string[] = []): Promise<NpcRig> {
		const template = await this.template(model);
		const mesh = SkeletonUtils.clone(template.mesh) as SkinnedMesh;
		const material = createToonMaterial({
			colors: this.paletteFor(outfit),
			noise: this.noise,
			character: true,
			eye: this.eye,
			mouth: this.mouth,
			skinColor: outfit.skin ?? '#c99a7b',
			seed,
			doubleSide: false,
			name: `npc-${model}`
		});
		mesh.material = material;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.frustumCulled = false;
		return new NpcRig(mesh, material, template, sitting, freeBones);
	}
}

/** One animated character: mixer with idle / walk / talk actions blended by weight. */
/** Bones of the legs (thigh, shin) found from the bind pose, for the sitting pose. */
function findLegs(mesh: SkinnedMesh): { thigh: Bone; shin: Bone }[] {
	mesh.updateMatrixWorld(true);
	const bones = mesh.skeleton.bones;
	const root = bones[0];
	const rootY = root.getWorldPosition(new Vector3()).y;
	const legs: { thigh: Bone; shin: Bone }[] = [];
	for (const bone of bones) {
		const parent = bone.parent as Bone | null;
		if (!parent || !(parent as Bone).isBone) continue;
		const y = bone.getWorldPosition(new Vector3()).y;
		const x = bone.getWorldPosition(new Vector3()).x;
		const child = bone.children.find((c) => (c as Bone).isBone) as Bone | undefined;
		if (!child) continue;
		const childY = child.getWorldPosition(new Vector3()).y;
		// a thigh starts near the hips, off-centre, and its child is much lower
		if (Math.abs(x) > 0.04 && y < rootY + 0.05 && y > rootY - 0.25 && childY < y - 0.25) legs.push({ thigh: bone, shin: child });
	}
	return legs.slice(0, 2);
}

/** Tracks a sitting NPC must not animate (legs and root translation). */
function sittingFilter(mesh: SkinnedMesh): Set<string> {
	const names = new Set<string>(['bone_0.position']);
	for (const { thigh } of findLegs(mesh)) {
		thigh.traverse((b) => {
			names.add(`${b.name}.quaternion`);
			names.add(`${b.name}.position`);
		});
	}
	return names;
}

function filterClip(clip: AnimationClip | undefined, drop: Set<string>): AnimationClip | undefined {
	if (!clip) return clip;
	return new AnimationClip(`${clip.name}-sit`, clip.duration, clip.tracks.filter((t) => !drop.has(t.name)));
}

const rotWorld = (bone: Bone, axis: Vector3, angle: number) => {
	const parent = bone.parent!;
	parent.updateMatrixWorld(true);
	const parentQ = parent.getWorldQuaternion(new Quaternion());
	const worldQ = bone.getWorldQuaternion(new Quaternion());
	const r = new Quaternion().setFromAxisAngle(axis, angle);
	bone.quaternion.copy(parentQ.invert().multiply(r.multiply(worldQ)));
	bone.updateMatrixWorld(true);
};

export class NpcRig {
	readonly mesh: SkinnedMesh;
	readonly material: ShaderMaterial;
	readonly template: RigTemplate;
	readonly mixer: AnimationMixer;
	readonly sitting: boolean;
	readonly actions: Partial<Record<'idle' | 'walk' | 'talk' | 'air', AnimationAction>> = {};
	readonly weights: Record<'idle' | 'walk' | 'talk' | 'air', number> = { idle: 1, walk: 0, talk: 0, air: 0 };
	targets: Record<'idle' | 'walk' | 'talk' | 'air', number> = { idle: 1, walk: 0, talk: 0, air: 0 };

	constructor(mesh: SkinnedMesh, material: ShaderMaterial, template: RigTemplate, sitting = false, freeBones: string[] = []) {
		this.mesh = mesh;
		this.material = material;
		this.template = template;
		this.sitting = sitting;
		this.mixer = new AnimationMixer(mesh);
		let clips: RigTemplate['clips'] = template.clips;
		if (sitting) {
			const drop = sittingFilter(mesh);
			// bones driven by code (IK) instead of the clips
			for (const name of freeBones) {
				mesh.skeleton.getBoneByName(name)?.traverse((b) => {
					drop.add(`${b.name}.quaternion`);
					drop.add(`${b.name}.position`);
				});
			}
			clips = {
				idle: filterClip(template.clips.idle, drop)!,
				talk: filterClip(template.clips.talk, drop),
				idleTalk: filterClip(template.clips.idleTalk, drop)
			};
			this.applySitPose();
		}
		const play = (key: 'idle' | 'walk' | 'talk' | 'air', clip?: AnimationClip) => {
			if (!clip || clip.duration <= 0) return;
			const action = this.mixer.clipAction(clip);
			action.play();
			action.setEffectiveWeight(key === 'idle' ? 1 : 0);
			action.time = Math.random() * clip.duration;
			this.actions[key] = action;
		};
		play('idle', clips.idle);
		play('walk', clips.walk);
		play('talk', clips.idleTalk ?? clips.talk);
		if (clips.walk && !sitting) {
			const fps = 24;
			const air = AnimationUtils.subclip(clips.walk, `${template.model}-air`, 8, 11, fps);
			play('air', air);
		}
	}

	/** Fold the legs at hip and knee and lower the hips onto a seat. */
	private applySitPose() {
		const mesh = this.mesh;
		mesh.position.set(0, 0, 0);
		mesh.quaternion.identity();
		mesh.updateMatrixWorld(true);
		const legs = findLegs(mesh);
		const axis = new Vector3(1, 0, 0);
		for (const { thigh, shin } of legs) {
			rotWorld(thigh, axis, -Math.PI / 2);
			rotWorld(shin, axis, Math.PI / 2);
		}
		const root = mesh.skeleton.bones[0];
		// the shin's offset from the thigh is the thigh length: sitting drops the hips by it
		const thighLength = legs.length ? legs[0].shin.position.length() : 0.45;
		root.position.y -= Math.max(0.3, thighLength * 0.95);
		root.position.z += 0.05;
	}

	get canWalk(): boolean {
		return !!this.actions.walk;
	}

	setState(state: 'idle' | 'walk' | 'talk' | 'air') {
		for (const key of Object.keys(this.targets) as (keyof typeof this.targets)[]) this.targets[key] = key === state ? 1 : 0;
		if (!this.actions[state]) this.targets.idle = 1;
		this.material.uniforms.uIsTalking.value = state === 'talk' ? 1 : 0;
	}

	update(dt: number, walkSpeed = 1) {
		const k = 1 - Math.exp(-dt * 8);
		let total = 0;
		for (const key of Object.keys(this.weights) as (keyof typeof this.weights)[]) {
			const action = this.actions[key];
			if (!action) continue;
			this.weights[key] += (this.targets[key] - this.weights[key]) * k;
			total += this.weights[key];
		}
		for (const key of Object.keys(this.weights) as (keyof typeof this.weights)[]) {
			const action = this.actions[key];
			if (!action) continue;
			action.setEffectiveWeight(total > 0 ? this.weights[key] / total : key === 'idle' ? 1 : 0);
		}
		if (this.actions.walk) this.actions.walk.timeScale = walkSpeed;
		if (this.actions.air) this.actions.air.timeScale = 0.15;
		this.mixer.update(dt);
	}

	dispose() {
		this.mixer.stopAllAction();
		this.material.dispose();
	}
}
