import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyDuH1eLy_tYHJDRpjpFnBi_SwyUJ2iE6Xs",
    authDomain: "making-my-website.firebaseapp.com",
    projectId: "making-my-website",
    storageBucket: "making-my-website.firebasestorage.app",
    messagingSenderId: "282746500094",
    appId: "1:282746500094:web:721c87553c4d07dff686af",
    measurementId: "G-123PD5MLYB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Analytics (only in browser)
export const initAnalytics = async () => {
    if (await isSupported()) {
        return getAnalytics(app);
    }
    return null;
};

export default app;
