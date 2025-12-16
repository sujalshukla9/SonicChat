import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    type User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';
import { API_URL } from '../config/api';

interface User {
    id: string;  // Firestore document ID
    firebaseUid: string;  // Firebase Auth UID
    username: string;
    email: string;
    avatar: string;
    gender?: 'male' | 'female';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    login: (email: string, password: string) => Promise<boolean>;
    register: (username: string, email: string, password: string, gender: 'male' | 'female') => Promise<boolean>;
    loginWithGoogle: () => Promise<boolean>;
    logout: () => Promise<void>;
    setUser: (user: User) => void;
    clearError: () => void;
    checkAuth: () => Promise<boolean>;
    initAuthListener: () => () => void;
    updateUsername: (newUsername: string) => Promise<boolean>;
    syncUserWithBackend: () => Promise<void>;
}

// Helper to generate gender-specific avatar
const getGenderAvatar = (seed: string, gender?: 'male' | 'female'): string => {
    if (gender === 'female') {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&top=longHair&accessories=prescription02&facialHair=blank`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&top=shortFlat&facialHair=beardLight`;
};

// Helper to convert Firebase user to our User type
const firebaseUserToUser = (firebaseUser: FirebaseUser): User => ({
    id: firebaseUser.uid,  // Initially use UID, will be replaced with Firestore doc ID after sync
    firebaseUid: firebaseUser.uid,
    username: firebaseUser.displayName || 'User',
    email: firebaseUser.email || '',
    avatar: firebaseUser.photoURL || getGenderAvatar(firebaseUser.uid)
});

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null });
                try {
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    const firebaseUser = userCredential.user;
                    const token = await firebaseUser.getIdToken();

                    const user = firebaseUserToUser(firebaseUser);

                    // Sync with backend (required for friends feature to work)
                    try {
                        const syncResponse = await axios.post(`${API_URL}/api/auth/firebase-sync`, {
                            firebaseUid: firebaseUser.uid,
                            email: firebaseUser.email,
                            username: firebaseUser.displayName || email.split('@')[0],
                            avatar: user.avatar
                        });
                        // Update user with Firestore document ID from backend
                        user.id = syncResponse.data.user.id;
                    } catch (syncError) {
                        console.error('Backend sync failed:', syncError);
                    }

                    set({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false
                    });
                    return true;
                } catch (error: any) {
                    set({
                        error: error.message || 'Login failed',
                        isLoading: false
                    });
                    return false;
                }
            },

            register: async (username: string, email: string, password: string, gender: 'male' | 'female') => {
                set({ isLoading: true, error: null });
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const firebaseUser = userCredential.user;

                    // Update Firebase profile
                    await updateProfile(firebaseUser, {
                        displayName: username,
                        photoURL: getGenderAvatar(firebaseUser.uid, gender)
                    });

                    const token = await firebaseUser.getIdToken();

                    const user: User = {
                        id: firebaseUser.uid,
                        firebaseUid: firebaseUser.uid,
                        username,
                        email,
                        avatar: getGenderAvatar(firebaseUser.uid, gender),
                        gender
                    };

                    // Sync with backend
                    try {
                        const syncResponse = await axios.post(`${API_URL}/api/auth/firebase-sync`, {
                            firebaseUid: firebaseUser.uid,
                            email,
                            username,
                            avatar: user.avatar,
                            gender
                        });
                        user.id = syncResponse.data.user.id;
                    } catch (syncError) {
                        console.error('Backend sync failed:', syncError);
                    }

                    set({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false
                    });
                    return true;
                } catch (error: any) {
                    set({
                        error: error.message || 'Registration failed',
                        isLoading: false
                    });
                    return false;
                }
            },

            loginWithGoogle: async () => {
                set({ isLoading: true, error: null });
                try {
                    const result = await signInWithPopup(auth, googleProvider);
                    const firebaseUser = result.user;
                    const token = await firebaseUser.getIdToken();

                    const user = firebaseUserToUser(firebaseUser);

                    // Sync with backend
                    try {
                        const syncResponse = await axios.post(`${API_URL}/api/auth/firebase-sync`, {
                            firebaseUid: firebaseUser.uid,
                            email: firebaseUser.email,
                            username: firebaseUser.displayName,
                            avatar: firebaseUser.photoURL
                        });
                        user.id = syncResponse.data.user.id;
                    } catch (syncError) {
                        console.error('Backend sync failed:', syncError);
                    }

                    set({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false
                    });
                    return true;
                } catch (error: any) {
                    set({
                        error: error.message || 'Google login failed',
                        isLoading: false
                    });
                    return false;
                }
            },

            logout: async () => {
                try {
                    await signOut(auth);
                } catch (error) {
                    console.error('Logout error:', error);
                }
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false
                });
            },

            setUser: (user) => set({ user }),

            clearError: () => set({ error: null }),

            checkAuth: async () => {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    set({ isAuthenticated: false, user: null, token: null });
                    return false;
                }

                try {
                    const token = await currentUser.getIdToken();
                    const user = firebaseUserToUser(currentUser);

                    // Sync with backend
                    try {
                        const syncResponse = await axios.post(`${API_URL}/api/auth/firebase-sync`, {
                            firebaseUid: currentUser.uid,
                            email: currentUser.email,
                            username: currentUser.displayName,
                            avatar: user.avatar
                        });
                        user.id = syncResponse.data.user.id;
                    } catch (syncError) {
                        console.error('Backend sync failed:', syncError);
                    }

                    set({
                        user,
                        token,
                        isAuthenticated: true
                    });
                    return true;
                } catch (error) {
                    set({ isAuthenticated: false, user: null, token: null });
                    return false;
                }
            },

            initAuthListener: () => {
                const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                    if (firebaseUser) {
                        try {
                            const token = await firebaseUser.getIdToken();
                            const user = firebaseUserToUser(firebaseUser);

                            // Sync with backend
                            try {
                                const syncResponse = await axios.post(`${API_URL}/api/auth/firebase-sync`, {
                                    firebaseUid: firebaseUser.uid,
                                    email: firebaseUser.email,
                                    username: firebaseUser.displayName,
                                    avatar: user.avatar
                                });
                                user.id = syncResponse.data.user.id;
                            } catch (syncError) {
                                console.error('Backend sync failed:', syncError);
                            }

                            set({
                                user,
                                token,
                                isAuthenticated: true,
                                isLoading: false
                            });
                        } catch (error) {
                            console.error('Auth listener error:', error);
                            set({ isLoading: false });
                        }
                    } else {
                        set({
                            user: null,
                            token: null,
                            isAuthenticated: false,
                            isLoading: false
                        });
                    }
                });
                return unsubscribe;
            },

            updateUsername: async (newUsername: string) => {
                const state = get();
                if (!state.user || !state.token) return false;

                set({ isLoading: true, error: null });

                try {
                    // Update in Firebase Auth
                    if (auth.currentUser) {
                        await updateProfile(auth.currentUser, {
                            displayName: newUsername
                        });
                    }

                    // Update in backend
                    await axios.put(
                        `${API_URL}/api/auth/update-profile`,
                        { username: newUsername },
                        { headers: { Authorization: `Bearer ${state.token}` } }
                    );

                    // Update local state
                    set({
                        user: { ...state.user, username: newUsername },
                        isLoading: false
                    });

                    return true;
                } catch (error: any) {
                    set({
                        error: error.response?.data?.error || 'Failed to update username',
                        isLoading: false
                    });
                    return false;
                }
            },

            syncUserWithBackend: async () => {
                const state = get();
                if (!state.user || !state.token) return;

                try {
                    const syncResponse = await axios.post(`${API_URL}/api/auth/firebase-sync`, {
                        firebaseUid: state.user.firebaseUid,
                        email: state.user.email,
                        username: state.user.username,
                        avatar: state.user.avatar
                    }, {
                        headers: { Authorization: `Bearer ${state.token}` }
                    });

                    const updatedUser = {
                        ...state.user,
                        id: syncResponse.data.user.id
                    };
                    console.log('🔄 User synced, ID updated to', syncResponse.data.user.id);
                    set({ user: updatedUser });
                } catch (error) {
                    console.error('Sync with backend failed:', error);
                }
            }
        }),
        {
            name: 'sschats-auth',
            partialize: (state) => ({ token: state.token, user: state.user })
        }
    )
);
