import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getApp } from './auth.js';

export async function loadUserSaves(user) {
    if (!user) {
        // Guest user
        const save = localStorage.getItem('outdoor_sim_guest_save');
        return {
            slot_1: save ? JSON.parse(save) : null
        };
    }

    // Authenticated user
    const db = getFirestore(getApp());
    const docRef = doc(db, "saves", user.uid);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return { slot_1: null, slot_2: null, slot_3: null };
        }
    } catch (e) {
        console.error("Error loading saves:", e);
        return { slot_1: null, slot_2: null, slot_3: null };
    }
}

export async function saveGameSlot(user, slotId, data) {
    // Add timestamp for display purposes
    data.timestamp = Date.now();

    if (!user) {
        // Guest user
        if (slotId !== 'slot_1') return; // Only slot 1 for guests
        localStorage.setItem('outdoor_sim_guest_save', JSON.stringify(data));
        return;
    }

    // Authenticated user
    const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.10.0/firebase-functions.js");
    const functions = getFunctions(getApp());
    const saveGame = httpsCallable(functions, 'saveGame');
    
    try {
        const result = await saveGame({ slotId, saveData: data });
        // The server might return the trusted money amount
        if (result.data && result.data.money !== undefined) {
            data.player.money = result.data.money;
        }
    } catch (e) {
        console.error("Error saving game securely:", e);
    }
}
