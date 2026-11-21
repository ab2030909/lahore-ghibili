import { defineConfig } from 'vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Runes mode for project code, legacy mode for libraries in node_modules.
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
				experimental: { async: true }
			},
			// Static SPA build (the game is fully client-rendered). Served as plain static
			// files on Vercel; `fallback` makes it a single-page app. See adapter-static docs.
			adapter: adapter({ fallback: 'index.html', strict: false }),
			experimental: { remoteFunctions: true, handleRenderingErrors: true }
		})
	]
});
