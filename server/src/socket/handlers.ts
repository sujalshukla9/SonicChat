import { Server, Socket } from 'socket.io';
import { db } from '../config/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';

interface AuthenticatedSocket extends Socket {
    odlserId?: string;
    username?: string;
    firebaseUid?: string;
}

interface MessageData {
    room: string;
    content: string;
    type?: 'text' | 'image' | 'file';
}

interface PrivateMessageData {
    recipientId: string;
    content: string;
    type?: 'text' | 'image' | 'file';
}

// Track online users: { socketId: { userId, username, rooms } }
const onlineUsers = new Map<string, { odlserId: string; username: string; rooms: Set<string>; firebaseUid?: string }>();
// Track user sockets: { odlserId: socketId }
const userSockets = new Map<string, string>();

// In-memory message storage: { roomId: Message[] }
interface StoredMessage {
    _id: string;
    content: string;
    sender: string;
    senderUsername: string;
    room: string;
    type: string;
    time: string;
}
const messageStore = new Map<string, StoredMessage[]>();

// Helper to generate message ID
const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to add message to store
const addMessageToStore = (room: string, message: StoredMessage) => {
    if (!messageStore.has(room)) {
        messageStore.set(room, []);
    }
    const messages = messageStore.get(room)!;
    messages.push(message);
    // Keep only last 100 messages per room
    if (messages.length > 100) {
        messages.shift();
    }
};

// Helper to get messages from store
export const getMessagesFromStore = (room: string): StoredMessage[] => {
    return messageStore.get(room) || [];
};

export const setupSocketHandlers = (io: Server): void => {
    // Authentication middleware for Socket.io
    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const token = socket.handshake.auth.token;
            const firebaseUid = socket.handshake.auth.firebaseUid;
            const username = socket.handshake.auth.username;

            if (!token || !firebaseUid) {
                return next(new Error('Authentication required'));
            }

            // Find user in Firestore by firebaseUid
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('firebaseUid', '==', firebaseUid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return next(new Error('User not found'));
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            socket.odlserId = userDoc.id;
            socket.username = userData.username || username;
            socket.firebaseUid = firebaseUid;

            // Update user status to online
            await updateDoc(doc(db, 'users', userDoc.id), {
                status: 'online',
                lastSeen: serverTimestamp()
            });

            next();
        } catch (error) {
            console.error('Socket auth error:', error);
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
        console.log(`✅ User connected: ${socket.username} (${socket.id})`);

        // Store user in online users map
        if (socket.odlserId && socket.username) {
            onlineUsers.set(socket.id, {
                odlserId: socket.odlserId,
                username: socket.username,
                rooms: new Set(),
                firebaseUid: socket.firebaseUid
            });

            userSockets.set(socket.odlserId, socket.id);
        }

        // Broadcast user online status
        io.emit('user_status_change', {
            odlserId: socket.odlserId,
            username: socket.username,
            status: 'online'
        });

        // Join room
        socket.on('join_room', async (room: string) => {
            socket.join(room);

            const userData = onlineUsers.get(socket.id);
            if (userData) {
                userData.rooms.add(room);
            }

            console.log(`👤 ${socket.username} joined room: ${room}`);

            // Notify room members
            socket.to(room).emit('user_joined', {
                odlserId: socket.odlserId,
                username: socket.username,
                room
            });

            // Send list of users in room
            const roomUsers = Array.from(onlineUsers.values())
                .filter(u => u.rooms.has(room))
                .map(u => ({ odlserId: u.odlserId, username: u.username }));

            socket.emit('room_users', { room, users: roomUsers });
        });

        // Leave room
        socket.on('leave_room', (room: string) => {
            socket.leave(room);

            const userData = onlineUsers.get(socket.id);
            if (userData) {
                userData.rooms.delete(room);
            }

            console.log(`👋 ${socket.username} left room: ${room}`);

            socket.to(room).emit('user_left', {
                odlserId: socket.odlserId,
                username: socket.username,
                room
            });
        });

        // Send message to room
        socket.on('send_message', async (data: MessageData) => {
            try {
                const messageData = {
                    content: data.content,
                    senderId: socket.odlserId!,
                    senderUsername: socket.username!,
                    room: data.room,
                    type: data.type || 'text',
                    createdAt: serverTimestamp()
                };

                // Save to Firestore
                const docRef = await addDoc(collection(db, 'messages'), messageData);

                // Broadcast to room
                io.to(data.room).emit('receive_message', {
                    _id: docRef.id,
                    ...messageData,
                    sender: socket.odlserId,
                    time: new Date().toISOString()
                });

                console.log(`💬 [${data.room}] ${socket.username}: ${data.content}`);
            } catch (error) {
                console.error('Send message error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Private message
        socket.on('send_private_message', async (data: PrivateMessageData) => {
            try {
                if (!socket.odlserId) {
                    socket.emit('error', { message: 'Authentication required' });
                    return;
                }

                const dmRoom = `dm_${[socket.odlserId, data.recipientId].sort().join('_')}`;

                const message: StoredMessage = {
                    _id: generateMessageId(),
                    content: data.content,
                    sender: socket.odlserId,
                    senderUsername: socket.username || 'Unknown',
                    room: dmRoom,
                    type: data.type || 'text',
                    time: new Date().toISOString()
                };

                // Save to in-memory store for quick access
                addMessageToStore(dmRoom, message);

                // Also save to Firestore for persistence
                try {
                    await addDoc(collection(db, 'messages'), {
                        ...message,
                        createdAt: serverTimestamp()
                    });
                } catch (firestoreError) {
                    console.error('Failed to persist message to Firestore:', firestoreError);
                }

                // Send to sender
                socket.emit('receive_private_message', message);

                // Send to recipient if online
                const recipientSocketId = userSockets.get(data.recipientId);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('receive_private_message', message);
                }

                console.log(`📨 DM ${socket.username} -> ${data.recipientId.substring(0, 8)}`);
            } catch (error) {
                console.error('Private message error:', error);
                socket.emit('error', { message: 'Failed to send private message' });
            }
        });

        // Typing indicator
        socket.on('typing_start', (data: { room: string }) => {
            socket.to(data.room).emit('user_typing', {
                odlserId: socket.odlserId,
                username: socket.username,
                room: data.room
            });
        });

        socket.on('typing_stop', (data: { room: string }) => {
            socket.to(data.room).emit('user_stopped_typing', {
                odlserId: socket.odlserId,
                username: socket.username,
                room: data.room
            });
        });

        // Friend request notifications
        socket.on('send_friend_request', (data: { recipientId: string }) => {
            const recipientSocketId = userSockets.get(data.recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('friend_request_received', {
                    senderId: socket.odlserId,
                    senderUsername: socket.username
                });
            }
        });

        socket.on('accept_friend_request', (data: { senderId: string }) => {
            const senderSocketId = userSockets.get(data.senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit('friend_request_accepted', {
                    accepterId: socket.odlserId,
                    accepterUsername: socket.username
                });
            }
        });

        socket.on('reject_friend_request', (data: { senderId: string }) => {
            const senderSocketId = userSockets.get(data.senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit('friend_request_rejected', {
                    rejecterId: socket.odlserId
                });
            }
        });

        // Get online users
        socket.on('get_online_users', () => {
            const users = Array.from(onlineUsers.values()).map(u => ({
                odlserId: u.odlserId,
                username: u.username
            }));
            socket.emit('online_users', users);
        });

        // Disconnect
        socket.on('disconnect', async () => {
            console.log(`❌ User disconnected: ${socket.username} (${socket.id})`);

            const userData = onlineUsers.get(socket.id);

            // Notify rooms user was in
            if (userData) {
                userData.rooms.forEach(room => {
                    socket.to(room).emit('user_left', {
                        odlserId: socket.odlserId,
                        username: socket.username,
                        room
                    });
                });
            }

            // Update user status in Firestore
            if (socket.odlserId) {
                try {
                    await updateDoc(doc(db, 'users', socket.odlserId), {
                        status: 'offline',
                        lastSeen: serverTimestamp()
                    });
                } catch (error) {
                    console.error('Failed to update user status:', error);
                }
            }

            // Remove from tracking maps
            onlineUsers.delete(socket.id);
            if (socket.odlserId) {
                userSockets.delete(socket.odlserId);
            }

            // Broadcast status change
            io.emit('user_status_change', {
                odlserId: socket.odlserId,
                username: socket.username,
                status: 'offline'
            });
        });
    });
};

export { onlineUsers, userSockets };
