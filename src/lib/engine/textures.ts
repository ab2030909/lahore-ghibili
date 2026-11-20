/** Texture files under `static/game/images` used by the Lahore renderer. */
export const texturePaths = {
	/** 32³ colour lookup table applied in the post pass. */
	lut: '/game/images/lut.ktx2',
	/** Terrain noise, reused by every toon material for its grain. */
	noiseTerrain: '/game/images/noises-terrain.ktx2',
	/** Flow noise for the river and the courtyard pools. */
	waterNoise: '/game/images/water-noises-highq.ktx2',
	/** Soft cloud noise for the sky in the post pass. */
	cloudNoise512: '/game/images/clouds_noise_512.ktx2',
	/** Blinking eyes and talking mouths on the characters. */
	eye: '/game/images/eye-highq.ktx2',
	mouth: '/game/images/mouth-highq.ktx2'
} as const;
