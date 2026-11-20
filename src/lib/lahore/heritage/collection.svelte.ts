import { LANDMARKS, type LandmarkId } from './landmarks';

const STORAGE_KEY = 'lahore-heritage-collection-v1';

type Saved = { discovered: LandmarkId[]; saved: LandmarkId[]; memories: string[]; at: Record<string, number> };

function load(): Saved {
	if (typeof localStorage === 'undefined') return { discovered: [], saved: [], memories: [], at: {} };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { discovered: [], saved: [], memories: [], at: {} };
		const data = JSON.parse(raw) as Partial<Saved>;
		const valid = new Set(LANDMARKS.map((l) => l.id));
		return {
			discovered: (data.discovered ?? []).filter((id) => valid.has(id)),
			saved: (data.saved ?? []).filter((id) => valid.has(id)),
			memories: data.memories ?? [],
			at: data.at ?? {}
		};
	} catch {
		return { discovered: [], saved: [], memories: [], at: {} };
	}
}

/** Heritage collection: discovered landmarks, postcards saved to the album, NPC memories. */
class HeritageCollection {
	discovered = $state<LandmarkId[]>([]);
	saved = $state<LandmarkId[]>([]);
	memories = $state<string[]>([]);
	at = $state<Record<string, number>>({});

	constructor() {
		const data = load();
		this.discovered = data.discovered;
		this.saved = data.saved;
		this.memories = data.memories;
		this.at = data.at;
	}

	get total() {
		return LANDMARKS.length;
	}

	get progress() {
		return this.saved.length / LANDMARKS.length;
	}

	isDiscovered(id: LandmarkId) {
		return this.discovered.includes(id);
	}

	isSaved(id: LandmarkId) {
		return this.saved.includes(id);
	}

	discover(id: LandmarkId) {
		if (!this.discovered.includes(id)) {
			this.discovered = [...this.discovered, id];
			this.at = { ...this.at, [id]: Date.now() };
			this.persist();
		}
	}

	save(id: LandmarkId) {
		this.discover(id);
		if (!this.saved.includes(id)) {
			this.saved = [...this.saved, id];
			this.persist();
		}
	}

	remember(key: string) {
		if (!this.memories.includes(key)) {
			this.memories = [...this.memories, key];
			this.persist();
		}
	}

	reset() {
		this.discovered = [];
		this.saved = [];
		this.memories = [];
		this.at = {};
		this.persist();
	}

	private persist() {
		if (typeof localStorage === 'undefined') return;
		const data: Saved = { discovered: this.discovered, saved: this.saved, memories: this.memories, at: this.at };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	}
}

export const collection = new HeritageCollection();
