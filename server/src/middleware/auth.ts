import { Request, Response, NextFunction } from 'express';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface AuthRequest extends Request {
    userId?: string;
    username?: string;
    firebaseUid?: string;
}

// Auth middleware that validates Firebase UID and finds user in Firestore
const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const firebaseUid = req.headers['x-firebase-uid'] as string;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!firebaseUid) {
            res.status(401).json({ error: 'Firebase UID required' });
            return;
        }

        // Find user by Firebase UID in Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('firebaseUid', '==', firebaseUid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            res.status(401).json({ error: 'User not found. Please log in again.' });
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        req.userId = userDoc.id;
        req.username = userData.username;
        req.firebaseUid = firebaseUid;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

export default authMiddleware;
