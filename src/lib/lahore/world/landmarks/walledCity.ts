import { PlanetFrame } from '../../core/planet';
import { Builder } from '../../geometry/builder';
import { cart, charpai, lampPost, tree } from '../common';
import type { WorldContext } from '../context';

/**
 * Kashmiri Bazaar crossroads, the heart of the Walled City streets (havelis come from the
 * bazaar generator). Adds a chowk with a peepal tree, charpai, carts, a well, the
 * discovery point for the Androon Shehr postcard and pedestrian loops.
 */
export function buildWalledCityAnchor(ctx: WorldContext) {
	const frame = PlanetFrame.trail(102, 0, 270);
	const b = new Builder(1550);
	tree(b, 0, 2.6, 1.15, 'peepal');
	b.prism(1.5, 0.45, 10, 'brickLight', { x: 0, y: 0, z: 2.6 }, { upright: true });
	charpai(b, -2.2, 1.6, 0.2);
	cart(b, 2.4, -2.2, 1.57, ['marigold', 'flowerPink', 'fabricMagenta']);
	lampPost(b, -2.8, -2.4, 3.6);
	ctx.bake(b, frame, 'walled-city');
	ctx.anchor('walled-city', frame, 0, 0, [0, 6, -12], 5.5);
	ctx.spot(frame, -2.2, 1.6, 90, 'elder', { models: ['mountainman', 'oldwoman'], dialogue: 'charpaiElder', sit: true, name: 'Baba Fazal' }, 0.48);
	ctx.spot(frame, 2.4, -3.4, 180, 'vendor', { models: ['mountainman', 'boss'], dialogue: 'phool' });
	ctx.spot(frame, 1.0, 1.0, 300, 'child', { models: ['threekid'], dialogue: 'kidGali' });

	// pedestrians up and down the royal trail
	const segments: [number, number][][] = [
		[[6, 1.8], [34, 1.8]],
		[[34, -1.8], [6, -1.8]],
		[[56, 1.6], [150, 1.6]],
		[[150, -1.6], [56, -1.6]],
		[[152, -1.7], [228, -1.7]],
		[[228, 1.7], [152, 1.7]],
		[[230, 1.6], [276, 1.6]],
		[[276, -1.6], [230, -1.6]]
	];
	for (const s of segments) {
		const len = Math.abs(s[1][0] - s[0][0]);
		ctx.trailPath(s, false, Math.max(2, Math.round(len / 18)));
	}
}
