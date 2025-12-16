import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useFriendsStore } from '../stores/friendsStore';
import type { Message, OnlineUser, TypingUser } from '../stores/chatStore';

let socket: Socket | null = null;

export const useSocket = () => {
    const socketRef = useRef<Socket | null>(null);
    const { token, user, isAuthenticated } = useAuthStore();
    const {
        currentRoom,
        addMessage,
        setOnlineUsers,
        setRoomUsers,
        addTypingUser,
        removeTypingUser,
        incrementUnread
    } = useChatStore();
    const { fetchPendingRequests, fetchFriends, updateFriendStatus } = useFriendsStore();

    useEffect(() => {
        if (!isAuthenticated && !user) return;

        // Connect with authentication
        socketRef.current = io(SOCKET_URL, {
            auth: {
                token: token || undefined,
                firebaseUid: user?.firebaseUid || user?.id || undefined,
                username: user?.username || 'Guest'
            },
            transports: ['websocket', 'polling']
        });

        socket = socketRef.current;

        // Connection events
        socket.on('connect', () => {
            console.log('✅ Connected to SonicChat server with socket ID:', socket?.id);
            console.log('✅ Socket auth:', socket?.auth);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error.message);
        });

        // Message events
        socket.on('receive_message', (message: Message) => {
            addMessage(message.room, message);

            // Increment unread if not in the room
            if (message.room !== currentRoom) {
                incrementUnread(message.room);
            }
        });

        socket.on('receive_private_message', (message: Message) => {
            console.log('📩 Received private message:', message);
            console.log('📩 Message room:', message.room);
            console.log('📩 Current room:', currentRoom);

            // Use the room from the message
            const room = message.room;
            if (!room) {
                console.error('❌ Message has no room!', message);
                return;
            }

            console.log('📩 Adding message to room:', room);
            addMessage(room, message);

            // Increment unread if not in this room
            if (room !== currentRoom) {
                console.log('📩 Incrementing unread for room:', room);
                incrementUnread(room);
            }
        });

        // User events
        socket.on('online_users', (users: OnlineUser[]) => {
            setOnlineUsers(users);
        });

        socket.on('room_users', (data: { room: string; users: OnlineUser[] }) => {
            setRoomUsers(data.room, data.users);
        });

        socket.on('user_joined', (data: { userId: string; username: string; room: string }) => {
            console.log(`👤 ${data.username} joined ${data.room}`);
        });

        socket.on('user_left', (data: { userId: string; username: string; room: string }) => {
            console.log(`👋 ${data.username} left ${data.room}`);
        });

        socket.on('user_status_change', (data: { userId: string; username: string; status: string }) => {
            console.log(`🔄 ${data.username} is now ${data.status}`);
            updateFriendStatus(data.userId, data.status as 'online' | 'offline' | 'away');
        });

        // Typing events
        socket.on('user_typing', (data: TypingUser) => {
            addTypingUser(data);
        });

        socket.on('user_stopped_typing', (data: { userId: string; room: string }) => {
            removeTypingUser(data.userId, data.room);
        });

        // Friend request events
        socket.on('friend_request_received', (data: { senderId: string; senderUsername: string }) => {
            console.log(`📨 Friend request from ${data.senderUsername}`);
            fetchPendingRequests();
        });

        socket.on('friend_request_accepted', (data: { accepterId: string; accepterUsername: string }) => {
            console.log(`✅ ${data.accepterUsername} accepted your friend request`);
            fetchFriends();
        });

        socket.on('friend_request_rejected', (data: { rejecterId: string }) => {
            console.log(`❌ Friend request rejected`);
        });

        socket.on('error', (error: { message: string }) => {
            console.error('Socket error:', error.message);
        });

        return () => {
            socket?.disconnect();
            socketRef.current = null;
            socket = null;
        };
    }, [isAuthenticated, token, user]);

    const joinRoom = useCallback((room: string) => {
        socket?.emit('join_room', room);
    }, []);

    const leaveRoom = useCallback((room: string) => {
        socket?.emit('leave_room', room);
    }, []);

    const sendMessage = useCallback((room: string, content: string) => {
        socket?.emit('send_message', { room, content, type: 'text' });
    }, []);

    const sendPrivateMessage = useCallback((recipientId: string, content: string) => {
        console.log('📤 Sending private message to:', recipientId, 'content:', content);
        socket?.emit('send_private_message', { recipientId, content, type: 'text' });
    }, []);

    const startTyping = useCallback((room: string) => {
        socket?.emit('typing_start', { room });
    }, []);

    const stopTyping = useCallback((room: string) => {
        socket?.emit('typing_stop', { room });
    }, []);

    const getOnlineUsers = useCallback(() => {
        socket?.emit('get_online_users');
    }, []);

    return {
        socket: socketRef.current,
        joinRoom,
        leaveRoom,
        sendMessage,
        sendPrivateMessage,
        startTyping,
        stopTyping,
        getOnlineUsers
    };
};

export { socket };
