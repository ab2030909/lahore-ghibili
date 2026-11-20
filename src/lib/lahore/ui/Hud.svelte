<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import type { DialogueView, Prompt, RideMode, ShopView } from '../game/LahoreGame';

	let {
		prompt,
		area,
		saved,
		total,
		muted,
		dialogue,
		shop,
		toast,
		ride = 'walk',
		onCollection,
		onMute,
		onInteract,
		onHover
	}: {
		prompt: Prompt | null;
		ride?: RideMode;
		area: { name: string; urdu: string; key: number } | null;
		saved: number;
		total: number;
		muted: boolean;
		dialogue: DialogueView | null;
		shop: ShopView | null;
		toast: { text: string; key: number } | null;
		onCollection: () => void;
		onMute: () => void;
		onInteract: () => void;
		onHover?: () => void;
	} = $props();

	let showHelp = $state(true);
	$effect(() => {
		const t = setTimeout(() => (showHelp = false), 14000);
		return () => clearTimeout(t);
	});

	const icons: Record<Prompt['kind'], string> = { talk: '💬', discover: '📷', postcard: '🖼', shop: '🛍', bike: '🚲', boat: '🛶' };
</script>

<div class="hud">
	<div class="side-buttons">
		<button type="button" class="side" onclick={onCollection} onmouseenter={onHover} aria-label="Open your Lahore heritage collection (H)">
			<svg viewBox="0 0 40 30" aria-hidden="true">
				<rect x="6" y="6" width="28" height="20" rx="3" fill="#fff" stroke="#2b2b2e" stroke-width="2.4" />
				<circle cx="20" cy="17" r="6" fill="none" stroke="#2b2b2e" stroke-width="2" />
				<circle cx="20" cy="17" r="2.5" fill="#2b2b2e" />
				<rect x="11" y="8" width="6" height="3" rx="1.5" fill="#2b2b2e" />
			</svg>
			<span class="count">{saved}/{total}</span>
		</button>
		<button type="button" class="side" onclick={onMute} onmouseenter={onHover} aria-label={muted ? 'Unmute sound (M)' : 'Mute sound (M)'}>
			<svg viewBox="0 0 40 30" aria-hidden="true">
				<path d="M6 11 L13 11 L21 4 L21 26 L13 19 L6 19 Z" fill="#fff" stroke="#2b2b2e" stroke-width="2.4" stroke-linejoin="round" />
				{#if muted}
					<path d="M27 10 L35 20 M35 10 L27 20" stroke="#2b2b2e" stroke-width="2.6" stroke-linecap="round" />
				{:else}
					<path d="M26 10 C29 13 29 17 26 20 M30 6 C36 11 36 19 30 24" fill="none" stroke="#2b2b2e" stroke-width="2.4" stroke-linecap="round" />
				{/if}
			</svg>
		</button>
	</div>

	{#if area}
		{#key area.key}
			<div class="area" in:fly={{ y: -16, duration: 500 }} out:fade={{ duration: 400 }}>
				<span class="area-name">{area.name}</span>
				<span class="area-urdu" lang="ur" dir="rtl">{area.urdu}</span>
			</div>
		{/key}
	{/if}

	{#if prompt && !dialogue && !shop}
		<button type="button" class="prompt {prompt.kind}" onclick={onInteract} transition:scale={{ duration: 180, start: 0.85 }}>
			<kbd>{prompt.key ?? 'E'}</kbd>
			<span class="prompt-icon" aria-hidden="true">{icons[prompt.kind]}</span>
			<span class="prompt-label">{prompt.label}</span>
			{#if prompt.sub}<span class="prompt-sub" lang="ur">{prompt.sub}</span>{/if}
		</button>
	{/if}

	{#if dialogue}
		<div
			class="bubble"
			class:offscreen={!dialogue.onScreen}
			style="left: {Math.max(170, Math.min(dialogue.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 170))}px; top: {Math.max(150, dialogue.y)}px"
			transition:scale={{ duration: 160, start: 0.6 }}
		>
			{#if dialogue.name}<p class="speaker">{dialogue.name}</p>{/if}
			{#key dialogue.index}
				<p class="line-ur" in:fade={{ duration: 160 }}>{dialogue.line.ur}</p>
				<p class="line-en" in:fade={{ duration: 160 }}>{dialogue.line.en}</p>
			{/key}
			<p class="next"><kbd>E</kbd> {dialogue.index + 1 < dialogue.total ? 'next' : 'close'} · {dialogue.index + 1}/{dialogue.total}</p>
		</div>
	{/if}

	{#if shop}
		<div class="shop" transition:fly={{ y: 30, duration: 260 }}>
			<p class="shop-urdu" lang="ur" dir="rtl">{shop.urdu}</p>
			<h3>{shop.label}</h3>
			<p>{shop.info}</p>
			<p class="next"><kbd>E</kbd> close</p>
		</div>
	{/if}

	{#if toast}
		{#key toast.key}
			<div class="toast" in:fly={{ y: 24, duration: 300 }} out:fade={{ duration: 300 }}>{toast.text}</div>
		{/key}
	{/if}

	{#if ride === 'bike'}
		<div class="ride" transition:fly={{ y: 20, duration: 240 }}>
			<span class="ride-title">🚲 Sohrab cycle <span lang="ur">سہراب</span></span>
			<span><kbd>W A S D</kbd> pedal · <kbd>Space</kbd> hop · <kbd>R</kbd> tring tring · <kbd>C</kbd> get off</span>
		</div>
	{:else if ride === 'boat'}
		<div class="ride" transition:fly={{ y: 20, duration: 240 }}>
			<span class="ride-title">🛶 Ravi boat <span lang="ur">کشتی</span></span>
			<span><kbd>W</kbd> / <kbd>S</kbd> row · <kbd>A</kbd> / <kbd>D</kbd> steer · <kbd>K</kbd> step ashore near land</span>
		</div>
	{:else if showHelp}
		<div class="help" out:fade={{ duration: 800 }}>
			<kbd>W A S D</kbd> walk · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump · <kbd>E</kbd> interact · <kbd>C</kbd> Sohrab cycle · <kbd>K</kbd> boat at the river · drag to look · <kbd>H</kbd> collection
		</div>
	{/if}
</div>

<style>
	.hud {
		position: absolute;
		inset: 0;
		z-index: 6;
		pointer-events: none;
		font-family: 'Gochi Hand', 'Segoe Print', cursive;
		color: #2b2b2e;
	}

	kbd {
		display: inline-block;
		min-width: 1.4em;
		padding: 0 0.35em;
		border: 2px solid #2b2b2e;
		border-radius: 5px;
		background: #fff;
		font-family: inherit;
		text-align: center;
		box-shadow: 0 2px 0 #2b2b2e;
	}

	.side-buttons {
		position: absolute;
		top: 1.1rem;
		right: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		pointer-events: auto;
	}

	.side {
		position: relative;
		width: 58px;
		height: 50px;
		display: grid;
		place-items: center;
		background: #fff;
		border: 3px solid #2b2b2e;
		border-radius: 14px;
		box-shadow: 0 4px 0 #2b2b2e;
		cursor: pointer;
		transition: transform 120ms ease;
	}

	.side:hover {
		transform: translateY(-2px) rotate(-3deg);
	}

	.side svg {
		width: 34px;
	}

	.count {
		position: absolute;
		bottom: -12px;
		right: -10px;
		padding: 0 0.4em;
		font-size: 0.95rem;
		background: #f2c14f;
		border: 2px solid #2b2b2e;
		border-radius: 999px;
	}

	.area {
		position: absolute;
		top: 1.3rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		color: #fff;
		text-shadow: 0 2px 0 #373f42, 0 0 10px rgb(55 63 66 / 0.4);
	}

	.area-name {
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: clamp(1.1rem, 2.4vw, 1.6rem);
		letter-spacing: 0.08em;
		-webkit-text-stroke: 0.04em #373f42;
		paint-order: stroke fill;
	}

	.area-urdu {
		font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif;
		font-size: 1.05rem;
		line-height: 1.9;
	}

	.prompt {
		position: absolute;
		left: 50%;
		bottom: 2.2rem;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.45rem 1rem 0.45rem 0.55rem;
		font-family: inherit;
		font-size: 1.25rem;
		background: #fff;
		border: 3px solid #2b2b2e;
		border-radius: 999px;
		box-shadow: 0 4px 0 #2b2b2e;
		pointer-events: auto;
		cursor: pointer;
		white-space: nowrap;
	}

	.prompt.discover {
		background: #fff4cf;
	}

	.prompt-sub {
		font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif;
		font-size: 0.95rem;
		color: #6b6f72;
	}

	.bubble {
		position: absolute;
		transform: translate(-50%, calc(-100% - 18px));
		width: min(330px, 80vw);
		padding: 0.6rem 0.9rem 0.5rem;
		background: #fff;
		border: 3px solid #2b2b2e;
		border-radius: 18px;
		box-shadow: 0 4px 0 #2b2b2e;
	}

	.bubble::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -14px;
		width: 22px;
		height: 22px;
		background: #fff;
		border-right: 3px solid #2b2b2e;
		border-bottom: 3px solid #2b2b2e;
		transform: translateX(-50%) rotate(45deg);
	}

	.bubble.offscreen {
		left: 50% !important;
		top: auto !important;
		bottom: 7rem;
		transform: translateX(-50%);
	}

	.speaker {
		margin: 0;
		font-size: 0.95rem;
		color: #c8423a;
	}

	.line-ur {
		margin: 0.1rem 0 0;
		font-size: 1.25rem;
		line-height: 1.25;
	}

	.line-en {
		margin: 0.2rem 0 0;
		font-family: system-ui, sans-serif;
		font-size: 0.85rem;
		color: #5b6064;
	}

	.next {
		margin: 0.35rem 0 0;
		font-size: 0.9rem;
		color: #6b6f72;
		text-align: right;
	}

	.shop {
		position: absolute;
		left: 50%;
		bottom: 2rem;
		transform: translateX(-50%);
		width: min(420px, 88vw);
		padding: 0.8rem 1.1rem;
		background: #fffaf0;
		border: 3px solid #2b2b2e;
		border-radius: 16px;
		box-shadow: 0 5px 0 #2b2b2e;
	}

	.shop h3 {
		margin: 0;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 1.1rem;
		letter-spacing: 0.04em;
	}

	.shop p {
		margin: 0.3rem 0 0;
		font-family: system-ui, sans-serif;
		font-size: 0.92rem;
		line-height: 1.4;
	}

	.shop .shop-urdu {
		float: right;
		margin: -0.3rem 0 0 0.6rem;
		font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif;
		font-size: 1.3rem;
		color: #c8423a;
	}

	.toast {
		position: absolute;
		left: 50%;
		bottom: 6.4rem;
		transform: translateX(-50%);
		padding: 0.4rem 1rem;
		font-size: 1.15rem;
		background: #f2c14f;
		border: 3px solid #2b2b2e;
		border-radius: 999px;
		box-shadow: 0 4px 0 #2b2b2e;
		white-space: nowrap;
	}

	.help {
		position: absolute;
		left: 1.1rem;
		bottom: 1.1rem;
		font-size: 1rem;
		color: #fff;
		text-shadow: 0 2px 0 #373f42;
	}

	.help kbd {
		color: #2b2b2e;
		text-shadow: none;
	}

	.ride {
		position: absolute;
		left: 1.1rem;
		bottom: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.45rem 0.9rem 0.55rem;
		font-size: 1rem;
		background: #fff;
		border: 3px solid #2b2b2e;
		border-radius: 14px;
		box-shadow: 0 4px 0 #2b2b2e;
	}

	.ride-title {
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 0.95rem;
		letter-spacing: 0.04em;
	}

	.ride-title span {
		font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif;
		font-size: 0.9rem;
		color: #c8423a;
	}
</style>
