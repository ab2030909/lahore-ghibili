import type { WorldContext } from '../context';
import { buildBadshahi } from './badshahi';
import { buildDelhiGate } from './delhiGate';
import { buildSunehriMasjid } from './extras';
import { buildFoodStreet } from './foodStreet';
import { buildLahoreFort } from './fort';
import { buildShahiHammam } from './shahiHammam';
import { buildWazirKhan } from './wazirKhan';
import { buildWalledCityAnchor } from './walledCity';
import { buildGaddafiStadium, buildRailwayStation } from './modern';
import { buildTruck } from './truck';
import { buildWagah } from './wagah';

export function buildLandmarks(ctx: WorldContext) {
	buildDelhiGate(ctx);
	buildShahiHammam(ctx);
	buildWazirKhan(ctx);
	buildSunehriMasjid(ctx);
	buildWalledCityAnchor(ctx);
	buildLahoreFort(ctx);
	buildBadshahi(ctx);
	buildFoodStreet(ctx);
	buildRailwayStation(ctx);
	buildGaddafiStadium(ctx);
	buildTruck(ctx);
	buildWagah(ctx);
}
