import { MAP_ROWS, MAP_COLS, TILE_TYPE } from './constants.js';

export function generateWorld() {
    const map = Array.from({ length: MAP_ROWS }, () =>
        Array.from({ length: MAP_COLS }, () => TILE_TYPE.SNOW)
    );

    // Camp area: tent and bonfire spot near left edge
    const campCol = 5;
    const campRow = Math.floor(MAP_ROWS / 2);
    map[campRow][campCol] = TILE_TYPE.TENT;
    map[campRow][campCol + 2] = TILE_TYPE.BONFIRE;

    // Small camp clearing
    for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -1; dc <= 4; dc++) {
            if (map[campRow + dr]?.[campCol + dc] === TILE_TYPE.SNOW) {
                map[campRow + dr][campCol + dc] = TILE_TYPE.CAMP;
            }
        }
    }

    // Wilderness: trees and choppable trees
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            if (map[r][c] !== TILE_TYPE.CAMP && map[r][c] !== TILE_TYPE.TENT && map[r][c] !== TILE_TYPE.BONFIRE) {
                const roll = Math.random();
                if (roll < 0.12) map[r][c] = TILE_TYPE.CHOP;
                else if (roll < 0.30) map[r][c] = TILE_TYPE.TREE;
                else if (roll < 0.34) map[r][c] = TILE_TYPE.ROCK;
                else if (roll < 0.36) map[r][c] = TILE_TYPE.WATER;
            }
        }
    }

    // River
    let riverC = 48;
    for (let r = 0; r < MAP_ROWS; r++) {
        riverC += Math.floor(Math.random() * 3) - 1;
        riverC = Math.max(42, Math.min(55, riverC));
        for (let dc = 0; dc < 3; dc++) {
            if (map[r][riverC + dc] !== TILE_TYPE.TREE) {
                map[r][riverC + dc] = TILE_TYPE.WATER;
            }
        }
    }

    const cityEnd = 0; // no city zone on map
    return { map, campCol, campRow, cityEnd };
}
