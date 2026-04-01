export const ANIMALS = {
    rabbit: {
        name: 'Rabbit', icon: '🐇', speed: 2.2, size: 18,
        sell: 8, food: 25, chance: 0.45,
        description: 'Small, fast. Worth 8 coins.'
    },
    deer: {
        name: 'Deer', icon: '🦌', speed: 1.6, size: 26,
        sell: 22, food: 60, chance: 0.33,
        description: 'Worth 22 coins. Bigger meal.'
    },
    fox: {
        name: 'Fox', icon: '🦊', speed: 2.8, size: 20,
        sell: 15, food: 35, chance: 0.22,
        description: 'Tricky. Worth 15 coins.'
    },
};

export const SHOP_ITEMS = {
    food_ration: {
        name: 'Food Ration', icon: '🥫', price: 12,
        description: 'Restores 40 hunger.',
        action: (G) => { G.player.hunger = Math.min(100, G.player.hunger + 40); G.log('Ate a food ration. +40 hunger.', 'success'); }
    },
    warm_coat: {
        name: 'Warm Coat', icon: '🧥', price: 35,
        description: 'Reduces cold loss 30%.',
        action: (G) => {
            if (G.player.hasCoat) { G.log('You already have a warm coat!', 'danger'); return false; }
            G.player.hasCoat = true;
            G.log('You put on the warm coat. Cold resistance +30%.', 'success');
        }
    },
    better_axe: {
        name: 'Steel Axe', icon: '🪓', price: 40,
        description: 'Chop 2x more wood.',
        action: (G) => {
            if (G.player.steelAxe) { G.log('You already have a steel axe!', 'danger'); return false; }
            G.player.steelAxe = true;
            G.log('Upgraded to steel axe! Chop 2x wood.', 'success');
        }
    },
    arrows: {
        name: 'Arrows (10)', icon: '🏹', price: 10,
        description: 'Refills your arrows.',
        action: (G) => { G.player.arrows = Math.min(20, G.player.arrows + 10); G.log('+10 arrows.', 'success'); }
    },
    hot_soup: {
        name: 'Hot Soup', icon: '🍲', price: 8,
        description: '+30 hunger, +20 warmth.',
        action: (G) => {
            G.player.hunger = Math.min(100, G.player.hunger + 30);
            G.player.warmth = Math.min(100, G.player.warmth + 20);
            G.log('Hot soup warmed you up! +30 hunger, +20 warmth.', 'success');
        }
    },
    wood_bundle: {
        name: 'Wood Bundle', icon: '🪵', price: 6,
        description: '+5 firewood logs.',
        action: (G) => { G.player.wood += 5; G.log('+5 firewood logs.', 'success'); }
    },
};
