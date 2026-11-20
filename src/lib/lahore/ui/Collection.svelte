<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { LANDMARKS, type LandmarkId } from '../heritage/landmarks';
	import { collection } from '../heritage/collection.svelte';
	import { cloudinary, curatedImageUrl, isCloudinaryConfigured, lockedThumbnail, srcset, thumbnail, type CuratedAsset } from '../heritage/cloudinary';
	import { DIALOGUES } from '../game/dialogues';

	type HeritageStatus = {
		configured: boolean;
		assets: string[];
		videos: CuratedAsset[];
		curated: (CuratedAsset & { landmark: string | null })[];
		visitors: (CuratedAsset & { landmark: string | null })[];
		error?: string;
	};

	let {
		onClose,
		onOpen,
		status,
		onSound
	}: {
		onClose: () => void;
		onOpen: (id: LandmarkId) => void;
		status: HeritageStatus | null;
		onSound?: (name: 'click' | 'hover' | 'customize') => void;
	} = $props();

	const configured = isCloudinaryConfigured();
	const hints: Record<LandmarkId, string> = {
		'delhi-gate': 'Start of the royal trail, facing east',
		'shahi-hammam': 'Just inside the gate, look for painted domes',
		'wazir-khan': 'Follow the trail to the tiled minarets',
		'walled-city': 'Where the Kashmiri Bazaar galis cross',
		'lahore-fort': 'The great gate with two round bastions',
		badshahi: 'Climb the red stone stairs past Hazuri Bagh',
		'food-street': 'Follow the lanterns along Fort Road',
		'railway-station': 'A fortress of red brick north of Delhi Gate',
		'gaddafi-stadium': 'Floodlights south of Delhi Gate',
		'minar-e-pakistan': 'The white tower at the top of the world',
		'truck-art': 'A painted truck parked in Delhi Gate chowk',
		'wagah-border': 'South of the Fort, before the Ravi: two flags at sunset',
		'food-karahi': 'Fort Road Food Street: follow the sizzle of the wok',
		'food-nihari': 'Fort Road Food Street: the deg that cooked all night',
		'food-paye': 'Fort Road Food Street: Phajja\u2019s winter breakfast',
		'food-tikka': 'Fort Road Food Street: smoke from the charcoal grill',
		'food-biryani': 'Fort Road Food Street: a copper deg of saffron rice',
		'food-pulao': 'Fort Road Food Street: rice cooked in yakhni',
		'food-golgappay': 'Fort Road Food Street: the cart with the pani matkas',
		'food-lassi': 'Fort Road Food Street: tall steel glasses and malai'
	};

	const groups = [
		{ title: 'Places', urdu: 'مقامات', items: LANDMARKS.filter((l) => l.kind !== 'food') },
		{ title: 'Food of Lahore', urdu: 'لاہور کے کھانے', items: LANDMARKS.filter((l) => l.kind === 'food') }
	];

	const totalMemories = Object.values(DIALOGUES).filter((d) => d.memory).length;
	const seeded = $derived(status?.assets?.length ?? 0);

	let uploadFor = $state<LandmarkId>('delhi-gate');
	let uploading = $state(false);
	let uploadMessage = $state('');

	async function upload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		uploading = true;
		uploadMessage = '';
		try {
			const res = await fetch('/api/heritage/sign', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ landmark: uploadFor })
			});
			if (!res.ok) throw new Error(res.status === 503 ? 'Uploads need the Cloudinary API key and secret on the server.' : `Signing failed (${res.status})`);
			const signed = await res.json();
			const form = new FormData();
			form.append('file', file);
			for (const key of ['api_key', 'timestamp', 'signature', 'folder', 'tags', 'context', 'allowed_formats', 'transformation'] as const) {
				const value = key === 'api_key' ? signed.apiKey : signed[key];
				form.append(key, String(value));
			}
			const up = await fetch(signed.uploadUrl, { method: 'POST', body: form });
			if (!up.ok) throw new Error(`Cloudinary rejected the upload (${up.status})`);
			uploadMessage = 'Shukriya! Your photo is in Cloudinary and will appear here once a curator approves it.';
		} catch (error) {
			uploadMessage = (error as Error).message;
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onClose();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" transition:fade={{ duration: 250 }} onclick={onClose} role="presentation"></div>
<section class="album" transition:fly={{ y: 40, duration: 350 }} aria-label="Lahore heritage collection">
	<header>
		<div>
			<p class="eyebrow">Lahore heritage collection</p>
			<h2>Discover Lahore</h2>
			<p class="urdu" lang="ur" dir="rtl">لاہور کی یادیں</p>
		</div>
		<div class="progress">
			<span class="big">{collection.saved.length}<small>/{LANDMARKS.length}</small></span>
			<span>places discovered</span>
			<div class="bar"><span style="width: {(collection.saved.length / LANDMARKS.length) * 100}%"></span></div>
			<span class="mem">{collection.memories.length}/{totalMemories} heritage memories</span>
		</div>
		<button type="button" class="close" onclick={onClose} aria-label="Close collection">✕</button>
	</header>

	{#each groups as g (g.title)}
	<h3 class="group">
		{g.title}
		<span class="group-count">{g.items.filter((l) => collection.isSaved(l.id)).length}/{g.items.length}</span>
		<span class="group-urdu" lang="ur" dir="rtl">{g.urdu}</span>
	</h3>
	<div class="grid">
		{#each g.items as l (l.id)}
			{@const discovered = collection.isDiscovered(l.id)}
			{@const saved = collection.isSaved(l.id)}
			<button
				type="button"
				class="slot"
				class:locked={!discovered}
				style="--accent: {l.accent}"
				disabled={!discovered}
				onclick={() => {
					onSound?.('click');
					onOpen(l.id);
				}}
				onmouseenter={() => onSound?.('hover')}
			>
				<div class="thumb">
					{#if discovered}
						<img src={thumbnail(l, l.photos[0], 360)} srcset={srcset(l, l.photos[0], 1 / 0.72, { crop: 'thumb' })} sizes="220px" alt={l.name} loading="lazy" />
					{:else}
						<img src={lockedThumbnail(l, 360)} alt="" aria-hidden="true" loading="lazy" />
						<span class="q">?</span>
					{/if}
					{#if saved}<span class="tick" aria-label="Saved">✓</span>{/if}
				</div>
				<p class="name">{discovered ? l.name : 'Undiscovered'}</p>
				<p class="sub">{discovered ? l.urdu : hints[l.id]}</p>
			</button>
		{/each}
	</div>
	{/each}

	{#if status?.curated?.length || status?.visitors?.length}
		<div class="extras">
			<h3>From the Cloudinary archive</h3>
			<div class="strip">
				{#each [...(status?.curated ?? []), ...(status?.visitors ?? [])] as asset (asset.publicId)}
					<a href={curatedImageUrl(asset, 1600)} target="_blank" rel="noopener noreferrer" title={asset.caption ?? asset.publicId}>
						<img src={curatedImageUrl(asset, 200, 140)} alt={asset.caption ?? 'Lahore heritage photograph'} loading="lazy" />
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<footer>
		<div class="cloud">
			{#if configured}
				<span class="dot ok"></span> Images delivered by Cloudinary from <code>{cloudinary.cloudName}</code> ({cloudinary.delivery}),
				f_auto · q_auto · g_auto responsive crops.
				{#if status?.configured}{seeded} postcard photos seeded.{/if}
			{:else}
				<span class="dot"></span> Cloudinary not configured: photos load directly from Wikimedia Commons. Set
				<code>PUBLIC_CLOUDINARY_CLOUD_NAME</code> (see <code>.env.example</code>).
			{/if}
		</div>
		{#if status?.configured}
			<div class="upload">
				<label>
					Add your own photo of
					<select bind:value={uploadFor}>
						{#each LANDMARKS as l (l.id)}<option value={l.id}>{l.name}</option>{/each}
					</select>
				</label>
				<label class="file">
					<input type="file" accept="image/*" onchange={upload} disabled={uploading} />
					<span>{uploading ? 'Uploading…' : 'Choose photo'}</span>
				</label>
				{#if uploadMessage}<p class="msg">{uploadMessage}</p>{/if}
			</div>
		{/if}
		<p class="credits">
			Photographs: Wikimedia Commons contributors, credited on each card with their licence.
			<button type="button" class="reset" onclick={() => confirm('Reset your collection?') && collection.reset()}>reset</button>
		</p>
	</footer>
</section>

<style>
	.backdrop {
		position: absolute;
		inset: 0;
		z-index: 30;
		background: rgb(30 36 38 / 0.45);
		backdrop-filter: blur(3px);
	}

	.album {
		position: absolute;
		left: 50%;
		top: 50%;
		z-index: 31;
		width: min(980px, 95vw);
		max-height: 90vh;
		overflow-y: auto;
		transform: translate(-50%, -50%);
		padding: 1.2rem 1.4rem 1rem;
		background: #fbf6ea;
		border: 3px solid #2b2b2e;
		border-radius: 18px;
		box-shadow: 0 8px 0 #2b2b2e;
		font-family: 'Gochi Hand', 'Segoe Print', cursive;
		color: #2b2b2e;
	}

	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.eyebrow {
		margin: 0;
		font-size: 1rem;
		color: #c8423a;
	}

	h2 {
		margin: 0;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: clamp(1.3rem, 3vw, 2rem);
	}

	.urdu {
		margin: 0;
		font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif;
		font-size: 1.2rem;
		line-height: 1.9;
		text-align: left;
	}

	.progress {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		margin-left: auto;
		font-size: 1rem;
	}

	.big {
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 2rem;
		line-height: 1;
	}

	.big small {
		font-size: 1rem;
	}

	.bar {
		width: 170px;
		height: 10px;
		margin: 0.3rem 0;
		border: 2px solid #2b2b2e;
		border-radius: 999px;
		overflow: hidden;
		background: #fff;
	}

	.bar span {
		display: block;
		height: 100%;
		background: #c8423a;
		transition: width 400ms ease;
	}

	.mem {
		color: #6b6f72;
	}

	.close {
		width: 40px;
		height: 40px;
		font-size: 1.1rem;
		background: #fff;
		border: 3px solid #2b2b2e;
		border-radius: 50%;
		box-shadow: 0 3px 0 #2b2b2e;
		cursor: pointer;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.slot {
		padding: 8px 8px 6px;
		text-align: left;
		font-family: inherit;
		color: inherit;
		background: #fff;
		border: 3px solid #2b2b2e;
		border-radius: 10px;
		box-shadow: 0 4px 0 #2b2b2e;
		cursor: pointer;
		transition: transform 120ms ease;
	}

	.slot:nth-child(odd) {
		transform: rotate(-1deg);
	}

	.slot:nth-child(even) {
		transform: rotate(1deg);
	}

	.slot:not(.locked):hover {
		transform: translateY(-3px) rotate(0deg);
	}

	.slot.locked {
		cursor: default;
		background: #efe9dc;
	}

	.thumb {
		position: relative;
		aspect-ratio: 1 / 0.72;
		border: 2px solid #2b2b2e;
		border-radius: 4px;
		overflow: hidden;
		background: var(--accent);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.q {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 2.4rem;
		color: #fff;
		text-shadow: 0 3px 0 #2b2b2e;
	}

	.tick {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		color: #fff;
		background: #3f9a69;
		border: 2px solid #2b2b2e;
		border-radius: 50%;
	}

	.name {
		margin: 0.35rem 0 0;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 0.95rem;
	}

	.sub {
		margin: 0;
		font-size: 0.98rem;
		color: #6b6f72;
	}

	.group {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		margin: 1.3rem 0 -0.2rem;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 1.05rem;
		letter-spacing: 0.03em;
	}

	.group-count {
		font-family: 'Gochi Hand', 'Segoe Print', cursive;
		font-size: 1rem;
		color: #6b6f72;
	}

	.group-urdu {
		margin-left: auto;
		font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif;
		font-size: 1.05rem;
		color: #c8423a;
	}

	.extras h3 {
		margin: 1.2rem 0 0.4rem;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 1rem;
	}

	.strip {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
	}

	.strip img {
		width: 140px;
		height: 98px;
		object-fit: cover;
		border: 3px solid #2b2b2e;
		border-radius: 6px;
	}

	footer {
		margin-top: 1rem;
		font-family: system-ui, sans-serif;
		font-size: 0.8rem;
		color: #5b6064;
	}

	.cloud {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #c8423a;
	}

	.dot.ok {
		background: #3f9a69;
	}

	code {
		padding: 0 0.3em;
		background: #fff;
		border-radius: 4px;
	}

	.upload {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		margin-top: 0.6rem;
		font-family: 'Gochi Hand', cursive;
		font-size: 1rem;
		color: #2b2b2e;
	}

	.file input {
		display: none;
	}

	.file span {
		display: inline-block;
		padding: 0.15rem 0.8rem;
		border: 2px solid #2b2b2e;
		border-radius: 999px;
		background: #f2c14f;
		cursor: pointer;
	}

	.msg {
		width: 100%;
		margin: 0;
		font-family: system-ui, sans-serif;
		font-size: 0.8rem;
	}

	.credits {
		margin: 0.6rem 0 0;
		line-height: 1.4;
	}


	.reset {
		margin-left: 0.4rem;
		font-size: 0.75rem;
		color: #8a8f92;
		background: none;
		border: none;
		text-decoration: underline;
		cursor: pointer;
	}
</style>
