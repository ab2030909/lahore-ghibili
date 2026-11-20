import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '$app/env/private';
import { PUBLIC_CLOUDINARY_CLOUD_NAME, PUBLIC_CLOUDINARY_FOLDER } from '$app/env/public';

/**
 * Server-only Cloudinary client. The API secret is read from the private environment and
 * never reaches the browser; the client only ever sees the public cloud name.
 */
export function cloudinaryServer() {
	const cloudName = PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
	const apiKey = CLOUDINARY_API_KEY ?? '';
	const apiSecret = CLOUDINARY_API_SECRET ?? '';
	const folder = PUBLIC_CLOUDINARY_FOLDER || 'lahore-heritage';
	const configured = !!(cloudName && apiKey && apiSecret);
	if (configured) cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
	return { cloudinary, configured, cloudName, apiKey, folder };
}

export type CuratedResource = {
	publicId: string;
	resourceType: 'image' | 'video';
	landmark: string | null;
	caption?: string;
	credit?: string;
	width?: number;
	height?: number;
	tags: string[];
};

type SearchResource = {
	public_id: string;
	resource_type: 'image' | 'video';
	width?: number;
	height?: number;
	tags?: string[];
	context?: Record<string, string>;
	asset_folder?: string;
	folder?: string;
};

export function toCurated(r: SearchResource, folder: string): CuratedResource {
	const path = r.public_id.startsWith(`${folder}/`) ? r.public_id.slice(folder.length + 1) : r.public_id;
	const landmark = path.includes('/') ? path.split('/')[0] : null;
	return {
		publicId: r.public_id,
		resourceType: r.resource_type,
		landmark,
		caption: r.context?.caption ?? r.context?.alt,
		credit: r.context?.credit,
		width: r.width,
		height: r.height,
		tags: r.tags ?? []
	};
}
