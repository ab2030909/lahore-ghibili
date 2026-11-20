import { DataTexture, NearestFilter, RGBAFormat, SRGBColorSpace, UnsignedByteType } from 'three';

/**
 * Lahore colour palette. Like Messenger's 16x16 `atlas.png`, geometry UVs point at a single
 * cell, and the toon shader derives the shadow tint from that colour. Colours were picked
 * from reference photographs of each landmark and softened to sit in Messenger's palette.
 *
 * Row 15 is reserved for unlit/emissive colours (bulbs, lanterns, fire, lit windows).
 */
export const PALETTE = {
	// Brick and earth
	brick: '#b8694f',
	brickDark: '#99533f',
	brickLight: '#cd8a6c',
	brickTan: '#c6a582',
	brickTanDark: '#a7865f',
	brickTanLight: '#dcc3a2',
	terracotta: '#c56f52',
	terracottaDark: '#a3563f',
	ochre: '#dca863',
	ochreLight: '#ebc888',
	ochreDark: '#b98845',
	sandstone: '#c96f58',
	sandstoneDark: '#a8584a',
	sandstoneLight: '#d99a80',
	sandstonePave: '#d6957c',
	marble: '#f0ebe1',
	marbleShade: '#ddd4c5',
	cream: '#efe4d0',
	creamDark: '#d9c8ab',
	lime: '#e8dcc6',
	limeDark: '#cdbd9f',
	plasterWhite: '#ece6da',
	plasterGrey: '#bdb5a8',
	// Wood and metal
	wood: '#6f4a33',
	woodDark: '#4e3323',
	woodLight: '#9b6b45',
	woodGreen: '#3f6b55',
	woodBlue: '#3e5f7c',
	shutterGrey: '#8e9597',
	shutterBlue: '#5d89a6',
	shutterGreen: '#5c9877',
	iron: '#3b3d40',
	brass: '#c79a48',
	gold: '#d8a83c',
	// Painted havelis (Food Street)
	paintPink: '#d87c8f',
	paintRose: '#c55b6d',
	paintBlue: '#5f93c5',
	paintSky: '#8bc0dd',
	paintTurquoise: '#4fb2ad',
	paintGreen: '#6fae6b',
	paintYellow: '#f0c25b',
	paintOrange: '#e08b50',
	paintMint: '#a9d8c1',
	paintLilac: '#a68dc8',
	paintCream: '#f3e3bf',
	// Kashi tiles (Wazir Khan)
	tileCobalt: '#2f56a6',
	tileTurquoise: '#2fa3a8',
	tileYellow: '#f2c14f',
	tileGreen: '#4f9a5d',
	tileWhite: '#f4f0e6',
	tileOrange: '#e07b3a',
	// Nature
	grass: '#86b56c',
	grassDark: '#679a5b',
	grassLight: '#a3c97f',
	leaf: '#5b9f6c',
	leafDark: '#447f56',
	leafLight: '#7cb877',
	leafOlive: '#8aa25a',
	gulmohar: '#e2573f',
	jacaranda: '#9a80d2',
	bougainvillea: '#d9529a',
	marigold: '#f2a83c',
	trunk: '#7b5a45',
	trunkDark: '#5d4334',
	dirt: '#baa17f',
	sand: '#ddcaa5',
	riverbed: '#8f8b72',
	rock: '#a29b8c',
	// Street
	paving: '#b5795f',
	pavingDark: '#9c6550',
	pavingStone: '#bdb5a8',
	pavingStoneDark: '#a29a8d',
	asphalt: '#757371',
	curb: '#d7d0c4',
	cityGround: '#c2ad91',
	// Signs, fabrics, misc
	signGreen: '#2f7b56',
	signRed: '#c53d36',
	signBlue: '#2f5d9a',
	signYellow: '#f2c24f',
	awningRed: '#c9493f',
	awningBlue: '#3f74b5',
	awningGreen: '#3f9a69',
	awningOrange: '#e48a3b',
	awningYellow: '#e9b83f',
	awningPink: '#d35f8c',
	fabricMagenta: '#c6417f',
	fabricSaffron: '#f19b39',
	fabricTeal: '#2f8f8a',
	fabricWhite: '#f2efe8',
	flowerPink: '#e98aa1',
	flagGreen: '#1f6b46',
	postRed: '#c8423a',
	rickshawGreen: '#3e9a4b',
	rickshawYellow: '#efc340',
	black: '#2b2b2e',
	charcoal: '#3a3c3f',
	white: '#f6f4ef',
	glass: '#3c4a57',
	glassLight: '#7f97a8',
	windowFrame: '#e6dcc8',
	interior: '#3b302b',
	recess: '#5b3c31',
	recessStone: '#6b4a40',
	steel: '#9aa3a8',
	waterTank: '#2f3236',
	potClay: '#b0603f',
	coal: '#2e2a28',
	karahi: '#4a4a48',
	naan: '#e6c387',
	// flags at Wagah
	pakGreen: '#01411c',
	indiaSaffron: '#ff9933',
	indiaGreen: '#138808',
	indiaNavy: '#1f2a7a',
	// dishes of the food street
	rice: '#f4ead0',
	biryaniRice: '#f2b84b',
	saffron: '#f39a1e',
	pulaoRice: '#d6b37c',
	gravyRed: '#b8401f',
	niharyRed: '#8e2a12',
	gravyBrown: '#7b4325',
	tikkaRed: '#c9472c',
	chilliGreen: '#3f8f2f',
	coriander: '#5aa845',
	yogurt: '#f6f3e8',
	lassi: '#efe6c8',
	puri: '#d9a457',
	tamarind: '#5b2c19',
	mintWater: '#7fb85a',
	copper: '#b8743c',
	lemon: '#e8d84f',
	onionPink: '#e6b3c3',
	ginger: '#e9cf8a',
	cloth: '#d8cfc0',
	// Row 15: unlit
	bulb: '#ffe8a3',
	lantern: '#ffc56b',
	lanternRed: '#ff7b5c',
	neonPink: '#ff86b0',
	neonGreen: '#86ffbf',
	neonBlue: '#86d2ff',
	litWindow: '#ffd37b',
	fire: '#ff8a3e',
	ember: '#ffb36b',
	skyGlow: '#fff4d6'
} as const;

export type PaletteKey = keyof typeof PALETTE;

const UNLIT_KEYS: PaletteKey[] = [
	'bulb',
	'lantern',
	'lanternRed',
	'neonPink',
	'neonGreen',
	'neonBlue',
	'litWindow',
	'fire',
	'ember',
	'skyGlow'
];

const CELLS = 16;
const cellOf = new Map<PaletteKey, [number, number]>();

(() => {
	let index = 0;
	for (const key of Object.keys(PALETTE) as PaletteKey[]) {
		if (UNLIT_KEYS.includes(key)) continue;
		const cx = index % CELLS;
		const cy = Math.floor(index / CELLS);
		if (cy >= CELLS - 1) throw new Error('Lahore palette overflow');
		cellOf.set(key, [cx, cy]);
		index += 1;
	}
	UNLIT_KEYS.forEach((key, i) => cellOf.set(key, [i, CELLS - 1]));
})();

/** UV at the centre of a palette cell (DataTexture rows are bottom-up, flipY = false). */
export function paletteUV(key: PaletteKey): [number, number] {
	const cell = cellOf.get(key);
	if (!cell) throw new Error(`Unknown palette colour ${key}`);
	return [(cell[0] + 0.5) / CELLS, (cell[1] + 0.5) / CELLS];
}

/** Threshold used by the shader to skip lighting for emissive cells. */
export const UNLIT_V_THRESHOLD = (CELLS - 1) / CELLS;

function hexToRgb(hex: string): [number, number, number] {
	const value = parseInt(hex.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

let paletteTexture: DataTexture | null = null;

export function getPaletteTexture(): DataTexture {
	if (paletteTexture) return paletteTexture;
	const data = new Uint8Array(CELLS * CELLS * 4).fill(255);
	for (const [key, [cx, cy]] of cellOf) {
		const [r, g, b] = hexToRgb(PALETTE[key]);
		const i = (cy * CELLS + cx) * 4;
		data[i] = r;
		data[i + 1] = g;
		data[i + 2] = b;
		data[i + 3] = 255;
	}
	const texture = new DataTexture(data, CELLS, CELLS, RGBAFormat, UnsignedByteType);
	texture.colorSpace = SRGBColorSpace;
	texture.magFilter = NearestFilter;
	texture.minFilter = NearestFilter;
	texture.generateMipmaps = false;
	texture.needsUpdate = true;
	texture.name = 'LahorePalette';
	paletteTexture = texture;
	return texture;
}
