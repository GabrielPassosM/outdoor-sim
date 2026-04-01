export function log(msg, type = '') {
    const box = document.getElementById('log-messages');
    const p = document.createElement('p');
    p.textContent = '▶ ' + msg;
    p.className = type;
    box.appendChild(p);
    box.scrollTop = box.scrollHeight;

    // Trim log
    while (box.children.length > 60) box.removeChild(box.firstChild);
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
}

export function updateInventory(G) {
    const p = G.player;
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';

    const items = [
        { icon: '🪓', name: p.steelAxe ? 'Steel Axe' : 'Axe', qty: null },
        { icon: '⛺', name: 'Tent', qty: null },
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

import { startHunt, chopWood, openBonfire, openCook } from './wilderness.js';
import { travelToCity } from './city.js';

export function updateActionButtons(G) {
    const p = G.player;
    const panel = document.getElementById('action-buttons');
    panel.innerHTML = '';

    const btn = (label, cls, fn, disabled = false, title = '') => {
        const b = document.createElement('button');
        b.className = `pixel-btn ${cls}`;
        b.innerHTML = label;
        b.style.fontSize = '0.38rem';
        b.style.padding = '6px 8px';
        b.disabled = disabled;
        b.title = title;
        b.addEventListener('click', fn);
        panel.appendChild(b);
    };

    // Wilderness actions
    btn(`[H] 🏹 Hunt`, '', () => startHunt(G), p.arrows <= 0, 'Hunt an animal (needs arrows)');
    btn(`[X] 🪵 Chop`, '', () => chopWood(G), false, 'Chop nearby trees for wood');
    btn(`[F] 🔥 Bonfire`, '', () => openBonfire(G), false, 'Manage your bonfire');
    btn(`[C] 🍳 Cook`, '', () => openCook(G), false, 'Cook and eat food');

    // Travel to city
    const canTravel = p.hunger >= 20 && !G.travel.active && !G.sleeping.active;
    btn(
        `🏙️ GO TO CITY<br><span style="font-size:0.3rem;color:#aaa">(costs 20 hunger, 1 min)</span>`,
        'success',
        () => travelToCity(G),
        !canTravel,
        `Travel to Frostholm (requires 20+ hunger)`
    );
}
