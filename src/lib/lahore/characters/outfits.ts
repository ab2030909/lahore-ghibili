/**
 * Lahori wardrobes for the Messenger NPC rigs. Each model's garments map to cells of the
 * original 16x16 atlas (found by analysing which cells each body region samples); an outfit
 * swaps those cells for Lahore clothing colours and sets a South Asian skin tone.
 * Cells are [column, row-from-top] of atlas.png.
 */

export type NpcModel =
	| 'office-worker'
	| 'young-lady'
	| 'mountainman'
	| 'threekid'
	| 'musician'
	| 'oldwoman'
	| 'male-scientist'
	| 'female-scientist'
	| 'factory-worker-b'
	| 'factory-worker-c'
	| 'chef'
	| 'boss'
	| 'scout';

export type Outfit = {
	model: NpcModel;
	label: string;
	cells: Record<string, string>;
	skin?: string;
	voice: 'male1' | 'male2' | 'male3' | 'female1' | 'female2' | 'female3';
};

const SKIN_CELL = '3,5';

export const SKIN_TONES = ['#c99a7b', '#b98463', '#d6aa88', '#a8745a', '#e0b896', '#9c6a50', '#c48e6c'];

const HAIR_BLACK = '#2a2321';

/** The player: a tourist exploring Lahore in a casual blue shirt and jeans. */
export const TOURIST: Outfit = {
	model: 'office-worker',
	label: 'Tourist',
	cells: {
		'0,5': HAIR_BLACK,
		'0,0': '#4a7aa8',   // blue casual shirt
		'8,3': '#5a8ab8',
		'2,4': '#3a5a7a',   // collar
		'1,3': '#3a4a5a',   // jeans
		'0,3': '#2a2a2a',   // shoes
		'0,15': '#4a7aa8',
		'6,3': '#5a8ab8',
		'3,4': '#d8a83c'    // belt buckle
	},
	skin: '#c48e6c',
	voice: 'male1'
};

/** Pakistan Rangers ceremonial dress at Wagah: black, with a red belt and green badge. */
export const RANGER: Outfit = {
	model: 'office-worker',
	label: 'Pakistan Rangers',
	cells: {
		'0,5': HAIR_BLACK,
		'0,0': '#1c1d20',
		'8,3': '#26282c',
		'2,4': '#c8423a',
		'1,3': '#1c1d20',
		'0,3': '#111214',
		'0,15': '#2f8f4f',
		'6,3': '#2a2c30',
		'3,4': '#2f8f4f'
	},
	skin: '#b98463',
	voice: 'male2'
};

/** India's Border Security Force at Attari: khaki, with a red belt and gold badge. */
export const BSF: Outfit = {
	model: 'office-worker',
	label: 'Border Security Force',
	cells: {
		'0,5': HAIR_BLACK,
		'0,0': '#a8915a',
		'8,3': '#b9a26a',
		'2,4': '#c8423a',
		'1,3': '#93804f',
		'0,3': '#2b2622',
		'0,15': '#e9b83f',
		'6,3': '#a8915a',
		'3,4': '#e9b83f'
	},
	skin: '#a8745a',
	voice: 'male3'
};

const kameez = ['#f2efe8', '#e8e2d4', '#cfe0ea', '#d8c9a8', '#b9c7b0', '#9fb6c9', '#e6d3b0', '#c9b8d8', '#a8b89a'];
const brightKameez = ['#c6417f', '#e9b83f', '#2f8f8a', '#d35f8c', '#5f93c5', '#e07b3a', '#9a80d2', '#3f9a69', '#c9493f'];
const dupatta = ['#f2c14f', '#f4f0e6', '#c6417f', '#2fa3a8', '#e98aa1', '#f19b39', '#a9d8c1'];

function pickFrom<T>(items: readonly T[], i: number): T {
	return items[((i % items.length) + items.length) % items.length];
}

/** Build a varied outfit for a model; `i` selects colours deterministically. */
export function outfitFor(model: NpcModel, i: number): Outfit {
	const skin = pickFrom(SKIN_TONES, i * 3 + 1);
	switch (model) {
		case 'male-scientist': {
			// lab coat -> long kameez, trousers -> matching shalwar, tie hidden
			const c = pickFrom(kameez, i);
			return {
				model,
				label: 'Shalwar kameez',
				cells: { '1,1': HAIR_BLACK, '0,0': c, '3,4': c, '6,3': c, '6,1': c, '0,4': c, '0,3': '#4a3a30', '5,1': '#3b2f28', '0,2': '#4a3a30' },
				skin,
				voice: pickFrom(['male1', 'male2', 'male3'] as const, i)
			};
		}
		case 'female-scientist': {
			const c = pickFrom(brightKameez, i);
			return {
				model,
				label: 'Shalwar kameez & dupatta',
				cells: { '0,5': HAIR_BLACK, '1,2': HAIR_BLACK, '0,0': c, '3,2': pickFrom(kameez, i + 2), '5,7': pickFrom(dupatta, i), '6,3': c, '1,1': c, '3,3': c, '3,4': '#c79a48', '5,1': '#7a3b2e' },
				skin,
				voice: pickFrom(['female1', 'female2', 'female3'] as const, i)
			};
		}
		case 'young-lady': {
			const c = pickFrom(brightKameez, i + 3);
			return {
				model,
				label: 'Kurti & shalwar',
				cells: { '0,5': HAIR_BLACK, '0,0': pickFrom(dupatta, i + 1), '0,10': c, '4,7': c, '3,7': '#c79a48', '2,4': '#d8a83c' },
				skin,
				voice: pickFrom(['female1', 'female2', 'female3'] as const, i + 1)
			};
		}
		case 'office-worker': {
			const c = pickFrom(kameez, i + 4);
			return {
				model,
				label: 'Babu',
				cells: { '0,5': HAIR_BLACK, '0,0': c, '8,3': c, '2,4': '#7a3b2e', '1,3': '#5a5650', '0,3': '#2f2a28' },
				skin,
				voice: pickFrom(['male1', 'male2', 'male3'] as const, i + 2)
			};
		}
		case 'mountainman':
			return {
				model,
				label: 'Bazurg with waistcoat',
				cells: { '1,5': '#f4f0e6', '0,5': '#7a5a3c', '4,7': '#ece6da', '5,7': '#ece6da', '0,0': '#ece6da' },
				skin: pickFrom(SKIN_TONES, i + 2),
				voice: 'male3'
			};
		case 'oldwoman':
			return {
				model,
				label: 'Nani with chador',
				cells: { '0,0': '#f2efe8', '1,2': '#d8d0c4', '1,5': pickFrom(['#2f8f8a', '#7a4f7a', '#3e5f7c'], i), '0,5': pickFrom(['#5e4a7a', '#7a5a3c', '#2f5d6a'], i), '4,7': '#d8cfc0', '5,7': '#6f4a33' },
				skin: pickFrom(SKIN_TONES, i + 4),
				voice: 'female3'
			};
		case 'threekid':
			return {
				model,
				label: 'Bacha',
				cells: { '0,3': pickFrom(['#5f93c5', '#e07b3a', '#3f9a69', '#d35f8c', '#efc340'], i), '0,0': '#f4f0e6' },
				skin,
				voice: pickFrom(['male2', 'female2'] as const, i)
			};
		case 'musician':
			return {
				model,
				label: 'Street musician',
				cells: { '0,0': '#f2efe8', '0,5': '#3b302b', '1,4': '#9b6b45', '2,8': '#d8a83c', '0,3': HAIR_BLACK, '1,2': '#6f4a33' },
				skin,
				voice: 'male2'
			};
		case 'factory-worker-b':
		case 'factory-worker-c':
			return {
				model,
				label: 'Mazdoor',
				cells: { '3,4': pickFrom(['#8e9597', '#a8b89a', '#b5a58a'], i), '0,0': '#efc340', '1,5': HAIR_BLACK, '0,5': HAIR_BLACK, '0,10': '#e48a3b', '1,1': '#5a4636' },
				skin,
				voice: pickFrom(['male1', 'male3'] as const, i)
			};
		case 'chef':
			return {
				model,
				label: 'Karahi ustad',
				cells: { '0,0': '#f4f0e6', '1,1': '#3b302b', '3,4': pickFrom(['#c9493f', '#2f8f8a', '#e9b83f'], i), '0,4': '#c8423a', '0,1': '#5a4636', '0,3': HAIR_BLACK },
				skin,
				voice: 'male2'
			};
		case 'boss':
			return {
				model,
				label: 'Dukaandar',
				cells: { '0,0': '#f2efe8', '1,5': pickFrom(['#6f5a43', '#3e5f7c', '#5a6b4a'], i), '0,4': '#f2efe8', '1,3': HAIR_BLACK, '0,3': '#2f2a28' },
				skin,
				voice: 'male1'
			};
		case 'scout':
			return {
				model,
				label: 'Visitor',
				cells: { '5,7': pickFrom(['#8bc0dd', '#f3e3bf', '#a9d8c1'], i), '0,5': '#3e5f7c', '0,1': HAIR_BLACK },
				skin: pickFrom(SKIN_TONES, i + 5),
				voice: pickFrom(['female1', 'male2'] as const, i)
			};
	}
}

export const skinCell = SKIN_CELL;
