import { TILE, MAP_ROWS, MAP_COLS, TILE_TYPE } from './constants.js';
import { ANIMALS } from './data.js';
import { updateHUD, updateInventory, log, addNotif, updateActionButtons } from './ui.js';

// ─── HUNTING MINI-GAME ───────────────────────
export function setupHuntingGame(G) {
    document.getElementById('shoot-btn').addEventListener('click', () => shootAnimal(G));
    document.getElementById('hunt-cancel-btn').addEventListener('click', () => closeHunting(G));
}

export function startHunt(G) {
    if (G.player.inCity) { log("Can't hunt in the city!", 'danger'); return; }
    if (G.player.arrows <= 0) { log('You have no arrows! Buy more in the city.', 'danger'); return; }

    const W = G.canvas.width;
    const H = G.canvas.height;
    const visibleAnimals = G.animals.filter(a => {
        const sx = a.x - G.camera.x;
        const sy = a.y - G.camera.y;
        return sx >= -20 && sx <= W + 20 && sy >= -20 && sy <= H + 20;
    });

    if (visibleAnimals.length === 0) {
        log("No animals in sight to hunt!", 'danger');
        return;
    }

    const target = visibleAnimals[Math.floor(Math.random() * visibleAnimals.length)];
    const chosen = target.type;
    G.animals = G.animals.filter(a => a !== target);

    const def = ANIMALS[chosen];
    G.hunting.active = true;
    G.hunting.type = chosen;
    G.hunting.animalX = 10;
    G.hunting.dir = 1;
    G.hunting.speed = def.speed * 55 + Math.random() * 30;
    G.hunting.result = null;
    G.hunting.timer = 0;
    G.hunting.missed = false;

    document.getElementById('hunt-instruction').textContent =
        `A ${def.name} appeared! Wait for it to enter the green zone, then click SHOOT or press SPACE!`;
    document.getElementById('hunt-animal').textContent = def.icon;
    document.getElementById('hunting-overlay').classList.remove('hidden');
    runHuntingLoop(G);
}

export function runHuntingLoop(G) {
    if (!G.hunting.active) return;
    const track = document.getElementById('hunt-track');
    const animalEl = document.getElementById('hunt-animal');
    const trackW = track.clientWidth - 30;

    G.hunting.animalX += G.hunting.dir * G.hunting.speed * 0.016;
    if (G.hunting.animalX > trackW) { G.hunting.animalX = trackW; G.hunting.dir = -1; }
    if (G.hunting.animalX < 0) { G.hunting.animalX = 0; G.hunting.dir = 1; }
    animalEl.style.left = G.hunting.animalX + 'px';

    // Speed up over time
    G.hunting.timer += 0.016;
    if (G.hunting.timer > 3) G.hunting.speed = Math.min(G.hunting.speed * 1.002, 400);

    // Timeout after 12s = miss
    if (G.hunting.timer > 12) {
        G.hunting.active = false;
        G.player.arrows--;
        log('The animal got away!', 'danger');
        updateHUD(G);
        closeHunting(G);
        return;
    }
    requestAnimationFrame(() => runHuntingLoop(G));
}

export function shootAnimal(G) {
    if (!G.hunting.active) return;
    const track = document.getElementById('hunt-track');
    const trackW = track.clientWidth - 30;
    const zoneLeft = (trackW - 80) / 2;
    const zoneRight = zoneLeft + 80;
    const ax = G.hunting.animalX;

    G.hunting.active = false;
    G.player.arrows--;

    if (ax >= zoneLeft && ax <= zoneRight) {
        // HIT
        const type = G.hunting.type;
        const def = ANIMALS[type];
        G.player.inventory[type]++;
        log(`You hit the ${def.name}! Added to inventory.`, 'success');
        addNotif(G, `+1 ${def.icon} ${def.name}!`, '#2ecc71');
    } else {
        log('Missed the shot! Arrow wasted.', 'danger');
        addNotif(G, 'MISS!', '#e74c3c');
    }

    updateHUD(G);
    updateInventory(G);
    setTimeout(() => closeHunting(G), 400);
}

export function closeHunting(G) {
    G.hunting.active = false;
    document.getElementById('hunting-overlay').classList.add('hidden');
}

// ─── FIREWOOD / BONFIRE ───────────────────────
export function chopWood(G) {
    if (G.player.inCity) { log("Can't chop wood in the city!", 'danger'); return; }
    // Find a choppable tree nearby
    const px = Math.floor(G.player.x / TILE);
    const py = Math.floor(G.player.y / TILE);
    let found = false;
    for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
            const r = py + dy, c = px + dx;
            if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
                if (G.world.map[r][c] === TILE_TYPE.CHOP) {
                    found = true;
                    G.world.map[r][c] = TILE_TYPE.SNOW; // tree is depleted
                    break;
                }
            }
        }
        if (found) break;
    }

    if (!found) { log('No choppable trees nearby! Explore further.', 'danger'); return; }

    const amount = G.player.steelAxe ? 4 : 2;
    G.player.wood += amount;
    log(`Chopped wood! +${amount} logs. Total: ${G.player.wood}`, 'success');
    addNotif(G, `+${amount} 🪵`, '#f1c40f');
    updateInventory(G);

    // Regrow in ~30s
    setTimeout(() => {
        const px2 = Math.floor(G.player.x / TILE);
        const py2 = Math.floor(G.player.y / TILE);
        // regenerate a random choppable tree somewhat nearby
        const rr = py2 + Math.floor(Math.random() * 20) - 10;
        const rc = px2 + Math.floor(Math.random() * 20) + 2;
        if (rr >= 0 && rr < MAP_ROWS && rc >= G.world.cityEnd + 3 && rc < MAP_COLS) {
            if (G.world.map[rr][rc] === TILE_TYPE.SNOW) {
                G.world.map[rr][rc] = TILE_TYPE.CHOP;
            }
        }
    }, 30000);
}

export function openBonfire(G) {
    document.getElementById('bonfire-wood-count').textContent = G.player.wood;
    document.getElementById('bonfire-status').textContent = G.bonfire.lit
        ? `🔥 Fire is burning! Staying warm. (${Math.floor(G.bonfire.timer)}s left)`
        : 'Fire is out. Add wood to light it!';
    document.getElementById('bonfire-overlay').classList.remove('hidden');
}

export function setupBonfire(G) {
    document.getElementById('add-wood-btn').addEventListener('click', () => {
        if (G.player.wood <= 0) { log('No wood! Chop some trees first.', 'danger'); return; }
        G.player.wood--;
        G.bonfire.lit = true;
        G.bonfire.timer = (G.bonfire.timer || 0) + 45; // 45s of fire per log
        document.getElementById('bonfire-wood-count').textContent = G.player.wood;
        document.getElementById('bonfire-status').textContent =
            `🔥 Fire is burning! Staying warm. (${Math.floor(G.bonfire.timer)}s left)`;
        log(`Added a log to the bonfire. (~${Math.floor(G.bonfire.timer)}s of warmth)`, 'success');
        updateInventory(G);
    });
    document.getElementById('bonfire-close-btn').addEventListener('click', () => {
        document.getElementById('bonfire-overlay').classList.add('hidden');
    });
}

// ─── COOKING ─────────────────────────────────
export function setupCook(G) {
    document.getElementById('cook-close-btn').addEventListener('click', () => {
        document.getElementById('cook-overlay').classList.add('hidden');
    });
}

export function openCook(G) {
    const p = G.player;
    const options = document.getElementById('cook-options');
    options.innerHTML = '';

    const raw = [
        { key: 'rabbit', cooked: 'cooked_rabbit', icon: '🐇', food: 25 },
        { key: 'deer', cooked: 'cooked_deer', icon: '🦌', food: 60 },
        { key: 'fox', cooked: 'cooked_fox', icon: '🦊', food: 35 },
    ];

    let anyRaw = false;
    raw.forEach(item => {
        const qty = p.inventory[item.key];
        if (qty <= 0) return;
        anyRaw = true;
        const div = document.createElement('div');
        div.className = 'cook-option';
        div.innerHTML = `
      <span>${item.icon} ${ANIMALS[item.key].name} (×${qty})</span>
      <button class="pixel-btn success" style="font-size:0.4rem;padding:6px 10px">
        🍳 Cook (+${item.food} hunger)
      </button>`;
        div.querySelector('button').addEventListener('click', () => {
            if (!G.bonfire.lit) {
                log('Need a lit bonfire to cook!', 'danger');
                return;
            }
            p.inventory[item.key]--;
            p.inventory[item.cooked]++;
            log(`Cooked ${item.icon} ${ANIMALS[item.key].name}!`, 'success');
            updateInventory(G);
            openCook(G); // refresh
        });
        options.appendChild(div);
    });

    // Show cooked items to eat
    const cooked = [
        { key: 'cooked_rabbit', icon: '🍖', food: 25 },
        { key: 'cooked_deer', icon: '🍖', food: 60 },
        { key: 'cooked_fox', icon: '🍖', food: 35 },
    ];
    cooked.forEach(item => {
        const qty = p.inventory[item.key];
        if (qty <= 0) return;
        const label = item.key.replace('cooked_', '').replace(/^\w/, c => c.toUpperCase());
        const div = document.createElement('div');
        div.className = 'cook-option';
        div.innerHTML = `
      <span>${item.icon} Cooked ${label} (×${qty})</span>
      <button class="pixel-btn" style="font-size:0.4rem;padding:6px 10px;border-color:#e67e22;">
        😋 Eat (+${item.food} hunger)
      </button>`;
        div.querySelector('button').addEventListener('click', () => {
            p.inventory[item.key]--;
            p.hunger = Math.min(100, p.hunger + item.food);
            log(`Ate cooked ${label}! +${item.food} hunger.`, 'success');
            addNotif(G, `+${item.food} 🍖`, '#e67e22');
            updateHUD(G);
            updateInventory(G);
            openCook(G);
        });
        options.appendChild(div);
    });

    if (!anyRaw && !cooked.some(i => p.inventory[i.key] > 0)) {
        options.innerHTML = '<p style="font-size:0.45rem;color:#778;padding:12px;">No animals to cook. Go hunt!</p>';
    }

    document.getElementById('cook-overlay').classList.remove('hidden');
}

export function placeTent(G) {
    if (G.player.inventory.tent <= 0 || G.tent.placing || G.tent.placed) return;
    const px = Math.floor(G.player.x / TILE);
    const py = Math.floor(G.player.y / TILE);
    const t = G.world.map[py][px];
    if (t !== TILE_TYPE.SNOW && t !== TILE_TYPE.CAMP) {
        log("Must be placed on flat snow!", 'danger');
        return;
    }
    
    // Start placing
    G.player.inventory.tent--;
    G.tent.placing = true;
    G.tent.timer = G.tent.duration; // 120s
    G.tent.col = px;
    G.tent.row = py;
    
    log(`Started building tent! It will take 2 minutes.`, 'important');
    addNotif(G, 'Building Tent...', '#3498db');
    updateInventory(G);
    updateActionButtons(G);
}

export function buildBonfire(G) {
    if (!G.tent.placed || G.bonfire.placed || G.player.wood < 5) return;
    const px = Math.floor(G.player.x / TILE);
    const py = Math.floor(G.player.y / TILE);
    
    // Nearest to tent check
    const distToTent = Math.hypot(G.player.x - G.tent.col * TILE, G.player.y - G.tent.row * TILE);
    if (distToTent >= 80) {
        log("Must build bonfire near your tent!", 'danger');
        return;
    }

    const t = G.world.map[py][px];
    if (t !== TILE_TYPE.SNOW && t !== TILE_TYPE.CAMP && t !== TILE_TYPE.TENT) {
        log("Cannot build bonfire here!", 'danger');
        return;
    }

    // Build
    G.player.wood -= 5;
    G.world.map[py][px] = TILE_TYPE.BONFIRE;
    G.bonfire.placed = true;
    G.bonfire.col = px;
    G.bonfire.row = py;

    log(`Bonfire built! You can now add wood to light it.`, 'success');
    addNotif(G, 'Bonfire Built!', '#e67e22');
    updateInventory(G);
    updateActionButtons(G);
}
