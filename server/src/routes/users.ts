import { Router, Response } from 'express';
import { db } from '../config/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();

// Search users by username
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { q } = req.query;

        if (!q || (q as string).length < 2) {
            res.status(400).json({ error: 'Search query must be at least 2 characters' });
            return;
        }

        const searchQuery = (q as string).toLowerCase();
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);

        const users = querySnapshot.docs
            .filter(userDoc => {
                const userData = userDoc.data();
                return userDoc.id !== req.userId &&
                    userData.username?.toLowerCase().includes(searchQuery);
            })
            .slice(0, 20)
            .map(userDoc => {
                const userData = userDoc.data();
                return {
                    _id: userDoc.id,
                    username: userData.username,
                    avatar: userData.avatar,
                    status: userData.status || 'offline',
                    lastSeen: userData.lastSeen?.toDate?.()?.toISOString() || null
                };
            });

        res.json({ users });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// Get online users
router.get('/online', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const q = query(
            collection(db, 'users'),
            where('status', '==', 'online')
        );
        const querySnapshot = await getDocs(q);

        const users = querySnapshot.docs.map(userDoc => {
            const userData = userDoc.data();
            return {
                _id: userDoc.id,
                username: userData.username,
                avatar: userData.avatar,
                status: userData.status
            };
        });

        res.json({ users });
    } catch (error) {
        console.error('Get online users error:', error);
        res.status(500).json({ error: 'Failed to fetch online users' });
    }
});

// Get user profile
router.get('/:userId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', req.params.userId));

        if (!userDoc.exists()) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const userData = userDoc.data();
        res.json({
            user: {
                _id: userDoc.id,
                username: userData.username,
                avatar: userData.avatar,
                status: userData.status || 'offline',
                lastSeen: userData.lastSeen?.toDate?.()?.toISOString() || null,
                createdAt: userData.createdAt?.toDate?.()?.toISOString() || null
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Update profile
router.patch('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { username, avatar } = req.body;
        const updates: any = {
            updatedAt: serverTimestamp()
        };

        if (username) {
            // Check if username is taken
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);

            const existingUser = querySnapshot.docs.find(doc => doc.id !== req.userId);
            if (existingUser) {
                res.status(400).json({ error: 'Username already taken' });
                return;
            }
            updates.username = username;
        }

        if (avatar) {
            updates.avatar = avatar;
        }

        await updateDoc(doc(db, 'users', req.userId!), updates);

        // Get updated user
        const userDoc = await getDoc(doc(db, 'users', req.userId!));
        const userData = userDoc.data();

        res.json({
            user: {
                _id: userDoc.id,
                username: userData?.username,
                avatar: userData?.avatar,
                email: userData?.email,
                gender: userData?.gender
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
