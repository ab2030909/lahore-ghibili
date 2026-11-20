import { defineEnvVars } from '@sveltejs/kit/hooks';

/**
 * Minimal Standard Schema validator: optional string (empty when unset), so the game still
 * runs without Cloudinary credentials and explains how to configure them.
 */
const optional = {
	'~standard': {
		version: 1 as const,
		vendor: 'lahore',
		validate: (value: unknown) => ({ value: typeof value === 'string' ? value.trim() : '' }),
		types: undefined as unknown as { input: string | undefined; output: string }
	}
};

/** Environment variables (SvelteKit 3). See .env.example. */
export const variables = defineEnvVars({
	PUBLIC_CLOUDINARY_CLOUD_NAME: {
		public: true,
		schema: optional,
		description: 'Cloudinary cloud name used to build delivery URLs in the browser.'
	},
	PUBLIC_CLOUDINARY_FOLDER: {
		public: true,
		schema: optional,
		description: 'Folder holding the seeded heritage assets (default lahore-heritage).'
	},
	PUBLIC_CLOUDINARY_DELIVERY: {
		public: true,
		schema: optional,
		description: '"upload" (seeded assets) or "fetch" (Cloudinary fetches Wikimedia originals).'
	},
	CLOUDINARY_API_KEY: {
		schema: optional,
		description: 'Server-only Cloudinary API key (Search API, signed uploads, seeding).'
	},
	CLOUDINARY_API_SECRET: {
		schema: optional,
		description: 'Server-only Cloudinary API secret. Never exposed to the browser.'
	}
});
