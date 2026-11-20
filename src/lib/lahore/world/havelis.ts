import { Vector3 } from 'three';
import { pick, randInt, randRange, type Rng } from '../core/math';
import { PlanetFrame } from '../core/planet';
import { Builder, type Look } from '../geometry/builder';
import { FOOD_SIGNS, SHOP_SIGNS, type DecorKey } from '../render/decorAtlas';
import type { PaletteKey } from '../render/palette';
import { awning, jharokha, pediment, window } from './common';
import type { WorldContext } from './context';
import { BAZAAR_ROWS, STREETS, TRAIL_WIDTH, isReserved, wrapW } from './layout';

export type HaveliStyle = 'walled' | 'food' | 'mixed';

const SHOP_INFO: Record<string, [string, string, string]> = {
	signChai: ['Chai khana', 'چائے خانہ', 'Doodh patti chai, brewed with milk and cardamom, poured from a height for the froth.'],
	signMithai: ['Mithai shop', 'مٹھائی', 'Gulab jamun, jalebi and barfi. Lahoris buy a box for every good news.'],
	signKapra: ['Cloth house', 'کپڑا', 'Lawn, khaddar and silk by the metre, ready for the tailor next door.'],
	signJutay: ['Khussa maker', 'کھسہ', 'Hand-stitched khussa shoes with gold thread, a Lahore speciality.'],
	signKitab: ['Book stall', 'کتب', 'Urdu poetry, old maps and school books. Ask for Iqbal and Faiz.'],
	signLassi: ['Lassi wala', 'لسی', 'Thick sweet lassi in a clay cup, topped with a slab of cream.'],
	signBangles: ['Bangle stall', 'چوڑیاں', 'Glass bangles in every colour, sold by the dozen.'],
	signAttar: ['Attar seller', 'عطر', 'Rose, jasmine and oud oils in tiny crystal bottles.'],
	signPhool: ['Flower seller', 'پھول', 'Motia and rose garlands, strung fresh every morning.'],
	signPaan: ['Paan shop', 'پان', 'Betel leaf folded with gulkand and fennel, the after-dinner ritual.'],
	signHalwa: ['Halwa puri', 'حلوہ پوری', 'The Sunday breakfast: puri, chana and semolina halwa.'],
	signTikka: ['Tikka house', 'تکہ', 'Charcoal-grilled chicken and mutton tikka, served with naan.'],
	signNaan: ['Tandoor', 'تندور', 'Naan slapped onto the hot clay walls of the tandoor.'],
	signKarahi: ['Karahi house', 'کڑاہی', 'Lahori karahi cooked in the iron wok with tomatoes and green chillies.'],
	signFalooda: ['Falooda', 'فالودہ', 'Rose syrup, vermicelli and kulfi in a tall glass.'],
	signChaat: ['Dahi bhalla', 'دہی بھلے', 'Lentil dumplings in yoghurt with tamarind chutney.']
};

type HaveliOptions = {
	width: number;
	depth: number;
	floors: number;
	style: HaveliStyle;
	shop: boolean;
	sign?: DecorKey;
	rooftop?: boolean;
};

function bodyLook(rng: Rng, style: HaveliStyle): { wall: Look; trim: PaletteKey; painted: boolean } {
	if (style === 'food') {
		const paint = pick(rng, ['paintPink', 'paintBlue', 'paintYellow', 'paintGreen', 'paintTurquoise', 'paintOrange', 'paintLilac', 'paintMint', 'paintCream'] as PaletteKey[]);
		if (rng() < 0.35) return { wall: { decor: 'brickRed', tile: 1.6 }, trim: 'paintCream', painted: false };
		return { wall: paint, trim: 'white', painted: true };
	}
	if (style === 'mixed') {
		const v = rng();
		if (v < 0.4) return { wall: pick(rng, ['lime', 'cream', 'plasterWhite', 'ochreLight'] as PaletteKey[]), trim: 'limeDark', painted: true };
		return { wall: { decor: v < 0.7 ? 'brickRed' : 'brickTan', tile: 1.6 }, trim: 'lime', painted: false };
	}
	const v = rng();
	if (v < 0.55) return { wall: { decor: 'brickRed', tile: 1.6 }, trim: 'brickLight', painted: false };
	if (v < 0.78) return { wall: { decor: 'brickTan', tile: 1.6 }, trim: 'brickTanLight', painted: false };
	if (v < 0.9) return { wall: { decor: 'brickDark', tile: 1.6 }, trim: 'lime', painted: false };
	return { wall: pick(rng, ['lime', 'paintCream', 'paintSky', 'paintMint'] as PaletteKey[]), trim: 'limeDark', painted: true };
}

/**
 * One Walled City haveli facing +Z with its façade on z = 0.
 * Returns local wire anchor points (top front corners) for street-crossing cables.
 */
export function haveli(b: Builder, x: number, o: HaveliOptions): { anchors: [number, number, number][]; height: number } {
	const rng = b.rng;
	const { width: w, depth: d, floors } = o;
	const floorH = 2.9;
	const groundH = 3.1;
	const H = groundH + (floors - 1) * floorH;
	const look = bodyLook(rng, o.style);
	const wood = pick(rng, ['wood', 'woodDark', 'woodGreen', 'woodBlue'] as PaletteKey[]);

	// main body (front face slightly set back for shop recess on ground floor)
	b.box(w, H, d, look.wall, { x, y: 0, z: -d / 2 }, { collide: true }, { top: look.painted ? (look.wall as PaletteKey) : 'brickDark' });

	// plinth band
	b.box(w + 0.04, 0.35, 0.12, look.trim, { x, y: 0, z: 0.02 }, { collide: false });

	// ground floor: shop or door
	if (o.shop) {
		const sw = Math.min(w - 0.8, 3.4);
		b.box(sw, 2.4, 0.1, 'interior', { x, y: 0.35, z: 0.03 }, { collide: false });
		const open = rng() < 0.7;
		if (!open) {
			b.panel(sw - 0.1, 2.2, { decor: 'shopShutter' }, { x, y: 0.4, z: 0.1 }, { collide: false });
		} else {
			// counter and goods
			b.box(sw - 0.2, 0.9, 0.5, 'woodLight', { x, y: 0, z: 0.35 }, { collide: true });
			const goods = pick(rng, [
				['marigold', 'flowerPink', 'gulmohar'],
				['fabricMagenta', 'fabricSaffron', 'fabricTeal'],
				['brass', 'gold', 'potClay'],
				['naan', 'ochreLight', 'sand'],
				['paintGreen', 'paintOrange', 'paintYellow']
			] as PaletteKey[][]);
			for (let i = 0; i < 5; i++) {
				b.box(0.42, 0.3 + rng() * 0.25, 0.32, goods[i % goods.length], { x: x - sw / 2 + 0.45 + i * ((sw - 0.9) / 4), y: 0.9, z: 0.35 }, { collide: false });
			}
			// shelves inside
			for (let s = 0; s < 3; s++) b.box(sw - 0.3, 0.06, 0.3, 'woodLight', { x, y: 0.9 + s * 0.55, z: 0.1 }, { collide: false });
		}
		// sign board above the shop
		const sign = o.sign ?? pick(rng, o.style === 'food' ? FOOD_SIGNS : SHOP_SIGNS);
		b.panel(Math.min(w - 0.4, 3.6), 0.9, { decor: sign }, { x, y: 2.8, z: 0.06 }, { collide: false });
		if (rng() < 0.75) awning(b, sw + 0.4, 1.0, { x, y: 2.65, z: 0.05 }, pick(rng, ['awningRed', 'awningBlue', 'awningGreen', 'awningOrange', 'awningYellow', 'awningPink'] as PaletteKey[]));
	} else {
		b.panel(1.3, 2.3, { decor: rng() < 0.5 ? 'doorStudded' : 'doorGreen' }, { x: x + randRange(rng, -w / 4, w / 4), y: 0.35, z: 0.04 }, { collide: false });
		if (rng() < 0.5) b.panel(1.6, 1.1, { decor: rng() < 0.5 ? 'posterA' : 'posterB' }, { x: x + (rng() < 0.5 ? -1 : 1) * (w / 2 - 1.1), y: 1.2, z: 0.03 }, { collide: false });
	}

	// floor cornices
	for (let f = 1; f < floors; f++) {
		const y = groundH + (f - 1) * floorH;
		b.box(w + 0.2, 0.18, 0.28, look.trim, { x, y: y - 0.1, z: 0.1 }, { collide: false });
	}

	// upper floors: jharokhas or windows
	const jharokhaFloor = floors >= 2 && (o.style !== 'mixed' || rng() < 0.4) ? randInt(rng, 1, floors - 1) : -1;
	for (let f = 1; f < floors; f++) {
		const y = groundH + (f - 1) * floorH + 0.55;
		if (f === jharokhaFloor) {
			const jw = Math.min(w - 1.0, rng() < 0.5 ? 2.2 : 3.0);
			jharokha(b, jw, { x, y: y - 0.25, z: 0 }, { wood, canopy: rng() < 0.6 ? wood : 'tileCobalt' });
			continue;
		}
		const count = w > 5 ? 2 : 1;
		const arch = rng() < 0.55;
		for (let i = 0; i < count; i++) {
			const wx = count === 1 ? x : x + (i === 0 ? -1 : 1) * (w / 4);
			const fill: Look = arch ? { decor: 'windowArched' } : rng() < 0.5 ? { decor: 'windowShutter' } : 'glass';
			window(b, 0.95, 1.5, { x: wx, y, z: 0 }, { frame: look.trim, fill, arch });
			if (!arch && rng() < 0.4) pediment(b, 1.3, 0.35, look.trim, { x: wx, y: y + 1.65, z: 0.05 });
			if (rng() < 0.12) b.box(0.7, 0.45, 0.5, 'plasterWhite', { x: wx, y: y - 0.65, z: 0.3 }, { collide: false });
		}
	}

	// parapet and rooftop
	const parapet = 0.7;
	b.box(w, parapet, 0.18, look.trim, { x, y: H, z: -0.09 }, { collide: true });
	b.box(w, parapet, 0.18, look.trim, { x, y: H, z: -d + 0.09 }, { collide: true });
	b.box(0.18, parapet, d, look.trim, { x: x - w / 2 + 0.09, y: H, z: -d / 2 }, { collide: true });
	b.box(0.18, parapet, d, look.trim, { x: x + w / 2 - 0.09, y: H, z: -d / 2 }, { collide: true });
	if (o.style === 'food' && rng() < 0.6) {
		b.merlons(w - 0.2, 0.5, look.trim, { x, y: H + parapet, z: -0.09 });
	}
	if (o.rooftop ?? rng() < 0.55) {
		const v = rng();
		if (v < 0.5) {
			b.cylinder(0.55, 1.1, 'waterTank', { x: x + randRange(rng, -w / 4, w / 4), y: H, z: -d / 2 - 0.5 }, { segments: 10 });
		} else if (v < 0.75) {
			b.box(1.6, 2.0, 1.6, look.trim, { x: x - w / 4, y: H, z: -d + 1.2 }, { collide: true });
		} else {
			// clothesline with laundry
			for (let i = 0; i < 4; i++) {
				b.panel(0.45, 0.65, pick(rng, ['fabricMagenta', 'fabricSaffron', 'fabricTeal', 'fabricWhite', 'paintSky'] as PaletteKey[]), {
					x: x - w / 3 + i * (w / 5),
					y: H + 0.6,
					z: -d / 2
				}, { collide: false });
			}
		}
	}
	return {
		anchors: [
			[x - w / 2 + 0.3, H - 0.4, 0.05],
			[x + w / 2 - 0.3, H - 0.4, 0.05],
			[x, H - 1.6, 0.05]
		],
		height: H
	};
}

/** Rows of havelis along a street segment in trail coordinates. */
function rowAlong(
	ctx: WorldContext,
	start: [number, number],
	end: [number, number],
	sideOffset: number,
	style: HaveliStyle,
	chunk: string,
	seed: number,
	reserveCheck = true
): { frame: PlanetFrame; anchors: Vector3[] }[] {
	const b = new Builder(seed);
	const rng = b.rng;
	const [aw, at] = start;
	const [bw, bt] = end;
	const len = Math.hypot(bw - aw, bt - at);
	const dw = (bw - aw) / len;
	const dt = (bt - at) / len;
	// normal pointing to the row side (left of travel direction for +1)
	const nw = -dt;
	const nt = dw;
	const result: { frame: PlanetFrame; anchors: Vector3[] }[] = [];
	let s = 0.5;
	let inBlock = 0;
	while (s < len - 2) {
		// an open alley every few houses, so rows never become one long wall
		if (inBlock >= 3) {
			inBlock = 0;
			s += 4.5;
			continue;
		}
		const width = Math.min(len - s, randRange(rng, 3.8, 6.4));
		if (width < 3) break;
		const cs = s + width / 2;
		const cw = aw + dw * cs + nw * sideOffset;
		const ct = at + dt * cs + nt * sideOffset;
		const depth = randRange(rng, 6, 8.5);
		const backW = cw + nw * Math.sign(sideOffset) * depth * 0.6;
		const backT = ct + nt * Math.sign(sideOffset) * depth * 0.6;
		if (reserveCheck && (isReserved(wrapW(cw), ct, 0.4) || isReserved(wrapW(backW), backT, 0.2))) {
			s += 1.5;
			continue;
		}
		// facing: towards the street (opposite to the offset normal)
		const fw = -nw * Math.sign(sideOffset);
		const ft = -nt * Math.sign(sideOffset);
		// compass: north = +t, east = -w (w grows westwards)
		const facing = (Math.atan2(-fw, ft) * 180) / Math.PI;
		const frame = PlanetFrame.trail(cw, ct, facing);
		const floors = style === 'food' ? randInt(rng, 3, 5) : randInt(rng, 2, 4);
		const shop = style === 'food' ? rng() < 0.85 : rng() < 0.7;
		const sign = shop ? pick(rng, style === 'food' ? FOOD_SIGNS : SHOP_SIGNS) : undefined;
		const info = haveli(b, 0, { width: width - 0.12, depth, floors, style, shop, sign });
		ctx.bake(b, frame, chunk);
		const anchors = info.anchors.map(([x, y, z]) => frame.point(x, y, z));
		result.push({ frame, anchors });
		if (shop && sign && SHOP_INFO[sign] && rng() < 0.55) {
			const [label, urdu, text] = SHOP_INFO[sign];
			ctx.shop(frame, 0, 1.6, label, urdu, text);
			ctx.spot(frame, rng() < 0.5 ? -0.6 : 0.6, 0.95, 0, style === 'food' ? 'vendor' : 'shopkeeper', {
				models: style === 'food' ? ['chef', 'boss', 'male-scientist'] : ['boss', 'male-scientist', 'mountainman', 'office-worker'],
				dialogue: sign
			});
		}
		s += width;
		inBlock++;
	}
	return result;
}

/** Cables zig-zagging between opposite façades: the tangle of the old city. */
function wiresBetween(ctx: WorldContext, left: Vector3[], right: Vector3[], rng: Rng) {
	if (!left.length || !right.length) return;
	for (let i = 0; i < left.length; i++) {
		const a = left[i];
		const candidates = right.filter((p) => p.distanceTo(a) < 11);
		if (!candidates.length) continue;
		const count = rng() < 0.5 ? 1 : 2;
		for (let k = 0; k < count; k++) {
			const bpt = pick(rng, candidates);
			ctx.wire(a, bpt, 0.4 + rng() * 0.9, 12);
		}
	}
	// a few cables running along the façades
	for (const side of [left, right]) {
		for (let i = 0; i < side.length - 1; i++) {
			if (rng() < 0.6) ctx.wire(side[i], side[i + 1], 0.25 + rng() * 0.3, 8);
		}
	}
}

export function buildBazaars(ctx: WorldContext) {
	let seed = 100;
	const curb = TRAIL_WIDTH / 2 + 0.75;
	const rowsBySegment = new Map<string, Vector3[][]>();
	for (const row of BAZAAR_ROWS) {
		const chunk = `bazaar-${row.style}-${Math.floor(row.w0 / 40)}`;
		const offset = row.side * curb;
		// travel westwards (increasing w); left of travel is north (+t)
		const built = rowAlong(ctx, [row.w0, 0], [row.w1, 0], offset, row.style, chunk, seed++);
		const key = `${row.w0}-${row.w1}`;
		const anchors = built.flatMap((r) => r.anchors.filter((_, i) => i < 2));
		const list = rowsBySegment.get(key) ?? [];
		list.push(anchors);
		rowsBySegment.set(key, list);
		if (row.style === 'food') {
			for (let i = 0; i < built.length - 1; i += 1) {
				const a = built[i].anchors[2];
				const bb = built[i + 1].anchors[2];
				void a;
				void bb;
			}
		}
	}
	const rng = new Builder(7).rng;
	for (const [key, rows] of rowsBySegment) {
		if (rows.length === 2) {
			const [w0] = key.split('-').map(Number);
			if (w0 >= 278) {
				// Food Street: string lights instead of utility cables
				for (let i = 0; i < Math.min(rows[0].length, rows[1].length); i += 2) {
					const a = rows[0][i];
					const bpt = rows[1][Math.min(rows[1].length - 1, i + 1)];
					ctx.stringLights(a, bpt, 0.9, 0.55, i % 4 === 0 ? 'lantern' : 'bulb');
				}
			} else wiresBetween(ctx, rows[0], rows[1], rng);
		}
	}

	// side galis
	for (const street of STREETS) {
		if (street.name === 'Roshnai Path') continue;
		const [a, bpt] = street.points;
		const chunk = `gali-${street.name}`;
		const half = street.width / 2 + 0.25;
		const left = rowAlong(ctx, a, bpt, half, 'walled', chunk, seed++);
		const right = rowAlong(ctx, a, bpt, -half, 'walled', chunk, seed++);
		wiresBetween(
			ctx,
			left.flatMap((r) => r.anchors.slice(0, 2)),
			right.flatMap((r) => r.anchors.slice(0, 2)),
			rng
		);
		// pedestrians walking the gali
		ctx.trailPath([a, bpt], false, 2);
	}
}
