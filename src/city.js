import { ANIMALS, SHOP_ITEMS } from './data.js';
import { updateHUD, updateActionButtons, updateInventory, log, addNotif } from './ui.js';
import { DEVELOPMENT_MODE } from './settings.js';

export function setupCity(G) {
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            G.shopTab = btn.dataset.tab;
            renderShop(G);
        });
    });

    // Leave city
    document.getElementById('leave-city-btn').addEventListener('click', () => {
        leaveCity(G);
    });

    // Hotel sleep
    document.getElementById('sleep-btn').addEventListener('click', () => {
        startSleep(G);
    });

    // Travel cancel
    document.getElementById('travel-cancel-btn').addEventListener('click', () => {
        if (G.travel.active) {
            G.travel.active = false;
            document.getElementById('travel-overlay').classList.add('hidden');
            log('Trip cancelled. You stayed in the wilderness.', 'info');
            // Refund half hunger cost
            G.player.hunger = Math.min(100, G.player.hunger + 10);
            updateHUD(G);
            updateActionButtons(G);
        }
    });
}

// -- Travel to city (1 min, costs 20 hunger) --
export function travelToCity(G) {
    if (G.player.inCity) return;
    if (G.player.hunger < 20) {
        log('Not enough hunger to travel! Need at least 20.', 'danger');
        addNotif(G, 'Need 20+ hunger!', '#e74c3c');
        return;
    }
    if (G.travel.active || G.sleeping.active) return;

    // Deduct hunger cost
    G.player.hunger -= 20;
    updateHUD(G);
    log('🛷 Setting off for the city. Journey takes 1 minute...', 'info');

    // Start travel
    G.travel = { active: true, direction: 'city', elapsed: 0, duration: DEVELOPMENT_MODE ? 2 : 60 };
    document.getElementById('travel-title').textContent = 'TRAVELLING TO CITY';
    document.getElementById('travel-subtitle').textContent = 'The path through the snow is long...';
    document.getElementById('travel-icon').textContent = '🛷';
    document.getElementById('travel-progress-bar').style.width = '0%';
    document.getElementById('travel-overlay').classList.remove('hidden');
    document.getElementById('travel-cancel-btn').classList.remove('hidden');
    updateActionButtons(G);
}

// -- Open city menu --
export function openCity(G) {
    G.player.inCity = true;
    document.getElementById('city-money').textContent = G.player.money;
    document.getElementById('city-overlay').classList.remove('hidden');
    renderShop(G);
    updateHUD(G);
    updateActionButtons(G);
    log('🏙️ Arrived in Frostholm. Stats are stable here.', 'success');
}

// -- Leave city (instant) --
export function leaveCity(G) {
    G.player.inCity = false;
    document.getElementById('city-overlay').classList.add('hidden');
    log('🌲 Headed back into the wilderness. Stay warm!', 'info');
    updateActionButtons(G);
    updateHUD(G);
}

// -- Hotel sleep (5 min, costs 2 coins) --
export function startSleep(G) {
    if (G.player.money < 2) {
        log('Not enough coins! The inn costs 2 coins.', 'danger');
        return;
    }
    G.player.money -= 2;
    updateHUD(G);
    document.getElementById('city-money').textContent = G.player.money;
    document.getElementById('city-overlay').classList.add('hidden');

    G.sleeping = { active: true, elapsed: 0, duration: DEVELOPMENT_MODE ? 2 : 300 }; // 5 min
    document.getElementById('sleep-progress-bar').style.width = '0%';
    document.getElementById('sleep-timer-text').textContent = '5:00 remaining';
    document.getElementById('sleep-overlay').classList.remove('hidden');
    log('😴 You check into The Frozen Inn...', 'info');
}

export function openCity_refresh(G) {
    document.getElementById('city-money').textContent = G.player.money;
}

export function renderShop(G) {
    const content = document.getElementById('shop-content');
    content.innerHTML = '';
    document.getElementById('city-money').textContent = G.player.money;

    if (G.shopTab === 'sell') {
        // Sell raw animals and cooked ones
        const sellable = [
            { key: 'rabbit', icon: '🐇', price: ANIMALS.rabbit.sell, label: 'Rabbit' },
            { key: 'deer', icon: '🦌', price: ANIMALS.deer.sell, label: 'Deer' },
            { key: 'fox', icon: '🦊', price: ANIMALS.fox.sell, label: 'Fox' },
            { key: 'cooked_rabbit', icon: '🍖', price: 6, label: 'Cooked Rabbit' },
            { key: 'cooked_deer', icon: '🍖', price: 18, label: 'Cooked Deer' },
            { key: 'cooked_fox', icon: '🍖', price: 11, label: 'Cooked Fox' },
        ];
        let hasAnything = false;
        sellable.forEach(item => {
            const qty = G.player.inventory[item.key];
            if (!qty) return;
            hasAnything = true;
            const div = document.createElement('div');
            div.className = 'shop-item';
            div.innerHTML = `
        <div class="shop-item-info">
          <span class="shop-item-icon">${item.icon}</span>
          <div>
            <div class="shop-item-name">${item.label} ×${qty}</div>
            <div class="shop-item-desc">Sell for ${item.price} coins each</div>
          </div>
        </div>
        <button class="pixel-btn success" style="font-size:0.5rem;padding:10px 14px">
          SELL ALL<br><span style="font-size:0.45rem; color:var(--gold);">💰${item.price * qty}</span>
        </button>`;
            div.querySelector('button').addEventListener('click', () => {
                const earned = item.price * G.player.inventory[item.key];
                G.player.money += earned;
                G.player.inventory[item.key] = 0;
                log(`Sold all ${item.label} for ${earned} coins!`, 'success');
                addNotif(G, `+${earned} 💰`, '#f1c40f');
                updateHUD(G);
                updateInventory(G);
                renderShop(G);
            });
            content.appendChild(div);
        });
        if (!hasAnything)
            content.innerHTML = '<p style="font-size:1rem;color:#778;padding:12px;text-align:center;">Nothing to sell. Hunt some animals!</p>';
    } else {
        // Buy tab
        Object.entries(SHOP_ITEMS).forEach(([key, item]) => {
            const canAfford = G.player.money >= item.price;
            const div = document.createElement('div');
            div.className = 'shop-item';
            div.innerHTML = `
        <div class="shop-item-info">
          <span class="shop-item-icon">${item.icon}</span>
          <div>
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-desc">${item.description}</div>
          </div>
        </div>
        <button class="pixel-btn ${canAfford ? 'success' : ''}" style="font-size:0.5rem;padding:10px 14px" ${canAfford ? '' : 'disabled'}>
          BUY<br><span style="font-size:0.45rem; color:var(--gold);">💰${item.price}</span>
        </button>`;
            div.querySelector('button').addEventListener('click', () => {
                if (G.player.money < item.price) return;
                const result = item.action(G);
                if (result === false) return;
                G.player.money -= item.price;
                updateHUD(G);
                updateInventory(G);
                renderShop(G);
            });
            content.appendChild(div);
        });
    }
}
