import { PUBLIC_CLOUDINARY_CLOUD_NAME, PUBLIC_CLOUDINARY_DELIVERY, PUBLIC_CLOUDINARY_FOLDER } from '$app/env/public';
import type { HeritagePhoto, Landmark } from './landmarks';

/**
 * Cloudinary delivery for the Lahore heritage layer, built on Cloudinary's documented
 * delivery URL format:
 *   https://res.cloudinary.com/<cloud>/<image|video>/<upload|fetch>/<transformations>/<public id or URL>
 *
 * - `upload` (default): assets seeded into your product environment by
 *   `scripts/cloudinary-seed.mjs` as <folder>/<landmark>/<slot>
 * - `fetch`: Cloudinary fetches the Wikimedia Commons originals on the fly (needs
 *   "Fetched URL" unrestricted in the Cloudinary console)
 *
 * Every image uses f_auto + q_auto. Crops use g_auto, sizes come from responsive widths,
 * locked postcards use e_grayscale + e_blur, films use e_zoompan (image -> MP4).
 * Only the public cloud name is used in the browser; the API secret stays server-side.
 */

export type Delivery = 'upload' | 'fetch';

export const cloudinary = {
	cloudName: PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',
	folder: PUBLIC_CLOUDINARY_FOLDER || 'lahore-heritage',
	delivery: (PUBLIC_CLOUDINARY_DELIVERY === 'fetch' ? 'fetch' : 'upload') as Delivery
};

export const isCloudinaryConfigured = (): boolean => cloudinary.cloudName.length > 0;

export const RESPONSIVE_WIDTHS = [320, 480, 640, 960, 1280, 1600, 2000];

export function publicIdFor(landmark: Landmark, photo: HeritagePhoto): string {
	return `${cloudinary.folder}/${landmark.id}/${photo.slot}`;
}

type ImageOptions = {
	width?: number;
	height?: number;
	crop?: 'fill' | 'fit' | 'limit' | 'thumb' | 'scale' | 'pad';
	gravity?: string;
	quality?: string;
	effects?: string[];
	dpr?: number;
	extra?: string[];
};

function transformation(o: ImageOptions): string {
	const crop: string[] = [];
	if (o.crop) crop.push(`c_${o.crop}`);
	if (o.width) crop.push(`w_${Math.round(o.width)}`);
	if (o.height) crop.push(`h_${Math.round(o.height)}`);
	if (o.crop === 'fill' || o.crop === 'thumb') crop.push(`g_${o.gravity ?? 'auto'}`);
	if (o.crop === 'pad') crop.push('b_auto');
	if (o.dpr) crop.push(`dpr_${o.dpr}`);
	const parts = [...(o.effects ?? []), crop.join(','), ...(o.extra ?? []), `f_auto,q_${o.quality ?? 'auto'}`];
	return parts.filter(Boolean).join('/');
}

/** Wikimedia thumbnail (only used when Cloudinary is not configured, so the game still works). */
function commonsThumb(source: string, width: number): string {
	const m = source.match(/\/wikipedia\/commons\/(\w)\/(\w\w)\/([^/?]+)/);
	if (!m) return source;
	const standard = [330, 500, 960, 1280, 1920].find((w) => w >= width) ?? 1920;
	return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${m[3]}/${standard}px-${m[3]}`;
}

export function imageUrl(landmark: Landmark, photo: HeritagePhoto, options: ImageOptions = {}): string {
	if (!isCloudinaryConfigured()) return commonsThumb(photo.source, options.width ?? 960);
	const t = transformation({ gravity: photo.gravity, ...options });
	const base = `https://res.cloudinary.com/${cloudinary.cloudName}/image`;
	if (cloudinary.delivery === 'fetch') return `${base}/fetch/${t}/${encodeURIComponent(photo.source)}`;
	return `${base}/upload/${t}/${publicIdFor(landmark, photo)}`;
}

/** Responsive srcset for a given aspect ratio. */
export function srcset(landmark: Landmark, photo: HeritagePhoto, aspect: number, options: ImageOptions = {}): string {
	return RESPONSIVE_WIDTHS.map((w) => `${imageUrl(landmark, photo, { crop: 'fill', width: w, height: w / aspect, ...options })} ${w}w`).join(', ');
}

/** Hero image for the postcard face. */
export const postcardImage = (l: Landmark, p = l.photos[0], width = 960) =>
	imageUrl(l, p, { crop: 'fill', width, height: width / 1.5, effects: ['e_improve'] });

/** Collection thumbnail. */
export const thumbnail = (l: Landmark, p = l.photos[0], size = 360) =>
	imageUrl(l, p, { crop: 'thumb', width: size, height: Math.round(size * 0.72) });

/** Undiscovered postcard teaser: grayscale + heavy blur. */
export const lockedThumbnail = (l: Landmark, size = 360) =>
	imageUrl(l, l.photos[0], { crop: 'fill', width: size, height: Math.round(size * 0.72), effects: ['e_grayscale', 'e_blur:900'], quality: 'auto:low' });

/** Tiny blurred placeholder (LQIP) shown while the full image streams in. */
export const placeholder = (l: Landmark, p = l.photos[0]) =>
	imageUrl(l, p, { crop: 'fill', width: 48, height: 32, effects: ['e_blur:400'], quality: 'auto:low' });

/** Full-resolution view (limit, keeps aspect). */
export const fullImage = (l: Landmark, p: HeritagePhoto, width = 2000) =>
	imageUrl(l, p, { crop: 'limit', width, quality: 'auto:good' });

function textLayer(text: string, font: string, color: string, placement: string, extra = ''): string {
	// Cloudinary text layers: URL-encode, and double-escape commas and slashes
	const encoded = encodeURIComponent(text).replace(/%2C/g, '%252C').replace(/%2F/g, '%252F');
	return `co_rgb:${color},l_text:${font}:${encoded}${extra}/fl_layer_apply,${placement}`;
}

/**
 * Shareable postcard composed entirely by Cloudinary: cropped photo, cream border,
 * landmark name and "Greetings from Lahore" text layers.
 */
export function shareablePostcard(l: Landmark): string | null {
	if (!isCloudinaryConfigured()) return null;
	const p = l.photos[0];
	const steps = [
		'c_fill,g_auto,w_1200,h_800',
		'e_improve',
		textLayer(l.name.toUpperCase(), 'Arial_64_bold', 'ffffff', 'g_south_west,x_48,y_84'),
		textLayer('Greetings from Lahore · Har gali mein aik kahani hai', 'Arial_30', 'fff4d6', 'g_south_west,x_50,y_40'),
		'bo_28px_solid_rgb:f4ecd8',
		'f_auto,q_auto'
	].join('/');
	const base = `https://res.cloudinary.com/${cloudinary.cloudName}/image`;
	if (cloudinary.delivery === 'fetch') return `${base}/fetch/${steps}/${encodeURIComponent(p.source)}`;
	return `${base}/upload/${steps}/${publicIdFor(l, p)}`;
}

/**
 * Heritage film: Cloudinary turns the landmark photograph into a short MP4 with the
 * zoompan (Ken Burns) effect. Returns null without Cloudinary.
 */
export function filmUrl(l: Landmark): { src: string; poster: string } | null {
	if (!isCloudinaryConfigured()) return null;
	const { mode, maxzoom, duration } = l.film;
	const effect = `e_zoompan:mode_${mode};maxzoom_${maxzoom};du_${duration};fps_25`;
	const base = `https://res.cloudinary.com/${cloudinary.cloudName}/image`;
	const p = l.photos[0];
	const poster = postcardImage(l, p, 960);
	if (cloudinary.delivery === 'fetch') {
		return { src: `${base}/fetch/${effect}/c_scale,w_960/q_auto/f_mp4/${encodeURIComponent(p.source)}`, poster };
	}
	return { src: `${base}/upload/${effect}/c_scale,w_960/q_auto/${publicIdFor(l, p)}.mp4`, poster };
}

/** Uploaded heritage video (if the curator added one), delivered with f_auto/q_auto. */
export function videoUrl(publicId: string, width = 1280): { src: string; poster: string } | null {
	if (!isCloudinaryConfigured()) return null;
	const base = `https://res.cloudinary.com/${cloudinary.cloudName}/video/upload`;
	return {
		src: `${base}/c_limit,w_${width}/f_auto:video,q_auto/${publicId}`,
		poster: `${base}/so_1,c_limit,w_${Math.round(width * 0.75)}/f_auto,q_auto/${publicId}.jpg`
	};
}

/** Extra assets curated in the Cloudinary Media Library (via the server endpoint). */
export type CuratedAsset = { publicId: string; resourceType: 'image' | 'video'; caption?: string; credit?: string; width?: number; height?: number };

export function curatedImageUrl(asset: CuratedAsset, width = 640, height?: number): string {
	const crop = height ? `c_fill,g_auto,w_${width},h_${height}` : `c_limit,w_${width}`;
	return `https://res.cloudinary.com/${cloudinary.cloudName}/image/upload/${crop}/f_auto,q_auto/${asset.publicId}`;
}
