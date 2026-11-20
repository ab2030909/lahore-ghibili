import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cloudinaryServer, toCurated, type CuratedResource } from '$lib/server/cloudinary';

/**
 * GET /api/heritage
 * Uses the Cloudinary Search API (server-side, signed with the API secret) to list what is
 * in the heritage folder: seeded postcard photos, uploaded heritage videos, extra photos a
 * curator tagged `lahore-curated` in the Media Library, and approved visitor memories.
 */
export const GET: RequestHandler = async ({ setHeaders }) => {
	const { cloudinary, configured, cloudName, folder } = cloudinaryServer();
	if (!configured) {
		return json({ configured: false, cloudName: cloudName || null, folder, assets: [], videos: [], curated: [], visitors: [] });
	}
	try {
		const result = await cloudinary.search
			.expression(`public_id:${folder}/*`)
			.with_field('context')
			.with_field('tags')
			.sort_by('created_at', 'desc')
			.max_results(200)
			.execute();
		const resources = (result.resources ?? []).map((r: Parameters<typeof toCurated>[0]) => toCurated(r, folder)) as CuratedResource[];
		setHeaders({ 'cache-control': 'public, max-age=60' });
		return json({
			configured: true,
			cloudName,
			folder,
			assets: resources.filter((r) => r.tags.includes('lahore-postcard')).map((r) => r.publicId),
			videos: resources.filter((r) => r.resourceType === 'video'),
			curated: resources.filter((r) => r.tags.includes('lahore-curated')),
			visitors: resources.filter((r) => r.tags.includes('lahore-visitor') && r.tags.includes('approved'))
		});
	} catch (error) {
		console.error('Cloudinary search failed', error);
		return json({ configured: true, cloudName, folder, error: 'search_failed', assets: [], videos: [], curated: [], visitors: [] }, { status: 502 });
	}
};
