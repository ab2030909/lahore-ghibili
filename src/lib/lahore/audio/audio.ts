/**
 * Web Audio port of the original Messenger audio controller: the same sound registry
 * (file + base volume), looping beds faded by gameplay (footsteps by walk weight,
 * ambiences by zone, background music at 0.1) and one-shots with a minimum replay gap.
 */

const ROOT = '/game/audio/';

type SoundDef = { url: string; volume: number; loop?: boolean; minGap?: number };

export const SOUNDS = {
	bgmusic: { url: 'music/bgmusic-highq.ogg', volume: 0.1, loop: true },
	'ambiance-base': { url: 'ambiances/base.ogg', volume: 0.5, loop: true },
	'ambiance-city': { url: 'ambiances/city.ogg', volume: 0.5, loop: true },
	'ambiance-temple': { url: 'ambiances/temple.ogg', volume: 0.5, loop: true },
	'ambiance-forest': { url: 'ambiances/forest.ogg', volume: 0.5, loop: true },
	'ambiance-beach': { url: 'ambiances/beach.ogg', volume: 0.5, loop: true },
	'ambiance-waterfalls': { url: 'ambiances/waterfalls.ogg', volume: 0.5, loop: true },
	footsteps: { url: 'character/footsteps4.ogg', volume: 0.2, loop: true },
	'footsteps-water': { url: 'character/footsteps-water.ogg', volume: 0.2, loop: true },
	jump: { url: 'character/jump-start.ogg', volume: 0.1 },
	land: { url: 'character/jump-land.ogg', volume: 0.125 },
	'bubble-starts': { url: 'character/bubble-starts.ogg', volume: 0.15 },
	'bubble-ends': { url: 'character/bubble-ends.ogg', volume: 0.1 },
	'emoji-starts1': { url: 'character/emoji-starts1.ogg', volume: 0.15 },
	clothes: { url: 'character/clothes.ogg', volume: 0.2 },
	'zoom-in': { url: 'camera/zoom-in-5.ogg', volume: 0.1 },
	'zoom-off': { url: 'camera/zoom-off-5.ogg', volume: 0.1 },
	whoosh: { url: 'camera/whoosh2.ogg', volume: 0.2 },
	title: { url: 'ui/title.ogg', volume: 0.25 },
	buttons: { url: 'ui/buttons2.ogg', volume: 0.05 },
	hover: { url: 'ui/hover2.ogg', volume: 0.2, minGap: 0.08 },
	click: { url: 'ui/click2.ogg', volume: 0.15 },
	click3: { url: 'ui/click3.ogg', volume: 0.05 },
	'open-box1': { url: 'ui/openbox1.ogg', volume: 0.1 },
	'open-box2': { url: 'ui/openbox2.ogg', volume: 0.15 },
	'open-checklist': { url: 'ui/openbox-checklist.ogg', volume: 0.6 },
	paper: { url: 'ui/paper1.ogg', volume: 0.25 },
	'quest-complete': { url: 'ui/quest-complete.ogg', volume: 0.25 },
	customize: { url: 'ui/customize.ogg', volume: 0.06 },
	'intro-letters': { url: 'intro/letters.ogg', volume: 0.1 },
	'button-turn': { url: 'intro/button-turn.ogg', volume: 0.1, minGap: 0.2 },
	'button-out': { url: 'intro/button-out.ogg', volume: 0.075 },
	rune1: { url: 'intro/rune1.ogg', volume: 0.1, minGap: 0.2 },
	rune2: { url: 'intro/rune2.ogg', volume: 0.1, minGap: 0.2 },
	rune3: { url: 'intro/rune3.ogg', volume: 0.1, minGap: 0.2 },
	rune4: { url: 'intro/rune4.ogg', volume: 0.1, minGap: 0.2 },
	male1: { url: 'dialogues/male1.ogg', volume: 0.35, loop: true },
	male2: { url: 'dialogues/male2.ogg', volume: 0.35, loop: true },
	male3: { url: 'dialogues/male3.ogg', volume: 0.35, loop: true },
	female1: { url: 'dialogues/female1.ogg', volume: 0.35, loop: true },
	female2: { url: 'dialogues/female2.ogg', volume: 0.35, loop: true },
	female3: { url: 'dialogues/female3.ogg', volume: 0.35, loop: true },
	musician: { url: 'music/musician.ogg', volume: 0.5, loop: true }
} as const satisfies Record<string, SoundDef>;

export type SoundName = keyof typeof SOUNDS;

const LOOP_BEDS: SoundName[] = [
	'bgmusic',
	'ambiance-base',
	'ambiance-city',
	'ambiance-temple',
	'ambiance-forest',
	'ambiance-beach',
	'ambiance-waterfalls',
	'footsteps',
	'footsteps-water'
];

type Loop = { source: AudioBufferSourceNode; gain: GainNode; level: number; target: number };

export class AudioManager {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private buffers = new Map<SoundName, AudioBuffer>();
	private loops = new Map<SoundName, Loop>();
	private lastPlayed = new Map<SoundName, number>();
	private voice: { name: SoundName; source: AudioBufferSourceNode; gain: GainNode } | null = null;
	private loading: Promise<void> | null = null;
	muted = false;
	started = false;

	/** Must be called from a user gesture (browser autoplay policy). */
	async unlock() {
		if (!this.ctx) {
			const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			this.ctx = new Ctor();
			this.master = this.ctx.createGain();
			this.master.gain.value = this.muted ? 0 : 1;
			this.master.connect(this.ctx.destination);
		}
		if (this.ctx.state === 'suspended') await this.ctx.resume();
		if (!this.loading) this.loading = this.loadAll();
		return this.loading;
	}

	private async loadAll() {
		const ctx = this.ctx!;
		const entries = Object.entries(SOUNDS) as [SoundName, SoundDef][];
		// load UI + intro sounds first, the rest in the background
		const priority = entries.filter(([n]) => !n.startsWith('ambiance') && n !== 'bgmusic');
		const rest = entries.filter(([n]) => n.startsWith('ambiance') || n === 'bgmusic');
		const load = async ([name, def]: [SoundName, SoundDef]) => {
			try {
				const res = await fetch(ROOT + def.url);
				if (!res.ok) return;
				const buf = await ctx.decodeAudioData(await res.arrayBuffer());
				this.buffers.set(name, buf);
				if (LOOP_BEDS.includes(name) && this.started) this.startLoop(name);
			} catch (error) {
				console.warn('Audio failed to load', name, error);
			}
		};
		await Promise.all(priority.map(load));
		void Promise.all(rest.map(load));
	}

	/** Start all loop beds silently (call once gameplay audio should run). */
	startBeds() {
		this.started = true;
		for (const name of LOOP_BEDS) this.startLoop(name);
	}

	private startLoop(name: SoundName) {
		if (!this.ctx || !this.master || this.loops.has(name)) return;
		const buffer = this.buffers.get(name);
		if (!buffer) return;
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		source.loop = true;
		const gain = this.ctx.createGain();
		gain.gain.value = 0;
		source.connect(gain).connect(this.master);
		source.start(0, Math.random() * buffer.duration * (name.startsWith('footsteps') ? 0 : 1));
		this.loops.set(name, { source, gain, level: 0, target: name === 'bgmusic' ? 1 : 0 });
	}

	/** Target level (0..1, multiplied by the registry volume) for a loop bed. */
	setLoop(name: SoundName, level: number) {
		const loop = this.loops.get(name);
		if (loop) loop.target = Math.max(0, level);
	}

	/** Per-frame smoothing of loop beds. */
	update(dt: number) {
		if (!this.ctx) return;
		const k = 1 - Math.exp(-dt * 6);
		for (const [name, loop] of this.loops) {
			loop.level += (loop.target - loop.level) * k;
			loop.gain.gain.value = loop.level * SOUNDS[name].volume;
		}
	}

	play(name: SoundName, opts: { volume?: number; rate?: number } = {}) {
		if (!this.ctx || !this.master) return;
		const buffer = this.buffers.get(name);
		if (!buffer) return;
		const def = SOUNDS[name] as SoundDef;
		const now = this.ctx.currentTime;
		if (def.minGap && now - (this.lastPlayed.get(name) ?? -10) < def.minGap) return;
		this.lastPlayed.set(name, now);
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		source.playbackRate.value = opts.rate ?? 1;
		const gain = this.ctx.createGain();
		gain.gain.value = def.volume * (opts.volume ?? 1);
		source.connect(gain).connect(this.master);
		source.start();
	}

	/** Gibberish voice loop while an NPC talks (original dialogue sounds). */
	startVoice(name: SoundName) {
		this.stopVoice();
		if (!this.ctx || !this.master) return;
		const buffer = this.buffers.get(name);
		if (!buffer) return;
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		source.loop = true;
		const gain = this.ctx.createGain();
		gain.gain.value = 0;
		gain.gain.linearRampToValueAtTime((SOUNDS[name] as SoundDef).volume, this.ctx.currentTime + 0.2);
		source.connect(gain).connect(this.master);
		source.start(0, Math.random() * buffer.duration);
		this.voice = { name, source, gain };
	}

	stopVoice() {
		if (!this.voice || !this.ctx) return;
		const { source, gain } = this.voice;
		gain.gain.cancelScheduledValues(this.ctx.currentTime);
		gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
		gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
		source.stop(this.ctx.currentTime + 0.25);
		this.voice = null;
	}

	/** Classic thumb-bell "tring tring", synthesised (there is no bell in the original set). */
	bell() {
		if (!this.ctx || !this.master) return;
		const now = this.ctx.currentTime;
		for (const t0 of [0, 0.17]) {
			for (const [freq, level] of [[2280, 0.09], [3610, 0.045], [5150, 0.02]] as const) {
				const osc = this.ctx.createOscillator();
				osc.type = 'sine';
				osc.frequency.value = freq;
				const gain = this.ctx.createGain();
				gain.gain.setValueAtTime(0, now + t0);
				gain.gain.linearRampToValueAtTime(level, now + t0 + 0.004);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + t0 + 0.75);
				osc.connect(gain).connect(this.master);
				osc.start(now + t0);
				osc.stop(now + t0 + 0.8);
			}
		}
	}

	setMuted(muted: boolean) {
		this.muted = muted;
		if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
	}

	dispose() {
		this.stopVoice();
		for (const loop of this.loops.values()) loop.source.stop();
		this.loops.clear();
		void this.ctx?.close();
		this.ctx = null;
	}
}
