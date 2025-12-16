import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth (for token verification if needed)
export const auth = getAuth(app);

console.log('✅ Firebase initialized for server');

export default app;
