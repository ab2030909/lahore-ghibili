<script lang="ts">
	import { fade } from 'svelte/transition';

	let {
		visible,
		onBegin,
		onHover,
		onLetter
	}: { visible: boolean; onBegin: () => void; onHover?: () => void; onLetter?: () => void } = $props();

	const letters = 'LAHORE'.split('');

	$effect(() => {
		if (!visible || !onLetter) return;
		const timers = letters.map((_, i) => setTimeout(() => onLetter?.(), 350 + i * 140));
		return () => timers.forEach(clearTimeout);
	});
</script>

{#if visible}
	<div class="title-screen" out:fade={{ duration: 500 }}>
		<h1 aria-label="Lahore">
			{#each letters as letter, i (i)}
				<span class="letter" style="--i: {i}">{letter}</span>
			{/each}
		</h1>
		<p class="subtitle">A CITY OF STORIES</p>
		<p class="urdu" lang="ur" dir="rtl">ہر گلی میں ایک کہانی ہے</p>
		<p class="tagline">Har gali mein aik kahani hai.</p>
		<button class="begin" type="button" onclick={onBegin} onmouseenter={onHover}>BEGIN</button>
		<p class="controls">
			<kbd>W A S D</kbd> walk · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump · <kbd>E</kbd> talk &amp; discover ·
			<kbd>C</kbd> Sohrab cycle · <kbd>K</kbd> boat · <kbd>R</kbd> bell · drag to look · <kbd>H</kbd> collection
		</p>
	</div>
{/if}

<style>
	.title-screen {
		position: absolute;
		inset: 0;
		z-index: 5;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		text-align: center;
		color: #fff;
	}

	h1 {
		margin: 0;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: clamp(4.5rem, 16vw, 12.5rem);
		line-height: 0.9;
		letter-spacing: 0.04em;
		display: flex;
		gap: 0.02em;
	}

	.letter {
		display: inline-block;
		color: #f7f4ec;
		-webkit-text-stroke: 0.035em #373f42;
		paint-order: stroke fill;
		text-shadow:
			0.02em 0.02em 0 #373f42,
			0.04em 0.04em 0 #373f42,
			0.06em 0.06em 0 #2b3134,
			0.08em 0.08em 0 #2b3134;
		opacity: 0;
		transform: translateY(0.25em) rotate(-6deg) scale(0.8);
		animation: drop 0.55s cubic-bezier(0.2, 1.4, 0.4, 1) forwards;
		animation-delay: calc(0.35s + var(--i) * 0.14s);
	}

	.letter:nth-child(even) {
		transform: translateY(-0.25em) rotate(6deg) scale(0.8);
	}

	@keyframes drop {
		to {
			opacity: 1;
			transform: none;
		}
	}

	.subtitle,
	.tagline,
	.urdu {
		margin: 0;
		opacity: 0;
		animation: rise 0.8s ease-out forwards;
	}

	.subtitle {
		margin-top: 0.6rem;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: clamp(1rem, 2.6vw, 1.7rem);
		letter-spacing: 0.32em;
		color: #f7f4ec;
		-webkit-text-stroke: 0.06em #373f42;
		paint-order: stroke fill;
		text-shadow: 0.08em 0.08em 0 #373f42;
		animation-delay: 1.4s;
	}

	.urdu {
		margin-top: 0.9rem;
		font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif;
		font-size: clamp(1.3rem, 3vw, 2rem);
		line-height: 2.1;
		color: #fff9e8;
		text-shadow: 0 2px 0 #373f42, 0 0 12px rgb(55 63 66 / 0.35);
		animation-delay: 1.8s;
	}

	.tagline {
		font-family: 'Gochi Hand', 'Segoe Print', cursive;
		font-size: clamp(1.1rem, 2.4vw, 1.6rem);
		color: #fff;
		text-shadow: 0 2px 0 #373f42;
		animation-delay: 2.1s;
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.begin {
		pointer-events: auto;
		margin-top: clamp(1.4rem, 5vh, 3.2rem);
		padding: 0.55em 1.9em 0.45em;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: clamp(1.1rem, 2.2vw, 1.5rem);
		letter-spacing: 0.12em;
		color: #fff7df;
		-webkit-text-stroke: 0.05em #373f42;
		paint-order: stroke fill;
		background: #f2c14f;
		border: 3px solid #373f42;
		border-radius: 6px;
		box-shadow: 0 6px 0 #373f42;
		cursor: pointer;
		opacity: 0;
		animation: rise 0.6s ease-out 2.5s forwards;
		transition:
			transform 120ms ease,
			box-shadow 120ms ease,
			background 120ms ease;
	}

	.begin:hover {
		transform: translateY(-2px) rotate(-2deg);
		background: #f5cd68;
	}

	.begin:active {
		transform: translateY(4px);
		box-shadow: 0 2px 0 #373f42;
	}

	.begin:focus-visible {
		outline: 3px dashed #fff;
		outline-offset: 4px;
	}

	.controls {
		position: absolute;
		bottom: 1.4rem;
		margin: 0;
		padding: 0 1rem;
		font-family: 'Gochi Hand', 'Segoe Print', cursive;
		font-size: 1.05rem;
		color: #fff;
		text-shadow: 0 2px 0 #373f42;
		opacity: 0;
		animation: rise 0.8s ease-out 3s forwards;
	}

	kbd {
		display: inline-block;
		padding: 0 0.4em;
		border: 2px solid #373f42;
		border-radius: 5px;
		background: #f7f4ec;
		color: #373f42;
		font-family: inherit;
		text-shadow: none;
		box-shadow: 0 2px 0 #373f42;
	}

	@media (prefers-reduced-motion: reduce) {
		.letter,
		.subtitle,
		.urdu,
		.tagline,
		.begin,
		.controls {
			animation-duration: 1ms;
			animation-delay: 0s;
		}
	}
</style>
