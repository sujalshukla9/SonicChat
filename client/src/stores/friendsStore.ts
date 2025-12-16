import { create } from 'zustand';
import { API_URL } from '../config/api';
import { useAuthStore } from './authStore';

export interface Friend {
    _id: string;
    username: string;
    avatar: string;
    status: 'online' | 'offline' | 'away';
    lastSeen?: string;
}

export interface SearchUser {
    _id: string;
    username: string;
    avatar: string;
    status: 'online' | 'offline' | 'away';
    lastSeen?: string;
    isFriend: boolean;
    requestSent: boolean;
    requestReceived: boolean;
}

export interface FriendRequest {
    _id: string;
    sender: {
        _id: string;
        username: string;
        avatar: string;
        status?: string;
    };
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
}

interface FriendsState {
    friends: Friend[];
    pendingRequests: FriendRequest[];
    searchResults: SearchUser[];
    selectedFriend: Friend | null;
    isLoading: boolean;
    searchQuery: string;

    setSearchQuery: (query: string) => void;
    setSelectedFriend: (friend: Friend | null) => void;
    searchUsers: (query: string) => Promise<void>;
    fetchFriends: () => Promise<void>;
    fetchPendingRequests: () => Promise<void>;
    sendFriendRequest: (userId: string) => Promise<boolean>;
    acceptFriendRequest: (requestId: string) => Promise<boolean>;
    rejectFriendRequest: (requestId: string) => Promise<boolean>;
    cancelFriendRequest: (userId: string) => Promise<boolean>;
    removeFriend: (friendId: string) => Promise<boolean>;
    updateFriendStatus: (userId: string, status: 'online' | 'offline' | 'away') => void;
    clearSearch: () => void;
}

const getAuthHeaders = () => {
    const { token, user } = useAuthStore.getState();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Firebase-UID': user?.firebaseUid || user?.id || ''
    };
};

export const useFriendsStore = create<FriendsState>((set) => ({
    friends: [],
    pendingRequests: [],
    searchResults: [],
    selectedFriend: null,
    isLoading: false,
    searchQuery: '',

    setSearchQuery: (query) => set({ searchQuery: query }),

    setSelectedFriend: (friend) => set({ selectedFriend: friend }),

    searchUsers: async (query) => {
        if (query.length < 2) {
            set({ searchResults: [] });
            return;
        }

        try {
            set({ isLoading: true });
            const response = await fetch(`${API_URL}/api/friends/search?q=${encodeURIComponent(query)}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Search failed');

            const data = await response.json();
            set({ searchResults: data.users, isLoading: false });
        } catch (error) {
            console.error('Search users error:', error);
            set({ searchResults: [], isLoading: false });
        }
    },

    fetchFriends: async () => {
        try {
            set({ isLoading: true });
            const response = await fetch(`${API_URL}/api/friends/list`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch friends');

            const data = await response.json();
            set({ friends: data.friends, isLoading: false });
        } catch (error) {
            console.error('Fetch friends error:', error);
            set({ isLoading: false });
        }
    },

    fetchPendingRequests: async () => {
        try {
            const response = await fetch(`${API_URL}/api/friends/requests/pending`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch pending requests');

            const data = await response.json();
            set({ pendingRequests: data.requests });
        } catch (error) {
            console.error('Fetch pending requests error:', error);
        }
    },

    sendFriendRequest: async (userId) => {
        try {
            const response = await fetch(`${API_URL}/api/friends/request/${userId}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to send friend request');
            }

            // Update search results to reflect the sent request
            set((state) => ({
                searchResults: state.searchResults.map(user =>
                    user._id === userId ? { ...user, requestSent: true } : user
                )
            }));

            return true;
        } catch (error) {
            console.error('Send friend request error:', error);
            return false;
        }
    },

    acceptFriendRequest: async (requestId) => {
        try {
            const response = await fetch(`${API_URL}/api/friends/accept/${requestId}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to accept friend request');

            const data = await response.json();

            // Add the new friend to the friends list
            set((state) => ({
                friends: [...state.friends, data.friend],
                pendingRequests: state.pendingRequests.filter(r => r._id !== requestId)
            }));

            return true;
        } catch (error) {
            console.error('Accept friend request error:', error);
            return false;
        }
    },

    rejectFriendRequest: async (requestId) => {
        try {
            const response = await fetch(`${API_URL}/api/friends/reject/${requestId}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to reject friend request');

            // Remove from pending requests
            set((state) => ({
                pendingRequests: state.pendingRequests.filter(r => r._id !== requestId)
            }));

            return true;
        } catch (error) {
            console.error('Reject friend request error:', error);
            return false;
        }
    },

    cancelFriendRequest: async (userId) => {
        try {
            const response = await fetch(`${API_URL}/api/friends/request/${userId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to cancel friend request');

            // Update search results
            set((state) => ({
                searchResults: state.searchResults.map(user =>
                    user._id === userId ? { ...user, requestSent: false } : user
                )
            }));

            return true;
        } catch (error) {
            console.error('Cancel friend request error:', error);
            return false;
        }
    },

    removeFriend: async (friendId) => {
        try {
            const response = await fetch(`${API_URL}/api/friends/${friendId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to remove friend');

            // Remove from friends list
            set((state) => ({
                friends: state.friends.filter(f => f._id !== friendId),
                selectedFriend: state.selectedFriend?._id === friendId ? null : state.selectedFriend
            }));

            return true;
        } catch (error) {
            console.error('Remove friend error:', error);
            return false;
        }
    },

    updateFriendStatus: (userId, status) => {
        set((state) => ({
            friends: state.friends.map(friend =>
                friend._id === userId ? { ...friend, status } : friend
            )
        }));
    },

    clearSearch: () => set({ searchResults: [], searchQuery: '' })
}));
