const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const ANIMALS = {
    rabbit: { sell: 8 },
    deer: { sell: 22 },
    fox: { sell: 15 },
    cooked_rabbit: { sell: 6 },
    cooked_deer: { sell: 18 },
    cooked_fox: { sell: 11 },
};

const SHOP_ITEMS = {
    food_ration: { price: 12 },
    warm_coat: { price: 35 },
    better_axe: { price: 40 },
    arrows: { price: 10 },
    hot_soup: { price: 8 },
    wood_bundle: { price: 6 },
};

exports.saveGame = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new HttpsError('unauthenticated', 'User must be logged in to save.');
    }

    const { slotId, saveData } = request.data;
    if (!slotId || !saveData) {
        throw new HttpsError('invalid-argument', 'Missing save data or slot ID.');
    }

    const docRef = db.collection('saves').doc(uid);
    const docSnap = await docRef.get();
    let saves = docSnap.exists ? docSnap.data() : { slot_1: null, slot_2: null, slot_3: null };

    // Basic Validation: Ensure health is capped at 100
    if (saveData.player.health > 100) saveData.player.health = 100;
    if (saveData.player.hunger > 100) saveData.player.hunger = 100;
    if (saveData.player.warmth > 100) saveData.player.warmth = 100;

    // Optional: We could do complex delta checking here against saves[slotId].
    // For now, we trust the client's non-economy state (like position, inventory), 
    // but the economy itself (money) will be handled server-side during transactions.

    // To prevent direct money manipulation, if a previous save exists, we FORCE the money 
    // to equal the last known money on the server, UNLESS this is a new game.
    if (saves[slotId] && saves[slotId].player) {
        // Enforce server-side money truth. The client cannot just declare it has more money.
        saveData.player.money = saves[slotId].player.money;
    }

    saveData.timestamp = Date.now();
    saves[slotId] = saveData;

    await docRef.set(saves);
    return { success: true, timestamp: saveData.timestamp, money: saveData.player.money };
});

exports.processTransaction = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new HttpsError('unauthenticated', 'User must be logged in to transact.');
    }

    const { slotId, action, itemKey, qty, currentClientState } = request.data;
    if (!slotId || !action || !itemKey) {
        throw new HttpsError('invalid-argument', 'Missing transaction details.');
    }

    const docRef = db.collection('saves').doc(uid);
    const docSnap = await docRef.get();
    if (!docSnap.exists || !docSnap.data()[slotId]) {
        throw new HttpsError('not-found', 'Save file not found.');
    }

    let saves = docSnap.data();
    let serverPlayer = saves[slotId].player;

    // Sync client's latest inventory (since they might have hunted without saving)
    // We only accept inventory increases, not money increases.
    if (currentClientState && currentClientState.inventory) {
        serverPlayer.inventory = currentClientState.inventory;
    }

    if (action === 'sell') {
        const animal = ANIMALS[itemKey];
        if (!animal) throw new HttpsError('invalid-argument', 'Invalid item to sell.');

        const amountToSell = qty || serverPlayer.inventory[itemKey] || 0;
        if (amountToSell <= 0) {
            throw new HttpsError('failed-precondition', 'Not enough items to sell.');
        }

        const earned = animal.sell * amountToSell;
        serverPlayer.money += earned;
        serverPlayer.inventory[itemKey] -= amountToSell;

    } else if (action === 'buy') {
        const shopItem = SHOP_ITEMS[itemKey];
        if (!shopItem) throw new HttpsError('invalid-argument', 'Invalid shop item.');

        if (serverPlayer.money < shopItem.price) {
            throw new HttpsError('failed-precondition', 'Not enough money.');
        }

        serverPlayer.money -= shopItem.price;

        // Apply item effects to server state
        if (itemKey === 'food_ration') serverPlayer.hunger = Math.min(100, serverPlayer.hunger + 40);
        if (itemKey === 'hot_soup') {
            serverPlayer.hunger = Math.min(100, serverPlayer.hunger + 30);
            serverPlayer.warmth = Math.min(100, serverPlayer.warmth + 20);
        }
        if (itemKey === 'wood_bundle') serverPlayer.wood += 5;
        if (itemKey === 'arrows') serverPlayer.arrows = Math.min(20, serverPlayer.arrows + 10);
        if (itemKey === 'warm_coat') {
            if (serverPlayer.hasCoat) throw new HttpsError('failed-precondition', 'Already have a coat.');
            serverPlayer.hasCoat = true;
        }
        if (itemKey === 'better_axe') {
            if (serverPlayer.steelAxe) throw new HttpsError('failed-precondition', 'Already have a steel axe.');
            serverPlayer.steelAxe = true;
        }
    } else {
        throw new HttpsError('invalid-argument', 'Invalid action type.');
    }

    // Save the updated state
    saves[slotId].player = serverPlayer;
    await docRef.set(saves);

    // Return the new trusted player state to the client
    return { success: true, player: serverPlayer };
});
