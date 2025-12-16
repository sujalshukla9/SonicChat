import { Router, Request, Response } from 'express';
import { db } from '../config/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();

// Sync Firebase user with Firestore
router.post('/firebase-sync', async (req: Request, res: Response): Promise<void> => {
    try {
        const { firebaseUid, email, username, avatar, gender } = req.body;

        if (!firebaseUid || !email) {
            res.status(400).json({ error: 'Firebase UID and email are required' });
            return;
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('firebaseUid', '==', firebaseUid));
        const querySnapshot = await getDocs(q);

        let userId: string;
        let userData: any;

        if (!querySnapshot.empty) {
            // Update existing user - PRESERVE existing username and avatar
            const userDoc = querySnapshot.docs[0];
            userId = userDoc.id;
            const existingData = userDoc.data();

            userData = {
                ...existingData,
                email,
                // Keep existing username and avatar - don't overwrite!
                username: existingData.username || username || email.split('@')[0],
                avatar: existingData.avatar || avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUid}`,
                gender: existingData.gender || gender || 'male',
                status: 'online',
                lastSeen: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await updateDoc(doc(db, 'users', userId), {
                email: userData.email,
                status: 'online',
                lastSeen: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } else {
            // Create new user
            userData = {
                firebaseUid,
                email,
                username: username || email.split('@')[0],
                avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUid}`,
                gender: gender || 'male',
                status: 'online',
                friends: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastSeen: serverTimestamp()
            };

            const docRef = await addDoc(usersRef, userData);
            userId = docRef.id;
        }

        res.json({
            message: 'User synced successfully',
            user: {
                id: userId,
                firebaseUid,
                username: userData.username,
                email: userData.email,
                avatar: userData.avatar,
                gender: userData.gender
            }
        });
    } catch (error: any) {
        console.error('Firebase sync error:', error);
        res.status(500).json({ error: error.message || 'Failed to sync user' });
    }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('firebaseUid', '==', req.firebaseUid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const user = userDoc.data();

        res.json({
            user: {
                id: userDoc.id,
                firebaseUid: user.firebaseUid,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                gender: user.gender
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update username
router.put('/username', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { username } = req.body;

        if (!username || username.length < 3 || username.length > 20) {
            res.status(400).json({ error: 'Username must be 3-20 characters' });
            return;
        }

        // Check if username is taken
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        const existingUser = querySnapshot.docs.find(doc => doc.id !== req.userId);
        if (existingUser) {
            res.status(400).json({ error: 'Username already taken' });
            return;
        }

        // Update username
        await updateDoc(doc(db, 'users', req.userId!), {
            username,
            updatedAt: serverTimestamp()
        });

        res.json({
            message: 'Username updated successfully',
            username
        });
    } catch (error: any) {
        console.error('Update username error:', error);
        res.status(500).json({ error: 'Failed to update username' });
    }
});

// Logout - update user status
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await updateDoc(doc(db, 'users', req.userId!), {
            status: 'offline',
            lastSeen: serverTimestamp()
        });
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error during logout' });
    }
});

// Store public key for E2E encryption
router.post('/public-key', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { publicKey } = req.body;

        if (!publicKey) {
            res.status(400).json({ error: 'Public key is required' });
            return;
        }

        await updateDoc(doc(db, 'users', req.userId!), {
            publicKey,
            updatedAt: serverTimestamp()
        });

        console.log(`🔐 Public key stored for user ${req.userId?.substring(0, 8)}...`);
        res.json({ message: 'Public key stored successfully' });
    } catch (error: any) {
        console.error('Store public key error:', error);
        res.status(500).json({ error: 'Failed to store public key' });
    }
});

// Get public key for a user
router.get('/public-key/:userId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;

        const userDoc = await getDoc(doc(db, 'users', userId));

        if (!userDoc.exists()) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const userData = userDoc.data();
        const publicKey = userData.publicKey;

        if (!publicKey) {
            res.status(404).json({ error: 'User has no public key' });
            return;
        }

        res.json({ publicKey });
    } catch (error: any) {
        console.error('Get public key error:', error);
        res.status(500).json({ error: 'Failed to get public key' });
    }
});

export default router;

