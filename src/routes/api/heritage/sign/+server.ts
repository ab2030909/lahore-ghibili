import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cloudinaryServer } from '$lib/server/cloudinary';
import { LANDMARKS } from '$lib/lahore/heritage/landmarks';

const VALID = new Set<string>(LANDMARKS.map((l) => l.id));

/**
 * POST /api/heritage/sign  { landmark: "<landmark id>" }
 * Returns a short-lived signature for a direct browser upload of a visitor's own photo of a
 * Lahore landmark. Upload parameters (folder, tags, size limits) are fixed here on the
 * server so a client cannot change them; images are tagged for moderation and only
 * displayed once a curator adds the `approved` tag.
 */
export const POST: RequestHandler = async ({ request }) => {
	const { cloudinary, configured, cloudName, apiKey, folder } = cloudinaryServer();
	if (!configured) error(503, 'Cloudinary is not configured on the server');
	let landmark = '';
	try {
		const body = (await request.json()) as { landmark?: string };
		landmark = String(body.landmark ?? '');
	} catch {
		error(400, 'Invalid JSON');
	}
	if (!VALID.has(landmark)) error(400, 'Unknown landmark');

	const timestamp = Math.round(Date.now() / 1000);
	const params = {
		timestamp,
		folder: `${folder}/visitor-memories/${landmark}`,
		tags: `lahore-visitor,${landmark}`,
		context: `landmark=${landmark}`,
		allowed_formats: 'jpg,jpeg,png,webp,heic',
		transformation: 'c_limit,w_2400,h_2400'
	};
	const signature = cloudinary.utils.api_sign_request(params, cloudinary.config().api_secret as string);
	return json({ ...params, signature, apiKey, cloudName, uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload` });
};
