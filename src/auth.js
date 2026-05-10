import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDVI_t3DQY1tkO1w8MbJsAns26HEQC1YWM",
    authDomain: "outdoorsimulator-fe87b.firebaseapp.com",
    projectId: "outdoorsimulator-fe87b",
    storageBucket: "outdoorsimulator-fe87b.firebasestorage.app",
    messagingSenderId: "919848853920",
    appId: "1:919848853920:web:b540048e8f0b019eb4c4c5",
    measurementId: "G-H70DS903EF"
};

let app, auth, provider;

export function getApp() {
    return app;
}

export function getCurrentUser() {
    return auth ? auth.currentUser : null;
}

import { DEVELOPMENT_MODE } from './settings.js';

export async function initAuth(onUserChange) {
    try {
        app = initializeApp(firebaseConfig);
        
        if (DEVELOPMENT_MODE) {
            const { getFirestore, connectFirestoreEmulator } = await import("https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js");
            const { getFunctions, connectFunctionsEmulator } = await import("https://www.gstatic.com/firebasejs/10.10.0/firebase-functions.js");
            connectFirestoreEmulator(getFirestore(app), '127.0.0.1', 8080);
            connectFunctionsEmulator(getFunctions(app), '127.0.0.1', 5001);
            console.log("Connected to Firebase Local Emulators");
        }

        auth = getAuth(app);
        provider = new GoogleAuthProvider();

        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
            onUserChange(user);
        });
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
        // Call the callback with null (acting as guest if Firebase fails)
        onUserChange(null);
    }
}

export function loginWithGoogle() {
    if (!auth) {
        console.error("Firebase auth not initialized, please check configuration.");
        return Promise.reject(new Error("Auth not initialized"));
    }
    return signInWithPopup(auth, provider);
}

export function logout() {
    if (!auth) return Promise.resolve();
    return signOut(auth);
}
