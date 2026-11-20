<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { LahoreGame, type DialogueView, type GameState, type Prompt, type RideMode, type ShopView } from '$lib/lahore/game/LahoreGame';
	import { LANDMARK_BY_ID, LANDMARKS, type LandmarkId } from '$lib/lahore/heritage/landmarks';
	import { collection } from '$lib/lahore/heritage/collection.svelte';
	import type { CuratedAsset } from '$lib/lahore/heritage/cloudinary';
	import TitleScreen from '$lib/lahore/ui/TitleScreen.svelte';
	import Loading from '$lib/lahore/ui/Loading.svelte';
	import Hud from '$lib/lahore/ui/Hud.svelte';
	import Postcard from '$lib/lahore/ui/Postcard.svelte';
	import Collection from '$lib/lahore/ui/Collection.svelte';

	type HeritageStatus = {
		configured: boolean;
		assets: string[];
		videos: (CuratedAsset & { landmark: string | null })[];
		curated: (CuratedAsset & { landmark: string | null })[];
		visitors: (CuratedAsset & { landmark: string | null })[];
	};

	let host: HTMLDivElement;
	let game: LahoreGame | null = null;

	let gameState = $state<GameState>('loading');
	let progress = $state(0);
	let loadingLabel = $state('Opening the post office');
	let loadError = $state<string | null>(null);
	let prompt = $state<Prompt | null>(null);
	let dialogue = $state<DialogueView | null>(null);
	let shop = $state<ShopView | null>(null);
	let area = $state<{ name: string; urdu: string; key: number } | null>(null);
	let toast = $state<{ text: string; key: number } | null>(null);
	let muted = $state(false);
	let ride = $state<RideMode>('walk');
	let postcard = $state<{ id: LandmarkId; fresh: boolean } | null>(null);
	let showCollection = $state(false);
	let heritage = $state<HeritageStatus | null>(null);
	let stats = $state<{ fps: number; triangles: number; npcs: number } | null>(null);
	let showStats = $state(false);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;
	let areaTimer: ReturnType<typeof setTimeout> | null = null;

	const modalOpen = $derived(!!postcard || showCollection);

	$effect(() => {
		game?.setPaused(modalOpen);
	});

	function showToast(text: string) {
		toast = { text, key: Date.now() };
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 3200);
	}

	function curatedFor(id: LandmarkId): CuratedAsset[] {
		return (heritage?.curated ?? []).filter((a) => a.landmark === id && a.resourceType === 'image');
	}

	function videoFor(id: LandmarkId): string | null {
		return heritage?.videos?.find((v) => v.landmark === id)?.publicId ?? null;
	}

	onMount(() => {
		const g = new LahoreGame(host, {
			onLoading: (p, label) => {
				progress = Math.max(progress, p);
				loadingLabel = label;
			},
			onState: (s) => (gameState = s),
			onPrompt: (p) => (prompt = p),
			onDialogue: (d) => (dialogue = d),
			onShop: (s) => (shop = s),
			onDiscover: (id) => {
				const fresh = !collection.isSaved(id);
				postcard = { id, fresh };
			},
			onArea: (a) => {
				area = { ...a, key: Date.now() };
				if (areaTimer) clearTimeout(areaTimer);
				areaTimer = setTimeout(() => (area = null), 4200);
			},
			onToast: showToast,
			onMemory: (title) => showToast(`Heritage memory unlocked: ${title}`),
			onCollection: () => {
				showCollection = !showCollection;
				game?.playUi('open-checklist');
			},
			onEscape: () => {
				if (postcard) postcard = null;
				else if (showCollection) showCollection = false;
			},
			onMuted: (m) => (muted = m),
			onStats: (s) => (stats = s),
			onRide: (mode) => (ride = mode)
		});
		game = g;
		g.load().catch((error) => {
			console.error(error);
			loadError = error instanceof Error ? error.message : String(error);
		});

		fetch('/api/heritage')
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => (heritage = data))
			.catch(() => (heritage = null));

		const onKey = (e: KeyboardEvent) => {
			if (e.code === 'F3') {
				e.preventDefault();
				showStats = !showStats;
			}
		};
		window.addEventListener('keydown', onKey);
		(window as unknown as { lahore?: LahoreGame }).lahore = g;
		return () => {
			window.removeEventListener('keydown', onKey);
			g.dispose();
			game = null;
		};
	});

	function begin() {
		void game?.begin();
	}

	function closePostcard() {
		if (postcard && !collection.isSaved(postcard.id) && postcard.fresh) {
			collection.save(postcard.id);
			showToast(`${LANDMARK_BY_ID[postcard.id].name} saved to your collection · ${collection.saved.length}/${LANDMARKS.length}`);
		}
		postcard = null;
		game?.playUi('paper');
	}
</script>

<svelte:head>
	<title>LAHORE · A City of Stories</title>
	<meta name="description" content="Explore Lahore's Walled City, Wazir Khan Mosque, Shahi Hammam, Lahore Fort, Badshahi Mosque and Food Street as a tourist in a tiny-planet adventure." />
	<meta name="theme-color" content="#5fbfb9" />
</svelte:head>

<main id="app" class="lahore-app">
	<div class="canvas-host" bind:this={host}></div>

	<TitleScreen visible={gameState === 'intro'} onBegin={begin} onHover={() => game?.playUi('button-turn')} onLetter={() => game?.playUi('rune1')} />

	{#if gameState === 'play'}
		<Hud
			{prompt}
			{area}
			saved={collection.saved.length}
			total={LANDMARKS.length}
			{muted}
			{dialogue}
			{shop}
			{toast}
			{ride}
			onCollection={() => {
				showCollection = true;
				game?.playUi('open-checklist');
			}}
			onMute={() => game?.toggleMute()}
			onInteract={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }))}
			onHover={() => game?.playUi('hover')}
		/>
	{/if}

	{#if postcard}
		<Postcard
			landmark={LANDMARK_BY_ID[postcard.id]}
			fresh={postcard.fresh}
			curated={curatedFor(postcard.id)}
			videoId={videoFor(postcard.id)}
			onClose={closePostcard}
			onSound={(name) => game?.playUi(name)}
		/>
	{/if}

	{#if showCollection}
		<Collection
			status={heritage}
			onClose={() => {
				showCollection = false;
				game?.playUi('click3');
			}}
			onOpen={(id) => {
				showCollection = false;
				postcard = { id, fresh: false };
				game?.playUi('paper');
			}}
			onSound={(name) => game?.playUi(name)}
		/>
	{/if}

	<Loading visible={gameState === 'loading'} {progress} label={loadingLabel} error={loadError} />

	{#if showStats && stats}
		<div class="stats" transition:fade>{stats.fps} fps · {Math.round(stats.triangles / 1000)}k tris · {stats.npcs} Lahoris</div>
	{/if}
</main>

<style>
	.lahore-app {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: #5fbfb9;
		user-select: none;
	}

	.canvas-host {
		position: absolute;
		inset: 0;
	}

	.canvas-host :global(canvas) {
		display: block;
		width: 100%;
		height: 100%;
		outline: none;
	}

	.stats {
		position: absolute;
		left: 0.8rem;
		top: 0.8rem;
		z-index: 50;
		padding: 0.2rem 0.6rem;
		font: 12px/1.4 ui-monospace, monospace;
		color: #fff;
		background: rgb(0 0 0 / 0.5);
		border-radius: 6px;
	}
</style>
