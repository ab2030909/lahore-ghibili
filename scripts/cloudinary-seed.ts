/**
 * Seed the Lahore heritage postcards into your Cloudinary product environment.
 *
 *   node scripts/cloudinary-seed.ts            (Node 24+, runs TypeScript directly)
 *
 * Reads PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and
 * PUBLIC_CLOUDINARY_FOLDER from .env. For every landmark photo it uploads the Wikimedia
 * Commons image (1920px rendition) as <folder>/<landmark>/<slot>, tagged `lahore-postcard`,
 * with caption/credit/license context, and eagerly generates the heritage film
 * (e_zoompan -> MP4) for the main photo so the first viewer does not wait.
 * Optional: put real heritage videos at heritage-media/<landmark>.mp4 to upload them too.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { LANDMARKS } from '../src/lib/lahore/heritage/landmarks.ts';

function loadEnv() {
	const file = resolve('.env');
	if (!existsSync(file)) return;
	for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').replace(/\s+#.*$/, '');
	}
}

loadEnv();
const cloudName = process.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const folder = process.env.PUBLIC_CLOUDINARY_FOLDER || 'lahore-heritage';

if (!cloudName || !apiKey || !apiSecret) {
	console.error('Missing Cloudinary credentials. Copy .env.example to .env and fill in PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.');
	process.exit(1);
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

const UA = 'LahoreMessengerHeritage/1.0 (hackathon project; seeding CC-licensed Commons images)';

function commonsRendition(source: string, width = 1920): string {
	const m = source.match(/\/wikipedia\/commons\/(\w)\/(\w\w)\/([^/?]+)/);
	if (!m) return source;
	return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${m[3]}/${width}px-${m[3]}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Download from Wikimedia. Commons rate-limits bulk downloads (HTTP 429), so retry with
 * exponential backoff and honour Retry-After when it is sent.
 */
async function asDataUri(url: string, attempts = 5): Promise<string> {
	let wait = 4000;
	for (let i = 1; i <= attempts; i++) {
		const res = await fetch(url, { headers: { 'User-Agent': UA } });
		if (res.ok) {
			const type = res.headers.get('content-type') ?? 'image/jpeg';
			const buf = Buffer.from(await res.arrayBuffer());
			return `data:${type};base64,${buf.toString('base64')}`;
		}
		if (res.status !== 429 && res.status < 500) throw new Error(`Download failed ${res.status} for ${url}`);
		if (i === attempts) throw new Error(`Download failed ${res.status} after ${attempts} tries for ${url}`);
		const retryAfter = Number(res.headers.get('retry-after'));
		const pause = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : wait;
		console.log(`  ${res.status} from Commons, waiting ${Math.round(pause / 1000)}s (try ${i}/${attempts})`);
		await sleep(pause);
		wait *= 2;
	}
	throw new Error(`Download failed for ${url}`);
}

async function exists(publicId: string, type: 'image' | 'video' = 'image') {
	try {
		await cloudinary.api.resource(publicId, { resource_type: type });
		return true;
	} catch {
		return false;
	}
}

let uploaded = 0;
let skipped = 0;
const failed: string[] = [];
for (const landmark of LANDMARKS) {
	for (const [i, photo] of landmark.photos.entries()) {
		const publicId = `${folder}/${landmark.id}/${photo.slot}`;
		if (await exists(publicId)) {
			console.log(`= ${publicId} already in Cloudinary`);
			skipped++;
			continue;
		}
		const options = {
			public_id: publicId,
			overwrite: false,
			resource_type: 'image' as const,
			tags: ['lahore-postcard', landmark.id],
			context: {
				caption: photo.caption,
				alt: `${landmark.name}: ${photo.caption}`,
				credit: `${photo.author} / Wikimedia Commons, ${photo.license}`,
				license_url: photo.licenseUrl,
				source_page: photo.commonsPage
			},
			eager:
				i === 0
					? [
							{
								raw_transformation: `e_zoompan:mode_${landmark.film.mode};maxzoom_${landmark.film.maxzoom};du_${landmark.film.duration};fps_25/c_scale,w_960/q_auto`,
								format: 'mp4'
							},
							{ raw_transformation: 'c_fill,g_auto,w_960,h_640/e_improve/f_auto,q_auto' }
						]
					: undefined,
			eager_async: true
		};
		// the original file URL (CDN-cached) is far less rate-limited than the /thumb/ renderer
		try {
			try {
				// let Cloudinary fetch the original directly (no bandwidth through this machine)
				await cloudinary.uploader.upload(photo.source, options);
			} catch (error) {
				console.warn(`  remote upload refused (${(error as Error).message ?? error}); downloading locally`);
				await cloudinary.uploader.upload(await asDataUri(photo.source), options);
			}
			console.log(`+ ${publicId}`);
			uploaded++;
		} catch (error) {
			console.error(`! ${publicId} skipped: ${(error as Error).message ?? error}`);
			failed.push(publicId);
		}
		// be polite to Commons between photos
		await sleep(1500);
	}

	const video = resolve('heritage-media', `${landmark.id}.mp4`);
	if (existsSync(video)) {
		const publicId = `${folder}/${landmark.id}/film`;
		if (!(await exists(publicId, 'video'))) {
			await cloudinary.uploader.upload(video, { resource_type: 'video', public_id: publicId, tags: ['lahore-video', landmark.id] });
			console.log(`+ ${publicId} (video)`);
		}
	}
}

console.log(`\nDone: ${uploaded} uploaded, ${skipped} already present in "${folder}" on cloud "${cloudName}".`);
if (failed.length) {
	console.log(`${failed.length} could not be fetched from Commons (rate limiting). Run the command again to pick them up:`);
	for (const id of failed) console.log(`  - ${id}`);
}
