export function log(msg, type = '') {
    const box = document.getElementById('log-messages');
    const logBox = document.getElementById('log-box');
    const p = document.createElement('p');
    p.textContent = '▶ ' + msg;
    p.className = type;
    box.appendChild(p);

    // Trim log before scrolling
    while (box.children.length > 60) box.removeChild(box.firstChild);

    logBox.scrollTop = logBox.scrollHeight;
}

export function addNotif(G, text, color = '#fff') {
    G.notifications.push({
        text, color,
        x: G.player.x - G.camera.x,
        y: G.player.y - G.camera.y - 20,
        life: 1.5,
        maxLife: 1.5,
    });
}

export function setupSnowflakes() {
    const container = document.getElementById('snowflakes');
    for (let i = 0; i < 40; i++) {
        const s = document.createElement('div');
        s.className = 'snowflake';
        s.textContent = ['❄', '❅', '❆', '·'][Math.floor(Math.random() * 4)];
        s.style.left = Math.random() * 100 + '%';
        s.style.animationDuration = (4 + Math.random() * 8) + 's';
        s.style.animationDelay = (-Math.random() * 10) + 's';
        s.style.fontSize = (8 + Math.random() * 12) + 'px';
        container.appendChild(s);
    }
}

export function updateHUD(G) {
    const p = G.player;
    document.getElementById('health-bar').style.width = p.health + '%';
    document.getElementById('hunger-bar').style.width = p.hunger + '%';
    document.getElementById('warmth-bar').style.width = p.warmth + '%';
    document.getElementById('health-val').textContent = Math.floor(p.health);
    document.getElementById('hunger-val').textContent = Math.floor(p.hunger);
    document.getElementById('warmth-val').textContent = Math.floor(p.warmth);
    document.getElementById('money-display').textContent = p.money;
    document.getElementById('location-display').textContent =
        G.travel.active ? 'TRAVELLING...' :
            G.sleeping.active ? 'SLEEPING...' :
                p.inCity ? 'FROSTHOLM' : 'WILDERNESS';
    document.getElementById('day-display').textContent = G.day;

    // Color warnings
    document.getElementById('hunger-bar').style.background =
        p.hunger < 25 ? 'linear-gradient(90deg, #c0392b, #e74c3c)' :
            p.hunger < 50 ? 'linear-gradient(90deg, #e67e22, #d35400)' :
                'linear-gradient(90deg, #f39c12, #e67e22)';
    document.getElementById('warmth-bar').style.background =
        p.warmth < 25 ? 'linear-gradient(90deg, #2980b9, #1a5276)' :
            p.warmth < 50 ? 'linear-gradient(90deg, #3498db, #2980b9)' :
                'linear-gradient(90deg, #5dade2, #3498db)';

    let nearBonfire = false;
    if (G.bonfire.placed) {
        // TILE is imported later in this file, but ES imports are hoisted!
        const tileSize = 40; // using standard size if TILE isn't hoisted reliably, wait... actually just using TILE is fine.
        const dist = Math.hypot(p.x - G.bonfire.col * TILE, p.y - G.bonfire.row * TILE);
        nearBonfire = dist < 80;
    }

    const cookBtn = document.getElementById('action-cook-btn');
    if (cookBtn) cookBtn.disabled = !nearBonfire;

    const bonfireBtn = document.getElementById('action-bonfire-btn');
    if (bonfireBtn) bonfireBtn.disabled = !nearBonfire;

    const chopBtn = document.getElementById('action-chop-btn');
    if (chopBtn) chopBtn.disabled = p.hunger < 5;

    const huntBtn = document.getElementById('action-hunt-btn');
    if (huntBtn) {
        let nearbyAnimal = false;
        for (let i = 0; i < G.animals.length; i++) {
            if (Math.hypot(p.x - G.animals[i].x, p.y - G.animals[i].y) <= 140) {
                nearbyAnimal = true;
                break;
            }
        }
        huntBtn.disabled = p.arrows <= 0 || !nearbyAnimal;
    }
}

export function updateInventory(G) {
    const p = G.player;
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';

    const items = [
        { icon: '🪓', name: p.steelAxe ? 'Steel Axe' : 'Axe', qty: null },
        { icon: '⛺', name: 'Tent', qty: p.inventory.tent },
        { icon: '🍳', name: 'Pan', qty: null },
        { icon: '🏹', name: 'Arrows', qty: p.arrows },
        { icon: '🪵', name: 'Wood', qty: p.wood },
        { icon: '🐇', name: 'Rabbit', qty: p.inventory.rabbit },
        { icon: '🦌', name: 'Deer', qty: p.inventory.deer },
        { icon: '🦊', name: 'Fox', qty: p.inventory.fox },
        { icon: '🍖', name: 'Cooked', qty: p.inventory.cooked_rabbit + p.inventory.cooked_deer + p.inventory.cooked_fox },
    ];
    if (p.hasCoat) items.push({ icon: '🧥', name: 'Warm Coat', qty: null });

    items.forEach(item => {
        if (item.qty === 0 && item.qty !== null) return;
        const div = document.createElement('div');
        div.className = 'inv-item';
        div.innerHTML = `<div class="item-icon">${item.icon}</div>
      <div class="item-name">${item.name}</div>
      ${item.qty !== null ? `<div class="item-qty">${item.qty}</div>` : ''}`;
        grid.appendChild(div);
    });
}

import { startHunt, chopWood, openBonfire, openCook, placeTent, buildBonfire } from './wilderness.js';
import { travelToCity } from './city.js';
import { TILE } from './constants.js';

export function updateActionButtons(G) {
    const p = G.player;
    const panel = document.getElementById('action-buttons');
    panel.innerHTML = '';

    const btn = (label, cls, fn, disabled = false, title = '', id = '') => {
        const b = document.createElement('button');
        if (id) b.id = id;
        b.className = `pixel-btn ${cls}`;
        b.innerHTML = label;
        b.style.fontSize = '0.6rem';
        b.style.padding = '12px 16px';
        b.disabled = disabled;
        b.title = title;
        b.addEventListener('click', fn);
        panel.appendChild(b);
    };

    // Wilderness actions
    if (p.inventory.tent > 0 && !G.tent.placing && !G.tent.placed) {
        const t = G.world.map[Math.floor(p.y / TILE)][Math.floor(p.x / TILE)];
        const isSnow = t === 0 || t === 7; // SNOW or CAMP
        btn(`[T] ⛺ Place Tent<br><span style="font-size:0.45rem;color:#aaa">(2 mins)</span>`, 'success', () => placeTent(G), !isSnow, isSnow ? 'Start building your base camp' : 'Must be on snow');
    }

    if (G.tent.placed && !G.bonfire.placed) {
        const distToTent = Math.hypot(p.x - G.tent.col * TILE, p.y - G.tent.row * TILE);
        const nearTent = distToTent < 80;
        btn(`[B] 🔥 Build Bonfire<br><span style="font-size:0.45rem;color:#aaa">(Costs 5 wood)</span>`, 'success', () => buildBonfire(G), !nearTent || p.wood < 5, 'Requires 5 wood. Must be near your tent.');
    }

    btn(`[H] 🏹 Hunt`, '', () => startHunt(G), p.arrows <= 0, 'Hunt an animal (needs arrows)', 'action-hunt-btn');
    btn(`[X] 🪵 Chop<br><span style="font-size:0.45rem;color:#aaa">(costs 5 hunger)</span>`, '', () => chopWood(G), p.hunger < 5, 'Chop nearby trees for wood', 'action-chop-btn');

    if (G.bonfire.placed) {
        btn(`[F] 🔥 Bonfire`, '', () => openBonfire(G), false, 'Manage your bonfire', 'action-bonfire-btn');
    }
    btn(`[C] 🍳 Cook`, '', () => openCook(G), false, 'Cook and eat food', 'action-cook-btn');

    // Travel to city
    const canTravel = p.hunger >= 20 && !G.travel.active && !G.sleeping.active;
    btn(
        `🏙️ GO TO CITY<br><span style="font-size:0.45rem;color:#aaa">(costs 20 hunger, 1 min)</span>`,
        'success',
        () => travelToCity(G),
        !canTravel,
        `Travel to Frostholm (requires 20+ hunger)`
    );
}
