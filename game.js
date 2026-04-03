import {
  TILE, MAP_COLS, MAP_ROWS, DRAIN_RATES
} from './src/constants.js';

import { generateWorld } from './src/world.js';
import { setupCity } from './src/city.js';
import { setupHuntingGame, setupBonfire, setupCook, startHunt, chopWood, openBonfire, openCook, placeTent, buildBonfire, shootAnimal } from './src/wilderness.js';
import { setupSnowflakes, log, addNotif, updateActionButtons, updateHUD, updateInventory } from './src/ui.js';
import { render } from './src/renderer.js';
import { ANIMALS } from './src/data.js';

/* =============================================
   OUTDOOR SIM - CORE GAME ENGINE
   ============================================= */

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.world = generateWorld();
    this.player = this.createPlayer();
    this.animals = [];
    this.animalSpawnTimer = 0;
    this.hunting = { active: false, type: null, animalX: 0, dir: 1, speed: 0, timer: 0, result: null };
    this.tent = { placed: false, placing: false, col: 0, row: 0, timer: 0, duration: 120 };
    this.bonfire = { lit: false, timer: 0, placed: false, col: 0, row: 0 };
    this.day = 1;
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
      money: 20,
      inventory: { tent: 1, rabbit: 0, deer: 0, fox: 0, cooked_rabbit: 0, cooked_deer: 0, cooked_fox: 0 },
      wood: 5,
      arrows: 10,
      hasCoat: false,
      steelAxe: false,
      speed: 90,
      inCity: false,
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
      !document.getElementById('cook-overlay').classList.contains('hidden');
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

    this.movePlayer(dt);
    this.moveAnimals(dt);
    this.updateStats(dt);
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

document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  game = new Game();
  game.start();
});

document.getElementById('restart-btn').addEventListener('click', () => {
  document.getElementById('death-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  game = new Game();
  game.start();
});
