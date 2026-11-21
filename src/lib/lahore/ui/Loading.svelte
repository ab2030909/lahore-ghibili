<script lang="ts">
	import { fade } from 'svelte/transition';

	let { visible, progress, label, error }: { visible: boolean; progress: number; label: string; error?: string | null } = $props();
</script>

{#if visible}
	<div class="loading" out:fade={{ duration: 600 }} role="status" aria-live="polite">
		<svg class="postcard" viewBox="0 0 120 84" aria-hidden="true">
			<!-- tourist camera -->
			<path d="M40 22 L48 14 L72 14 L80 22 Z" fill="#fff" stroke="#2b2b2e" stroke-width="3" stroke-linejoin="round" />
			<rect x="12" y="22" width="96" height="50" rx="8" fill="#fff" stroke="#2b2b2e" stroke-width="3" stroke-linejoin="round" />
			<circle cx="60" cy="48" r="17" fill="#fff" stroke="#2b2b2e" stroke-width="3" />
			<circle cx="60" cy="48" r="8" fill="#c8423a" stroke="#2b2b2e" stroke-width="2.4" />
			<circle cx="55" cy="43" r="2.5" fill="#fff" />
			<rect x="86" y="30" width="12" height="7" rx="2" fill="#c8423a" stroke="#2b2b2e" stroke-width="2" />
		</svg>
		<p class="label">{error ? 'Something went wrong' : 'LOADING'}</p>
		<div class="bar" aria-hidden="true"><span style="width: {Math.round(progress * 100)}%"></span></div>
		<p class="detail">{error ?? label}</p>
	</div>
{/if}

<style>
	.loading {
		position: absolute;
		inset: 0;
		z-index: 20;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		background: #fff;
		color: #2b2b2e;
		font-family: 'Gochi Hand', 'Segoe Print', cursive;
	}

	.postcard {
		width: 74px;
		animation: wobble 1.6s ease-in-out infinite;
	}

	@keyframes wobble {
		0%,
		100% {
			transform: rotate(-4deg) translateY(0);
		}
		50% {
			transform: rotate(4deg) translateY(-4px);
		}
	}

	.label {
		margin: 0.2rem 0 0;
		font-size: 1.15rem;
		letter-spacing: 0.18em;
	}

	.bar {
		width: 160px;
		height: 8px;
		border: 2px solid #2b2b2e;
		border-radius: 999px;
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		background: #c8423a;
		transition: width 200ms ease;
	}

	.detail {
		margin: 0;
		min-height: 1.4em;
		font-size: 1rem;
		color: #6b6f72;
	}
</style>
