import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';
import { mulberry32, type Rng } from '../core/math';

/**
 * Procedural decoration atlas (original artwork, painted at runtime with Canvas 2D).
 * Tiling regions (bricks, paving, inlay, tiles) are sampled through the `uvRect` attribute
 * and tiled in the shader; panel regions (tile niches, frescoes, signs) are stretched.
 * Every motif is drawn from the reference photographs in the Lahore heritage brief:
 * Wazir Khan kashi-kari, Badshahi red sandstone with marble inlay, Shahi Hammam frescoes,
 * Sheesh Mahal mirror work, Walled City shop boards.
 */

export const ATLAS_SIZE = 2048;
/** The atlas is 2048 wide; two extra rows at the bottom hold the stadium signs. */
export const ATLAS_HEIGHT = 3968;

type Region = { x: number; y: number; w: number; h: number };

const R = (x: number, y: number, w: number, h: number): Region => ({ x, y, w, h });

export const DECOR_REGIONS = {
	// row 0 — tiling 256
	brickRed: R(0, 0, 256, 256),
	brickTan: R(256, 0, 256, 256),
	brickDark: R(512, 0, 256, 256),
	pavingHerring: R(768, 0, 256, 256),
	sandstoneSlabs: R(1024, 0, 256, 256),
	marbleSlabs: R(1280, 0, 256, 256),
	sandstoneInlay: R(1536, 0, 256, 256),
	geometricStar: R(1792, 0, 256, 256),
	// row 1
	jali: R(0, 256, 256, 256),
	woodJali: R(256, 256, 256, 256),
	frescoNet: R(512, 256, 256, 256),
	mirrorMosaic: R(768, 256, 256, 256),
	pavingStone: R(1024, 256, 256, 256),
	limePlaster: R(1280, 256, 256, 256),
	marbleInlay: R(1536, 256, 256, 256),
	ochrePlaster: R(1792, 256, 256, 256),
	// row 2 — bands
	tileBand: R(0, 512, 512, 128),
	calligraphyBand: R(512, 512, 1024, 128),
	inlayBand: R(1536, 512, 512, 128),
	// row 3 — tall panels
	tileVaseNiche: R(0, 640, 256, 384),
	tileCypress: R(256, 640, 256, 384),
	frescoVase: R(512, 640, 256, 384),
	frescoBird: R(768, 640, 256, 384),
	doorStudded: R(1024, 640, 256, 384),
	doorGreen: R(1280, 640, 256, 384),
	windowArched: R(1536, 640, 128, 192),
	windowShutter: R(1664, 640, 128, 192),
	shopShutter: R(1536, 832, 256, 192),
	posterA: R(1792, 640, 256, 192),
	posterB: R(1792, 832, 256, 192),
	// row 4
	tileSpandrel: R(0, 1024, 512, 256),
	tileSpandrelGold: R(512, 1024, 512, 256),
	frescoDome: R(1024, 1024, 512, 256),
	inlayNiche: R(1536, 1024, 256, 256),
	tileSquare: R(1792, 1024, 256, 256),
	// rows 5+ — signs (512 x 128)
	signDelhiGate: R(0, 1280, 512, 128),
	signCalligraphy: R(512, 1280, 1024, 128),
	signHammam: R(1536, 1280, 512, 128),
	signChai: R(0, 1408, 512, 128),
	signMithai: R(512, 1408, 512, 128),
	signKapra: R(1024, 1408, 512, 128),
	signJutay: R(1536, 1408, 512, 128),
	signKitab: R(0, 1536, 512, 128),
	signTikka: R(512, 1536, 512, 128),
	signLassi: R(1024, 1536, 512, 128),
	signNaan: R(1536, 1536, 512, 128),
	signKarahi: R(0, 1664, 512, 128),
	signHalwa: R(512, 1664, 512, 128),
	signBangles: R(1024, 1664, 512, 128),
	signPost: R(1536, 1664, 512, 128),
	foodStreetBanner: R(0, 1792, 1024, 128),
	signFalooda: R(1024, 1792, 512, 128),
	signPaan: R(1536, 1792, 512, 128),
	signAttar: R(0, 1920, 512, 128),
	signPhool: R(512, 1920, 512, 128),
	signChaat: R(1024, 1920, 512, 128),
	signWelcome: R(1536, 1920, 512, 128),
	// row 16+ — Gaddafi Stadium
	stadiumBanner: R(0, 2048, 1024, 128),
	scoreboard: R(1024, 2048, 1024, 256),
	signTickets: R(0, 2176, 512, 128),
	signEnclosure: R(512, 2176, 512, 128),
	// rows 18+ — Pakistani truck art
	truckSide: R(0, 2304, 1024, 512),
	truckBack: R(1024, 2304, 512, 512),
	truckFront: R(1536, 2304, 512, 384),
	truckBumper: R(1536, 2688, 512, 128),
	truckCab: R(0, 2816, 256, 256),
	truckCrown: R(256, 2816, 512, 256),
	truckFloral: R(768, 2816, 256, 128),
	truckChevron: R(768, 2944, 256, 128),
	// Lahore Junction and Pakistan Railways
	stationSign: R(1024, 2816, 1024, 128),
	coachSide: R(1024, 2944, 1024, 128),
	locoSide: R(0, 3072, 1024, 128),
	platformSign: R(1024, 3072, 1024, 128),
	// row 25 — famous food stalls
	signButtKarahi: R(0, 3200, 512, 128),
	signNihari: R(512, 3200, 512, 128),
	signPhajja: R(1024, 3200, 512, 128),
	signTikkaHouse: R(1536, 3200, 512, 128),
	signBiryani: R(0, 3328, 512, 128),
	signPulao: R(512, 3328, 512, 128),
	signGolgappay: R(1024, 3328, 512, 128),
	signMalaiLassi: R(1536, 3328, 512, 128),
	// rows 27+ — Wagah border
	flagPakistan: R(0, 3456, 384, 256),
	flagIndia: R(384, 3456, 384, 256),
	signBabEAzadi: R(768, 3456, 1024, 128),
	signZindabad: R(768, 3584, 1024, 128),
	signIndiaGate: R(1792, 3456, 256, 128),
	signZeroLine: R(1792, 3584, 256, 128),
	signSwarnaJayanti: R(0, 3712, 1024, 128),
	signRangers: R(1024, 3712, 1024, 128),
	signMotto: R(0, 3840, 1024, 128),
	signQuaid: R(1024, 3840, 1024, 128)
} as const;

export type DecorKey = keyof typeof DECOR_REGIONS;

export const SHOP_SIGNS: DecorKey[] = [
	'signChai',
	'signMithai',
	'signKapra',
	'signJutay',
	'signKitab',
	'signLassi',
	'signBangles',
	'signAttar',
	'signPhool',
	'signPaan',
	'signHalwa'
];

export const FOOD_SIGNS: DecorKey[] = [
	'signTikka',
	'signNaan',
	'signKarahi',
	'signFalooda',
	'signChaat',
	'signLassi',
	'signChai',
	'signHalwa'
];

/** UV rect (x, y, w, h) of a region, inset by one texel to avoid bleeding. flipY = true. */
export function decorRect(key: DecorKey): [number, number, number, number] {
	const r = DECOR_REGIONS[key];
	const inset = 1.5;
	const x = (r.x + inset) / ATLAS_SIZE;
	const w = (r.w - inset * 2) / ATLAS_SIZE;
	const h = (r.h - inset * 2) / ATLAS_HEIGHT;
	const y = 1 - (r.y + r.h - inset) / ATLAS_HEIGHT;
	return [x, y, w, h];
}

// ---------------------------------------------------------------------------------------
// drawing helpers

type Ctx = CanvasRenderingContext2D;

const URDU_FONT = '"Noto Nastaliq Urdu", "Noto Naskh Arabic", "Segoe UI", "Arial", sans-serif';
const NASKH_FONT = '"Noto Naskh Arabic", "Noto Nastaliq Urdu", "Segoe UI", "Arial", sans-serif';
const LATIN_FONT = '"Gochi Hand", "Segoe UI", "Arial", sans-serif';
const BLOCK_FONT = '"Bungee", "Arial Black", "Segoe UI", sans-serif';

function shade(hex: string, amount: number): string {
	const v = parseInt(hex.slice(1), 16);
	let r = (v >> 16) & 255;
	let g = (v >> 8) & 255;
	let b = v & 255;
	const f = (c: number) => Math.max(0, Math.min(255, Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount))));
	r = f(r);
	g = f(g);
	b = f(b);
	return `rgb(${r},${g},${b})`;
}

function jitter(rng: Rng, hex: string, spread: number): string {
	return shade(hex, (rng() - 0.5) * spread);
}

function clip(ctx: Ctx, r: Region, pad = 0, fn: () => void) {
	ctx.save();
	ctx.beginPath();
	ctx.rect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2);
	ctx.clip();
	fn();
	ctx.restore();
}

/** Mughal pointed arch path inside a box (spring line at `spring` fraction of height). */
function archPath(ctx: Ctx, x: number, y: number, w: number, h: number, spring = 0.62) {
	const springY = y + h * (1 - spring);
	ctx.moveTo(x, y + h);
	ctx.lineTo(x, springY);
	ctx.bezierCurveTo(x, springY - h * 0.22, x + w * 0.3, y + h * 0.08, x + w * 0.5, y);
	ctx.bezierCurveTo(x + w * 0.7, y + h * 0.08, x + w, springY - h * 0.22, x + w, springY);
	ctx.lineTo(x + w, y + h);
	ctx.closePath();
}

/** Cusped (multifoil) arch, used on Badshahi and Naulakha panels. */
function cuspedArchPath(ctx: Ctx, x: number, y: number, w: number, h: number) {
	const springY = y + h * 0.45;
	ctx.moveTo(x, y + h);
	ctx.lineTo(x, springY);
	const lobes = 5;
	const cx = x + w / 2;
	for (let i = 0; i < lobes; i++) {
		const a0 = Math.PI + (i / lobes) * Math.PI;
		const a1 = Math.PI + ((i + 1) / lobes) * Math.PI;
		const rx = w / 2;
		const ry = springY - y;
		const p1x = cx + Math.cos(a1) * rx;
		const p1y = springY + Math.sin(a1) * ry;
		const midA = (a0 + a1) / 2;
		const cpx = cx + Math.cos(midA) * rx * 0.86;
		const cpy = springY + Math.sin(midA) * ry * 0.86;
		ctx.quadraticCurveTo(cpx + (cpx - cx) * 0.18, cpy + (cpy - springY) * 0.18, p1x, p1y);
	}
	ctx.lineTo(x + w, y + h);
	ctx.closePath();
}

function flower(ctx: Ctx, cx: number, cy: number, r: number, petals: number, petal: string, center: string, rot = 0) {
	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(rot);
	ctx.fillStyle = petal;
	for (let i = 0; i < petals; i++) {
		ctx.rotate((Math.PI * 2) / petals);
		ctx.beginPath();
		ctx.ellipse(0, -r * 0.55, r * 0.32, r * 0.55, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.fillStyle = center;
	ctx.beginPath();
	ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function leaf(ctx: Ctx, x: number, y: number, len: number, angle: number, color: string) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle);
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.quadraticCurveTo(len * 0.5, -len * 0.28, len, 0);
	ctx.quadraticCurveTo(len * 0.5, len * 0.28, 0, 0);
	ctx.fill();
	ctx.restore();
}

function star8(ctx: Ctx, cx: number, cy: number, r: number, inner = 0.55) {
	ctx.beginPath();
	for (let i = 0; i < 16; i++) {
		const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
		const rr = i % 2 === 0 ? r : r * inner;
		const px = cx + Math.cos(a) * rr;
		const py = cy + Math.sin(a) * rr;
		if (i === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
	}
	ctx.closePath();
}

function fitText(ctx: Ctx, text: string, font: (size: number) => string, maxWidth: number, startSize: number): number {
	let size = startSize;
	ctx.font = font(size);
	while (size > 10 && ctx.measureText(text).width > maxWidth) {
		size -= 2;
		ctx.font = font(size);
	}
	return size;
}

// ---------------------------------------------------------------------------------------
// tiling materials

function bricks(ctx: Ctx, r: Region, rng: Rng, base: string, mortar: string, rows = 12, perRow = 4) {
	ctx.fillStyle = mortar;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	const bh = r.h / rows;
	const bw = r.w / perRow;
	const gap = Math.max(2, bh * 0.14);
	for (let row = -1; row <= rows; row++) {
		const offset = row % 2 === 0 ? 0 : bw / 2;
		for (let col = -1; col <= perRow; col++) {
			ctx.fillStyle = jitter(rng, base, 0.16);
			ctx.fillRect(r.x + col * bw + offset + gap / 2, r.y + row * bh + gap / 2, bw - gap, bh - gap);
		}
	}
}

/** Basketweave brick paving (restored Shahi Guzargah / Food Street floors). Tiles seamlessly. */
function brickPaving(ctx: Ctx, r: Region, rng: Rng) {
	ctx.fillStyle = '#a07a63';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	const blocks = 4;
	const b = r.w / blocks;
	const u = b / 2;
	const gap = 3;
	for (let by = 0; by < blocks; by++) {
		for (let bx = 0; bx < blocks; bx++) {
			const x0 = r.x + bx * b;
			const y0 = r.y + by * b;
			const horizontal = (bx + by) % 2 === 0;
			for (let k = 0; k < 2; k++) {
				ctx.fillStyle = jitter(rng, '#b5795f', 0.2);
				if (horizontal) ctx.fillRect(x0 + gap / 2, y0 + k * u + gap / 2, b - gap, u - gap);
				else ctx.fillRect(x0 + k * u + gap / 2, y0 + gap / 2, u - gap, b - gap);
			}
		}
	}
}

function slabs(ctx: Ctx, r: Region, rng: Rng, base: string, line: string, cols: number, rows: number) {
	ctx.fillStyle = line;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	const sw = r.w / cols;
	const sh = r.h / rows;
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const off = y % 2 === 0 ? 0 : sw / 2;
			ctx.fillStyle = jitter(rng, base, 0.08);
			ctx.fillRect(r.x + x * sw + off + 2, r.y + y * sh + 2, sw - 4, sh - 4);
			if (off > 0 && x === 0) ctx.fillRect(r.x + 2 - sw / 2, r.y + y * sh + 2, sw - 4, sh - 4);
		}
	}
}

function sandstoneInlay(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#c96f58';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = '#f2ece2';
	ctx.lineWidth = 7;
	ctx.strokeRect(r.x + 14, r.y + 14, r.w - 28, r.h - 28);
	ctx.lineWidth = 5;
	ctx.beginPath();
	cuspedArchPath(ctx, r.x + 50, r.y + 40, r.w - 100, r.h - 80);
	ctx.stroke();
	ctx.fillStyle = 'rgba(160,80,64,0.35)';
	ctx.beginPath();
	cuspedArchPath(ctx, r.x + 58, r.y + 50, r.w - 116, r.h - 96);
	ctx.fill();
	flower(ctx, r.x + r.w / 2, r.y + r.h * 0.62, 18, 6, '#f2ece2', '#c96f58');
}

function marbleInlay(ctx: Ctx, r: Region, rng: Rng) {
	ctx.fillStyle = '#f0ebe1';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = '#d8cfbf';
	ctx.lineWidth = 3;
	ctx.strokeRect(r.x + 10, r.y + 10, r.w - 20, r.h - 20);
	// pietra dura flowers
	const cx = r.x + r.w / 2;
	const cy = r.y + r.h / 2;
	ctx.strokeStyle = '#5f8a5a';
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.moveTo(cx, cy + 80);
	ctx.quadraticCurveTo(cx - 10, cy, cx, cy - 60);
	ctx.stroke();
	for (let i = 0; i < 4; i++) leaf(ctx, cx, cy + 40 - i * 26, 34, i % 2 ? -0.6 : Math.PI + 0.6, '#5f8a5a');
	flower(ctx, cx, cy - 64, 22, 6, '#c45a5a', '#e6b34a', rng() * 2);
	flower(ctx, cx - 40, cy - 10, 14, 5, '#d98b8b', '#e6b34a');
	flower(ctx, cx + 40, cy - 10, 14, 5, '#d98b8b', '#e6b34a');
}

function geometricStars(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#f4f0e6';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	const s = r.w / 2;
	clip(ctx, r, 4, () => {
		for (let y = -1; y <= 2; y++) {
			for (let x = -1; x <= 2; x++) {
				const cx = r.x + x * s + s / 2;
				const cy = r.y + y * s + s / 2;
				ctx.fillStyle = '#2f56a6';
				star8(ctx, cx, cy, s * 0.46, 0.62);
				ctx.fill();
				ctx.fillStyle = '#f2c14f';
				star8(ctx, cx, cy, s * 0.3, 0.6);
				ctx.fill();
				ctx.fillStyle = '#2fa3a8';
				ctx.beginPath();
				ctx.arc(cx, cy, s * 0.1, 0, Math.PI * 2);
				ctx.fill();
				// cross-shaped fillers
				ctx.fillStyle = '#4f9a5d';
				ctx.beginPath();
				ctx.arc(cx + s / 2, cy + s / 2, s * 0.12, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	});
}

function jali(ctx: Ctx, r: Region, frame: string, hole: string) {
	ctx.fillStyle = frame;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	const s = r.w / 4;
	ctx.fillStyle = hole;
	for (let y = 0; y < 4; y++) {
		for (let x = 0; x < 4; x++) {
			const cx = r.x + x * s + s / 2;
			const cy = r.y + y * s + s / 2;
			star8(ctx, cx, cy, s * 0.38, 0.7);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(r.x + x * s, r.y + y * s, s * 0.11, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}

function woodLattice(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#2f2420';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = '#7a5238';
	ctx.lineWidth = 7;
	const n = 6;
	for (let i = -n; i <= n * 2; i++) {
		ctx.beginPath();
		ctx.moveTo(r.x + (i * r.w) / n, r.y);
		ctx.lineTo(r.x + (i * r.w) / n + r.w, r.y + r.h);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(r.x + (i * r.w) / n, r.y + r.h);
		ctx.lineTo(r.x + (i * r.w) / n + r.w, r.y);
		ctx.stroke();
	}
}

function frescoNet(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#efe3cc';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = '#a94d36';
	ctx.lineWidth = 4;
	const s = r.w / 2;
	clip(ctx, r, 4, () => {
		for (let y = -1; y <= 2; y++) {
			for (let x = -1; x <= 2; x++) {
				const cx = r.x + x * s + s / 2;
				const cy = r.y + y * s + s / 2;
				ctx.beginPath();
				ctx.moveTo(cx, cy - s / 2);
				ctx.lineTo(cx + s / 2, cy);
				ctx.lineTo(cx, cy + s / 2);
				ctx.lineTo(cx - s / 2, cy);
				ctx.closePath();
				ctx.stroke();
				ctx.fillStyle = '#a94d36';
				star8(ctx, cx, cy, s * 0.12, 0.5);
				ctx.fill();
				ctx.fillStyle = '#4f7d5a';
				ctx.beginPath();
				ctx.arc(cx + s / 2, cy, s * 0.05, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = '#3e5f8a';
				ctx.beginPath();
				ctx.arc(cx, cy + s / 2, s * 0.05, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	});
}

function mirrorMosaic(ctx: Ctx, r: Region, rng: Rng) {
	ctx.fillStyle = '#b9c3c9';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	const n = 16;
	const s = r.w / n;
	for (let y = 0; y < n; y++) {
		for (let x = 0; x < n; x++) {
			const v = rng();
			ctx.fillStyle = v > 0.85 ? '#f6f8f9' : v > 0.5 ? '#d8dee2' : v > 0.12 ? '#c4ccd1' : '#d9b25c';
			ctx.fillRect(r.x + x * s + 1, r.y + y * s + 1, s - 2, s - 2);
		}
	}
	ctx.strokeStyle = '#d9b25c';
	ctx.lineWidth = 4;
	flower(ctx, r.x + r.w / 2, r.y + r.h / 2, 60, 8, 'rgba(255,255,255,0.55)', '#d9b25c');
}

function plaster(ctx: Ctx, r: Region, rng: Rng, base: string) {
	ctx.fillStyle = base;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	for (let i = 0; i < 26; i++) {
		ctx.fillStyle = shade(base, (rng() - 0.6) * 0.12);
		ctx.globalAlpha = 0.35;
		ctx.beginPath();
		ctx.ellipse(r.x + rng() * r.w, r.y + rng() * r.h, 10 + rng() * 40, 6 + rng() * 26, rng() * 3, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------------------
// bands

function tileBand(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#2f56a6';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.fillStyle = '#f4f0e6';
	ctx.fillRect(r.x - 4, r.y + 6, r.w + 8, 6);
	ctx.fillRect(r.x - 4, r.y + r.h - 12, r.w + 8, 6);
	const n = 8;
	const s = r.w / n;
	for (let i = 0; i < n; i++) {
		const cx = r.x + i * s + s / 2;
		const cy = r.y + r.h / 2;
		ctx.fillStyle = '#f2c14f';
		ctx.beginPath();
		ctx.moveTo(cx, cy - 40);
		ctx.bezierCurveTo(cx + 34, cy - 30, cx + 34, cy + 30, cx, cy + 40);
		ctx.bezierCurveTo(cx - 34, cy + 30, cx - 34, cy - 30, cx, cy - 40);
		ctx.fill();
		ctx.strokeStyle = '#f4f0e6';
		ctx.lineWidth = 4;
		ctx.stroke();
		flower(ctx, cx, cy, 18, 6, '#2fa3a8', '#e07b3a');
		leaf(ctx, cx + s / 2 - 6, cy, 22, -Math.PI / 2, '#4f9a5d');
	}
}

function inlayBand(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#c96f58';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = '#f2ece2';
	ctx.lineWidth = 6;
	ctx.strokeRect(r.x + 6, r.y + 10, r.w - 12, r.h - 20);
	const n = 6;
	const s = r.w / n;
	for (let i = 0; i < n; i++) {
		const cx = r.x + i * s + s / 2;
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(cx - 30, r.y + r.h / 2);
		ctx.lineTo(cx, r.y + 24);
		ctx.lineTo(cx + 30, r.y + r.h / 2);
		ctx.lineTo(cx, r.y + r.h - 24);
		ctx.closePath();
		ctx.stroke();
		flower(ctx, cx, r.y + r.h / 2, 12, 6, '#f2ece2', '#c96f58');
	}
}

function calligraphyBand(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#2f56a6';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.fillStyle = '#f2c14f';
	ctx.fillRect(r.x - 4, r.y + 4, r.w + 8, 6);
	ctx.fillRect(r.x - 4, r.y + r.h - 10, r.w + 8, 6);
	ctx.fillStyle = '#f4f0e6';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.direction = 'rtl';
	const text = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ';
	fitText(ctx, text, (s) => `700 ${s}px ${NASKH_FONT}`, r.w - 80, 70);
	ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2 + 4);
	ctx.direction = 'ltr';
	flower(ctx, r.x + 26, r.y + r.h / 2, 16, 6, '#f2c14f', '#2fa3a8');
	flower(ctx, r.x + r.w - 26, r.y + r.h / 2, 16, 6, '#f2c14f', '#2fa3a8');
}

// ---------------------------------------------------------------------------------------
// panels

function vaseFlowers(ctx: Ctx, cx: number, baseY: number, scale: number, vase: string, petals: string[]) {
	// vase
	ctx.fillStyle = vase;
	ctx.beginPath();
	ctx.moveTo(cx - 18 * scale, baseY);
	ctx.quadraticCurveTo(cx - 34 * scale, baseY - 40 * scale, cx - 12 * scale, baseY - 62 * scale);
	ctx.lineTo(cx - 16 * scale, baseY - 74 * scale);
	ctx.lineTo(cx + 16 * scale, baseY - 74 * scale);
	ctx.lineTo(cx + 12 * scale, baseY - 62 * scale);
	ctx.quadraticCurveTo(cx + 34 * scale, baseY - 40 * scale, cx + 18 * scale, baseY);
	ctx.closePath();
	ctx.fill();
	// stems
	ctx.strokeStyle = '#4f9a5d';
	ctx.lineWidth = 4 * scale;
	const tops: [number, number][] = [];
	for (let i = -2; i <= 2; i++) {
		const tx = cx + i * 30 * scale;
		const ty = baseY - (150 - Math.abs(i) * 28) * scale;
		ctx.beginPath();
		ctx.moveTo(cx, baseY - 72 * scale);
		ctx.quadraticCurveTo(cx + i * 6 * scale, baseY - 110 * scale, tx, ty);
		ctx.stroke();
		tops.push([tx, ty]);
		leaf(ctx, (cx + tx) / 2, (baseY - 72 * scale + ty) / 2, 22 * scale, i < 0 ? Math.PI - 0.5 : -0.5, '#4f9a5d');
	}
	tops.forEach(([x, y], i) => flower(ctx, x, y, 16 * scale, 6, petals[i % petals.length], '#f2c14f'));
}

function tileVaseNiche(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#2f56a6';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.fillStyle = '#f4f0e6';
	ctx.beginPath();
	archPath(ctx, r.x + 16, r.y + 16, r.w - 32, r.h - 32, 0.72);
	ctx.fill();
	ctx.fillStyle = '#f2c14f';
	ctx.beginPath();
	archPath(ctx, r.x + 24, r.y + 24, r.w - 48, r.h - 48, 0.72);
	ctx.fill();
	vaseFlowers(ctx, r.x + r.w / 2, r.y + r.h - 34, 1.05, '#2f56a6', ['#e07b3a', '#f4f0e6', '#2fa3a8', '#c45a5a', '#f4f0e6']);
}

function tileCypress(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#2fa3a8';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.fillStyle = '#f4f0e6';
	ctx.beginPath();
	archPath(ctx, r.x + 18, r.y + 18, r.w - 36, r.h - 36, 0.72);
	ctx.fill();
	const cx = r.x + r.w / 2;
	ctx.strokeStyle = '#7b5a45';
	ctx.lineWidth = 7;
	ctx.beginPath();
	ctx.moveTo(cx, r.y + r.h - 30);
	ctx.lineTo(cx, r.y + 90);
	ctx.stroke();
	for (let i = 0; i < 9; i++) {
		const y = r.y + r.h - 70 - i * 26;
		leaf(ctx, cx, y, 46 - i * 2, Math.PI + 0.7, '#4f9a5d');
		leaf(ctx, cx, y, 46 - i * 2, -0.7, '#4f9a5d');
		if (i % 2 === 0) {
			flower(ctx, cx - 50 + i * 2, y - 8, 9, 5, '#2f56a6', '#f2c14f');
			flower(ctx, cx + 50 - i * 2, y - 8, 9, 5, '#e07b3a', '#f2c14f');
		}
	}
}

function tileSpandrel(ctx: Ctx, r: Region, rng: Rng, ground: string, accent: string) {
	ctx.fillStyle = ground;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = accent;
	ctx.lineWidth = 5;
	for (let i = 0; i < 9; i++) {
		const x0 = r.x + (i / 8) * r.w;
		ctx.beginPath();
		ctx.moveTo(x0, r.y + r.h);
		ctx.bezierCurveTo(x0 + 40, r.y + r.h * 0.4, x0 - 40, r.y + r.h * 0.3, x0 + 20, r.y);
		ctx.stroke();
	}
	for (let i = 0; i < 46; i++) {
		const x = r.x + rng() * r.w;
		const y = r.y + rng() * r.h;
		const pick = rng();
		flower(ctx, x, y, 10 + rng() * 12, rng() > 0.5 ? 6 : 5, pick > 0.66 ? '#f2c14f' : pick > 0.33 ? '#f4f0e6' : '#e07b3a', '#2fa3a8', rng() * 3);
		leaf(ctx, x + 12, y + 6, 18, rng() * 6, '#4f9a5d');
	}
	ctx.strokeStyle = '#f4f0e6';
	ctx.lineWidth = 6;
	ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
}

function tileSquare(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#f2c14f';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = '#2f56a6';
	ctx.lineWidth = 10;
	ctx.strokeRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16);
	ctx.fillStyle = '#2f56a6';
	star8(ctx, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.36, 0.6);
	ctx.fill();
	ctx.fillStyle = '#f4f0e6';
	star8(ctx, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.24, 0.6);
	ctx.fill();
	flower(ctx, r.x + r.w / 2, r.y + r.h / 2, 26, 8, '#e07b3a', '#2fa3a8');
}

function inlayNiche(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#c96f58';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = '#f2ece2';
	ctx.lineWidth = 6;
	ctx.strokeRect(r.x + 10, r.y + 10, r.w - 20, r.h - 20);
	ctx.fillStyle = '#9f5444';
	ctx.beginPath();
	cuspedArchPath(ctx, r.x + 40, r.y + 34, r.w - 80, r.h - 60);
	ctx.fill();
	ctx.lineWidth = 4;
	ctx.stroke();
}

function frescoVase(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#efe3cc';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = '#a94d36';
	ctx.lineWidth = 6;
	ctx.strokeRect(r.x + 10, r.y + 10, r.w - 20, r.h - 20);
	ctx.lineWidth = 3;
	ctx.strokeRect(r.x + 20, r.y + 20, r.w - 40, r.h - 40);
	ctx.strokeStyle = '#4f7d5a';
	ctx.beginPath();
	archPath(ctx, r.x + 30, r.y + 30, r.w - 60, r.h - 60, 0.75);
	ctx.stroke();
	vaseFlowers(ctx, r.x + r.w / 2, r.y + r.h - 44, 0.95, '#b5523b', ['#c8973e', '#b5523b', '#3e5f8a', '#c8973e', '#b5523b']);
}

function frescoBird(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#efe3cc';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = '#a94d36';
	ctx.lineWidth = 6;
	ctx.strokeRect(r.x + 10, r.y + 10, r.w - 20, r.h - 20);
	const cx = r.x + r.w / 2;
	const cy = r.y + r.h / 2;
	// wings
	ctx.fillStyle = '#4f7d5a';
	ctx.beginPath();
	ctx.moveTo(cx, cy);
	ctx.quadraticCurveTo(cx - 90, cy - 90, cx - 100, cy - 20);
	ctx.quadraticCurveTo(cx - 60, cy - 10, cx, cy + 10);
	ctx.fill();
	ctx.fillStyle = '#c8973e';
	ctx.beginPath();
	ctx.moveTo(cx, cy);
	ctx.quadraticCurveTo(cx + 90, cy - 90, cx + 100, cy - 20);
	ctx.quadraticCurveTo(cx + 60, cy - 10, cx, cy + 10);
	ctx.fill();
	// body & tail
	ctx.fillStyle = '#b5523b';
	ctx.beginPath();
	ctx.ellipse(cx, cy + 10, 22, 40, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#3e5f8a';
	ctx.beginPath();
	ctx.moveTo(cx - 14, cy + 40);
	ctx.lineTo(cx, cy + 130);
	ctx.lineTo(cx + 14, cy + 40);
	ctx.fill();
	ctx.fillStyle = '#efe3cc';
	ctx.beginPath();
	ctx.arc(cx, cy - 34, 14, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#b5523b';
	ctx.beginPath();
	ctx.arc(cx, cy - 34, 9, 0, Math.PI * 2);
	ctx.fill();
	for (let i = 0; i < 6; i++) flower(ctx, r.x + 40 + (i % 2) * (r.w - 80), r.y + 50 + Math.floor(i / 2) * 120, 12, 5, '#b5523b', '#c8973e');
}

function frescoDome(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#efe3cc';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	const n = 8;
	const s = r.w / n;
	ctx.strokeStyle = '#a94d36';
	ctx.lineWidth = 4;
	for (let i = 0; i <= n; i++) {
		const x = r.x + i * s;
		ctx.beginPath();
		ctx.moveTo(x, r.y + r.h);
		ctx.quadraticCurveTo(x + s / 2, r.y + r.h * 0.5, x + s / 2, r.y);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(x + s, r.y + r.h);
		ctx.quadraticCurveTo(x + s / 2, r.y + r.h * 0.5, x + s / 2, r.y);
		ctx.stroke();
		ctx.fillStyle = '#a94d36';
		star8(ctx, x + s / 2, r.y + r.h * 0.62, 12, 0.5);
		ctx.fill();
		flower(ctx, x, r.y + r.h - 26, 14, 6, '#4f7d5a', '#c8973e');
	}
	ctx.fillStyle = '#c8973e';
	ctx.fillRect(r.x - 4, r.y + r.h - 10, r.w + 8, 10);
}

function door(ctx: Ctx, r: Region, wood: string, studs: string) {
	ctx.fillStyle = '#5a3b30';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.fillStyle = wood;
	ctx.beginPath();
	archPath(ctx, r.x + 12, r.y + 12, r.w - 24, r.h - 18, 0.8);
	ctx.fill();
	ctx.strokeStyle = shade(wood, -0.35);
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.moveTo(r.x + r.w / 2, r.y + 40);
	ctx.lineTo(r.x + r.w / 2, r.y + r.h - 6);
	ctx.stroke();
	for (let row = 0; row < 3; row++) {
		for (let side = 0; side < 2; side++) {
			const px = r.x + 30 + side * (r.w / 2 - 14);
			const py = r.y + 110 + row * 82;
			ctx.strokeRect(px, py, r.w / 2 - 46, 62);
		}
	}
	ctx.fillStyle = studs;
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 4; col++) {
			ctx.beginPath();
			ctx.arc(r.x + 34 + col * ((r.w - 68) / 3), r.y + 96 + row * 32, 4.5, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	ctx.beginPath();
	ctx.arc(r.x + r.w / 2 - 14, r.y + r.h * 0.6, 8, 0, Math.PI * 2);
	ctx.arc(r.x + r.w / 2 + 14, r.y + r.h * 0.6, 8, 0, Math.PI * 2);
	ctx.fill();
}

function windowArched(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#4e3323';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.fillStyle = '#2b2420';
	ctx.beginPath();
	archPath(ctx, r.x + 12, r.y + 12, r.w - 24, r.h - 24, 0.7);
	ctx.fill();
	ctx.save();
	ctx.beginPath();
	archPath(ctx, r.x + 12, r.y + 12, r.w - 24, r.h - 24, 0.7);
	ctx.clip();
	ctx.strokeStyle = '#8a5d3d';
	ctx.lineWidth = 4;
	for (let i = -8; i < 16; i++) {
		ctx.beginPath();
		ctx.moveTo(r.x + i * 14, r.y);
		ctx.lineTo(r.x + i * 14 + r.h, r.y + r.h);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(r.x + i * 14, r.y + r.h);
		ctx.lineTo(r.x + i * 14 + r.h, r.y);
		ctx.stroke();
	}
	ctx.restore();
}

function windowShutter(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#e6dcc8';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.fillStyle = '#3f6b55';
	ctx.fillRect(r.x + 10, r.y + 10, r.w / 2 - 12, r.h - 20);
	ctx.fillRect(r.x + r.w / 2 + 2, r.y + 10, r.w / 2 - 12, r.h - 20);
	ctx.strokeStyle = '#2d4d3d';
	ctx.lineWidth = 3;
	for (let i = 0; i < 12; i++) {
		const y = r.y + 18 + i * 14;
		ctx.beginPath();
		ctx.moveTo(r.x + 14, y);
		ctx.lineTo(r.x + r.w - 14, y);
		ctx.stroke();
	}
}

function shopShutter(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#8e9597';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	for (let i = 0; i < 20; i++) {
		ctx.fillStyle = i % 2 === 0 ? '#9ba2a4' : '#7f8688';
		ctx.fillRect(r.x, r.y + i * (r.h / 20), r.w, r.h / 40);
	}
	ctx.fillStyle = '#5d6466';
	ctx.fillRect(r.x, r.y + r.h - 16, r.w, 16);
}

function poster(ctx: Ctx, r: Region, rng: Rng, bg: string, title: string) {
	ctx.fillStyle = bg;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.fillStyle = 'rgba(255,255,255,0.85)';
	ctx.beginPath();
	ctx.arc(r.x + r.w * 0.3, r.y + r.h * 0.42, 34, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillRect(r.x + r.w * 0.3 - 40, r.y + r.h * 0.42 + 30, 80, 60);
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.direction = 'rtl';
	fitText(ctx, title, (s) => `700 ${s}px ${URDU_FONT}`, r.w * 0.5, 34);
	ctx.fillText(title, r.x + r.w * 0.72, r.y + r.h * 0.38);
	ctx.direction = 'ltr';
	ctx.fillStyle = shade(bg, -0.3);
	for (let i = 0; i < 3; i++) ctx.fillRect(r.x + r.w * 0.52, r.y + r.h * (0.56 + i * 0.1), r.w * 0.4 * (0.6 + rng() * 0.4), 8);
	ctx.fillStyle = '#f2c14f';
	ctx.fillRect(r.x, r.y + r.h - 22, r.w, 22);
}

function sign(ctx: Ctx, r: Region, bg: string, fg: string, urdu: string, english: string, border = '#f4f0e6') {
	ctx.fillStyle = bg;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = border;
	ctx.lineWidth = 6;
	ctx.strokeRect(r.x + 7, r.y + 7, r.w - 14, r.h - 14);
	ctx.fillStyle = fg;
	ctx.textBaseline = 'middle';
	if (urdu) {
		ctx.textAlign = 'center';
		ctx.direction = 'rtl';
		const urduWidth = english ? r.w * 0.46 : r.w - 60;
		fitText(ctx, urdu, (s) => `700 ${s}px ${URDU_FONT}`, urduWidth, 58);
		ctx.fillText(urdu, english ? r.x + r.w * 0.74 : r.x + r.w / 2, r.y + r.h / 2 + 6);
		ctx.direction = 'ltr';
	}
	if (english) {
		ctx.textAlign = 'center';
		const latinWidth = urdu ? r.w * 0.44 : r.w - 60;
		fitText(ctx, english, (s) => `${s}px ${BLOCK_FONT}`, latinWidth, 44);
		ctx.fillText(english, urdu ? r.x + r.w * 0.27 : r.x + r.w / 2, r.y + r.h / 2 + 2);
	}
}

/** Stadium scoreboard: a local T20 in progress at the Gaddafi. */
function scoreboard(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#16181c';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = '#f2c24f';
	ctx.lineWidth = 8;
	ctx.strokeRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16);
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'left';
	ctx.fillStyle = '#7ee08a';
	ctx.font = `46px ${BLOCK_FONT}`;
	ctx.fillText('LAHORE  186/4', r.x + 36, r.y + 62);
	ctx.fillStyle = '#ffffff';
	ctx.font = `30px ${BLOCK_FONT}`;
	ctx.fillText('OVERS 18.2   TARGET 191', r.x + 36, r.y + 122);
	ctx.fillStyle = '#f2c24f';
	ctx.fillText('NEED 5 OFF 10', r.x + 36, r.y + 176);
	ctx.textAlign = 'center';
	ctx.direction = 'rtl';
	ctx.fillStyle = '#ffffff';
	fitText(ctx, 'زندہ دلانِ لاہور', (s) => `700 ${s}px ${URDU_FONT}`, 330, 56);
	ctx.fillText('زندہ دلانِ لاہور', r.x + r.w - 200, r.y + 100);
	ctx.direction = 'ltr';
	// a strip of "lights" along the bottom
	for (let i = 0; i < 24; i++) {
		ctx.fillStyle = i % 3 === 0 ? '#f2c24f' : '#3a3f46';
		ctx.fillRect(r.x + 36 + i * 40, r.y + r.h - 38, 26, 14);
	}
}

// ---------------------------------------------------------------------------------------
// Pakistani truck art ("phool patti"): bright flowers, borders, a peacock, a mosque scene,
// poetry on the back and the green Pakistan crown over the cab.

const TA = {
	red: '#d8352a',
	orange: '#f08a24',
	yellow: '#f6c335',
	green: '#2f9e44',
	leaf: '#1f7a3a',
	teal: '#1fa39a',
	blue: '#2457c5',
	navy: '#17306e',
	pink: '#e2437e',
	white: '#f7f3ea',
	ink: '#1b1b1d',
	sky: '#8fd3f0'
};
const TA_FLOWERS = [TA.red, TA.blue, TA.pink, TA.orange, TA.teal, TA.yellow, TA.white];

function taFlower(ctx: Ctx, x: number, y: number, r: number, petal: string, centre: string, petals = 6) {
	ctx.fillStyle = petal;
	for (let i = 0; i < petals; i++) {
		const a = (i / petals) * Math.PI * 2;
		ctx.beginPath();
		ctx.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.52, r * 0.3, a, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.strokeStyle = 'rgba(20,20,30,0.45)';
	ctx.lineWidth = Math.max(1, r * 0.07);
	for (let i = 0; i < petals; i++) {
		const a = (i / petals) * Math.PI * 2;
		ctx.beginPath();
		ctx.moveTo(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25);
		ctx.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8);
		ctx.stroke();
	}
	ctx.fillStyle = centre;
	ctx.beginPath();
	ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = 'rgba(255,255,255,0.7)';
	ctx.beginPath();
	ctx.arc(x - r * 0.08, y - r * 0.08, r * 0.1, 0, Math.PI * 2);
	ctx.fill();
}

function taLeaf(ctx: Ctx, x: number, y: number, len: number, angle: number, color = TA.leaf) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle);
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.ellipse(len / 2, 0, len / 2, len * 0.2, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function taFloralBand(ctx: Ctx, x: number, y: number, w: number, h: number, bg: string, rng: Rng) {
	ctx.fillStyle = bg;
	ctx.fillRect(x, y, w, h);
	const r = h * 0.36;
	const n = Math.max(2, Math.round(w / (r * 2.7)));
	for (let i = 0; i < n; i++) {
		const cx = x + (i + 0.5) * (w / n);
		const cy = y + h / 2;
		taLeaf(ctx, cx, cy, r * 1.7, -0.45);
		taLeaf(ctx, cx, cy, r * 1.7, Math.PI + 0.45);
		const petal = TA_FLOWERS[(i * 3 + Math.floor(rng() * 2)) % TA_FLOWERS.length];
		taFlower(ctx, cx, cy, r, petal === bg ? TA.white : petal, petal === TA.yellow ? TA.red : TA.yellow);
	}
}

/** Nested coloured frame lines; returns the inset. */
function taBorder(ctx: Ctx, x: number, y: number, w: number, h: number, colors: string[], width: number): number {
	colors.forEach((c, i) => {
		const o = width * (i + 0.5);
		ctx.strokeStyle = c;
		ctx.lineWidth = width;
		ctx.strokeRect(x + o, y + o, w - 2 * o, h - 2 * o);
	});
	return width * colors.length;
}

function taDots(ctx: Ctx, x: number, y: number, w: number, color: string, step = 18, r = 3.5) {
	ctx.fillStyle = color;
	for (let px = x + step / 2; px < x + w; px += step) {
		ctx.beginPath();
		ctx.arc(px, y, r, 0, Math.PI * 2);
		ctx.fill();
	}
}

function taZigzag(ctx: Ctx, x: number, y: number, w: number, h: number, a: string, b: string) {
	const step = h * 1.4;
	for (let px = x, i = 0; px < x + w; px += step, i++) {
		ctx.fillStyle = i % 2 ? a : b;
		ctx.beginPath();
		ctx.moveTo(px, y);
		ctx.lineTo(px + step, y);
		ctx.lineTo(px + step / 2, y + h);
		ctx.closePath();
		ctx.fill();
	}
}

function taPeacock(ctx: Ctx, x: number, y: number, w: number, h: number) {
	ctx.fillStyle = '#bfe7f2';
	ctx.fillRect(x, y, w, h);
	const cx = x + w * 0.55;
	const cy = y + h * 0.62;
	// tail fan
	for (let i = 0; i < 9; i++) {
		const a = Math.PI * (0.95 + (i / 8) * 0.75);
		const tx = cx + Math.cos(a) * w * 0.42;
		const ty = cy + Math.sin(a) * h * 0.5;
		ctx.strokeStyle = TA.leaf;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(cx, cy);
		ctx.lineTo(tx, ty);
		ctx.stroke();
		ctx.fillStyle = TA.teal;
		ctx.beginPath();
		ctx.ellipse(tx, ty, w * 0.07, h * 0.08, a, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = TA.blue;
		ctx.beginPath();
		ctx.arc(tx, ty, w * 0.03, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = TA.yellow;
		ctx.beginPath();
		ctx.arc(tx, ty, w * 0.012, 0, Math.PI * 2);
		ctx.fill();
	}
	// body, neck and head
	ctx.fillStyle = TA.blue;
	ctx.beginPath();
	ctx.ellipse(cx, cy, w * 0.13, h * 0.16, -0.4, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.ellipse(cx + w * 0.1, cy - h * 0.2, w * 0.045, h * 0.14, 0.35, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(cx + w * 0.15, cy - h * 0.33, w * 0.05, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = TA.orange;
	ctx.beginPath();
	ctx.moveTo(cx + w * 0.19, cy - h * 0.34);
	ctx.lineTo(cx + w * 0.25, cy - h * 0.32);
	ctx.lineTo(cx + w * 0.19, cy - h * 0.3);
	ctx.fill();
	ctx.fillStyle = TA.white;
	ctx.beginPath();
	ctx.arc(cx + w * 0.16, cy - h * 0.34, w * 0.012, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = TA.blue;
	ctx.lineWidth = 2;
	for (let i = -1; i <= 1; i++) {
		ctx.beginPath();
		ctx.moveTo(cx + w * 0.15, cy - h * 0.37);
		ctx.lineTo(cx + w * (0.15 + i * 0.03), cy - h * 0.47);
		ctx.stroke();
	}
	// branch with leaves
	ctx.strokeStyle = '#7a4a2a';
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.moveTo(x + 6, cy + h * 0.17);
	ctx.lineTo(x + w - 6, cy + h * 0.12);
	ctx.stroke();
	for (let i = 0; i < 5; i++) taLeaf(ctx, x + w * (0.1 + i * 0.2), cy + h * 0.15, w * 0.12, i % 2 ? 0.6 : -0.6, TA.green);
}

function taMosque(ctx: Ctx, x: number, y: number, w: number, h: number) {
	const sky = ctx.createLinearGradient(0, y, 0, y + h);
	sky.addColorStop(0, '#7cc6ec');
	sky.addColorStop(0.7, '#f3e3b8');
	ctx.fillStyle = sky;
	ctx.fillRect(x, y, w, h);
	// clouds
	ctx.fillStyle = 'rgba(255,255,255,0.85)';
	for (const [cx, cy, s] of [[0.2, 0.16, 1], [0.75, 0.12, 0.8], [0.5, 0.22, 0.6]] as const) {
		ctx.beginPath();
		ctx.ellipse(x + w * cx, y + h * cy, w * 0.07 * s, h * 0.05 * s, 0, 0, Math.PI * 2);
		ctx.ellipse(x + w * (cx + 0.05), y + h * (cy - 0.02), w * 0.05 * s, h * 0.05 * s, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	const base = y + h * 0.8;
	// garden path
	ctx.fillStyle = '#5aa64a';
	ctx.fillRect(x, base, w, y + h - base);
	ctx.fillStyle = '#c96a4a';
	ctx.beginPath();
	ctx.moveTo(x + w * 0.44, base);
	ctx.lineTo(x + w * 0.56, base);
	ctx.lineTo(x + w * 0.66, y + h);
	ctx.lineTo(x + w * 0.34, y + h);
	ctx.fill();
	// prayer hall in red sandstone with white domes
	const hallTop = y + h * 0.55;
	ctx.fillStyle = '#b4473a';
	ctx.fillRect(x + w * 0.2, hallTop, w * 0.6, base - hallTop);
	ctx.fillStyle = '#f0e2c8';
	for (let i = 0; i < 5; i++) {
		const ax = x + w * (0.26 + i * 0.11);
		ctx.beginPath();
		ctx.moveTo(ax, base);
		ctx.lineTo(ax, hallTop + (base - hallTop) * 0.45);
		ctx.quadraticCurveTo(ax + w * 0.03, hallTop + (base - hallTop) * 0.15, ax + w * 0.06, hallTop + (base - hallTop) * 0.45);
		ctx.lineTo(ax + w * 0.06, base);
		ctx.fill();
	}
	ctx.fillStyle = '#fbf7ee';
	for (const [dx, r] of [[0.5, 0.11], [0.32, 0.07], [0.68, 0.07]] as const) {
		ctx.beginPath();
		ctx.ellipse(x + w * dx, hallTop, w * r, h * r * 1.5, 0, Math.PI, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#d9b44a';
		ctx.fillRect(x + w * dx - 1.5, hallTop - h * r * 1.5 - h * 0.06, 3, h * 0.06);
		ctx.fillStyle = '#fbf7ee';
	}
	// minarets
	for (const mx of [0.1, 0.9]) {
		ctx.fillStyle = '#b4473a';
		ctx.fillRect(x + w * mx - w * 0.025, y + h * 0.25, w * 0.05, base - (y + h * 0.25));
		ctx.fillStyle = '#f0e2c8';
		for (const k of [0.4, 0.6]) ctx.fillRect(x + w * mx - w * 0.032, y + h * k, w * 0.064, h * 0.025);
		ctx.fillStyle = '#fbf7ee';
		ctx.beginPath();
		ctx.ellipse(x + w * mx, y + h * 0.25, w * 0.035, h * 0.06, 0, Math.PI, Math.PI * 2);
		ctx.fill();
	}
}

function taBouquet(ctx: Ctx, x: number, y: number, w: number, h: number, rng: Rng) {
	ctx.fillStyle = TA.red;
	ctx.fillRect(x, y, w, h);
	const cx = x + w / 2;
	// vase
	ctx.fillStyle = TA.yellow;
	ctx.beginPath();
	ctx.moveTo(cx - w * 0.16, y + h * 0.95);
	ctx.quadraticCurveTo(cx - w * 0.3, y + h * 0.75, cx - w * 0.12, y + h * 0.62);
	ctx.lineTo(cx + w * 0.12, y + h * 0.62);
	ctx.quadraticCurveTo(cx + w * 0.3, y + h * 0.75, cx + w * 0.16, y + h * 0.95);
	ctx.fill();
	ctx.fillStyle = TA.blue;
	ctx.fillRect(cx - w * 0.2, y + h * 0.75, w * 0.4, h * 0.04);
	for (let i = 0; i < 7; i++) {
		const a = -Math.PI / 2 + (i - 3) * 0.38;
		const fx = cx + Math.cos(a) * w * 0.32;
		const fy = y + h * 0.58 + Math.sin(a) * h * 0.42;
		ctx.strokeStyle = TA.leaf;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(cx, y + h * 0.64);
		ctx.lineTo(fx, fy);
		ctx.stroke();
		taLeaf(ctx, (cx + fx) / 2, (y + h * 0.64 + fy) / 2, w * 0.14, a + 0.9, TA.green);
		const petal = TA_FLOWERS[(i + Math.floor(rng() * 3)) % TA_FLOWERS.length];
		taFlower(ctx, fx, fy, w * 0.1, petal === TA.red ? TA.white : petal, TA.yellow);
	}
}

function truckSide(ctx: Ctx, r: Region, rng: Rng) {
	ctx.fillStyle = TA.navy;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	const i = taBorder(ctx, r.x, r.y, r.w, r.h, [TA.red, TA.yellow, TA.green, TA.white], 7);
	const x = r.x + i;
	const w = r.w - i * 2;
	taFloralBand(ctx, x, r.y + i, w, 78, TA.orange, rng);
	taDots(ctx, x, r.y + i + 4, w, TA.white, 16, 3);
	taZigzag(ctx, x, r.y + i + 78, w, 16, TA.yellow, TA.red);
	const py = r.y + i + 102;
	const ph = r.h - i * 2 - 102 - 92;
	ctx.fillStyle = TA.yellow;
	ctx.fillRect(x, py - 4, w, ph + 8);
	const gap = 12;
	const lw = w * 0.26;
	const cw = w * 0.44;
	const rw = w - lw - cw - gap * 4;
	taPeacock(ctx, x + gap, py, lw, ph);
	taMosque(ctx, x + gap * 2 + lw, py, cw, ph);
	taBouquet(ctx, x + gap * 3 + lw + cw, py, rw, ph, rng);
	for (const [fx, fw] of [[x + gap, lw], [x + gap * 2 + lw, cw], [x + gap * 3 + lw + cw, rw]] as const) {
		ctx.strokeStyle = TA.ink;
		ctx.lineWidth = 3;
		ctx.strokeRect(fx, py, fw, ph);
	}
	taFloralBand(ctx, x, r.y + r.h - i - 86, w, 64, TA.green, rng);
	taZigzag(ctx, x, r.y + r.h - i - 22, w, 22, TA.red, TA.yellow);
}

function truckBack(ctx: Ctx, r: Region, rng: Rng) {
	ctx.fillStyle = TA.navy;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	const i = taBorder(ctx, r.x, r.y, r.w, r.h, [TA.yellow, TA.red, TA.teal], 8);
	const x = r.x + i;
	const w = r.w - i * 2;
	taFloralBand(ctx, x, r.y + i, w, 70, TA.pink, rng);
	// the protective eyes
	for (const ex of [0.3, 0.7]) {
		const cx = x + w * ex;
		const cy = r.y + i + 118;
		ctx.fillStyle = TA.white;
		ctx.beginPath();
		ctx.ellipse(cx, cy, 52, 26, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#2b7bd0';
		ctx.beginPath();
		ctx.arc(cx, cy, 18, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = TA.ink;
		ctx.beginPath();
		ctx.arc(cx, cy, 8, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = TA.ink;
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.ellipse(cx, cy, 52, 26, 0, 0, Math.PI * 2);
		ctx.stroke();
		for (let k = -3; k <= 3; k++) {
			ctx.beginPath();
			ctx.moveTo(cx + k * 13, cy - 24);
			ctx.lineTo(cx + k * 15, cy - 38);
			ctx.stroke();
		}
	}
	// poetry panels
	const p1 = r.y + i + 168;
	ctx.fillStyle = TA.yellow;
	ctx.fillRect(x + 16, p1, w - 32, 120);
	ctx.strokeStyle = TA.red;
	ctx.lineWidth = 6;
	ctx.strokeRect(x + 22, p1 + 6, w - 44, 108);
	ctx.fillStyle = TA.red;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.direction = 'rtl';
	fitText(ctx, 'دیکھ مگر پیار سے', (s) => `700 ${s}px ${URDU_FONT}`, w - 90, 64);
	ctx.fillText('دیکھ مگر پیار سے', x + w / 2, p1 + 66);
	const p2 = p1 + 136;
	ctx.fillStyle = TA.red;
	ctx.fillRect(x + 16, p2, w - 32, 84);
	ctx.fillStyle = TA.white;
	fitText(ctx, 'ماں کی دعا جنت کی ہوا', (s) => `700 ${s}px ${URDU_FONT}`, w - 80, 46);
	ctx.fillText('ماں کی دعا جنت کی ہوا', x + w / 2, p2 + 46);
	ctx.direction = 'ltr';
	taZigzag(ctx, x, r.y + r.h - i - 22, w, 22, TA.yellow, TA.green);
}

function truckFront(ctx: Ctx, r: Region, rng: Rng) {
	ctx.fillStyle = TA.white;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	// windscreen with a floral valance
	const wx = r.x + 34;
	const wy = r.y + 30;
	const ww = r.w - 68;
	const wh = r.h * 0.44;
	const glass = ctx.createLinearGradient(0, wy, 0, wy + wh);
	glass.addColorStop(0, '#5b7c96');
	glass.addColorStop(1, '#22313f');
	ctx.fillStyle = glass;
	ctx.fillRect(wx, wy, ww, wh);
	ctx.fillStyle = 'rgba(255,255,255,0.22)';
	ctx.beginPath();
	ctx.moveTo(wx + ww * 0.1, wy + wh);
	ctx.lineTo(wx + ww * 0.3, wy);
	ctx.lineTo(wx + ww * 0.38, wy);
	ctx.lineTo(wx + ww * 0.18, wy + wh);
	ctx.fill();
	taFloralBand(ctx, wx, wy, ww, 30, TA.red, rng);
	taZigzag(ctx, wx, wy + 30, ww, 12, TA.yellow, TA.green);
	ctx.strokeStyle = '#2b2b2e';
	ctx.lineWidth = 8;
	ctx.strokeRect(wx, wy, ww, wh);
	ctx.lineWidth = 4;
	for (const sx of [0.3, 0.68]) {
		ctx.beginPath();
		ctx.moveTo(wx + ww * sx, wy + wh - 4);
		ctx.lineTo(wx + ww * (sx + 0.2), wy + wh - 30);
		ctx.stroke();
	}
	// painted garland across the cab
	const gy = wy + wh + 14;
	for (let k = 0; k < 7; k++) {
		const fx = r.x + 40 + k * ((r.w - 80) / 6);
		taLeaf(ctx, fx, gy + 26, 34, -0.4);
		taLeaf(ctx, fx, gy + 26, 34, Math.PI + 0.4);
		taFlower(ctx, fx, gy + 26, 22, TA_FLOWERS[(k * 2) % TA_FLOWERS.length] === TA.white ? TA.pink : TA_FLOWERS[(k * 2) % TA_FLOWERS.length], TA.yellow);
	}
	// grille and lamps
	const gx = r.x + r.w * 0.32;
	const gw = r.w * 0.36;
	const gyy = r.y + r.h - 110;
	ctx.fillStyle = '#2b2b2e';
	ctx.fillRect(gx, gyy, gw, 76);
	ctx.fillStyle = '#b9c0c6';
	for (let k = 0; k < 6; k++) ctx.fillRect(gx + 8, gyy + 8 + k * 11, gw - 16, 5);
	for (const lx of [r.x + 74, r.x + r.w - 74]) {
		ctx.fillStyle = '#cfd5da';
		ctx.beginPath();
		ctx.arc(lx, gyy + 38, 40, 0, Math.PI * 2);
		ctx.fill();
		const glow = ctx.createRadialGradient(lx, gyy + 38, 4, lx, gyy + 38, 32);
		glow.addColorStop(0, '#fffbe6');
		glow.addColorStop(1, '#f2d27a');
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(lx, gyy + 38, 32, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = TA.orange;
		ctx.fillRect(lx + (lx < r.x + r.w / 2 ? 48 : -70), gyy + 26, 22, 22);
	}
}

function truckBumper(ctx: Ctx, r: Region) {
	ctx.fillStyle = TA.red;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = TA.yellow;
	ctx.lineWidth = 6;
	ctx.strokeRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10);
	for (let k = 0; k < 8; k++) {
		const cx = r.x + 34 + k * ((r.w - 68) / 7);
		if (k === 3 || k === 4) continue;
		ctx.fillStyle = k % 2 ? TA.blue : TA.yellow;
		ctx.beginPath();
		ctx.arc(cx, r.y + r.h / 2, 22, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = TA.white;
		ctx.beginPath();
		ctx.arc(cx, r.y + r.h / 2, 9, 0, Math.PI * 2);
		ctx.fill();
	}
	// number plate
	const pw = 150;
	const px = r.x + r.w / 2 - pw / 2;
	ctx.fillStyle = '#f6d03a';
	ctx.fillRect(px, r.y + 22, pw, r.h - 44);
	ctx.strokeStyle = TA.ink;
	ctx.lineWidth = 4;
	ctx.strokeRect(px + 3, r.y + 25, pw - 6, r.h - 50);
	ctx.fillStyle = TA.ink;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	fitText(ctx, 'LEA 7234', (s) => `${s}px ${BLOCK_FONT}`, pw - 20, 34);
	ctx.fillText('LEA 7234', r.x + r.w / 2, r.y + r.h / 2 + 2);
}

function truckCab(ctx: Ctx, r: Region, rng: Rng) {
	ctx.fillStyle = TA.white;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.fillStyle = '#2c3d4c';
	ctx.fillRect(r.x + 26, r.y + 18, r.w - 52, r.h * 0.36);
	ctx.strokeStyle = '#2b2b2e';
	ctx.lineWidth = 6;
	ctx.strokeRect(r.x + 26, r.y + 18, r.w - 52, r.h * 0.36);
	ctx.lineWidth = 3;
	ctx.strokeRect(r.x + 16, r.y + 10, r.w - 32, r.h - 24);
	taDots(ctx, r.x + 16, r.y + r.h * 0.45, r.w - 32, TA.red, 20, 4);
	for (let k = 0; k < 3; k++) {
		const fx = r.x + 50 + k * 78;
		const fy = r.y + r.h * 0.68 + (k % 2) * 22;
		taLeaf(ctx, fx, fy, 40, -0.5);
		taLeaf(ctx, fx, fy, 40, Math.PI + 0.3);
		taFlower(ctx, fx, fy, 26, TA_FLOWERS[(k * 2 + Math.floor(rng() * 2)) % 6], TA.yellow);
	}
	ctx.fillStyle = '#9aa2a8';
	ctx.fillRect(r.x + r.w - 70, r.y + r.h * 0.52, 34, 9);
}

function truckCrown(ctx: Ctx, r: Region, rng: Rng) {
	ctx.fillStyle = TA.navy;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	const i = taBorder(ctx, r.x, r.y, r.w, r.h, [TA.red, TA.yellow, TA.teal], 7);
	taDots(ctx, r.x + i, r.y + i + 8, r.w - i * 2, TA.yellow, 18, 4);
	// flower sprays either side
	for (const side of [0, 1]) {
		const cx = r.x + (side ? r.w - 70 : 70);
		for (let k = 0; k < 3; k++) {
			const fy = r.y + 62 + k * 52;
			taLeaf(ctx, cx, fy, 40, side ? 2.6 : 0.5);
			taFlower(ctx, cx + (k % 2 ? 14 : -14), fy, 22, TA_FLOWERS[(k + side * 2 + Math.floor(rng() * 2)) % 6], TA.yellow);
		}
	}
	// green panel with the crescent and star
	const px = r.x + 128;
	const pw = r.w - 256;
	const py = r.y + 50;
	const ph = r.h - 100;
	ctx.fillStyle = '#0f6b3a';
	ctx.fillRect(px, py, pw, ph);
	ctx.strokeStyle = TA.yellow;
	ctx.lineWidth = 5;
	ctx.strokeRect(px + 5, py + 5, pw - 10, ph - 10);
	for (const [sx, flip] of [[px + 40, 1], [px + pw - 40, -1]] as const) {
		ctx.fillStyle = TA.white;
		ctx.beginPath();
		ctx.arc(sx, py + ph / 2, 22, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#0f6b3a';
		ctx.beginPath();
		ctx.arc(sx + flip * 9, py + ph / 2 - 5, 19, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.fillStyle = TA.white;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.direction = 'rtl';
	fitText(ctx, 'پاکستان', (s) => `700 ${s}px ${URDU_FONT}`, pw - 120, 70);
	ctx.fillText('پاکستان', px + pw / 2, py + ph / 2 + 8);
	ctx.direction = 'ltr';
}

function truckChevron(ctx: Ctx, r: Region) {
	ctx.fillStyle = TA.yellow;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.fillStyle = TA.red;
	for (let k = -2; k < 8; k++) {
		ctx.beginPath();
		ctx.moveTo(r.x + k * 40, r.y + r.h);
		ctx.lineTo(r.x + k * 40 + 20, r.y + r.h);
		ctx.lineTo(r.x + k * 40 + 20 + r.h * 0.6, r.y);
		ctx.lineTo(r.x + k * 40 + r.h * 0.6, r.y);
		ctx.fill();
	}
}

/** Pakistan Railways coach: dark green with a yellow band, windows, doors and lettering. */
function coachSide(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#1d5b3c';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.fillStyle = '#e9dfc4';
	ctx.fillRect(r.x, r.y, r.w, 8);
	ctx.fillStyle = '#163f2b';
	ctx.fillRect(r.x, r.y + r.h - 16, r.w, 16);
	// doors at both ends
	for (const dx of [r.x + 12, r.x + r.w - 62]) {
		ctx.strokeStyle = '#0f2d1f';
		ctx.lineWidth = 3;
		ctx.strokeRect(dx, r.y + 16, 50, r.h - 34);
		ctx.fillStyle = '#2a3946';
		ctx.fillRect(dx + 10, r.y + 24, 30, 30);
		ctx.fillStyle = '#c9a646';
		ctx.fillRect(dx + 38, r.y + 66, 6, 14);
	}
	// windows with bars
	const n = 11;
	const x0 = r.x + 84;
	const span = r.w - 168;
	for (let k = 0; k < n; k++) {
		const wx = x0 + k * (span / n) + 6;
		const ww = span / n - 12;
		ctx.fillStyle = '#e9dfc4';
		ctx.fillRect(wx - 3, r.y + 19, ww + 6, 46);
		ctx.fillStyle = '#2a3946';
		ctx.fillRect(wx, r.y + 22, ww, 40);
		ctx.fillStyle = 'rgba(255,255,255,0.25)';
		ctx.fillRect(wx + 4, r.y + 24, ww * 0.25, 36);
		ctx.fillStyle = '#9aa2a8';
		for (let b = 1; b < 4; b++) ctx.fillRect(wx, r.y + 22 + b * 10, ww, 2);
	}
	ctx.fillStyle = '#f2c24f';
	ctx.fillRect(r.x, r.y + 72, r.w, 7);
	ctx.fillStyle = '#e9dfc4';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.font = `17px ${BLOCK_FONT}`;
	ctx.fillText('PAKISTAN RAILWAYS', r.x + r.w * 0.32, r.y + 95);
	ctx.font = `14px ${BLOCK_FONT}`;
	ctx.fillText('ECONOMY  2-22', r.x + r.w * 0.55, r.y + 95);
	ctx.direction = 'rtl';
	fitText(ctx, 'پاکستان ریلوے', (s) => `700 ${s}px ${URDU_FONT}`, 200, 26);
	ctx.fillText('پاکستان ریلوے', r.x + r.w * 0.76, r.y + 96);
	ctx.direction = 'ltr';
}

/** Pakistan Railways diesel locomotive hood: green with yellow and red stripes. */
function locoSide(ctx: Ctx, r: Region) {
	ctx.fillStyle = '#1d5b3c';
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	// radiator and engine-room grilles
	ctx.fillStyle = '#163f2b';
	for (const [gx, gw] of [[0.06, 0.16], [0.7, 0.24]] as const) {
		ctx.fillRect(r.x + r.w * gx, r.y + 12, r.w * gw, 54);
		ctx.fillStyle = '#0d2a1c';
		for (let k = 0; k < 12; k++) ctx.fillRect(r.x + r.w * gx + 4 + k * ((r.w * gw - 8) / 12), r.y + 14, 3, 50);
		ctx.fillStyle = '#163f2b';
	}
	// access doors
	ctx.strokeStyle = '#0f2d1f';
	ctx.lineWidth = 3;
	for (let k = 0; k < 4; k++) ctx.strokeRect(r.x + r.w * (0.26 + k * 0.1), r.y + 12, r.w * 0.09, 56);
	ctx.fillStyle = '#f2c24f';
	ctx.fillRect(r.x, r.y + 76, r.w, 14);
	ctx.fillStyle = '#c8423a';
	ctx.fillRect(r.x, r.y + 94, r.w, 5);
	ctx.fillStyle = '#ffffff';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	fitText(ctx, 'PAKISTAN RAILWAYS', (s) => `${s}px ${BLOCK_FONT}`, r.w * 0.36, 26);
	ctx.fillText('PAKISTAN RAILWAYS', r.x + r.w * 0.45, r.y + 113);
	ctx.direction = 'rtl';
	fitText(ctx, 'پاکستان ریلوے', (s) => `700 ${s}px ${URDU_FONT}`, 190, 28);
	ctx.fillText('پاکستان ریلوے', r.x + r.w * 0.82, r.y + 112);
	ctx.direction = 'ltr';
	ctx.fillStyle = '#f2c24f';
	ctx.font = `22px ${BLOCK_FONT}`;
	ctx.fillText('6304', r.x + r.w * 0.12, r.y + 113);
}

// ---------------------------------------------------------------------------------------
// National flags at Wagah, drawn to their official proportions (3:2)

function star(ctx: Ctx, cx: number, cy: number, outer: number, inner: number, rotation: number) {
	ctx.beginPath();
	for (let i = 0; i < 10; i++) {
		const r = i % 2 ? inner : outer;
		const a = rotation + (i * Math.PI) / 5;
		const x = cx + Math.cos(a) * r;
		const y = cy + Math.sin(a) * r;
		if (i) ctx.lineTo(x, y);
		else ctx.moveTo(x, y);
	}
	ctx.closePath();
	ctx.fill();
}

/** Flag of Pakistan: white hoist (1/4), dark green field, white crescent and star. */
export function drawFlagPakistan(ctx: Ctx, x: number, y: number, w: number, h: number) {
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(x, y, w * 0.25, h);
	ctx.fillStyle = '#01411c';
	ctx.fillRect(x + w * 0.25, y, w * 0.75, h);
	// crescent and star centred in the green, opening towards the upper fly
	const cx = x + w * 0.625;
	const cy = y + h * 0.5;
	const unit = h;
	ctx.fillStyle = '#ffffff';
	ctx.beginPath();
	ctx.arc(cx, cy, unit * 0.3, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#01411c';
	ctx.beginPath();
	ctx.arc(cx + unit * 0.077, cy - unit * 0.077, unit * 0.275, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#ffffff';
	const sx = cx + unit * 0.13;
	const sy = cy - unit * 0.13;
	// one point of the star aims at the centre of the crescent's opening (upper right)
	star(ctx, sx, sy, unit * 0.1, unit * 0.04, -Math.PI / 4);
}

/** Flag of India: saffron, white and green bands, navy Ashoka Chakra with 24 spokes. */
export function drawFlagIndia(ctx: Ctx, x: number, y: number, w: number, h: number) {
	const band = h / 3;
	ctx.fillStyle = '#ff9933';
	ctx.fillRect(x, y, w, band);
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(x, y + band, w, band);
	ctx.fillStyle = '#138808';
	ctx.fillRect(x, y + band * 2, w, h - band * 2);
	const cx = x + w / 2;
	const cy = y + h / 2;
	const r = band * 0.375;
	ctx.strokeStyle = '#000080';
	ctx.fillStyle = '#000080';
	ctx.lineWidth = Math.max(1.5, r * 0.11);
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.stroke();
	ctx.lineWidth = Math.max(1, r * 0.045);
	for (let i = 0; i < 24; i++) {
		const a = (i / 24) * Math.PI * 2;
		ctx.beginPath();
		ctx.moveTo(cx + Math.cos(a) * r * 0.16, cy + Math.sin(a) * r * 0.16);
		ctx.lineTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95);
		ctx.stroke();
	}
	ctx.beginPath();
	ctx.arc(cx, cy, r * 0.17, 0, Math.PI * 2);
	ctx.fill();
}

const DEVANAGARI_FONT = '"Noto Sans Devanagari", "Nirmala UI", "Mangal", "Kohinoor Devanagari", sans-serif';

/** Sign with Devanagari on the left and Latin on the right (Indian side of the border). */
function signDeva(ctx: Ctx, r: Region, bg: string, fg: string, deva: string, english: string, border = '#f4f0e6') {
	ctx.fillStyle = bg;
	ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
	ctx.strokeStyle = border;
	ctx.lineWidth = 6;
	ctx.strokeRect(r.x + 7, r.y + 7, r.w - 14, r.h - 14);
	ctx.fillStyle = fg;
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.direction = 'ltr';
	if (english) {
		fitText(ctx, deva, (s) => `700 ${s}px ${DEVANAGARI_FONT}`, r.w * 0.44, 58);
		ctx.fillText(deva, r.x + r.w * 0.26, r.y + r.h / 2 + 2);
		fitText(ctx, english, (s) => `${s}px ${BLOCK_FONT}`, r.w * 0.44, 44);
		ctx.fillText(english, r.x + r.w * 0.73, r.y + r.h / 2 + 2);
	} else {
		fitText(ctx, deva, (s) => `700 ${s}px ${DEVANAGARI_FONT}`, r.w - 40, 64);
		ctx.fillText(deva, r.x + r.w / 2, r.y + r.h / 2 + 2);
	}
}

// ---------------------------------------------------------------------------------------

let atlasTexture: CanvasTexture | null = null;

async function waitForFonts(): Promise<void> {
	if (typeof document === 'undefined' || !document.fonts) return;
	const link = document.querySelector<HTMLLinkElement>('link[data-lahore-fonts]');
	if (link && !link.sheet) {
		await Promise.race([
			new Promise((resolve) => {
				link.addEventListener('load', resolve, { once: true });
				link.addEventListener('error', resolve, { once: true });
			}),
			new Promise((resolve) => setTimeout(resolve, 3000))
		]);
	}
	const loads = [
		'700 48px "Noto Nastaliq Urdu"',
		'700 48px "Noto Naskh Arabic"',
		'48px "Bungee"',
		'700 48px "Noto Sans Devanagari"',
		'48px "Gochi Hand"'
	].map((font) => document.fonts.load(font).catch(() => []));
	await Promise.race([Promise.all(loads), new Promise((resolve) => setTimeout(resolve, 2500))]);
}

export async function createDecorAtlas(): Promise<CanvasTexture> {
	if (atlasTexture) return atlasTexture;
	await waitForFonts();
	const canvas = document.createElement('canvas');
	canvas.width = ATLAS_SIZE;
	canvas.height = ATLAS_HEIGHT;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D canvas unavailable for the Lahore decor atlas');
	const rng = mulberry32(1635);
	const G = DECOR_REGIONS;
	ctx.fillStyle = '#c8b8a0';
	ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_HEIGHT);

	bricks(ctx, G.brickRed, rng, '#b8694f', '#c88d72');
	bricks(ctx, G.brickTan, rng, '#c6a582', '#d8c0a0');
	bricks(ctx, G.brickDark, rng, '#a35b45', '#b8775f');
	brickPaving(ctx, G.pavingHerring, rng);
	slabs(ctx, G.sandstoneSlabs, rng, '#d6957c', '#c27f66', 2, 4);
	slabs(ctx, G.marbleSlabs, rng, '#efe9df', '#d6cdbd', 2, 2);
	sandstoneInlay(ctx, G.sandstoneInlay);
	geometricStars(ctx, G.geometricStar);
	jali(ctx, G.jali, '#e9dfcc', '#3b302b');
	woodLattice(ctx, G.woodJali);
	frescoNet(ctx, G.frescoNet);
	mirrorMosaic(ctx, G.mirrorMosaic, rng);
	slabs(ctx, G.pavingStone, rng, '#bdb5a8', '#a39b8e', 3, 3);
	plaster(ctx, G.limePlaster, rng, '#e8dcc6');
	marbleInlay(ctx, G.marbleInlay, rng);
	plaster(ctx, G.ochrePlaster, rng, '#dca863');

	tileBand(ctx, G.tileBand);
	calligraphyBand(ctx, G.calligraphyBand);
	inlayBand(ctx, G.inlayBand);

	tileVaseNiche(ctx, G.tileVaseNiche);
	tileCypress(ctx, G.tileCypress);
	frescoVase(ctx, G.frescoVase);
	frescoBird(ctx, G.frescoBird);
	door(ctx, G.doorStudded, '#6f4a33', '#c79a48');
	door(ctx, G.doorGreen, '#3f6b55', '#d8c58a');
	windowArched(ctx, G.windowArched);
	windowShutter(ctx, G.windowShutter);
	shopShutter(ctx, G.shopShutter);
	poster(ctx, G.posterA, rng, '#2f7b56', 'جشن بہاراں');
	poster(ctx, G.posterB, rng, '#c53d36', 'لاہور لاہور اے');

	tileSpandrel(ctx, G.tileSpandrel, rng, '#2f56a6', '#2fa3a8');
	tileSpandrel(ctx, G.tileSpandrelGold, rng, '#f2c14f', '#4f9a5d');
	frescoDome(ctx, G.frescoDome);
	inlayNiche(ctx, G.inlayNiche);
	tileSquare(ctx, G.tileSquare);

	sign(ctx, G.signDelhiGate, '#c6a582', '#c99a3a', 'دہلی گیٹ', '', '#c6a582');
	sign(ctx, G.signCalligraphy, '#2f7b56', '#f4f0e6', 'سُبْحَانَ اللّٰہِ وَالْحَمْدُ لِلّٰہِ وَلَا اِلٰہَ اِلَّا اللّٰہُ وَاللّٰہُ اَکْبَر', '');
	sign(ctx, G.signHammam, '#5b3c31', '#f2c24f', 'شاہی حمام', 'SHAHI HAMMAM');
	sign(ctx, G.signChai, '#c53d36', '#ffffff', 'چائے خانہ', 'CHAI');
	sign(ctx, G.signMithai, '#d87c8f', '#ffffff', 'مٹھائی', 'SWEETS');
	sign(ctx, G.signKapra, '#2f5d9a', '#ffffff', 'کپڑا ہاؤس', 'CLOTH');
	sign(ctx, G.signJutay, '#2f7b56', '#ffffff', 'لاہوری جوتے', 'KHUSSA');
	sign(ctx, G.signKitab, '#f2c24f', '#2b2b2e', 'کتب خانہ', 'BOOKS', '#2b2b2e');
	sign(ctx, G.signTikka, '#e08b50', '#ffffff', 'تکہ کباب', 'TIKKA');
	sign(ctx, G.signLassi, '#f4f0e6', '#2f56a6', 'لسی', 'LASSI', '#2f56a6');
	sign(ctx, G.signNaan, '#6f4a33', '#f2c24f', 'تندوری نان', 'NAAN');
	sign(ctx, G.signKarahi, '#c53d36', '#f2c24f', 'لاہوری کڑاہی', 'KARAHI');
	sign(ctx, G.signHalwa, '#f2c24f', '#c53d36', 'حلوہ پوری', 'HALWA PURI', '#c53d36');
	sign(ctx, G.signBangles, '#c6417f', '#ffffff', 'چوڑیاں', 'BANGLES');
	sign(ctx, G.signPost, '#c8423a', '#ffffff', 'پاکستان پوسٹ', 'POST');
	sign(ctx, G.foodStreetBanner, '#2b2b2e', '#f2c24f', 'فوڈ اسٹریٹ', 'FORT ROAD FOOD STREET', '#f2c24f');
	sign(ctx, G.signFalooda, '#a68dc8', '#ffffff', 'فالودہ', 'FALOODA');
	sign(ctx, G.signPaan, '#3f9a69', '#ffffff', 'پان شاپ', 'PAAN');
	sign(ctx, G.signAttar, '#5b3c31', '#f2c24f', 'عطر', 'ATTAR');
	sign(ctx, G.signPhool, '#f19b39', '#ffffff', 'پھول والے', 'FLOWERS');
	sign(ctx, G.signChaat, '#4fb2ad', '#ffffff', 'دہی بھلے', 'CHAAT');
	sign(ctx, G.signWelcome, '#2f56a6', '#f2c24f', 'جی آیاں نوں', 'WELCOME', '#f2c24f');
	sign(ctx, G.stadiumBanner, '#1f6b3a', '#ffffff', 'قذافی اسٹیڈیم', 'GADDAFI STADIUM', '#f2c24f');
	sign(ctx, G.signTickets, '#c53d36', '#ffffff', 'ٹکٹ گھر', 'TICKETS');
	sign(ctx, G.signEnclosure, '#2b2b2e', '#f2c24f', 'گیٹ نمبر ۱', 'GATE 1', '#f2c24f');
	scoreboard(ctx, G.scoreboard);
	truckSide(ctx, G.truckSide, rng);
	truckBack(ctx, G.truckBack, rng);
	truckFront(ctx, G.truckFront, rng);
	truckBumper(ctx, G.truckBumper);
	truckCab(ctx, G.truckCab, rng);
	truckCrown(ctx, G.truckCrown, rng);
	taFloralBand(ctx, G.truckFloral.x, G.truckFloral.y, G.truckFloral.w, G.truckFloral.h, TA.red, rng);
	truckChevron(ctx, G.truckChevron);
	sign(ctx, G.stationSign, '#f2c24f', '#1b1b1d', 'لاہور جنکشن', 'LAHORE JN.', '#1b1b1d');
	sign(ctx, G.platformSign, '#2f56a6', '#ffffff', 'پلیٹ فارم نمبر ۱', 'PLATFORM 1');
	coachSide(ctx, G.coachSide);
	locoSide(ctx, G.locoSide);
	sign(ctx, G.signButtKarahi, '#c53d36', '#f2c24f', 'بٹ کڑاہی', 'BUTT KARAHI', '#f2c24f');
	sign(ctx, G.signNihari, '#5b2c19', '#f2c24f', 'نہاری ہاؤس', 'NIHARI', '#f2c24f');
	sign(ctx, G.signPhajja, '#2f7b56', '#ffffff', 'پھجا سری پائے', 'PHAJJA PAYE');
	sign(ctx, G.signTikkaHouse, '#1b1b1d', '#f19b39', 'تکہ ہاؤس', 'TIKKA HOUSE', '#f19b39');
	sign(ctx, G.signBiryani, '#f2b84b', '#7b2a12', 'دم بریانی', 'BIRYANI', '#7b2a12');
	sign(ctx, G.signPulao, '#f4ead0', '#2f7b56', 'یخنی پلاؤ', 'PULAO', '#2f7b56');
	sign(ctx, G.signGolgappay, '#5b8f3a', '#ffffff', 'گول گپے', 'GOLGAPPAY');
	sign(ctx, G.signMalaiLassi, '#2f56a6', '#ffffff', 'ملائی لسی', 'LASSI');
	drawFlagPakistan(ctx, G.flagPakistan.x, G.flagPakistan.y, G.flagPakistan.w, G.flagPakistan.h);
	drawFlagIndia(ctx, G.flagIndia.x, G.flagIndia.y, G.flagIndia.w, G.flagIndia.h);
	sign(ctx, G.signBabEAzadi, '#01411c', '#ffffff', 'باب آزادی', 'BAB-E-AZADI', '#ffffff');
	sign(ctx, G.signZindabad, '#ffffff', '#01411c', 'پاکستان زندہ باد', 'PAKISTAN', '#01411c');
	signDeva(ctx, G.signIndiaGate, '#ff9933', '#1b1b1d', 'भारत', '', '#ffffff');
	sign(ctx, G.signZeroLine, '#ffffff', '#c8423a', '', 'ZERO LINE', '#c8423a');
	signDeva(ctx, G.signSwarnaJayanti, '#f4f0e6', '#1f2a7a', 'स्वर्ण जयंती द्वार', 'INDIA', '#ff9933');
	sign(ctx, G.signRangers, '#1c1d20', '#f2c24f', 'پاکستان رینجرز', 'PAKISTAN RANGERS', '#2f8f4f');
	sign(ctx, G.signMotto, '#01411c', '#ffffff', 'ایمان، اتحاد، تنظیم', 'FAITH · UNITY · DISCIPLINE', '#f2c24f');
	sign(ctx, G.signQuaid, '#ffffff', '#01411c', 'قائداعظم محمد علی جناح', 'QUAID-E-AZAM', '#01411c');

	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;
	texture.anisotropy = 8;
	texture.minFilter = LinearMipmapLinearFilter;
	texture.magFilter = LinearFilter;
	texture.generateMipmaps = true;
	texture.needsUpdate = true;
	texture.name = 'LahoreDecorAtlas';
	atlasTexture = texture;
	return texture;
}
