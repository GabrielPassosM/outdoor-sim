import { TILE, MAP_COLS, MAP_ROWS, TILE_TYPE, COLORS, EMOJI_TILES } from './constants.js';
import { ANIMALS } from './data.js';

export function render(G) {
    const ctx = G.ctx;
    const W = G.canvas.width;
    const H = G.canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = Math.floor(G.camera.x);
    const cy = Math.floor(G.camera.y);

    const startCol = Math.max(0, Math.floor(cx / TILE));
    const startRow = Math.max(0, Math.floor(cy / TILE));
    const endCol = Math.min(MAP_COLS, startCol + Math.ceil(W / TILE) + 2);
    const endRow = Math.min(MAP_ROWS, startRow + Math.ceil(H / TILE) + 2);

    // Draw tiles
    for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
            const t = G.world.map[r][c];
            const sx = c * TILE - cx;
            const sy = r * TILE - cy;

            // Base color
            ctx.fillStyle = COLORS[t] || COLORS[0];
            ctx.fillRect(sx, sy, TILE, TILE);

            // Snow texture on snow tiles
            if (t === TILE_TYPE.SNOW || t === TILE_TYPE.CAMP) {
                // subtle pixel variation
                if ((r + c) % 3 === 0) {
                    ctx.fillStyle = 'rgba(255,255,255,0.12)';
                    ctx.fillRect(sx + 2, sy + 2, 4, 4);
                }
            }

            // Water shimmer
            if (t === TILE_TYPE.WATER) {
                ctx.fillStyle = 'rgba(100,200,255,0.2)';
                ctx.fillRect(sx, sy + (Date.now() / 500 + c) % TILE < TILE / 2 ? 2 : TILE / 2, TILE, 4);
            }

            // City border glow
            if (c === G.world.cityEnd) {
                ctx.fillStyle = 'rgba(100,180,255,0.25)';
                ctx.fillRect(sx, sy, TILE, TILE);
            }

            // Draw emoji on special tiles
            const emojis = EMOJI_TILES[t];
            if (emojis) {
                const seed = (r * 31 + c * 17) % emojis.length;
                ctx.font = `${TILE - 2}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(emojis[seed], sx + TILE / 2, sy + TILE / 2);
            }

            // Tile labels
            if (t === TILE_TYPE.TENT) {
                // Tent glow
                ctx.fillStyle = 'rgba(139,69,19,0.2)';
                ctx.fillRect(sx - 8, sy - 8, TILE + 16, TILE + 16);
            }
        }
    }

    // Draw animals
    G.animals.forEach(a => {
        const sx = a.x - cx;
        const sy = a.y - cy;
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) return;
        ctx.font = `${a.def.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(a.def.icon, sx, sy);
    });

    // Draw player
    renderPlayer(G, ctx, cx, cy);

    // Draw placing tent
    if (G.tent.placing) {
        const sx = G.tent.col * TILE - cx;
        const sy = G.tent.row * TILE - cy;
        ctx.globalAlpha = 0.5;
        ctx.font = `${TILE - 2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛺', sx + TILE / 2, sy + TILE / 2);
        ctx.globalAlpha = 1.0;
        
        const pct = 1 - (G.tent.timer / G.tent.duration);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(sx - 4, sy - 8, TILE + 8, 4);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(sx - 4, sy - 8, (TILE + 8) * pct, 4);
    }

    // Draw bonfire glow if active
    if (G.bonfire.lit) {
        const bx = G.bonfire.col * TILE + TILE / 2 - cx;
        const by = G.bonfire.row * TILE + TILE / 2 - cy;
        const glow = ctx.createRadialGradient(bx, by, 5, bx, by, 80);
        glow.addColorStop(0, 'rgba(232,99,26,0.4)');
        glow.addColorStop(1, 'rgba(232,99,26,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(bx - 80, by - 80, 160, 160);
    }

    // Draw notifications
    G.notifications = G.notifications.filter(n => n.life > 0);
    G.notifications.forEach(n => {
        const alpha = n.life / n.maxLife;
        const screenX = G.player.x - cx;
        const screenY = G.player.y - cy - (20 * (1 - n.life / n.maxLife)) - 20;
        ctx.globalAlpha = alpha;
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = n.color;
        ctx.fillText(n.text, screenX, screenY);
        ctx.globalAlpha = 1;
        n.life -= 0.033;
    });

    // Minimap
    renderMinimap(G, ctx, W, H);
}

export function renderPlayer(G, ctx, cx, cy) {
    const p = G.player;
    const sx = p.x - cx;
    const sy = p.y - cy;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + p.h / 2, p.w / 1.5, p.w / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw coat if equipped
    ctx.fillStyle = p.hasCoat ? '#e67e22' : '#2980b9'; // Orange coat or blue jacket
    ctx.fillRect(sx - p.w / 2, sy - p.h / 2, p.w, p.h);

    // Head
    ctx.fillStyle = '#f1c27d';
    ctx.fillRect(sx - p.w / 2 + 2, sy - p.h / 2 - 8, p.w - 4, 8);

    // Hat
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(sx - p.w / 2 + 1, sy - p.h / 2 - 10, p.w - 2, 4);

    // Tool / Hands
    ctx.fillStyle = '#f1c27d';
    ctx.fillRect(sx + p.w / 2, sy - 2, 4, 4); // right hand

    // Draw axe if equipped
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(sx + p.w / 2 + 2, sy - 6, 2, 10); // handle
    ctx.fillStyle = p.steelAxe ? '#bdc3c7' : '#7f8c8d'; // blade
    ctx.fillRect(sx + p.w / 2 + 4, sy - 6, 4, 6);
}

export function renderMinimap(G, ctx, W, H) {
    const mapW = 80;
    const mapH = 50;
    const mapX = W - mapW - 10;
    const mapY = 10;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(mapX - 2, mapY - 2, mapW + 4, mapH + 4);

    // Draw world pixels
    for (let r = 0; r < MAP_ROWS; r += 2) {
        for (let c = 0; c < MAP_COLS; c += 2) {
            const t = G.world.map[r][c];
            ctx.fillStyle = COLORS[t];
            ctx.fillRect(mapX + c, mapY + r, 2, 2);
        }
    }

    // Draw tent blip
    if (G.tent.placed || G.tent.placing) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(mapX + G.tent.col, mapY + G.tent.row, 4, 4);
    }

    // Draw player blip
    const pc = Math.floor(G.player.x / TILE);
    const pr = Math.floor(G.player.y / TILE);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(mapX + pc - 1, mapY + pr - 1, 3, 3);
}
