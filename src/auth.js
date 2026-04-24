import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCkJp3OBDhNAeFxReKBAf4rpz3p081aWA8",
    authDomain: "outdoor-sim.firebaseapp.com",
    projectId: "outdoor-sim",
    storageBucket: "outdoor-sim.firebasestorage.app",
    messagingSenderId: "848451898538",
    appId: "1:848451898538:web:d2495f155e4fafe63114d3"
};

let app, auth, provider;

export function initAuth(onUserChange) {
    try {
        app = initializeApp(firebaseConfig);
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
