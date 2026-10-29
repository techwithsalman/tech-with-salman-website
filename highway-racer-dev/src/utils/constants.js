// Highway Racer 3D - Gameplay Constants & Tuning

export const CONSTANTS = {
  // Road & Lane dimensions
  LANE_WIDTH: 3.8,
  LANE_COUNT: 4,
  get ROAD_WIDTH() {
    return this.LANE_WIDTH * this.LANE_COUNT; // 15.2m
  },
  SHOULDER_WIDTH: 2.6,
  SEGMENT_LENGTH: 120,
  VISIBLE_SEGMENTS: 8, // ~960m continuous forward view

  // Lane X coordinates: [-5.7, -1.9, 1.9, 5.7]
  get LANE_CENTERS() {
    return [-5.7, -1.9, 1.9, 5.7];
  },

  // Player physics
  PLAYER: {
    WIDTH: 1.95,
    LENGTH: 4.4,
    HEIGHT: 1.25,
    MAX_SPEED_KMH: 230,
    MIN_SPEED_KMH: 0,
    ACCELERATION: 11.5, // Torque tapers with speed in PlayerCar.
    BRAKING: 16.0,
    NATURAL_FRICTION: 4.5,
    HANDBRAKE_DECEL: 20.0,
    STEER_SPEED: 7.2,
    MAX_STEER_ANGLE: 0.45, // Wheel turn radians
    BODY_ROLL_FACTOR: 0.12, // Roll lean into turns
    BODY_PITCH_FACTOR: 0.05 // Pitch up on accel, down on brake
  },

  // Traffic tuning
  TRAFFIC: {
    MIN_SPAWN_DIST: 90,
    MAX_SPAWN_DIST: 260,
    DESPAWN_BEHIND_DIST: 40,
    MAX_ACTIVE_CARS: 12,
    INITIAL_SPAWN_RATE: 1.8, // seconds between spawns
    MIN_SPAWN_RATE: 0.7,
    DIFFICULTY_RAMP_TIME: 120 // seconds to reach max density
  },

  // Scoring & Rewards
  SCORING: {
    POINTS_PER_METER: 1,
    SPEED_MULTIPLIER_THRESHOLD: 120, // km/h
    NEAR_MISS_BASE_POINTS: 250,
    NEAR_MISS_DISTANCE: 2.3 // meters proximity to trigger near-miss
  },

  // Colors (Vibrant Daytime Highway Environment)
  COLORS: {
    ASPHALT: 0x3d414a,
    LANE_MARKING: 0xffffff,
    LANE_YELLOW: 0xffcc00,
    SHOULDER: 0x4e535c,
    BARRIER: 0x9ca5b0,
    BARRIER_POST: 0x6e7682,
    BARRIER_REFLECTOR: 0xff4d36,
    FOG: 0xbddbf2,
    SKY_TOP: 0x1f78e0,
    SKY_BOTTOM: 0xd6ebfb,
    SUN_LIGHT: 0xfffaee,
    GRASS: 0x487532,
    HEADLIGHT_BEAM: 0xfffcf0,
    TAILLIGHT_GLOW: 0xff2430,
    BRAKE_GLOW: 0xff0011
  }
};
