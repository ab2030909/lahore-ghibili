<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { HeritagePhoto, Landmark } from '../heritage/landmarks';
	import {
		curatedImageUrl,
		filmUrl,
		fullImage,
		isCloudinaryConfigured,
		placeholder,
		postcardImage,
		shareablePostcard,
		srcset,
		thumbnail,
		videoUrl,
		type CuratedAsset
	} from '../heritage/cloudinary';
	import { collection } from '../heritage/collection.svelte';
	import { DIALOGUES } from '../game/dialogues';

	let {
		landmark,
		fresh,
		curated = [],
		videoId = null,
		onClose,
		onSound
	}: {
		landmark: Landmark;
		fresh: boolean;
		curated?: CuratedAsset[];
		videoId?: string | null;
		onClose: () => void;
		onSound?: (name: 'paper' | 'click' | 'quest-complete' | 'open-box2' | 'customize' | 'hover') => void;
	} = $props();

	let flipped = $state(false);
	let photo = $state<HeritagePhoto | null>(null);
	let lightbox = $state(false);
	let film = $state(false);
	let loaded = $state(false);
	const current = $derived(photo ?? landmark.photos[0]);
	const saved = $derived(collection.isSaved(landmark.id));
	const configured = isCloudinaryConfigured();
	const filmSource = $derived(videoId ? videoUrl(videoId) : filmUrl(landmark));
	const shareUrl = $derived(shareablePostcard(landmark));
	const memories = $derived(
		Object.values(DIALOGUES)
			.filter((d) => d.memory && d.memory.landmark === landmark.id && collection.memories.includes(`${landmark.id}:${d.memory.title}`))
			.map((d) => d.memory!)
	);
	const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

	function save() {
		collection.save(landmark.id);
		onSound?.('quest-complete');
	}

	function flip() {
		flipped = !flipped;
		onSound?.('paper');
	}

	function choose(p: HeritagePhoto) {
		loaded = false;
		photo = p;
		onSound?.('click');
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			if (lightbox) lightbox = false;
			else if (film) film = false;
			else onClose();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" transition:fade={{ duration: 250 }} onclick={onClose} role="presentation"></div>
<div class="wrap" role="dialog" aria-modal="true" aria-label="{landmark.name} postcard">
	{#if fresh}
		<p class="discovered" in:scale={{ duration: 400, start: 0.6 }}>New postcard discovered!</p>
	{/if}
	<div class="card" class:flipped style="--accent: {landmark.accent}">
		<div class="face front">
			<div class="photo">
				<img class="lqip" src={placeholder(landmark, current)} alt="" aria-hidden="true" />
				<img
					class="main"
					class:loaded
					src={postcardImage(landmark, current, 960)}
					srcset={srcset(landmark, current, 1.5, { effects: ['e_improve'] })}
					sizes="(max-width: 760px) 92vw, 640px"
					alt="{landmark.name}: {current.caption}"
					onload={() => (loaded = true)}
				/>
				<button type="button" class="expand" onclick={() => (lightbox = true)} aria-label="View full photograph">⤢</button>
			</div>
			<div class="caption-row">
				<div>
					<p class="greetings">Greetings from <strong>Lahore</strong></p>
					<h2>{landmark.name}</h2>
					<p class="urdu" lang="ur" dir="rtl">{landmark.urdu}</p>
				</div>
				<div class="stamp" aria-hidden="true">
					<span class="stamp-top">PAKISTAN</span>
					<span class="stamp-word">{landmark.stamp}</span>
					<span class="stamp-bottom">LAHORE</span>
				</div>
			</div>
			<span class="postmark" aria-hidden="true">LAHORE · {date}</span>
		</div>
		<div class="face back">
			<div class="story">
				<p class="where">{landmark.location} · {landmark.era}</p>
				{#each landmark.story as paragraph, i (i)}
					<p>{paragraph}</p>
				{/each}
				{#if memories.length}
					<div class="memories">
						<p class="memories-title">Heritage memories</p>
						{#each memories as m (m.title)}
							<p><strong>{m.title}.</strong> {m.text}</p>
						{/each}
					</div>
				{/if}
			</div>
			<div class="address">
				<p class="note">“{landmark.memory}”</p>
				<div class="lines">
					<span>To: The Lahore Heritage Collection</span>
					<span>Androon Shehr, Lahore</span>
					<span>Pakistan</span>
				</div>
				<p class="credit">
					Photo: {current.caption}. By {current.author},
					<a href={current.licenseUrl} target="_blank" rel="noopener noreferrer">{current.license}</a>, via
					<a href={current.commonsPage} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>.
					{configured ? 'Delivered and optimised by Cloudinary.' : 'Set PUBLIC_CLOUDINARY_CLOUD_NAME to deliver this through Cloudinary.'}
				</p>
			</div>
		</div>
	</div>

	{#if landmark.photos.length > 1 || curated.length}
		<div class="gallery" aria-label="More photographs">
			{#each landmark.photos as p (p.slot)}
				<button type="button" class:active={p.slot === current.slot} onclick={() => choose(p)} onmouseenter={() => onSound?.('hover')}>
					<img src={thumbnail(landmark, p, 160)} alt={p.caption} loading="lazy" />
				</button>
			{/each}
			{#each curated as asset (asset.publicId)}
				<a class="curated" href={curatedImageUrl(asset, 1600)} target="_blank" rel="noopener noreferrer" title={asset.caption ?? 'Curated in Cloudinary'}>
					<img src={curatedImageUrl(asset, 160, 115)} alt={asset.caption ?? 'Curated heritage photograph'} loading="lazy" />
				</a>
			{/each}
		</div>
	{/if}

	<div class="actions">
		<button type="button" class="primary" onclick={flip}>{flipped ? 'Show the photo' : 'Turn over · read the story'}</button>
		{#if !saved}
			<button type="button" class="save" onclick={save}>Save to collection</button>
		{:else}
			<span class="saved-badge">✓ In your collection</span>
		{/if}
		{#if filmSource}
			<button type="button" onclick={() => { film = true; onSound?.('open-box2'); }}>▶ Heritage film</button>
		{/if}
		{#if shareUrl}
			<a class="button" href={shareUrl} target="_blank" rel="noopener noreferrer">Share postcard</a>
		{/if}
		<button type="button" onclick={onClose}>Close</button>
	</div>
</div>

{#if lightbox}
	<div class="lightbox" transition:fade={{ duration: 200 }} onclick={() => (lightbox = false)} role="presentation">
		<img src={fullImage(landmark, current, 2000)} alt="{landmark.name}: {current.caption}" />
	</div>
{/if}

{#if film && filmSource}
	<div class="lightbox" transition:fade={{ duration: 200 }} role="presentation" onclick={() => (film = false)}>
		<!-- svelte-ignore a11y_media_has_caption -->
		<video src={filmSource.src} poster={filmSource.poster} autoplay muted loop playsinline controls onclick={(e) => e.stopPropagation()}></video>
		<p class="film-note">{videoId ? 'Heritage film delivered by Cloudinary' : 'Ken Burns film generated by Cloudinary (e_zoompan) from the postcard photograph'}</p>
	</div>
{/if}

<style>
	.backdrop {
		position: absolute;
		inset: 0;
		z-index: 30;
		background: rgb(30 36 38 / 0.45);
		backdrop-filter: blur(3px);
	}

	.wrap {
		position: absolute;
		left: 50%;
		top: 50%;
		z-index: 31;
		width: min(680px, 94vw);
		transform: translate(-50%, -50%);
		font-family: 'Gochi Hand', 'Segoe Print', cursive;
		color: #2b2b2e;
	}

	.discovered {
		margin: 0 0 0.6rem;
		text-align: center;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 1.15rem;
		color: #fff;
		-webkit-text-stroke: 0.05em #373f42;
		paint-order: stroke fill;
		text-shadow: 0 3px 0 #373f42;
	}

	.card {
		position: relative;
		aspect-ratio: 3 / 2.25;
		transform-style: preserve-3d;
		transition: transform 0.7s cubic-bezier(0.3, 1.3, 0.4, 1);
		animation: arrive 0.8s cubic-bezier(0.2, 1.2, 0.3, 1);
	}

	@keyframes arrive {
		from {
			transform: translateY(60vh) rotate(-14deg) scale(0.6);
		}
	}

	.card.flipped {
		transform: rotateY(180deg);
	}

	.face {
		position: absolute;
		inset: 0;
		backface-visibility: hidden;
		background: #fbf6ea;
		border: 3px solid #2b2b2e;
		border-radius: 10px;
		box-shadow: 0 8px 0 #2b2b2e, 0 20px 40px rgb(0 0 0 / 0.25);
		overflow: hidden;
	}

	.front {
		display: flex;
		flex-direction: column;
		padding: 12px;
		transform: rotate(-1deg);
	}

	.photo {
		position: relative;
		flex: 1;
		min-height: 0;
		border: 2px solid #2b2b2e;
		border-radius: 4px;
		overflow: hidden;
		background: var(--accent);
	}

	.photo img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.lqip {
		filter: blur(12px);
		transform: scale(1.1);
	}

	.main {
		opacity: 0;
		transition: opacity 400ms ease;
	}

	.main.loaded {
		opacity: 1;
	}

	.expand {
		position: absolute;
		right: 8px;
		top: 8px;
		width: 34px;
		height: 34px;
		font-size: 1.1rem;
		background: #fff;
		border: 2px solid #2b2b2e;
		border-radius: 50%;
		cursor: pointer;
	}

	.caption-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		padding: 8px 4px 0;
	}

	.greetings {
		margin: 0;
		font-size: 1.05rem;
		color: #6b6f72;
	}

	.greetings strong {
		color: var(--accent);
		filter: brightness(0.8);
	}

	h2 {
		margin: 0;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: clamp(1.2rem, 3.6vw, 1.9rem);
		line-height: 1.05;
		letter-spacing: 0.02em;
	}

	.urdu {
		margin: 0;
		font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif;
		font-size: 1.15rem;
		line-height: 1.9;
		text-align: left;
	}

	.stamp {
		flex: none;
		width: 84px;
		height: 98px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		padding: 6px 4px;
		background: var(--accent);
		color: #fff;
		border: 2px dashed #fbf6ea;
		outline: 3px solid #2b2b2e;
		transform: rotate(4deg);
		font-family: 'Bungee', 'Arial Black', sans-serif;
		text-shadow: 0 1px 0 #2b2b2e;
	}

	.stamp-top,
	.stamp-bottom {
		font-size: 0.55rem;
		letter-spacing: 0.1em;
	}

	.stamp-word {
		font-family: 'Gochi Hand', cursive;
		font-size: 1.05rem;
		text-align: center;
		line-height: 1;
	}

	.postmark {
		position: absolute;
		right: 108px;
		bottom: 26px;
		padding: 6px 12px;
		border: 2px solid rgb(43 43 46 / 0.55);
		border-radius: 50%;
		color: rgb(43 43 46 / 0.6);
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 0.6rem;
		transform: rotate(-12deg);
		pointer-events: none;
	}

	.back {
		transform: rotateY(180deg);
		display: grid;
		grid-template-columns: 1.35fr 1fr;
		gap: 14px;
		padding: 16px 18px;
	}

	.story {
		overflow-y: auto;
		padding-right: 10px;
		border-right: 2px solid rgb(43 43 46 / 0.25);
		font-family: system-ui, sans-serif;
		font-size: 0.86rem;
		line-height: 1.45;
	}

	.story p {
		margin: 0 0 0.55rem;
	}

	.where {
		font-family: 'Gochi Hand', cursive;
		font-size: 1.05rem;
		color: #c8423a;
	}

	.memories {
		margin-top: 0.6rem;
		padding: 0.5rem 0.6rem;
		background: #fff4cf;
		border: 2px solid #2b2b2e;
		border-radius: 8px;
	}

	.memories-title {
		font-family: 'Gochi Hand', cursive;
		font-size: 1.05rem;
	}

	.address {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.note {
		margin: 0;
		font-size: 1.2rem;
		line-height: 1.25;
	}

	.lines {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 1.05rem;
	}

	.lines span {
		border-bottom: 2px solid rgb(43 43 46 / 0.3);
	}

	.credit {
		margin: auto 0 0;
		font-family: system-ui, sans-serif;
		font-size: 0.72rem;
		line-height: 1.35;
		color: #5b6064;
	}

	.credit a {
		color: #2f5d9a;
	}

	.gallery {
		display: flex;
		gap: 8px;
		margin-top: 18px;
		overflow-x: auto;
		padding: 4px 2px 6px;
	}

	.gallery button,
	.gallery a {
		flex: none;
		width: 88px;
		height: 62px;
		padding: 0;
		border: 3px solid #2b2b2e;
		border-radius: 6px;
		overflow: hidden;
		background: #fff;
		cursor: pointer;
		box-shadow: 0 3px 0 #2b2b2e;
	}

	.gallery .active {
		outline: 3px solid #f2c14f;
	}

	.gallery img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 14px;
	}

	.actions button,
	.actions .button {
		padding: 0.35rem 0.95rem;
		font-family: inherit;
		font-size: 1.08rem;
		color: #2b2b2e;
		text-decoration: none;
		background: #fff;
		border: 3px solid #2b2b2e;
		border-radius: 999px;
		box-shadow: 0 3px 0 #2b2b2e;
		cursor: pointer;
	}

	.actions .primary {
		background: #f2c14f;
	}

	.actions .save {
		background: #c8423a;
		color: #fff;
	}

	.saved-badge {
		align-self: center;
		font-size: 1.05rem;
		color: #fff;
		text-shadow: 0 2px 0 #373f42;
	}

	.lightbox {
		position: absolute;
		inset: 0;
		z-index: 40;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		background: rgb(20 22 24 / 0.85);
	}

	.lightbox img,
	.lightbox video {
		max-width: 92vw;
		max-height: 82vh;
		border: 3px solid #fff;
		border-radius: 6px;
	}

	.film-note {
		margin: 0;
		color: #fff;
		font-family: 'Gochi Hand', cursive;
		font-size: 1.05rem;
	}

	@media (max-width: 640px) {
		.back {
			grid-template-columns: 1fr;
		}
		.address {
			display: none;
		}
	}
</style>
