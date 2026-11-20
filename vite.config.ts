import { defineConfig } from 'vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Runes mode for project code, legacy mode for libraries in node_modules.
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
				experimental: { async: true }
			},
			// adapter-auto covers the common hosts; swap it for a specific adapter if you deploy
			// somewhere it does not detect. See https://svelte.dev/docs/kit/adapters
			adapter: adapter(),
			experimental: { remoteFunctions: true, handleRenderingErrors: true }
		})
	]
});
