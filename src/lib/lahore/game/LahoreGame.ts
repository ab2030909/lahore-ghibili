import {
	BoxGeometry,
	BufferAttribute,
	BufferGeometry,
	DirectionalLight,
	Group,
	Mesh,
	Object3D,
	PCFShadowMap,
	PerspectiveCamera,
	Scene,
	SRGBColorSpace,
	TextureLoader,
	Vector3,
	WebGLRenderer,
	type Data3DTexture,
	type ShaderMaterial,
	type Texture
} from 'three';
import { initKtx2Loader, loadKtx2Texture } from '$lib/engine/loadTextures';
import { texturePaths } from '$lib/engine/textures';
import { AudioManager, type SoundName } from '../audio/audio';
import { NpcSystem, type NpcAgent } from '../characters/npcSystem';
import { NpcLibrary } from '../characters/rigs';
import { PlayerAvatar } from '../characters/player';
import { orient, RaviBoat, SohrabCycle } from '../characters/vehicles';
import { CAMERA, DISCOVER_DISTANCE, PLANET_RADIUS, SUN, WATER_LEVEL } from '../core/config';
import { clamp, easeInOutCubic, fit, lerp, lerpCoefFPS, mulberry32 } from '../core/math';
import { dirToTrail, northEast, PlanetFrame, rotateAroundAxis, slerpDir, trailPoint } from '../core/planet';
import { CharacterPhysics } from '../controls/characterPhysics';
import { FollowCamera } from '../controls/followCamera';
import { InputController } from '../controls/input';
import { collection } from '../heritage/collection.svelte';
import { LANDMARK_BY_ID, type LandmarkId } from '../heritage/landmarks';
import { createLahoreComposer, type LahoreComposer } from '../render/composer';
import { createDecorAtlas } from '../render/decorAtlas';
import { getPaletteTexture, paletteUV, type PaletteKey } from '../render/palette';
import { createToonMaterial } from '../render/toonMaterial';
import type { Anchor, ShopSpot } from '../world/context';
import { createLahoreWorld, type LahoreWorld } from '../world/createLahoreWorld';
import { groundHeight } from '../world/ground';
import { CIRCUMFERENCE, SPAWN } from '../world/layout';
import { CricketMatch } from './cricket';
import { WagahCeremony } from './wagah';
import { dialogueFor, type Dialogue } from './dialogues';

export type GameState = 'loading' | 'intro' | 'transition' | 'play';

export type Prompt = { kind: 'talk' | 'discover' | 'postcard' | 'shop' | 'bike' | 'boat'; label: string; sub?: string; key?: string };

/** How the dakiya is getting around. */
export type RideMode = 'walk' | 'bike' | 'boat';

/** Ravi boat handling (units per second, radians per second). */
const BOAT = { speed: 3.4, reverse: 1.2, accel: 1.4, turn: 0.95, hull: 1.55, probe: 0.55, board: 3.8 };
/** Shallowest water the hull can float in (height relative to PLANET_RADIUS). */
const BOAT_MIN_DEPTH = WATER_LEVEL - PLANET_RADIUS - 0.3;

function signedAngle(from: Vector3, to: Vector3, axis: Vector3): number {
	const cross = new Vector3().crossVectors(from, to);
	return Math.atan2(cross.dot(axis), from.dot(to));
}

export type DialogueView = {
	name: string;
	line: { ur: string; en: string };
	index: number;
	total: number;
	x: number;
	y: number;
	onScreen: boolean;
};

export type ShopView = { label: string; urdu: string; info: string };

export type GameCallbacks = {
	onLoading?: (progress: number, label: string) => void;
	onState?: (state: GameState) => void;
	onPrompt?: (prompt: Prompt | null) => void;
	onDialogue?: (view: DialogueView | null) => void;
	onDiscover?: (id: LandmarkId) => void;
	onShop?: (shop: ShopView | null) => void;
	onArea?: (area: { name: string; urdu: string }) => void;
	onToast?: (text: string) => void;
	onCollection?: () => void;
	onEscape?: () => void;
	onMemory?: (title: string) => void;
	onMuted?: (muted: boolean) => void;
	onStats?: (stats: { fps: number; triangles: number; npcs: number }) => void;
	onRide?: (mode: RideMode) => void;
};

const AREAS: { name: string; urdu: string; test: (w: number, t: number) => boolean }[] = [
	{ name: 'Wagah Border', urdu: 'واہگہ بارڈر', test: (w, t) => w > 143 && w < 237 && t > -54 && t < -14 },
	{ name: 'Greater Iqbal Park', urdu: 'گریٹر اقبال پارک', test: (_w, t) => t > 56 },
	{ name: 'River Ravi', urdu: 'دریائے راوی', test: (_w, t) => t < -50 },
	{ name: 'Lahore Junction', urdu: 'لاہور ریلوے اسٹیشن', test: (w, t) => w > -50 && w < 6 && t > 20 && t < 55 },
	{
		name: 'Gaddafi Stadium',
		urdu: 'قذافی اسٹیڈیم',
		test: (w, t) => {
			const s = w > 180 ? w - CIRCUMFERENCE : w;
			return s > -63 && s < -17 && t < -10 && t > -51;
		}
	},
	{ name: 'Delhi Gate Chowk', urdu: 'دہلی دروازہ', test: (w) => w < -3 || w > 345 },
	{ name: 'Shahi Guzargah', urdu: 'شاہی گزرگاہ', test: (w) => w >= -3 && w < 36 },
	{ name: 'Wazir Khan Chowk', urdu: 'چوک وزیر خان', test: (w) => w >= 36 && w < 94 },
	{ name: 'Kashmiri Bazaar', urdu: 'کشمیری بازار', test: (w) => w >= 94 && w < 150 },
	{ name: 'Lahore Fort', urdu: 'شاہی قلعہ', test: (w) => w >= 150 && w < 202 },
	{ name: 'Hazuri Bagh', urdu: 'حضوری باغ', test: (w) => w >= 202 && w < 228 },
	{ name: 'Badshahi Mosque', urdu: 'بادشاہی مسجد', test: (w) => w >= 228 && w < 276 },
	{ name: 'Fort Road Food Street', urdu: 'فوڈ اسٹریٹ', test: (w) => w >= 276 && w <= 345 }
];

const KITE_KEYS: PaletteKey[] = ['gulmohar', 'tileYellow', 'tileTurquoise', 'fabricMagenta', 'paintGreen', 'paintBlue', 'fabricSaffron'];

function painted(g: BufferGeometry, key: PaletteKey, id: number): BufferGeometry {
	const uv = g.getAttribute('uv') as BufferAttribute;
	const [u, v] = paletteUV(key);
	for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
	g.setAttribute('surfaceId', new BufferAttribute(new Float32Array(uv.count).fill(id), 1));
	return g;
}

export class LahoreGame {
	private host: HTMLElement;
	private cb: GameCallbacks;
	private renderer: WebGLRenderer;
	private scene = new Scene();
	private camera: PerspectiveCamera;
	private composer: LahoreComposer | null = null;
	private sun = new DirectionalLight(0xffffff, 3);
	private audio = new AudioManager();
	private input: InputController;
	private world: LahoreWorld | null = null;
	private physics: CharacterPhysics | null = null;
	private follow: FollowCamera | null = null;
	private player = new PlayerAvatar();
	private npcs: NpcSystem | null = null;
	private materials: ShaderMaterial[] = [];
	private markers: { anchor: Anchor; group: Group; card: Object3D }[] = [];
	private kites: { mesh: Mesh; anchor: Vector3; phase: number; tail: Mesh }[] = [];
	private birds: { mesh: Mesh; center: Vector3; radius: number; speed: number; phase: number; height: number }[] = [];
	private state: GameState = 'loading';
	private frame = 0;
	private lastTime = performance.now();
	private elapsed = 0;
	private resizeObserver: ResizeObserver;
	private introAngle = 0.55;
	private transition = { t: 0, from: { pos: new Vector3(), target: new Vector3(), up: new Vector3() } };
	private paused = false;
	private talkingTo: NpcAgent | null = null;
	private dialogue: { data: Dialogue; index: number } | null = null;
	private prompt: Prompt | null = null;
	private promptTarget: { kind: Prompt['kind']; anchor?: Anchor; npc?: NpcAgent; shop?: ShopSpot; shore?: Vector3 } | null = null;
	/** Last position on dry land: walking or cycling into the Ravi puts you back here. */
	private lastDry = new Vector3();
	private wetTimer = 0;
	private cricket: CricketMatch | null = null;
	private wagah: WagahCeremony | null = null;
	private cycle: SohrabCycle | null = null;
	private boat: RaviBoat | null = null;
	private ride: RideMode = 'walk';
	private bike = { forward: new Vector3(0, 0, 1), last: new Vector3(), yawRate: 0 };
	private boatState = { position: new Vector3(), forward: new Vector3(0, 0, 1), speed: 0, yawRate: 0 };
	private shopOpen: ShopSpot | null = null;
	private area = '';
	private jumpTimer: ReturnType<typeof setTimeout> | null = null;
	private fps = { frames: 0, time: 0 };
	private disposed = false;
	// adaptive resolution: render at the sharpest pixel ratio that still holds ~30 fps
	private readonly maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
	private readonly minPixelRatio = Math.min(this.maxPixelRatio, 1);
	private pixelRatio = this.maxPixelRatio;
	private drs = { time: 0, frames: 0 };
	private shadowTick = 0;

	constructor(host: HTMLElement, callbacks: GameCallbacks) {
		this.host = host;
		this.cb = callbacks;
		this.renderer = new WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
		this.renderer.setPixelRatio(this.pixelRatio);
		this.renderer.setSize(host.clientWidth, host.clientHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = PCFShadowMap;
		// shadows are refreshed on a cadence (updateShadow), not every frame: the sun barely
		// moves between frames, so re-rendering the whole shadow depth pass each frame is waste.
		this.renderer.shadowMap.autoUpdate = false;
		this.renderer.autoClear = false;
		this.renderer.setClearColor(0x000000, 1);
		host.appendChild(this.renderer.domElement);
		this.renderer.domElement.style.touchAction = 'none';

		this.camera = new PerspectiveCamera(CAMERA.fov, host.clientWidth / Math.max(1, host.clientHeight), CAMERA.near, CAMERA.far);
		this.scene.add(this.camera);

		this.sun.castShadow = true;
		this.sun.shadow.mapSize.set(SUN.shadowMapSize, SUN.shadowMapSize);
		const s = this.sun.shadow.camera;
		s.left = -SUN.shadowExtent;
		s.right = SUN.shadowExtent;
		s.top = SUN.shadowExtent;
		s.bottom = -SUN.shadowExtent;
		s.near = 1;
		s.far = 260;
		this.sun.shadow.bias = -0.0006;
		this.sun.shadow.normalBias = 0.04;
		this.sun.shadow.radius = 2;
		this.scene.add(this.sun, this.sun.target);

		this.input = new InputController(this.renderer.domElement, {
			onJump: () => this.requestJump(),
			onInteract: () => this.interact(),
			onCollection: () => this.state === 'play' && this.cb.onCollection?.(),
			onEscape: () => this.escape(),
			onMute: () => this.toggleMute(),
			onBike: () => this.toggleBike(),
			onBoat: () => this.callBoat(),
			onBell: () => this.ringBell(),
			onDrag: (dx, dy) => this.follow?.rotate(dx, dy),
			onDragState: (d) => {
				if (this.follow) this.follow.dragging = d;
			},
			onAnyInput: () => void this.audio.unlock()
		});

		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(host);
	}

	// ------------------------------------------------------------------------------------
	// loading

	async load() {
		const progress = (p: number, label: string) => this.cb.onLoading?.(p, label);
		progress(0.02, 'Packing your bags');
		initKtx2Loader(this.renderer);
		const [lut, noiseTerrain, waterNoise, cloudNoise, eye, mouth, decor, introBg] = await Promise.all([
			loadKtx2Texture(texturePaths.lut),
			loadKtx2Texture(texturePaths.noiseTerrain),
			loadKtx2Texture(texturePaths.waterNoise),
			loadKtx2Texture(texturePaths.cloudNoise512),
			loadKtx2Texture(texturePaths.eye),
			loadKtx2Texture(texturePaths.mouth),
			createDecorAtlas(),
			new TextureLoader().loadAsync('/image.png').then((t) => { t.colorSpace = SRGBColorSpace; return t; }).catch(() => null)
		]);
		progress(0.15, 'Painting the tiles');
		const palette = getPaletteTexture();

		this.composer = createLahoreComposer(this.renderer, lut as Data3DTexture, cloudNoise, introBg);
		this.composer.setSize(this.host.clientWidth, this.host.clientHeight);

		const world = await createLahoreWorld({ palette, decor, noiseTerrain, waterNoise, cloudNoise }, (label) => progress(0.2 + Math.random() * 0.02, label));
		if (this.disposed) return;
		this.world = world;
		this.scene.add(world.group);
		this.materials.push(...world.materials.all);
		progress(0.45, 'Waking up the city');

		// characters
		const library = new NpcLibrary(eye, mouth, noiseTerrain);
		await library.loadAtlas();
		const accessory = createToonMaterial({ colors: palette, noise: noiseTerrain, character: true, doubleSide: false });
		this.materials.push(accessory);
		await this.player.load(library, accessory);
		this.scene.add(this.player.mesh);
		this.materials.push(this.player.rig.material);

		const spawnFrame = PlanetFrame.trail(SPAWN.w, SPAWN.t, SPAWN.facing);
		const spawn = trailPoint(SPAWN.w, SPAWN.t, 0.05);
		this.physics = new CharacterPhysics(world.bvh, 1.94, {
			onJump: () => {
				this.audio.play('jump');
				this.player.onJump();
			},
			onLand: (fall) => {
				this.audio.play('land');
				this.player.onLand(fall);
			}
		});
		this.physics.setSpawn(spawn, spawnFrame.z);
		this.lastDry.copy(spawn);
		this.follow = new FollowCamera(this.camera, world.bvh, this.physics);

		this.npcs = new NpcSystem(library);
		await this.npcs.spawn(world.ctx, (done, total) => progress(0.5 + (done / total) * 0.42, `Lahoris arriving ${done}/${total}`));
		this.scene.add(this.npcs.group);

		this.buildMarkers(palette, noiseTerrain);
		this.buildVehicles(palette, noiseTerrain);
		const cricketMaterial = createToonMaterial({ colors: palette, noise: noiseTerrain, name: 'Cricket' });
		this.materials.push(cricketMaterial);
		this.cricket = new CricketMatch(cricketMaterial);
		if (this.npcs) this.cricket.bind(this.npcs.agents);
		this.scene.add(this.cricket.group);
		this.wagah = new WagahCeremony(palette, noiseTerrain);
		this.materials.push(...this.wagah.materials);
		if (this.npcs) this.wagah.bind(this.npcs.agents);
		this.scene.add(this.wagah.group);
		this.buildKites(palette, noiseTerrain);
		this.buildBirds(palette, noiseTerrain);

		progress(1, 'Chalo, Lahore chalte hain!');
		// warm up shaders with one frame
		this.updateIntroCamera(0);
		this.renderer.compile(this.scene, this.camera);
		this.setState('intro');
		this.lastTime = performance.now();
		this.loop();
	}

	private buildMarkers(palette: Texture, noise: Texture) {
		if (!this.world) return;
		const material = createToonMaterial({ colors: palette, noise, name: 'Markers' });
		this.materials.push(material);
		for (const anchor of this.world.ctx.anchors) {
			const group = new Group();
			const card = new Group();
			const body = new Mesh(painted(new BoxGeometry(1.0, 0.66, 0.04), 'paintCream', 0.91), material);
			const stamp = new Mesh(painted(new BoxGeometry(0.22, 0.26, 0.05), 'postRed', 0.92), material);
			stamp.position.set(0.3, 0.12, 0.01);
			const line1 = new Mesh(painted(new BoxGeometry(0.4, 0.04, 0.05), 'woodDark', 0.93), material);
			line1.position.set(-0.18, -0.02, 0.01);
			const line2 = line1.clone();
			line2.position.set(-0.18, -0.14, 0.01);
			const ring = new Mesh(painted(new BoxGeometry(0.06, 0.06, 0.06), 'bulb', 0.94), material);
			ring.position.set(0, -0.5, 0);
			card.add(body, stamp, line1, line2);
			card.position.y = 2.4;
			card.traverse((o) => {
				if ((o as Mesh).isMesh) (o as Mesh).castShadow = true;
			});
			group.add(card, ring);
			const up = anchor.position.clone().normalize();
			group.position.copy(anchor.position);
			group.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), up);
			this.scene.add(group);
			this.markers.push({ anchor, group, card });
		}
	}

	private buildVehicles(palette: Texture, noise: Texture) {
		if (!this.world) return;
		const ctx = this.world.ctx;
		void ctx;
		// both are called on demand (C / K) and vanish when you get off
		this.cycle = new SohrabCycle(palette, noise);
		this.materials.push(...(this.cycle.materials as ShaderMaterial[]));
		this.cycle.group.visible = false;
		this.scene.add(this.cycle.group);

		this.boat = new RaviBoat(palette, noise);
		this.materials.push(this.boat.material as ShaderMaterial);
		this.boat.group.visible = false;
		this.scene.add(this.boat.group);
	}

	private buildKites(palette: Texture, noise: Texture) {
		if (!this.world) return;
		const material = createToonMaterial({ colors: palette, noise, name: 'Kites' });
		this.materials.push(material);
		const rng = mulberry32(99);
		for (const kite of this.world.ctx.kites) {
			const g = new BufferGeometry();
			// diamond: (top, left, right) + (left, bottom, right)
			const verts = new Float32Array([0, 0.55, 0, -0.42, 0, 0, 0.42, 0, 0, -0.42, 0, 0, 0, -0.6, 0, 0.42, 0, 0]);
			g.setAttribute('position', new BufferAttribute(verts, 3));
			g.setAttribute('normal', new BufferAttribute(new Float32Array(18).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
			g.setAttribute('uv', new BufferAttribute(new Float32Array(12), 2));
			const key = KITE_KEYS[Math.floor(rng() * KITE_KEYS.length)];
			const mesh = new Mesh(painted(g, key, 0.5 + rng() * 0.4), material);
			const tailGeo = painted(new BoxGeometry(0.03, 1.2, 0.03), 'white', 0.95);
			tailGeo.translate(0, -1.2, 0);
			const tail = new Mesh(tailGeo, material);
			mesh.add(tail);
			mesh.position.copy(kite.anchor);
			this.scene.add(mesh);
			this.kites.push({ mesh, anchor: kite.anchor, phase: kite.phase, tail });
		}
	}

	private buildBirds(palette: Texture, noise: Texture) {
		const material = createToonMaterial({ colors: palette, noise, name: 'Pigeons' });
		this.materials.push(material);
		const centers: [number, number, number][] = [
			[72, -18, 19],
			[251, 27, 26],
			[176, 26, 18],
			[0, 0, 13],
			[118, 10, 14]
		];
		const rng = mulberry32(5);
		for (const [w, t, h] of centers) {
			for (let i = 0; i < 9; i++) {
				const g = new BufferGeometry();
				const v = new Float32Array([0, 0, 0.12, -0.32, 0.06, -0.05, 0, 0, -0.1, 0, 0, 0.12, 0, 0, -0.1, 0.32, 0.06, -0.05]);
				g.setAttribute('position', new BufferAttribute(v, 3));
				g.setAttribute('normal', new BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
				g.setAttribute('uv', new BufferAttribute(new Float32Array(12), 2));
				const mesh = new Mesh(painted(g, rng() < 0.3 ? 'white' : 'charcoal', 0.3 + rng() * 0.2), material);
				this.scene.add(mesh);
				this.birds.push({ mesh, center: trailPoint(w, t, 0), radius: 4 + rng() * 6, speed: 0.4 + rng() * 0.35, phase: rng() * Math.PI * 2, height: h + rng() * 4 });
			}
		}
	}

	// ------------------------------------------------------------------------------------
	// state

	private setState(state: GameState) {
		this.state = state;
		this.cb.onState?.(state);
	}

	/** Called by the BEGIN button. */
	async begin() {
		if (this.state !== 'intro' || !this.follow || !this.physics) return;
		await this.audio.unlock();
		this.audio.play('button-out');
		this.audio.play('whoosh');
		this.audio.play('zoom-in');
		this.audio.startBeds();
		this.transition.t = 0;
		this.transition.from.pos.copy(this.camera.position);
		this.transition.from.target.set(0, 0, 0);
		this.transition.from.up.copy(this.camera.up);
		this.follow.reset();
		this.setState('transition');
	}

	setPaused(paused: boolean) {
		this.paused = paused;
		this.input.enabled = !paused;
		if (paused) this.input.clear();
	}

	toggleMute() {
		this.audio.setMuted(!this.audio.muted);
		this.cb.onMuted?.(this.audio.muted);
	}

	get muted() {
		return this.audio.muted;
	}

	playUi(name: SoundName) {
		void this.audio.unlock().then(() => this.audio.play(name));
	}

	private escape() {
		if (this.dialogue) this.endDialogue();
		else if (this.shopOpen) this.closeShop();
		else this.cb.onEscape?.();
	}

	private requestJump() {
		if (this.state !== 'play' || this.paused || !this.physics || this.ride === 'boat') return;
		this.physics.requestJump();
		if (this.jumpTimer) clearTimeout(this.jumpTimer);
		this.jumpTimer = setTimeout(() => {
			if (this.physics) this.physics.jumpRequested = false;
		}, 160);
	}

	// ------------------------------------------------------------------------------------
	// interactions

	private interact() {
		if (this.state !== 'play' || this.paused) return;
		if (this.dialogue) {
			this.advanceDialogue();
			return;
		}
		if (this.shopOpen) {
			this.closeShop();
			return;
		}
		const target = this.promptTarget;
		if (!target) return;
		if (target.kind === 'talk' && target.npc) this.startDialogue(target.npc);
		else if ((target.kind === 'discover' || target.kind === 'postcard') && target.anchor) {
			this.audio.play('open-box2');
			this.audio.play('paper');
			if (target.kind === 'discover') this.audio.play('quest-complete');
			collection.discover(target.anchor.id);
			this.cb.onDiscover?.(target.anchor.id);
		} else if (target.kind === 'shop' && target.shop) {
			this.shopOpen = target.shop;
			this.audio.play('open-box1');
			this.cb.onShop?.({ label: target.shop.label, urdu: target.shop.urdu, info: target.shop.info });
		} else if (target.kind === 'boat') {
			if (this.ride === 'boat' && target.shore) this.leaveBoat(target.shore);
			else if (this.ride !== 'boat') this.callBoat();
		}
	}

	private closeShop() {
		this.shopOpen = null;
		this.audio.play('click3');
		this.cb.onShop?.(null);
	}

	private startDialogue(npc: NpcAgent) {
		if (!this.npcs) return;
		const data = dialogueFor(npc.dialogue);
		this.talkingTo = npc;
		this.dialogue = { data, index: 0 };
		this.npcs.startTalk(npc);
		this.player.talking = true;
		this.audio.play('bubble-starts');
		this.audio.startVoice(npc.voice);
		if (this.follow) this.follow.focus = 1;
		if (data.memory && !collection.memories.includes(`${data.memory.landmark}:${data.memory.title}`)) {
			collection.remember(`${data.memory.landmark}:${data.memory.title}`);
			this.cb.onMemory?.(data.memory.title);
		}
	}

	private advanceDialogue() {
		if (!this.dialogue) return;
		this.dialogue.index += 1;
		this.audio.play('click');
		if (this.dialogue.index >= this.dialogue.data.lines.length) this.endDialogue(true);
	}

	/** `completed`: the player read every line (a cook then hands over the food card). */
	private endDialogue(completed = false) {
		const card = completed ? this.dialogue?.data.card : undefined;
		if (this.talkingTo && this.npcs) this.npcs.stopTalk(this.talkingTo);
		this.talkingTo = null;
		this.dialogue = null;
		this.player.talking = false;
		this.audio.stopVoice();
		this.audio.play('bubble-ends');
		if (this.follow) this.follow.focus = 0;
		this.cb.onDialogue?.(null);
		if (card && !collection.isDiscovered(card)) {
			this.audio.play('open-box2');
			this.audio.play('paper');
			this.audio.play('quest-complete');
			collection.discover(card);
			this.cb.onDiscover?.(card);
		}
	}

	private updateInteractions() {
		if (!this.physics || !this.npcs || !this.world) return;
		const pos = this.physics.position;
		let next: typeof this.promptTarget = null;
		let prompt: Prompt | null = null;

		if (this.ride === 'boat') {
			// in the boat only the jetties matter
			const shore = Math.abs(this.boatState.speed) < 1.6 ? this.findShore() : null;
			if (shore) {
				next = { kind: 'boat', shore };
				prompt = { kind: 'boat', label: 'Step ashore', sub: 'کنارے اتریں', key: 'K' };
			}
		} else if (!this.dialogue && !this.shopOpen) {
			// at the river's edge: offer a boat
			const ahead = pos.clone().addScaledVector(this.physics.forward, 2.2);
			if (this.wetTimer > 0 || this.isWet(ahead.normalize().multiplyScalar(WATER_LEVEL))) {
				next = { kind: 'boat' };
				prompt = { kind: 'boat', label: 'Call a boat', sub: 'کشتی', key: 'K' };
			}
			const npc = next ? null : this.npcs.nearestTalkable(pos, this.physics.forward);
			if (npc) {
				const d = dialogueFor(npc.dialogue);
				next = { kind: 'talk', npc };
				prompt = { kind: 'talk', label: `Talk${npc.name ? ` to ${npc.name}` : ''}`, sub: d.title ? undefined : 'Baat karein' };
			}
			if (!next) {
				let best: Anchor | null = null;
				let bestD = Infinity;
				for (const a of this.world.ctx.anchors) {
					const d = a.position.distanceTo(pos);
					if (d < Math.min(a.radius, DISCOVER_DISTANCE) && d < bestD) {
						best = a;
						bestD = d;
					}
				}
				if (best) {
					const l = LANDMARK_BY_ID[best.id];
					const known = collection.isDiscovered(best.id);
					next = { kind: known ? 'postcard' : 'discover', anchor: best };
					prompt = { kind: next.kind, label: known ? `View postcard · ${l.name}` : `Discover ${l.name}`, sub: l.urdu };
				}
			}
			if (!next) {
				for (const shop of this.world.ctx.shops) {
					if (shop.position.distanceTo(pos) < shop.radius) {
						next = { kind: 'shop', shop };
						prompt = { kind: 'shop', label: `Explore the ${shop.label.toLowerCase()}`, sub: shop.urdu };
						break;
					}
				}
			}
		}
		this.promptTarget = next;
		const changed = JSON.stringify(prompt) !== JSON.stringify(this.prompt);
		if (changed) {
			this.prompt = prompt;
			this.cb.onPrompt?.(prompt);
			if (prompt) this.audio.play('hover');
		}

		// dialogue bubble follows the speaker
		if (this.dialogue && this.talkingTo) {
			const npc = this.talkingTo;
			if (npc.position.distanceTo(pos) > 5) {
				this.endDialogue();
			} else {
				const head = npc.position.clone().addScaledVector(npc.position.clone().normalize(), npc.rig.template.height + 0.45);
				const p = head.project(this.camera);
				const line = this.dialogue.data.lines[this.dialogue.index];
				this.cb.onDialogue?.({
					name: npc.name ?? this.dialogue.data.title ?? '',
					line,
					index: this.dialogue.index,
					total: this.dialogue.data.lines.length,
					x: (p.x * 0.5 + 0.5) * this.host.clientWidth,
					y: (-p.y * 0.5 + 0.5) * this.host.clientHeight,
					onScreen: p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1
				});
			}
		}
		if (this.shopOpen && this.shopOpen.position.distanceTo(pos) > this.shopOpen.radius + 2) this.closeShop();

		// area names
		const { w, t } = dirToTrail(pos);
		const ww = ((w % CIRCUMFERENCE) + CIRCUMFERENCE) % CIRCUMFERENCE;
		const wSigned = ww > CIRCUMFERENCE - 30 ? ww - CIRCUMFERENCE : ww;
		const area = AREAS.find((a) => a.test(wSigned, t));
		if (area && area.name !== this.area) {
			this.area = area.name;
			this.cb.onArea?.({ name: area.name, urdu: area.urdu });
		}
	}

	// ------------------------------------------------------------------------------------
	// Sohrab cycle (C) and Ravi boat (K), both called on demand

	private setRide(mode: RideMode) {
		this.ride = mode;
		this.cb.onRide?.(mode);
	}

	private canAct(): boolean {
		return this.state === 'play' && !this.paused && !this.dialogue && !!this.physics && !!this.follow;
	}

	/** River water under this point, and the point is at or below the surface (jetty decks are dry). */
	private isWet(p: Vector3): boolean {
		return groundHeight(p.clone().normalize()) < WATER_LEVEL - PLANET_RADIUS - 0.02 && p.length() < WATER_LEVEL + 0.3;
	}

	private toggleBike() {
		if (!this.canAct()) return;
		if (this.ride === 'bike') this.dismountBike();
		else if (this.ride === 'walk') this.mountBike();
		else this.cb.onToast?.('No cycles on the Ravi. Step ashore first.');
	}

	private ringBell() {
		if (this.state === 'play' && !this.paused && this.ride === 'bike') this.audio.bell();
	}

	private mountBike() {
		if (!this.cycle || !this.physics || !this.follow) return;
		const p = this.physics;
		this.bike.forward.copy(p.forward);
		orient(this.cycle.group, p.position, p.up, p.forward);
		this.cycle.group.visible = true;
		p.forceScale = 1.9;
		p.turnScale = 0.55;
		p.jumpScale = 0.6;
		this.follow.distanceScale = 1.25;
		this.bike.last.copy(p.position);
		this.bike.yawRate = 0;
		this.player.mount({ vehicle: this.cycle.body, hands: this.cycle.grips, feet: this.cycle.pedals, seat: this.cycle.seat, kneeForward: 0.6 });
		this.setRide('bike');
		this.audio.play('clothes');
		this.audio.bell();
		this.cb.onToast?.('Sohrab cycle aa gayi! C to put it away');
	}

	private dismountBike() {
		if (!this.physics || !this.follow || !this.cycle) return;
		const p = this.physics;
		this.player.mount(null);
		p.forceScale = 1;
		p.turnScale = 1;
		p.jumpScale = 1;
		this.follow.distanceScale = 1;
		this.cycle.group.visible = false;
		this.setRide('walk');
		this.audio.play('clothes');
	}

	private updateBike(dt: number) {
		if (!this.cycle || !this.physics || this.ride !== 'bike') return;
		const p = this.physics;
		const distance = Math.min(1, this.bike.last.distanceTo(p.position));
		this.bike.last.copy(p.position);
		const yaw = dt > 0 ? signedAngle(this.bike.forward, p.forward, p.up) / dt : 0;
		this.bike.yawRate = lerp(this.bike.yawRate, clamp(yaw, -4, 4), 1 - Math.exp(-dt * 8));
		this.bike.forward.copy(p.forward);
		orient(this.cycle.group, p.position, p.up, p.forward);
		this.cycle.animate(dt, p.airborne ? distance * 0.5 : distance, this.bike.yawRate, true);
	}

	/** On foot or on the cycle the Ravi is a wall: step back onto the last dry spot. */
	private keepOutOfWater(dt: number) {
		if (!this.physics) return;
		this.wetTimer = Math.max(0, this.wetTimer - dt);
		const p = this.physics;
		if (this.isWet(p.position)) {
			p.snap(this.lastDry, p.forward);
			if (this.wetTimer <= 0) this.cb.onToast?.('You cannot swim. Press K to call a boat');
			this.wetTimer = 3;
		} else if (!p.airborne) this.lastDry.copy(p.position);
	}

	private placeBoat() {
		if (!this.boat) return;
		const s = this.boatState;
		const up = s.position.clone().normalize();
		orient(this.boat.group, s.position, up, s.forward);
		this.boat.group.updateMatrixWorld(true);
	}

	/** Would the hull at `center` (bow or stern leading) touch the bank, a jetty or a moored boat? */
	private boatBlocked(center: Vector3, forward: Vector3, direction: number): boolean {
		if (!this.world) return true;
		for (const reach of [BOAT.hull * direction, BOAT.hull * 0.4 * direction]) {
			const tip = center.clone().addScaledVector(forward, reach).normalize();
			if (groundHeight(tip) > BOAT_MIN_DEPTH) return true;
			const probe = tip.multiplyScalar(WATER_LEVEL + 0.25);
			const hit = this.world.bvh.closestPointToPoint(probe, undefined, 0, BOAT.probe);
			if (hit && hit.distance < BOAT.probe) return true;
		}
		return false;
	}

	/** Tangent directions around `pos`, starting with `forward`. */
	private around(pos: Vector3, forward: Vector3, count = 12): Vector3[] {
		const up = pos.clone().normalize();
		const f = forward.clone().addScaledVector(up, -forward.dot(up)).normalize();
		const out: Vector3[] = [];
		for (let i = 0; i < count; i++) {
			const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
			out.push(rotateAroundAxis(f.clone(), up, (k * Math.PI * 2) / count));
		}
		return out;
	}

	/** Open water close to the player where a called boat can float. */
	private findWaterSpot(): { position: Vector3; forward: Vector3 } | null {
		if (!this.physics) return null;
		const pos = this.physics.position;
		for (const dist of [2.5, 3.5, 4.5, 6, 8]) {
			for (const dir of this.around(pos, this.physics.forward)) {
				const c = pos.clone().addScaledVector(dir, dist).normalize().multiplyScalar(WATER_LEVEL);
				if (groundHeight(c.clone().normalize()) > BOAT_MIN_DEPTH) continue;
				if (this.boatBlocked(c, dir, 1) || this.boatBlocked(c, dir, -1)) continue;
				return { position: c, forward: dir };
			}
		}
		return null;
	}

	/** Dry ground (or a jetty) near the boat to step onto. */
	private findShore(): Vector3 | null {
		if (!this.world) return null;
		const s = this.boatState;
		for (const d of this.world.ctx.docks) if (d.water.distanceTo(s.position) < BOAT.board) return d.shore.clone();
		for (const dist of [2, 3, 4]) {
			for (const dir of this.around(s.position, s.forward)) {
				const c = s.position.clone().addScaledVector(dir, dist).normalize();
				const h = groundHeight(c);
				if (h > WATER_LEVEL - PLANET_RADIUS + 0.05) return c.multiplyScalar(PLANET_RADIUS + h + 0.3);
			}
		}
		return null;
	}

	private callBoat() {
		if (!this.canAct() || !this.boat) return;
		if (this.ride === 'boat') {
			const shore = this.findShore();
			if (shore) this.leaveBoat(shore);
			else this.cb.onToast?.('No dry land here. Row to the bank, then press K');
			return;
		}
		const spot = this.findWaterSpot();
		if (!spot) {
			this.cb.onToast?.('Go to the edge of the Ravi, then press K for a boat');
			return;
		}
		if (this.ride === 'bike') this.dismountBike();
		this.boatState.position.copy(spot.position);
		this.boatState.forward.copy(spot.forward);
		this.boat.group.visible = true;
		this.placeBoat();
		this.boardBoat();
	}

	private boardBoat() {
		if (!this.boat || !this.physics || !this.follow) return;
		const s = this.boatState;
		s.speed = 0;
		s.yawRate = 0;
		this.physics.drive(s.position, s.forward, 0);
		this.follow.distanceScale = 1.45;
		this.player.mount({ vehicle: this.boat.hull, hands: this.boat.handles, feet: this.boat.feet, seat: this.boat.seat, kneeForward: 0.8 });
		this.setRide('boat');
		this.audio.play('land');
		this.cb.onToast?.('Kashti aa gayi! W/S row, A/D steer, K or E to step ashore');
	}

	private leaveBoat(shore: Vector3) {
		if (!this.physics || !this.follow || !this.boat) return;
		const s = this.boatState;
		s.speed = 0;
		this.player.mount(null);
		this.follow.distanceScale = 1;
		const up = shore.clone().normalize();
		const towards = shore.clone().sub(s.position);
		towards.addScaledVector(up, -towards.dot(up));
		this.physics.snap(shore, towards.lengthSq() > 1e-6 ? towards.normalize() : s.forward);
		this.lastDry.copy(shore);
		this.boat.group.visible = false;
		this.setRide('walk');
		this.audio.play('land');
	}

	private updateBoat(dt: number, move: { x: number; z: number }) {
		if (!this.boat || !this.physics || this.ride !== 'boat') return;
		const s = this.boatState;
		const up = s.position.clone().normalize();
		const throttle = clamp(-move.z, -1, 1);
		const target = throttle >= 0 ? throttle * BOAT.speed : throttle * BOAT.reverse;
		s.speed = lerp(s.speed, target, 1 - Math.exp(-dt * BOAT.accel));
		const steer = -clamp(move.x, -1, 1) * BOAT.turn * (0.35 + 0.65 * Math.min(1, Math.abs(s.speed) / 1.5));
		s.yawRate = lerp(s.yawRate, steer, 1 - Math.exp(-dt * 4));
		rotateAroundAxis(s.forward, up, s.yawRate * dt);
		const next = s.position.clone().addScaledVector(s.forward, s.speed * dt).normalize().multiplyScalar(WATER_LEVEL);
		if (Math.abs(s.speed) > 1e-3 && this.boatBlocked(next, s.forward, Math.sign(s.speed))) {
			s.speed *= -0.3;
		} else {
			s.position.copy(next);
		}
		const upNow = s.position.clone().normalize();
		s.forward.addScaledVector(upNow, -s.forward.dot(upNow)).normalize();
		this.physics.drive(s.position, s.forward, s.speed);
		this.placeBoat();
		this.boat.animate(dt, this.elapsed, Math.min(1, Math.abs(s.speed) / BOAT.speed + Math.abs(s.yawRate) * 0.4));
	}

	// ------------------------------------------------------------------------------------
	// per frame

	private updateIntroCamera(dt: number) {
		this.introAngle += dt * 0.05;
		const dist = 200;
		const elev = 0.32;
		const pos = new Vector3(Math.sin(this.introAngle) * Math.cos(elev), Math.sin(elev), Math.cos(this.introAngle) * Math.cos(elev)).multiplyScalar(dist);
		this.camera.position.copy(pos);
		this.camera.up.set(0, 1, 0);
		this.camera.lookAt(0, 0, 0);
		this.camera.updateMatrixWorld();
		// sun from the upper left of the view
		const right = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
		const up = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
		const back = pos.clone().normalize();
		const sunDir = back.multiplyScalar(0.7).addScaledVector(up, 0.6).addScaledVector(right, -0.45).normalize();
		this.sun.position.copy(sunDir).multiplyScalar(240);
		this.sun.target.position.set(0, 0, 0);
		this.sun.target.updateMatrixWorld();
		this.composer?.setSunDir(sunDir);
		this.composer?.setSkyUp(up);
	}

	private updateSun() {
		if (!this.physics || !this.follow) return;
		// original: the sun sits at Spherical(100, 0.2π, -0.25π) relative to the character frame
		const up = this.physics.up;
		const { north, east } = northEast(up);
		const offset = new Vector3()
			.addScaledVector(up, Math.cos(SUN.phi))
			.addScaledVector(north, Math.sin(SUN.phi) * Math.cos(SUN.theta))
			.addScaledVector(east, Math.sin(SUN.phi) * Math.sin(SUN.theta));
		const target = this.follow.target.clone();
		const view = this.follow.target.clone().sub(this.follow.position).addScaledVector(up, 0);
		view.addScaledVector(up, -view.dot(up)).normalize();
		target.addScaledVector(view, SUN.forwardOffset);
		this.sun.target.position.copy(target);
		this.sun.position.copy(target).addScaledVector(offset, SUN.distance);
		this.sun.target.updateMatrixWorld();
		this.sun.shadow.camera.up.copy(up);
		this.composer?.setSunDir(offset);
		this.composer?.setSkyUp(up);
	}

	private updateWorldLife(dt: number) {
		const t = this.elapsed;
		this.wagah?.update(dt);
		// the bat's "tok" carries across the ground
		if (this.cricket?.update(dt) && this.state === 'play' && this.physics && this.physics.position.distanceTo(this.cricket.centre) < 30) {
			this.audio.play('click', { volume: 0.5 });
		}
		for (const m of this.markers) {
			const known = collection.isDiscovered(m.anchor.id);
			m.card.position.y = 3.4 + Math.sin(t * 1.6 + m.anchor.position.x) * 0.15;
			m.card.rotation.y += dt * (known ? 0.4 : 1.1);
			m.card.scale.setScalar(known ? 0.45 : 0.7);
		}
		for (const k of this.kites) {
			const up = k.anchor.clone().normalize();
			const { north, east } = northEast(up);
			const sway = Math.sin(t * 0.7 + k.phase) * 1.4;
			const bob = Math.sin(t * 1.3 + k.phase * 2) * 0.6;
			k.mesh.position.copy(k.anchor).addScaledVector(east, sway).addScaledVector(up, bob).addScaledVector(north, Math.cos(t * 0.5 + k.phase) * 0.8);
			k.mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), up);
			k.mesh.rotateZ(Math.sin(t * 1.1 + k.phase) * 0.35);
			k.mesh.rotateX(0.5);
			k.tail.rotation.z = Math.sin(t * 3 + k.phase) * 0.4;
		}
		for (const b of this.birds) {
			const up = b.center.clone().normalize();
			const { north, east } = northEast(up);
			const a = t * b.speed + b.phase;
			const p = b.center.clone()
				.addScaledVector(east, Math.cos(a) * b.radius)
				.addScaledVector(north, Math.sin(a) * b.radius)
				.addScaledVector(up, b.height + Math.sin(a * 2.3) * 0.8);
			b.mesh.position.copy(p);
			const tangent = east.clone().multiplyScalar(-Math.sin(a)).addScaledVector(north, Math.cos(a));
			b.mesh.up.copy(up);
			b.mesh.lookAt(p.clone().add(tangent));
			b.mesh.scale.set(1, 1 + Math.sin(t * 14 + b.phase) * 0.9, 1);
		}
	}

	private updateAudio(dt: number) {
		if (!this.physics) return;
		const p = this.physics;
		const walking = this.ride === 'walk' && !p.airborne && p.speed > 0.4 && this.state === 'play' ? 1 : 0;
		const inWater = p.position.length() < WATER_LEVEL + 0.05;
		// oars splash with the water footsteps loop
		const rowing = this.ride === 'boat' ? clamp(Math.abs(this.boatState.speed) / BOAT.speed, 0, 1) * 0.8 : 0;
		this.audio.setLoop('footsteps', walking && !inWater ? 1 : 0);
		this.audio.setLoop('footsteps-water', walking && inWater ? 1 : rowing);
		const { w, t } = dirToTrail(p.position);
		const ww = ((w % CIRCUMFERENCE) + CIRCUMFERENCE) % CIRCUMFERENCE;
		const temple = (ww > 50 && ww < 94 && t < -2) || (ww > 226 && ww < 276 && t > 2) || (ww > 108 && ww < 128 && t > 3) ? 1 : 0;
		const forest = t > 48 ? 1 : 0;
		const beach = t < -46 ? 1 : 0;
		const city = !temple && !forest && !beach ? 1 : 0;
		this.audio.setLoop('ambiance-base', 1);
		this.audio.setLoop('ambiance-city', city);
		this.audio.setLoop('ambiance-temple', temple);
		this.audio.setLoop('ambiance-forest', forest);
		this.audio.setLoop('ambiance-beach', beach);
		this.audio.setLoop('bgmusic', this.dialogue ? 0.5 : 1);
		this.audio.update(dt);
	}

	private loop = () => {
		if (this.disposed) return;
		this.frame = requestAnimationFrame(this.loop);
		const now = performance.now();
		const dt = Math.min(0.1, (now - this.lastTime) / 1000);
		this.lastTime = now;
		this.elapsed += dt;
		for (const m of this.materials) m.uniforms.uTime.value = this.elapsed;
		if (this.world) {
			this.world.materials.water.uniforms.uTime.value = this.elapsed;
			this.world.materials.cables.uniforms.uTime.value = this.elapsed;
		}
		const post = this.composer?.material.uniforms;
		if (post) post.uTime.value = this.elapsed;

		if (this.state === 'intro') {
			this.updateIntroCamera(dt);
			if (post) post.uIntroMix.value = 1;
			this.player.update(dt, this.physics!, this.elapsed);
			this.npcs?.update(dt, this.physics!.position, this.camera.position, this.elapsed);
		} else if (this.state === 'transition' && this.follow && this.physics) {
			this.transition.t = Math.min(1, this.transition.t + dt / 3.4);
			const k = easeInOutCubic(this.transition.t);
			this.follow.update(dt);
			this.player.update(dt, this.physics, this.elapsed);
			const from = this.transition.from;
			const fromDir = from.pos.clone().normalize();
			const toDir = this.follow.position.clone().normalize();
			const dir = slerpDir(fromDir, toDir, k);
			const dist = lerp(from.pos.length(), this.follow.position.length(), Math.pow(k, 0.6));
			this.camera.position.copy(dir).multiplyScalar(dist);
			const target = new Vector3().lerpVectors(from.target, this.follow.target, Math.pow(k, 0.35));
			this.camera.up.copy(from.up).lerp(this.follow.up, k).normalize();
			this.camera.lookAt(target);
			this.camera.updateMatrixWorld();
			if (post) post.uIntroMix.value = 1 - fit(k, 0.25, 0.85, 0, 1);
			if (k > 0.6) this.updateSun();
			else this.updateIntroCamera(0);
			this.npcs?.update(dt, this.physics.position, this.camera.position, this.elapsed);
			if (this.transition.t >= 1) this.setState('play');
		} else if (this.state === 'play' && this.follow && this.physics && this.npcs) {
			const move = this.paused || this.dialogue ? { x: 0, z: 0 } : this.input.move;
			this.physics.sprinting = this.input.sprint;
			if (this.ride === 'boat') {
				this.updateBoat(dt, move);
			} else {
				const obstacles = this.npcs.obstacles(this.physics.position);
				this.physics.update(dt, move, this.follow.forward, obstacles);
				this.keepOutOfWater(dt);
			}
			this.updateBike(dt);
			this.follow.update(dt);
			this.follow.apply();
			this.player.update(dt, this.physics, this.elapsed);
			this.npcs.update(dt, this.physics.position, this.camera.position, this.elapsed);
			this.updateSun();
			this.updateInteractions();
			if (post) post.uIntroMix.value = 0;
		}
		this.updateWorldLife(dt);
		this.updateAudio(dt);

		// refresh the shadow map every other frame (the sun is effectively static frame-to-frame)
		this.renderer.shadowMap.needsUpdate = (this.shadowTick++ & 1) === 0;
		if (this.composer) this.composer.render(this.scene, this.camera);

		this.fps.frames++;
		this.fps.time += dt;
		if (this.fps.time > 1) {
			const fps = Math.round(this.fps.frames / this.fps.time);
			this.adaptResolution(fps);
			this.cb.onStats?.({ fps, triangles: this.world?.stats.triangles ?? 0, npcs: this.npcs?.agents.length ?? 0 });
			this.fps.frames = 0;
			this.fps.time = 0;
		}
	};

	/**
	 * Dynamic resolution: pick the sharpest device pixel ratio that still holds ~30 fps.
	 * It only drops below native when the GPU cannot keep up, and climbs back when it can.
	 */
	private adaptResolution(fps: number) {
		const target = 30;
		let pr = this.pixelRatio;
		if (fps < target - 3 && pr > this.minPixelRatio) pr = Math.max(this.minPixelRatio, +(pr - 0.15).toFixed(3));
		else if (fps > target + 12 && pr < this.maxPixelRatio) pr = Math.min(this.maxPixelRatio, +(pr + 0.1).toFixed(3));
		if (pr !== this.pixelRatio) {
			this.pixelRatio = pr;
			this.renderer.setPixelRatio(pr);
			this.resize();
		}
	}

	private resize() {
		const w = this.host.clientWidth;
		const h = Math.max(1, this.host.clientHeight);
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(w, h);
		this.composer?.setSize(w, h);
	}

	/** Debug helper: teleport along the trail (w, t). */
	teleport(w: number, t: number, facing = 270) {
		if (!this.physics) return;
		if (this.ride === 'boat') this.leaveBoat(this.physics.position.clone());
		const frame = PlanetFrame.trail(w, t, facing);
		this.physics.snap(trailPoint(w, t, 1.5), frame.z);
		this.lastDry.copy(this.physics.position);
		this.bike.last.copy(this.physics.position);
		this.follow?.reset();
	}

	dispose() {
		this.disposed = true;
		cancelAnimationFrame(this.frame);
		this.resizeObserver.disconnect();
		this.input.dispose();
		this.audio.dispose();
		this.npcs?.dispose();
		this.composer?.dispose();
		this.renderer.dispose();
		this.renderer.domElement.remove();
	}
}

export const _unused = { clamp, lerpCoefFPS, rotateAroundAxis, PLANET_RADIUS };
