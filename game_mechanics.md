# Outdoor Sim - Game Mechanics & Guide

## 1. Overview
**Outdoor Sim** is a pixel-art survival game where players must endure harsh winter conditions. Your goal is to survive as many days as possible by balancing your basic needs: Health, Hunger, and Warmth. You venture into the dangerous wilderness to hunt animals and chop wood, then travel to the safety of the city to trade and rest.

## 2. The Two Realms

### The Wilderness
The entire game map is your snowy wilderness. Here you will find animals, trees to chop, and your base camp (marked by a tent and bonfire). **Stats drain constantly in the wilderness** — the cold and hunger are persistent threats.

### Frostholm (The City)
The city is a **menu-based destination**, not a physical location. While in Frostholm, **all survival stats are completely frozen** — you won't lose Hunger or Warmth here. Access it by pressing the "GO TO CITY" button on the action panel.

## 3. Travelling

### Going to the City
- **Cost:** 20 Hunger (needs at least 20 to depart)
- **Duration:** 1 real-life minute (progress bar shown)
- **Note:** You can cancel mid-trip, but only get 10 hunger back
- Stats still drain during travel

### Returning to the Wild
- **Instant.** No cost, no delay.
- Click "HEAD BACK INTO THE WILD" from the city menu.

## 4. Core Stats
- **Warmth (🔥):** Drops rapidly in the wilderness. Falls to zero → you freeze → Health drops.
- **Hunger (🍖):** Drops steadily in the wilderness. Falls to zero → you starve → Health drops.
- **Health (❤):** Loses when you're freezing (below 15 warmth) or starving (below 15 hunger). Slowly regenerates if both Hunger and Warmth are above 50. Reaches 0 → you die.

## 5. Wilderness Actions

### Hunting (🏹) — key `H`
- **Requires:** Arrows in inventory
- **How it works:** A mini-game track appears. An animal moves back and forth. Click SHOOT when it enters the green zone.
- **Animals:**
  - 🐇 **Rabbit** — easiest to hit, sells for 8 coins
  - 🦌 **Deer** — moderate, sells for 22 coins, most food
  - 🦊 **Fox** — fastest, sells for 15 coins
- Missing or waiting 12 seconds wastes one arrow.

### Chopping Wood (🪵) — key `X`
- Stand near a choppable tree (🪵 tile) and press `X`.
- Yield: **2 logs** (4 with steel axe)
- Trees respawn gradually over time.

### Bonfire (🔥) — key `F`
- Add wood logs to light or extend the fire (~45s per log).
- Standing near the lit bonfire near camp **restores warmth rapidly**.
- When the fire goes out, cold takes over again.

### Cooking (🍳) — key `C`
- **Requires a lit bonfire.**
- Convert raw animals → cooked meat.
- Eat cooked meat to restore Hunger:
  - Cooked Rabbit: +25 hunger
  - Cooked Fox: +35 hunger
  - Cooked Deer: +60 hunger

## 6. City — Frostholm

### Trading Post (Buy & Sell)
**Sell:** Raw animals and cooked meat for coins.
| Item | Sell Price |
|------|-----------|
| Rabbit | 8 coins |
| Deer | 22 coins |
| Fox | 15 coins |
| Cooked Rabbit | 6 coins |
| Cooked Deer | 18 coins |
| Cooked Fox | 11 coins |

**Buy:** Spend coins on supplies and permanent upgrades.
| Item | Price | Effect |
|------|-------|--------|
| 🏹 Arrows (10) | 10 | Restock arrows |
| 🥫 Food Ration | 12 | +40 hunger |
| 🍲 Hot Soup | 8 | +30 hunger, +20 warmth |
| 🪵 Wood Bundle | 6 | +5 logs |
| 🧥 Warm Coat | 35 | Permanent: cold loss -30% |
| 🪓 Steel Axe | 40 | Permanent: chop 2× wood |

### The Frozen Inn (Hotel)
- **Cost:** 2 coins
- **Duration:** 5 real-life minutes (shown as a progress bar)
- **Effect:** Fully restores Health, Hunger, and Warmth to 100 when complete
- No stats drain while sleeping

## 7. Day Cycle & Progression
- Each day lasts **2 real-world minutes**.
- Animals respawn each new day.
- **Priority tip:** Buy the Warm Coat first (35 coins) — cold is the fastest killer. Then save for the Steel Axe to double your wood output.

## 8. Starting Equipment
The player always begins with:
- 🪓 Axe (base), ⛺ Tent, 🍳 Pan
- 🏹 10 Arrows, 🪵 5 Wood logs, 💰 20 coins
