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
    const db = getFirestore(getApp());
    const docRef = doc(db, "saves", user.uid);
    try {
        const docSnap = await getDoc(docRef);
        let saves = docSnap.exists() ? docSnap.data() : { slot_1: null, slot_2: null, slot_3: null };
        saves[slotId] = data;
        await setDoc(docRef, saves);
    } catch (e) {
        console.error("Error saving game:", e);
    }
}
