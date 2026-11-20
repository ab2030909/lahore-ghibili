import { PlanetFrame } from '../../core/planet';
import { Builder } from '../../geometry/builder';
import type { PaletteKey } from '../../render/palette';
import type { WorldContext } from '../context';
import { TRUCK_SPOT } from '../layout';

const TASSELS: PaletteKey[] = ['awningRed', 'awningYellow', 'tileTurquoise', 'fabricMagenta', 'paintOrange'];

/**
 * A Pakistani truck-art lorry ("phool patti" truck) parked in Delhi Gate chowk: white cab
 * with painted flowers, the wooden taj (crown) with the green Pakistan panel, a cargo body
 * painted with a peacock, a mosque scene and bouquets, poetry on the back, tassels and
 * chains everywhere. Local frame: the truck faces +Z, ground at y = 0.
 */
export function buildTruck(ctx: WorldContext) {
	const { w, t, facing } = TRUCK_SPOT;
	const frame = PlanetFrame.trail(w, t, facing);
	const b = new Builder(7234);

	// chassis, fuel tank, steps
	b.box(1.1, 0.35, 7.0, 'charcoal', { x: 0, y: 0.6, z: 0 }, { collide: false });
	b.box(0.5, 0.45, 1.0, 'steel', { x: 1.0, y: 0.5, z: 0.9 }, { collide: false });
	for (const s of [-1, 1]) b.box(0.35, 0.07, 0.45, 'steel', { x: s * 1.1, y: 0.62, z: 2.6 }, { collide: false });

	// cab: white with painted flowers, windscreen and grille painted on the front
	b.box(2.3, 1.9, 1.7, 'white', { x: 0, y: 0.95, z: 2.75 }, { collide: true }, {
		front: { decor: 'truckFront' },
		left: { decor: 'truckCab' },
		right: { decor: 'truckCab' }
	});
	// the taj: crown over the cab, leaning forward, with an arched top and finials
	b.box(2.5, 1.15, 1.5, 'awningRed', { x: 0, y: 2.85, z: 3.0, rx: 0.14 }, { collide: true }, {
		front: { decor: 'truckCrown' },
		left: { decor: 'truckFloral' },
		right: { decor: 'truckFloral' },
		top: 'awningYellow'
	});
	// rounded top edge of the crown with brass end caps and finials
	b.cylinder(0.3, 2.46, 'awningRed', { x: 0, y: 4.0, z: 3.12, rz: Math.PI / 2 }, { segments: 12, collide: false, upright: false });
	for (const s of [-1, 1]) b.cylinder(0.34, 0.1, 'awningYellow', { x: s * 1.24, y: 4.0, z: 3.12, rz: Math.PI / 2 }, { segments: 12, collide: false, upright: false });
	for (const x of [-1.15, 0, 1.15]) {
		b.prism(0.08, 0.5, 6, 'awningYellow', { x, y: 4.25, z: 3.14 }, { collide: false, upright: true, rTop: 0.02 });
		b.box(0.15, 0.15, 0.15, 'awningRed', { x, y: 4.72, z: 3.14 }, { collide: false });
	}
	// tassels under the crown, the bumper and along the body
	for (let i = 0; i < 12; i++) {
		const x = -1.12 + i * (2.24 / 11);
		b.box(0.06, 0.34, 0.06, TASSELS[i % TASSELS.length], { x, y: 2.48, z: 3.86 }, { collide: false });
	}
	b.box(2.5, 0.4, 0.3, 'awningRed', { x: 0, y: 0.5, z: 3.72 }, { collide: true }, { front: { decor: 'truckBumper' } });
	for (let i = 0; i < 9; i++) {
		const x = -1.1 + i * (2.2 / 8);
		if (Math.abs(x) < 0.4) continue;
		b.box(0.07, 0.34, 0.07, TASSELS[(i + 2) % TASSELS.length], { x, y: 0.16, z: 3.88 }, { collide: false });
	}
	// mirrors on arms
	for (const s of [-1, 1]) {
		b.box(0.45, 0.05, 0.05, 'steel', { x: s * 1.35, y: 2.25, z: 3.4 }, { collide: false });
		b.box(0.07, 0.42, 0.26, 'charcoal', { x: s * 1.6, y: 2.05, z: 3.4 }, { collide: false });
	}

	// cargo body: painted panels, the back with poetry, a roped load under a tarpaulin
	b.box(2.4, 2.35, 5.35, 'paintBlue', { x: 0, y: 1.0, z: -0.925 }, { collide: true }, {
		left: { decor: 'truckSide' },
		right: { decor: 'truckSide' },
		back: { decor: 'truckBack' },
		top: 'woodDark'
	});
	b.box(2.5, 0.14, 5.45, 'awningYellow', { x: 0, y: 3.35, z: -0.925 }, { collide: false });
	b.box(2.6, 0.12, 5.5, 'awningRed', { x: 0, y: 0.92, z: -0.925 }, { collide: false });
	b.box(2.2, 0.75, 4.9, 'awningGreen', { x: 0, y: 3.45, z: -1.0 }, { collide: false });
	for (let k = 0; k < 5; k++) b.box(2.25, 0.05, 0.06, 'paintCream', { x: 0, y: 4.2, z: -3.1 + k * 1.05 }, { collide: false });
	// the painted front of the body above the cab, like a second crown
	b.box(2.5, 0.7, 0.2, 'paintBlue', { x: 0, y: 3.35, z: 1.75 }, { collide: false }, { front: { decor: 'truckFloral' } });
	// chains and bells hanging along the bottom edge
	for (const s of [-1, 1]) {
		for (let k = 0; k < 15; k++) {
			b.box(0.04, 0.32, 0.04, TASSELS[(k + (s > 0 ? 0 : 2)) % TASSELS.length], { x: s * 1.24, y: 0.6, z: -3.45 + k * 0.36 }, { collide: false });
		}
	}
	// tail lights and painted mudflaps
	for (const s of [-1, 1]) {
		b.box(0.3, 0.18, 0.06, 'awningRed', { x: s * 0.95, y: 1.15, z: -3.63 }, { collide: false });
		b.panel(0.62, 0.55, { decor: 'truckChevron' }, { x: s * 0.85, y: 0.1, z: -2.8, ry: Math.PI }, { collide: false });
	}

	// wheels: red rims, dual at the back
	const wheel = (x: number, z: number) => {
		b.cylinder(0.5, 0.34, 'charcoal', { x, y: 0.5, z, rz: Math.PI / 2 }, { segments: 14, collide: false, upright: false });
		b.cylinder(0.27, 0.36, 'awningRed', { x, y: 0.5, z, rz: Math.PI / 2 }, { segments: 12, collide: false, upright: false });
		b.cylinder(0.09, 0.38, 'steel', { x, y: 0.5, z, rz: Math.PI / 2 }, { segments: 8, collide: false, upright: false });
	};
	for (const s of [-1, 1]) {
		wheel(s * 0.98, 2.55);
		wheel(s * 0.98, -2.1);
		wheel(s * 0.62, -2.1);
	}

	ctx.bake(b, frame, 'truck-art');
	ctx.anchor('truck-art', frame, -2.3, -0.4, [0, 2.2, 0], 4.5);
	ctx.spot(frame, -1.9, 2.3, 270, 'visitor', { models: ['factory-worker-b', 'boss'], dialogue: 'truckDriver', name: 'Ustad Gulzar' });
}
