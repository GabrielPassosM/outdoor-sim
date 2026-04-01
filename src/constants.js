export const TILE = 16;
export const MAP_COLS = 80;
export const MAP_ROWS = 50;

export const TILE_TYPE = {
    SNOW: 0,
    TREE: 1,
    ROCK: 2,
    CHOP: 3, // choppable tree (logs)
    WATER: 4,
    PATH: 5,
    BUILDING: 6,
    CAMP: 7,
    BONFIRE: 8,
    TENT: 9,
};

export const COLORS = {
    [TILE_TYPE.SNOW]: '#dce9f5',
    [TILE_TYPE.TREE]: '#1a5c1a',
    [TILE_TYPE.ROCK]: '#6b6b7a',
    [TILE_TYPE.CHOP]: '#2d7a2d',
    [TILE_TYPE.WATER]: '#2a7aab',
    [TILE_TYPE.PATH]: '#b8a898',
    [TILE_TYPE.BUILDING]: '#4a3a2a',
    [TILE_TYPE.CAMP]: '#c8b878',
    [TILE_TYPE.BONFIRE]: '#8b5e00',
    [TILE_TYPE.TENT]: '#8b4513',
};

export const EMOJI_TILES = {
    [TILE_TYPE.TREE]: ['🌲', '🌲', '🎄'],
    [TILE_TYPE.CHOP]: ['🪵'],
    [TILE_TYPE.ROCK]: ['🪨'],
    [TILE_TYPE.BUILDING]: ['🏠', '🏪', '🏘️'],
    [TILE_TYPE.BONFIRE]: ['🔥'],
    [TILE_TYPE.TENT]: ['⛺'],
};

// Stat drain rates per second (wilderness only — city freezes all stats)
export const DRAIN_RATES = {
    hunger_wild: 0.35,  // loses ~21/min in wild
    warmth_wild: 0.55,  // loses ~33/min in wild
    health_starve: 0.4,   // loses health when very hungry
    health_freeze: 0.5,   // loses health when very cold
    health_regen: 0.08,  // gains health slowly when warm+fed
};
