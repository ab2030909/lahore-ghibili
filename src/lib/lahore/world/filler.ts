import { mulberry32, pick, randRange } from '../core/math';
import { PlanetFrame } from '../core/planet';
import { Builder } from '../geometry/builder';
import { tree } from './common';
import type { WorldContext } from './context';
import { CIRCUMFERENCE, inGarden, isReserved, NORTH_PARK_START, RIVER, streetDistance } from './layout';
import { buildKamranBaradari, buildMinarEPakistan, buildRaviJetties } from './landmarks/extras';

const KITE_COLORS = ['#e2573f', '#f2c14f', '#2fa3a8', '#c6417f', '#6fae6b', '#5f93c5', '#f19b39'];

export function buildFiller(ctx: WorldContext) {
	buildMinarEPakistan(ctx);
	buildKamranBaradari(ctx);
	buildRaviJetties(ctx);

	const rng = mulberry32(777);
	const step = 7.2;
	// city band blocks
	for (let w = -27; w < CIRCUMFERENCE - 27; w += step) {
		for (let t = -46; t <= 46; t += step) {
			const jw = w + randRange(rng, -1.2, 1.2);
			const jt = t + randRange(rng, -1.2, 1.2);
			if (Math.abs(jt) < 13.5) continue;
			if (isReserved(jw, jt, 3)) continue;
			if (inGarden(jw, jt)) continue;
			if (streetDistance(jw, jt) < 9.5) continue;
			const chunk = `filler-${Math.floor((jw + 27) / 48)}-${jt > 0 ? 'n' : 's'}`;
			const b = new Builder(Math.floor(jw * 31 + jt * 7));
			const frame = PlanetFrame.trail(jw, jt, randRange(rng, 0, 360));
			// open city: sparse trees instead of a wall of filler blocks (free to walk, much lighter)
			const roll = rng();
			if (roll > 0.38) continue;
			tree(b, 0, 0, randRange(rng, 0.9, 1.4), pick(rng, ['neem', 'peepal', 'neem', 'gulmohar'] as const));
			if (roll < 0.04) ctx.kites.push({ anchor: frame.point(0, 10 + rng() * 6, 0), color: pick(rng, KITE_COLORS), phase: rng() * 10 });
			ctx.bake(b, frame, chunk);
		}
	}

	// trees in Greater Iqbal Park and along the Ravi banks
	for (let i = 0; i < 260; i++) {
		const w = rng() * CIRCUMFERENCE;
		const north = rng() < 0.55;
		const t = north ? NORTH_PARK_START + 3 + rng() * 32 : RIVER.bankStart + 1 - rng() * 4.5;
		if (north && CIRCUMFERENCE / 4 - t < 34) continue;
		if (isReserved(w, t, 2)) continue;
		const b = new Builder(i * 101 + 7);
		tree(b, 0, 0, randRange(rng, 0.9, 1.5), pick(rng, north ? (['neem', 'gulmohar', 'jacaranda', 'peepal', 'ashoka'] as const) : (['palm', 'neem', 'peepal'] as const)));
		ctx.bake(b, PlanetFrame.trail(w, t, rng() * 360), north ? `park-${Math.floor(w / 60)}` : `riverbank-${Math.floor(w / 60)}`);
	}
}
