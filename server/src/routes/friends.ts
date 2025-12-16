import { Router, Response } from 'express';
import { db } from '../config/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import { getMessagesFromStore } from '../socket/handlers';

const router = Router();

// Search users by username
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { q } = req.query;
        console.log('🔍 Search request:', { query: q, userId: req.userId, firebaseUid: req.firebaseUid });

        if (!q || (q as string).length < 2) {
            res.status(400).json({ error: 'Search query must be at least 2 characters' });
            return;
        }

        const searchQuery = (q as string).toLowerCase();
        console.log('🔍 Searching for:', searchQuery);

        // Get all users (in production, you'd want to use a proper search solution)
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        console.log(`📊 Total users in database: ${querySnapshot.docs.length}`);
        querySnapshot.docs.forEach(doc => {
            console.log(`  - ${doc.data().username} (${doc.id})`);
        });

        // Get current user's data
        const currentUserDoc = await getDoc(doc(db, 'users', req.userId!));
        const currentUser = currentUserDoc.data();
        const friendIds = currentUser?.friends || [];

        // Get pending friend requests sent by current user
        const sentRequestsQuery = query(
            collection(db, 'friendRequests'),
            where('senderId', '==', req.userId),
            where('status', '==', 'pending')
        );
        const sentRequestsSnapshot = await getDocs(sentRequestsQuery);
        const sentRequestIds = sentRequestsSnapshot.docs.map(doc => doc.data().recipientId);

        // Get pending friend requests received by current user
        const receivedRequestsQuery = query(
            collection(db, 'friendRequests'),
            where('recipientId', '==', req.userId),
            where('status', '==', 'pending')
        );
        const receivedRequestsSnapshot = await getDocs(receivedRequestsQuery);
        const receivedRequestIds = receivedRequestsSnapshot.docs.map(doc => doc.data().senderId);

        // Filter and format users
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
                    lastSeen: userData.lastSeen?.toDate?.()?.toISOString() || null,
                    isFriend: friendIds.includes(userDoc.id),
                    requestSent: sentRequestIds.includes(userDoc.id),
                    requestReceived: receivedRequestIds.includes(userDoc.id)
                };
            });

        console.log(`🔍 Found ${users.length} users matching "${searchQuery}"`);
        res.json({ users });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// Send friend request
router.post('/request/:userId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const recipientId = req.params.userId;
        console.log('📨 Friend request:', { from: req.userId, to: recipientId });

        if (recipientId === req.userId) {
            res.status(400).json({ error: 'Cannot send friend request to yourself' });
            return;
        }

        // Check if recipient exists
        const recipientDoc = await getDoc(doc(db, 'users', recipientId));
        if (!recipientDoc.exists()) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Check if already friends
        const currentUserDoc = await getDoc(doc(db, 'users', req.userId!));
        const currentUser = currentUserDoc.data();
        if (currentUser?.friends?.includes(recipientId)) {
            res.status(400).json({ error: 'Already friends with this user' });
            return;
        }

        // Check for existing request
        const existingQuery = query(
            collection(db, 'friendRequests'),
            where('senderId', '==', req.userId),
            where('recipientId', '==', recipientId),
            where('status', '==', 'pending')
        );
        const existingSnapshot = await getDocs(existingQuery);

        if (!existingSnapshot.empty) {
            res.status(400).json({ error: 'Friend request already sent' });
            return;
        }

        // Check for reverse request (they sent us one)
        const reverseQuery = query(
            collection(db, 'friendRequests'),
            where('senderId', '==', recipientId),
            where('recipientId', '==', req.userId),
            where('status', '==', 'pending')
        );
        const reverseSnapshot = await getDocs(reverseQuery);

        if (!reverseSnapshot.empty) {
            res.status(400).json({ error: 'This user already sent you a friend request' });
            return;
        }

        // Create friend request
        const docRef = await addDoc(collection(db, 'friendRequests'), {
            senderId: req.userId,
            senderUsername: req.username,
            recipientId,
            recipientUsername: recipientDoc.data().username,
            status: 'pending',
            createdAt: serverTimestamp()
        });

        console.log('✅ Friend request created:', docRef.id);

        res.status(201).json({
            message: 'Friend request sent',
            request: {
                _id: docRef.id,
                recipient: {
                    _id: recipientId,
                    username: recipientDoc.data().username,
                    avatar: recipientDoc.data().avatar
                }
            }
        });
    } catch (error) {
        console.error('Send friend request error:', error);
        res.status(500).json({ error: 'Failed to send friend request' });
    }
});

// Accept friend request
router.post('/accept/:requestId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const requestDoc = await getDoc(doc(db, 'friendRequests', req.params.requestId));

        if (!requestDoc.exists() || requestDoc.data().recipientId !== req.userId || requestDoc.data().status !== 'pending') {
            res.status(404).json({ error: 'Friend request not found' });
            return;
        }

        const requestData = requestDoc.data();

        // Update request status
        await updateDoc(doc(db, 'friendRequests', req.params.requestId), {
            status: 'accepted',
            acceptedAt: serverTimestamp()
        });

        // Add each user to the other's friends list
        await updateDoc(doc(db, 'users', req.userId!), {
            friends: arrayUnion(requestData.senderId)
        });

        await updateDoc(doc(db, 'users', requestData.senderId), {
            friends: arrayUnion(req.userId)
        });

        // Get sender info for response
        const senderDoc = await getDoc(doc(db, 'users', requestData.senderId));
        const senderData = senderDoc.data();

        res.json({
            message: 'Friend request accepted',
            friend: {
                _id: requestData.senderId,
                username: senderData?.username,
                avatar: senderData?.avatar,
                status: senderData?.status || 'offline'
            }
        });
    } catch (error) {
        console.error('Accept friend request error:', error);
        res.status(500).json({ error: 'Failed to accept friend request' });
    }
});

// Reject friend request
router.post('/reject/:requestId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const requestDoc = await getDoc(doc(db, 'friendRequests', req.params.requestId));

        if (!requestDoc.exists() || requestDoc.data().recipientId !== req.userId || requestDoc.data().status !== 'pending') {
            res.status(404).json({ error: 'Friend request not found' });
            return;
        }

        await updateDoc(doc(db, 'friendRequests', req.params.requestId), {
            status: 'rejected',
            rejectedAt: serverTimestamp()
        });

        res.json({ message: 'Friend request rejected' });
    } catch (error) {
        console.error('Reject friend request error:', error);
        res.status(500).json({ error: 'Failed to reject friend request' });
    }
});

// Cancel sent friend request
router.delete('/request/:userId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const q = query(
            collection(db, 'friendRequests'),
            where('senderId', '==', req.userId),
            where('recipientId', '==', req.params.userId),
            where('status', '==', 'pending')
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            res.status(404).json({ error: 'Friend request not found' });
            return;
        }

        await deleteDoc(doc(db, 'friendRequests', querySnapshot.docs[0].id));

        res.json({ message: 'Friend request cancelled' });
    } catch (error) {
        console.error('Cancel friend request error:', error);
        res.status(500).json({ error: 'Failed to cancel friend request' });
    }
});

// Get pending friend requests (received)
router.get('/requests/pending', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        console.log('📬 Fetching pending requests for user:', req.userId);

        const q = query(
            collection(db, 'friendRequests'),
            where('recipientId', '==', req.userId),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        console.log(`📬 Found ${querySnapshot.docs.length} pending requests`);

        const requests = await Promise.all(
            querySnapshot.docs.map(async (requestDoc) => {
                const data = requestDoc.data();
                const senderDoc = await getDoc(doc(db, 'users', data.senderId));
                const senderData = senderDoc.data();

                return {
                    _id: requestDoc.id,
                    sender: {
                        _id: data.senderId,
                        username: senderData?.username || data.senderUsername,
                        avatar: senderData?.avatar,
                        status: senderData?.status
                    },
                    status: data.status,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                };
            })
        );

        res.json({ requests });
    } catch (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({ error: 'Failed to fetch pending requests' });
    }
});

// Get friends list
router.get('/list', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', req.userId!));
        const userData = userDoc.data();
        const friendIds = userData?.friends || [];

        if (friendIds.length === 0) {
            res.json({ friends: [] });
            return;
        }

        const friends = await Promise.all(
            friendIds.map(async (friendId: string) => {
                const friendDoc = await getDoc(doc(db, 'users', friendId));
                const friendData = friendDoc.data();

                return {
                    _id: friendId,
                    username: friendData?.username,
                    avatar: friendData?.avatar,
                    status: friendData?.status || 'offline',
                    lastSeen: friendData?.lastSeen?.toDate?.()?.toISOString() || null
                };
            })
        );

        res.json({ friends: friends.filter(f => f.username) });
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
});

// Remove friend
router.delete('/:friendId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const friendId = req.params.friendId;

        // Remove from both users' friends lists
        await updateDoc(doc(db, 'users', req.userId!), {
            friends: arrayRemove(friendId)
        });

        await updateDoc(doc(db, 'users', friendId), {
            friends: arrayRemove(req.userId)
        });

        res.json({ message: 'Friend removed' });
    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ error: 'Failed to remove friend' });
    }
});

// Get DM history with a friend
router.get('/dm/:friendId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const friendId = req.params.friendId;

        // Verify they are friends
        const userDoc = await getDoc(doc(db, 'users', req.userId!));
        const userData = userDoc.data();
        if (!userData?.friends?.includes(friendId)) {
            res.status(403).json({ error: 'You can only chat with friends' });
            return;
        }

        // Create consistent DM room name
        const dmRoom = `dm_${[req.userId, friendId].sort().join('_')}`;

        // Try to get messages from Firestore first (persistent storage)
        try {
            // Query by room only (no composite index needed)
            const q = query(
                collection(db, 'messages'),
                where('room', '==', dmRoom)
            );
            const querySnapshot = await getDocs(q);

            let messages = querySnapshot.docs.map(msgDoc => {
                const data = msgDoc.data();
                return {
                    _id: data._id || msgDoc.id,
                    room: data.room,
                    sender: data.sender,
                    senderUsername: data.senderUsername,
                    content: data.content,
                    type: data.type || 'text',
                    time: data.time || data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                    createdAt: data.createdAt?.toDate?.()?.getTime() || new Date(data.time || Date.now()).getTime()
                };
            });

            // Sort by time in memory (ascending - oldest first)
            messages.sort((a, b) => a.createdAt - b.createdAt);

            // Limit to last 100 messages
            if (messages.length > 100) {
                messages = messages.slice(-100);
            }

            // Remove the createdAt timestamp used for sorting
            const cleanMessages = messages.map(({ createdAt, ...msg }) => msg);

            console.log(`💬 DM history: ${cleanMessages.length} messages from Firestore for room ${dmRoom}`);
            res.json({ messages: cleanMessages });
        } catch (firestoreError: any) {
            // Firestore error - fall back to in-memory
            console.log('⚠️ Firestore query failed, using in-memory store:', firestoreError.message);
            const messages = getMessagesFromStore(dmRoom);
            res.json({ messages });
        }
    } catch (error: any) {
        console.error('Get DM history error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Remove friend (unfriend)
router.delete('/:friendId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const friendId = req.params.friendId;
        console.log(`❌ Unfriending: ${req.userId} removing ${friendId}`);

        // Verify the friend exists
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (!friendDoc.exists()) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Remove friend from current user's list
        await updateDoc(doc(db, 'users', req.userId!), {
            friends: arrayRemove(friendId)
        });

        // Remove current user from friend's list
        await updateDoc(doc(db, 'users', friendId), {
            friends: arrayRemove(req.userId)
        });

        console.log(`✅ Successfully unfriended: ${req.userId} <-> ${friendId}`);
        res.json({ message: 'Friend removed successfully' });
    } catch (error: any) {
        console.error('Remove friend error:', error);
        res.status(500).json({ error: 'Failed to remove friend' });
    }
});

export default router;
