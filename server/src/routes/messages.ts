import { Router, Response } from 'express';
import { db } from '../config/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit as firestoreLimit
} from 'firebase/firestore';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();

// Get messages for a room
router.get('/room/:roomName', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { roomName } = req.params;
        const { limit = 50 } = req.query;

        const q = query(
            collection(db, 'messages'),
            where('room', '==', roomName),
            orderBy('createdAt', 'desc'),
            firestoreLimit(parseInt(limit as string))
        );

        const querySnapshot = await getDocs(q);

        const messages = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                _id: doc.id,
                room: data.room,
                sender: data.senderId,
                senderUsername: data.senderUsername,
                content: data.content,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            };
        }).reverse();

        res.json({
            messages,
            hasMore: messages.length === parseInt(limit as string)
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Get private messages between two users
router.get('/dm/:recipientId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { recipientId } = req.params;
        const { limit = 50 } = req.query;

        // Create consistent DM room name
        const dmRoom = `dm_${[req.userId, recipientId].sort().join('_')}`;

        const q = query(
            collection(db, 'messages'),
            where('room', '==', dmRoom),
            orderBy('createdAt', 'desc'),
            firestoreLimit(parseInt(limit as string))
        );

        const querySnapshot = await getDocs(q);

        const messages = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                _id: doc.id,
                room: data.room,
                sender: data.senderId,
                senderUsername: data.senderUsername,
                content: data.content,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            };
        }).reverse();

        res.json({
            messages,
            hasMore: messages.length === parseInt(limit as string)
        });
    } catch (error) {
        console.error('Get DM error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

export default router;
