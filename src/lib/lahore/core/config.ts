/**
 * Gameplay constants.
 *
 * The physics and camera values are the defaults found in the original Messenger runtime
 * runtime it was ported from: character options passed to the
 * collision physics, and the follow camera's lerp settings. They are expressed per 60 Hz
 * physics step, exactly like the original, so the movement feel is preserved.
 */

/** Radius of the walkable ground of the Lahore planet. */
export const PLANET_RADIUS = 60;

/** River Ravi surface (south polar cap). Walking below this plays water footsteps. */
export const WATER_LEVEL = PLANET_RADIUS - 0.42;

export const PHYSICS = {
	substeps: 3,
	positionForce: 0.005,
	jumpForce: 0.15,
	gravity: -0.00981,
	damp: 0.92,
	dampIdle: 0.65,
	directionLerp: 0.075,
	rotVelocityMin: 0.0035,
	rotVelocityMax: 0.02,
	capsuleRadiusPercentage: 0.2,
	floorDetectInclination: 0.7,
	sprintSpeed: 1.3,
	autoStep: true,
	/** Falling below the planet by this much snaps the player back to spawn. */
	fallLimitDistance: 10
} as const;

export const CAMERA = {
	fov: 52,
	near: 0.1,
	far: 600,
	relativeCameraPosition: [0, 1, 5] as const,
	relativeCameraOffset: [-0.65, 0, 1] as const,
	sphericalVerticalMinLimit: Math.PI * 0.25,
	sphericalVerticalMaxLimit: Math.PI * 0.75,
	cameraCollisionsMinDistance: 0.75,
	cameraCollisionsIncrement: 0.05,
	cameraCollisionsMaxIterations: 10,
	cameraTargetLocalLerp: 0.0125,
	cameraTargetWorldLerp: 0.175,
	cameraRotationLerp: 0.03,
	cameraSphericalRotationLerp: 0.075,
	cameraSphericalRotationFastLerp: 0.3,
	cameraSphericalRadiusLerp: 0.035,
	cameraSphericalRadiusCollisionsLerp: 0.35,
	cameraAutomaticCenteringActiveLerp: 0.1,
	cameraAutomaticCenteringInactiveLerp: 0.0125,
	cameraInactiveMultiplier: 0.025
} as const;

/** Sun placement relative to the player's local frame (original: Spherical(100, 0.2π, -0.25π)). */
export const SUN = {
	distance: 100,
	phi: Math.PI * 0.2,
	theta: Math.PI * -0.25,
	forwardOffset: 6,
	shadowMapSize: 2048,
	shadowExtent: 32
} as const;

/** Post-processing settings taken from the original planet outline preset. */
export const POST = {
	outlineColor: '#373f42',
	lutIntensity: 1,
	outlineFade: [50, 300] as const
} as const;

export const TALK_DISTANCE = 2.5;
export const DISCOVER_DISTANCE = 9;
