import { create } from 'zustand';

export interface Message {
    _id?: string;
    content: string;
    sender: string;
    senderUsername: string;
    room: string;
    type: 'text' | 'image' | 'file' | 'system';
    isPrivate: boolean;
    recipient?: string;
    time: string;
    createdAt?: string;
}

export interface OnlineUser {
    userId: string;
    username: string;
}

export interface TypingUser {
    userId?: string;
    odlserId?: string;
    username: string;
    room: string;
}

interface ChatState {
    currentRoom: string;
    messages: Record<string, Message[]>;
    onlineUsers: OnlineUser[];
    roomUsers: Record<string, OnlineUser[]>;
    typingUsers: TypingUser[];
    unreadCounts: Record<string, number>;

    setCurrentRoom: (room: string) => void;
    addMessage: (room: string, message: Message) => void;
    setMessages: (room: string, messages: Message[]) => void;
    setOnlineUsers: (users: OnlineUser[]) => void;
    setRoomUsers: (room: string, users: OnlineUser[]) => void;
    addTypingUser: (user: TypingUser) => void;
    removeTypingUser: (userId: string, room: string) => void;
    incrementUnread: (room: string) => void;
    clearUnread: (room: string) => void;
    clearMessages: (room: string) => void;
    deleteMessage: (room: string, msgId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    currentRoom: 'general',
    messages: {},
    onlineUsers: [],
    roomUsers: {},
    typingUsers: [],
    unreadCounts: {},

    setCurrentRoom: (room) => {
        console.log('🏠 chatStore.setCurrentRoom called with:', room);
        set({ currentRoom: room });
    },

    addMessage: (room, message) => set((state) => ({
        messages: {
            ...state.messages,
            [room]: [...(state.messages[room] || []), message]
        }
    })),

    setMessages: (room, messages) => set((state) => ({
        messages: {
            ...state.messages,
            [room]: messages
        }
    })),

    setOnlineUsers: (users) => set({ onlineUsers: users }),

    setRoomUsers: (room, users) => set((state) => ({
        roomUsers: {
            ...state.roomUsers,
            [room]: users
        }
    })),

    addTypingUser: (user) => set((state) => ({
        typingUsers: state.typingUsers.some(u => u.userId === user.userId && u.room === user.room)
            ? state.typingUsers
            : [...state.typingUsers, user]
    })),

    removeTypingUser: (userId, room) => set((state) => ({
        typingUsers: state.typingUsers.filter(u => !(u.userId === userId && u.room === room))
    })),

    incrementUnread: (room) => set((state) => ({
        unreadCounts: {
            ...state.unreadCounts,
            [room]: (state.unreadCounts[room] || 0) + 1
        }
    })),

    clearUnread: (room) => set((state) => ({
        unreadCounts: {
            ...state.unreadCounts,
            [room]: 0
        }
    })),

    clearMessages: (room) => set((state) => ({
        messages: {
            ...state.messages,
            [room]: []
        }
    })),

    deleteMessage: (room, msgId) => set((state) => ({
        messages: {
            ...state.messages,
            [room]: (state.messages[room] || []).filter(msg => msg._id !== msgId)
        }
    }))
}));
