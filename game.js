import {
  TILE, MAP_COLS, MAP_ROWS, DRAIN_RATES
} from './src/constants.js';

import { generateWorld } from './src/world.js';
import { setupCity } from './src/city.js';
import { setupHuntingGame, setupBonfire, setupCook, startHunt, chopWood, openBonfire, openCook, placeTent, buildBonfire, shootAnimal } from './src/wilderness.js';
import { setupSnowflakes, log, addNotif, updateActionButtons, updateHUD, updateInventory } from './src/ui.js';
import { render } from './src/renderer.js';
import { ANIMALS } from './src/data.js';
import { DEVELOPMENT_MODE } from './src/settings.js';
import { initAuth, loginWithGoogle, logout, getCurrentUser } from './src/auth.js';
import { loadUserSaves, saveGameSlot } from './src/storage.js';

/* =============================================
   OUTDOOR SIM - CORE GAME ENGINE
   ============================================= */

class Game {
  constructor(saveData = null) {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    if (saveData) {
      this.world = saveData.world;
      if (typeof this.world.map === 'string') {
          this.world.map = JSON.parse(this.world.map);
      }
      this.player = saveData.player;
      this.day = saveData.day;
      this.tent = saveData.tent;
      this.bonfire = saveData.bonfire;
    } else {
      this.world = generateWorld();
      this.player = this.createPlayer();
      this.tent = { placed: false, placing: false, col: 0, row: 0, timer: 0, duration: DEVELOPMENT_MODE ? 2 : 120 };
      this.bonfire = { lit: false, timer: 0, placed: false, col: 0, row: 0 };
      this.day = 1;
    }

    this.animals = [];
    this.animalSpawnTimer = 0;
    this.hunting = { active: false, type: null, animalX: 0, dir: 1, speed: 0, timer: 0, result: null };
    this.cooking = [];
    this.dayTimer = 0;
    this.dayLength = 120; // seconds
    this.running = false;
    this.shopTab = 'sell';
    this.keys = {};
    this.lastTime = null;
    this.camera = { x: 0, y: 0 };
    this.notifications = [];
    // Travel state
    this.travel = { active: false, direction: null, elapsed: 0, duration: 0 };
    this.sleeping = { active: false, elapsed: 0, duration: 0 };

    this.bindInputs();
    setupHuntingGame(this);
    setupCity(this);
    setupBonfire(this);
    setupCook(this);
    setupSnowflakes();
    this.spawnAnimals();
  }

  createPlayer() {
    const { campCol, campRow } = this.world;
    return {
      x: campCol * TILE + TILE / 2,
      y: campRow * TILE + TILE / 2,
      w: 12, h: 14,
      health: 100, hunger: 100, warmth: 100,
      money: DEVELOPMENT_MODE ? 1000 : 20,
      inventory: { tent: 1, rabbit: 0, deer: 0, fox: 0, cooked_rabbit: 0, cooked_deer: 0, cooked_fox: 0 },
      wood: 5,
      arrows: 10,
      hasCoat: false,
      steelAxe: false,
      speed: 90,
      inCity: false,
    };
  }

  serialize() {
    return {
      player: this.player,
      world: {
          ...this.world,
          map: JSON.stringify(this.world.map)
      },
      day: this.day,
      tent: this.tent,
      bonfire: this.bonfire
    };
  }

  resize() {
    const panel = 160, hud = 90;
    const zoom = 2.5;
    const w = window.innerWidth - 240; // minus inventory panel
    const h = window.innerHeight - panel - hud;
    
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    
    this.canvas.width = Math.floor(w / zoom);
    this.canvas.height = Math.floor(h / zoom);
  }

  // ─── INPUT ───────────────────────────────────
  bindInputs() {
    window.addEventListener('keydown', e => {
      this.keys[e.key.toLowerCase()] = true;
      
      if (!this.isOverlayOpen() && !this.player.inCity && this.running) {
        if (e.key.toLowerCase() === 'h' && this.player.arrows > 0) startHunt(this);
        if (e.key.toLowerCase() === 'x') chopWood(this);
        if (e.key.toLowerCase() === 'f') openBonfire(this);
        if (e.key.toLowerCase() === 'c') openCook(this);
        if (e.key.toLowerCase() === 't') placeTent(this);
        if (e.key.toLowerCase() === 'b') buildBonfire(this);
      }

      if (e.key === ' ') {
        e.preventDefault();
        if (this.hunting.active) {
            shootAnimal(this);
        }
      }
    });
    window.addEventListener('keyup', e => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  isOverlayOpen() {
    return !document.getElementById('hunting-overlay').classList.contains('hidden') ||
      !document.getElementById('city-overlay').classList.contains('hidden') ||
      !document.getElementById('travel-overlay').classList.contains('hidden') ||
      !document.getElementById('sleep-overlay').classList.contains('hidden') ||
      !document.getElementById('bonfire-overlay').classList.contains('hidden') ||
      !document.getElementById('cook-overlay').classList.contains('hidden') ||
      !document.getElementById('eat-overlay').classList.contains('hidden') ||
      !document.getElementById('pause-overlay').classList.contains('hidden');
  }

  // ─── ANIMALS ─────────────────────────────────
  spawnAnimals() {
    const { cityEnd } = this.world;
    if (!this.canvas) return; // Safe check
    
    const W = this.canvas.width;
    const H = this.canvas.height;
    
    // Remove animals off-screen
    this.animals = this.animals.filter(a => {
        const sx = a.x - this.camera.x;
        const sy = a.y - this.camera.y;
        return sx >= -100 && sx <= W + 100 && sy >= -100 && sy <= H + 100;
    });

    // Rare spawn: max 2
    if (this.animals.length >= 2) return;
    
    const toSpawn = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < toSpawn; i++) {
      if (this.animals.length >= 2) break;
      const types = Object.keys(ANIMALS);
      const type = types[Math.floor(Math.random() * types.length)];
      const def = ANIMALS[type];
      
      const rx = this.camera.x + Math.random() * W;
      const ry = this.camera.y + Math.random() * H;
      if (rx < (cityEnd + 3) * TILE) continue; // Not in city
      
      this.animals.push({
        type, def,
        x: rx, y: ry,
        vx: (Math.random() * 2 - 1) * def.speed * 30,
        vy: (Math.random() * 2 - 1) * def.speed * 30,
        roamTimer: 2 + Math.random() * 3,
      });
    }
  }

  getTile(worldX, worldY) {
    const col = Math.floor(worldX / TILE);
    const row = Math.floor(worldY / TILE);
    if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return 0; // SNOW
    return this.world.map[row][col];
  }

  isWalkable(worldX, worldY) {
    const t = this.getTile(worldX, worldY);
    // 1=TREE, 2=ROCK, 6=BUILDING, 4=WATER
    return t !== 1 && t !== 2 && t !== 6 && t !== 4;
  }

  // ─── PLAYER MOVEMENT ─────────────────────────
  movePlayer(dt) {
    // Block movement while in city, travelling, or sleeping
    if (this.player.inCity || this.travel.active || this.sleeping.active) return;
    if (this.isOverlayOpen()) return;

    const p = this.player;
    let dx = 0, dy = 0;

    if (this.keys['arrowleft'] || this.keys['a']) dx -= 1;
    if (this.keys['arrowright'] || this.keys['d']) dx += 1;
    if (this.keys['arrowup'] || this.keys['w']) dy -= 1;
    if (this.keys['arrowdown'] || this.keys['s']) dy += 1;

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    const spd = p.speed * dt;
    const nx = p.x + dx * spd;
    const ny = p.y + dy * spd;

    const margin = 4;
    if (this.isWalkable(nx + margin, p.y + margin) && this.isWalkable(nx + margin, p.y + p.h - margin) &&
      this.isWalkable(nx - margin, p.y + margin) && this.isWalkable(nx - margin, p.y + p.h - margin)) {
      p.x = Math.max(0, Math.min(MAP_COLS * TILE - 1, nx));
    }
    if (this.isWalkable(p.x + margin, ny + margin) && this.isWalkable(p.x + margin, ny + p.h - margin) &&
      this.isWalkable(p.x - margin, ny + margin) && this.isWalkable(p.x - margin, ny + p.h - margin)) {
      p.y = Math.max(0, Math.min(MAP_ROWS * TILE - 1, ny));
    }
  }

  // ─── ANIMALS MOVEMENT ────────────────────────
  moveAnimals(dt) {
    const { cityEnd } = this.world;
    this.animals.forEach(a => {
      a.roamTimer -= dt;
      if (a.roamTimer <= 0) {
        a.vx = (Math.random() * 2 - 1) * a.def.speed * 30;
        a.vy = (Math.random() * 2 - 1) * a.def.speed * 30;
        a.roamTimer = 1.5 + Math.random() * 3;
      }

      const nx = a.x + a.vx * dt;
      const ny = a.y + a.vy * dt;
      if (this.isWalkable(nx, ny) && Math.floor(nx / TILE) >= cityEnd + 2) {
        a.x = Math.max(cityEnd * TILE, Math.min((MAP_COLS - 1) * TILE, nx));
        a.y = Math.max(0, Math.min((MAP_ROWS - 1) * TILE, ny));
      } else {
        a.vx *= -1; a.vy *= -1;
        a.roamTimer = 0.5;
        // Bump slightly to prevent getting stuck in a corner while fleeing
        a.x += a.vx * dt * 0.5;
        a.y += a.vy * dt * 0.5;
      }
    });
  }

  // ─── STAT UPDATE ─────────────────────────────
  updateStats(dt) {
    const p = this.player;

    // ── Handle travel timer ──
    if (this.travel.active) {
      this.travel.elapsed += dt;
      const pct = Math.min(1, this.travel.elapsed / this.travel.duration);
      document.getElementById('travel-progress-bar').style.width = (pct * 100) + '%';
      const remaining = Math.max(0, Math.ceil(this.travel.duration - this.travel.elapsed));
      document.getElementById('travel-timer-text').textContent = remaining + 's remaining';

      if (this.travel.elapsed >= this.travel.duration) {
        this.travel.active = false;
        document.getElementById('travel-overlay').classList.add('hidden');

        // Open city dynamically to avoid circular import loops when possible
        import('./src/city.js').then(module => {
          module.openCity(this);
        });
      }
      // Stats still drain during travel
    }

    // ── Handle sleep timer ──
    if (this.sleeping.active) {
      this.sleeping.elapsed += dt;
      const pct = Math.min(1, this.sleeping.elapsed / this.sleeping.duration);
      document.getElementById('sleep-progress-bar').style.width = (pct * 100) + '%';
      const remaining = Math.max(0, this.sleeping.duration - this.sleeping.elapsed);
      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);
      document.getElementById('sleep-timer-text').textContent =
        `${mins}:${String(secs).padStart(2, '0')} remaining`;

      if (this.sleeping.elapsed >= this.sleeping.duration) {
        this.sleeping.active = false;
        document.getElementById('sleep-overlay').classList.add('hidden');
        // Fully restore all stats
        p.health = 100; p.hunger = 100; p.warmth = 100;
        log('😊 You woke up fully rested! All stats restored.', 'success');
        addNotif(this, '✨ Fully Rested!', '#f1c40f');
        updateHUD(this);

        // Reopen city dynamically
        import('./src/city.js').then(module => {
          document.getElementById('city-overlay').classList.remove('hidden');
          document.getElementById('city-money').textContent = p.money;
          module.renderShop(this);
        });
      }
      return; // Freeze all drains while sleeping
    }

    // ── In city: stats frozen ──
    if (p.inCity) {
      // Day still progresses
      this.dayTimer += dt;
      if (this.dayTimer >= this.dayLength) {
        this.dayTimer = 0;
        this.day++;
        log(`☀ Day ${this.day} begins.`, 'important');
      }
      return; // No stat drains in city
    }

    // ── Wilderness drains ──

    // Hunger drain
    p.hunger -= DRAIN_RATES.hunger_wild * dt;

    // Warmth drain
    let coldRate = DRAIN_RATES.warmth_wild;
    if (p.hasCoat) coldRate *= 0.7;
    if (this.bonfire.lit) {
      const distToBonfire = Math.hypot(
        p.x - this.bonfire.col * TILE,
        p.y - this.bonfire.row * TILE
      );
      if (distToBonfire < 80) {
        p.warmth = Math.min(100, p.warmth + 8 * dt);
        coldRate = 0;
      }
    }
    p.warmth -= coldRate * dt;

    // Tent Placing Timer
    if (this.tent.placing) {
      this.tent.timer -= dt;
      if (this.tent.timer <= 0) {
        this.tent.placing = false;
        this.tent.placed = true;
        this.tent.timer = 0;
        this.world.map[this.tent.row][this.tent.col] = 9; // TILE_TYPE.TENT
        log('Your tent has been built!', 'success');
        addNotif(this, '⛺ Built!', '#f1c40f');
        import('./src/ui.js').then(ui => ui.updateActionButtons(this));
      }
    }

    // Bonfire timer
    if (this.bonfire.lit) {
      this.bonfire.timer -= dt;
      if (this.bonfire.timer <= 0) {
        this.bonfire.lit = false;
        this.bonfire.timer = 0;
        log('The bonfire went out! Add more wood.', 'danger');
        addNotif(this, '🔥 Fire out!', '#e74c3c');
      }

      // Cooking progress
      for (let i = this.cooking.length - 1; i >= 0; i--) {
        const item = this.cooking[i];
        if (item.timer > 0) {
          item.timer -= dt;
          if (item.timer <= 0) {
            item.timer = 0;
            log(`Finished cooking ${ANIMALS[item.raw].name}! Collect it from the fire.`, 'success');
            addNotif(this, `🍖 Ready!`, '#e67e22');
            
            if (!document.getElementById('cook-overlay').classList.contains('hidden')) {
              import('./src/wilderness.js').then(m => m.openCook(this));
            }
          }
        }
      }
    }

    // Live UI update for cooking
    if (this.cooking.length > 0 && !document.getElementById('cook-overlay').classList.contains('hidden')) {
      this.cooking.forEach(item => {
        const el = document.getElementById(`cook-timer-${item.id}`);
        if (el) el.textContent = `${Math.ceil(item.timer)}s`;
      });
    }

    // Clamp
    p.hunger = Math.max(0, Math.min(100, p.hunger));
    p.warmth = Math.max(0, Math.min(100, p.warmth));

    // Health effects
    if (p.hunger < 15) {
      p.health -= DRAIN_RATES.health_starve * dt;
      if (Math.random() < 0.02) addNotif(this, '😰 STARVING!', '#e74c3c');
    }
    if (p.warmth < 15) {
      p.health -= DRAIN_RATES.health_freeze * dt;
      if (Math.random() < 0.02) addNotif(this, '🥶 FREEZING!', '#3498db');
    }
    if (p.hunger > 50 && p.warmth > 50 && p.health < 100) {
      p.health = Math.min(100, p.health + DRAIN_RATES.health_regen * dt);
    }
    p.health = Math.max(0, Math.min(100, p.health));

    // Day cycle
    this.dayTimer += dt;
    if (this.dayTimer >= this.dayLength) {
      this.dayTimer = 0;
      this.day++;
      log(`☀ Day ${this.day} begins.`, 'important');
    }

    // Dynamic animal spawning
    this.animalSpawnTimer += dt;
    if (this.animalSpawnTimer > 8) {
        this.animalSpawnTimer = 0;
        if (Math.random() < 0.3) {
            this.spawnAnimals();
        }
    }

    // Death check
    if (p.health <= 0) this.die();
  }

  die() {
    this.running = false;
    let reason = 'You succumbed to the wilderness.';
    if (this.player.hunger <= 5) reason = 'You starved to death.';
    if (this.player.warmth <= 5) reason = 'You froze to death.';

    // Process Death Penalty
    this.player.health = 100;
    this.player.hunger = 100;
    this.player.warmth = 100;
    this.player.wood = 5;
    this.player.arrows = 10;
    this.player.hasCoat = false;
    this.player.steelAxe = false;
    this.player.inventory = { tent: this.tent.placed ? 0 : 1, rabbit: 0, deer: 0, fox: 0, cooked_rabbit: 0, cooked_deer: 0, cooked_fox: 0 };
    this.player.x = this.world.campCol * TILE + TILE / 2;
    this.player.y = this.world.campRow * TILE + TILE / 2;
    this.player.inCity = false;
    
    // Save penalized state to current slot
    if (window.currentSaveSlot) {
        saveGameSlot(window.currentUser, window.currentSaveSlot, this.serialize());
    }

    document.getElementById('death-reason').textContent = reason;
    document.getElementById('death-days').textContent = this.day;
    document.getElementById('death-screen').classList.remove('hidden');
  }

  // ─── CAMERA ──────────────────────────────────
  updateCamera() {
    const target = {
      x: this.player.x - this.canvas.width / 2,
      y: this.player.y - this.canvas.height / 2,
    };
    this.camera.x += (target.x - this.camera.x) * 0.1;
    this.camera.y += (target.y - this.camera.y) * 0.1;
    this.camera.x = Math.max(0, Math.min(MAP_COLS * TILE - this.canvas.width, this.camera.x));
    this.camera.y = Math.max(0, Math.min(MAP_ROWS * TILE - this.canvas.height, this.camera.y));
  }

  // ─── MAIN LOOP ───────────────────────────────
  loop(timestamp) {
    if (!this.running) return;
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); // cap dt at 100ms
    this.lastTime = timestamp;

    if (!document.getElementById('pause-overlay').classList.contains('hidden')) {
      // If paused, skip updating logic but keep rendering
    } else {
      this.movePlayer(dt);
      this.moveAnimals(dt);
      this.updateStats(dt);
    }
    this.updateCamera();

    updateHUD(this);

    render(this);

    requestAnimationFrame(t => this.loop(t));
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    updateHUD(this);
    updateInventory(this);
    updateActionButtons(this);
    log('Welcome to Outdoor Sim. Stay warm!', 'important');
    requestAnimationFrame(t => this.loop(t));
  }
}

// ─── INIT ────────────────────────────────────
let game = null;
window.currentUser = null;
window.currentSaveSlot = null;

const loginContainer = document.getElementById('login-container');
const userProfile = document.getElementById('user-profile');
const welcomeText = document.getElementById('welcome-text');

document.getElementById('google-login-btn').addEventListener('click', () => {
  loginWithGoogle().catch(err => {
    console.error("Login failed:", err);
  });
});

document.getElementById('guest-login-btn').addEventListener('click', () => {
  // Play as guest logic
  window.currentUser = null;
  loginContainer.classList.add('hidden');
  userProfile.classList.remove('hidden');
  welcomeText.textContent = "Welcome, Guest!";
  document.getElementById('logout-btn').classList.add('hidden'); // Guests can't logout
});

document.getElementById('logout-btn').addEventListener('click', () => {
  logout().then(() => {
    window.currentUser = null;
    loginContainer.classList.remove('hidden');
    userProfile.classList.add('hidden');
  });
});

document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('user-profile').classList.add('hidden');
  document.getElementById('login-container').classList.add('hidden');
  document.getElementById('saves-section').classList.remove('hidden');
  renderSavesMenu();
});

document.getElementById('back-to-profile-btn').addEventListener('click', () => {
  document.getElementById('saves-section').classList.add('hidden');
  if (window.currentUser || userProfile.classList.contains('hidden') === false) {
      userProfile.classList.remove('hidden');
  } else {
      loginContainer.classList.remove('hidden');
  }
});

async function renderSavesMenu() {
  const savesList = document.getElementById('saves-list');
  const loadingText = document.getElementById('saves-loading-text');
  savesList.innerHTML = '';
  loadingText.classList.remove('hidden');

  const saves = await loadUserSaves(window.currentUser);
  loadingText.classList.add('hidden');

  const slots = window.currentUser ? ['slot_1', 'slot_2', 'slot_3'] : ['slot_1'];

  slots.forEach((slot, idx) => {
    const data = saves[slot];
    const slotDiv = document.createElement('div');
    slotDiv.style.border = '2px solid #fff';
    slotDiv.style.padding = '10px';
    slotDiv.style.width = '250px';
    slotDiv.style.textAlign = 'center';
    
    if (data) {
        slotDiv.innerHTML = `
            <h3 style="margin-bottom:5px;">Slot ${idx + 1}</h3>
            <p style="font-size:0.7rem; margin-bottom:10px;">Day ${data.day} | ${data.player.money} coins</p>
            <button class="pixel-btn small-btn load-btn" data-slot="${slot}">LOAD GAME</button>
        `;
    } else {
        slotDiv.innerHTML = `
            <h3 style="margin-bottom:5px; color:#aaa;">Slot ${idx + 1}</h3>
            <p style="font-size:0.7rem; color:#aaa; margin-bottom:10px;">Empty</p>
            <button class="pixel-btn small-btn success new-btn" data-slot="${slot}">NEW GAME</button>
        `;
    }
    savesList.appendChild(slotDiv);
  });

  document.querySelectorAll('.load-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
          const slotId = e.target.getAttribute('data-slot');
          startGame(slotId, saves[slotId]);
      });
  });

  document.querySelectorAll('.new-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
          const slotId = e.target.getAttribute('data-slot');
          startGame(slotId, null);
      });
  });
}

function startGame(slotId, saveData) {
    window.currentSaveSlot = slotId;
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('saves-section').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    game = new Game(saveData);
    game.start();
}

document.getElementById('restart-btn').addEventListener('click', () => {
  document.getElementById('death-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  const penalizedData = game.serialize();
  game = new Game(penalizedData);
  game.start();
});

document.getElementById('menu-btn').addEventListener('click', () => {
    document.getElementById('pause-overlay').classList.remove('hidden');
});

document.getElementById('pause-continue-btn').addEventListener('click', () => {
    document.getElementById('pause-overlay').classList.add('hidden');
});

document.getElementById('pause-save-btn').addEventListener('click', () => {
    if (game && window.currentSaveSlot) {
        saveGameSlot(window.currentUser, window.currentSaveSlot, game.serialize());
        addNotif(game, '💾 Saved!', '#2ecc71');
        document.getElementById('pause-overlay').classList.add('hidden');
    }
});

document.getElementById('pause-main-menu-btn').addEventListener('click', () => {
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('title-screen').classList.remove('hidden');
    document.getElementById('saves-section').classList.remove('hidden');
    game.running = false;
    renderSavesMenu();
});

// Initialize authentication state listener
initAuth((user) => {
  window.currentUser = user;
  if (user) {
    // User is signed in
    loginContainer.classList.add('hidden');
    userProfile.classList.remove('hidden');
    document.getElementById('logout-btn').classList.remove('hidden');
    welcomeText.textContent = `Welcome, ${user.displayName || "Explorer"}!`;
  } else {
    // User is signed out or auth is not initialized/failed
    loginContainer.classList.remove('hidden');
    userProfile.classList.add('hidden');
  }
});
