import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Users, LogOut, Settings, Search,
    MessageCircle, MoreVertical, Smile,
    Bell, Sun, X, UserPlus, Check, Clock, Edit3, Mic, UserMinus, Lock,
    Paperclip, Image, Video, FileText, File, Download, Trash2
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useFriendsStore } from '../stores/friendsStore';
import type { Friend, SearchUser } from '../stores/friendsStore';
import { useSocket } from '../hooks/useSocket';
import { useEncryption } from '../hooks/useEncryption';
import { API_URL } from '../config/api';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export default function ChatPage() {
    const { user, isAuthenticated, logout, token, updateUsername, isLoading: authLoading, error: authError, clearError, syncUserWithBackend } = useAuthStore();
    const {
        currentRoom,
        messages,
        typingUsers,
        unreadCounts,
        setCurrentRoom,
        clearUnread,
        setMessages,
        deleteMessage,
        clearMessages
    } = useChatStore();

    const {
        friends,
        pendingRequests,
        searchResults,
        selectedFriend,
        searchQuery,
        setSearchQuery,
        setSelectedFriend,
        searchUsers,
        fetchFriends,
        fetchPendingRequests,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        cancelFriendRequest,
        clearSearch,
        removeFriend
    } = useFriendsStore();

    const { startTyping, stopTyping, sendPrivateMessage } = useSocket();
    const { isReady: encryptionReady, encrypt, decrypt } = useEncryption();

    const [currentMessage, setCurrentMessage] = useState<string>('');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showFriendMenu, setShowFriendMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [newUsername, setNewUsername] = useState('');
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [showChatSearch, setShowChatSearch] = useState(false);
    const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const username = user?.username || 'User';
    const userId = user?.id || '';
    const avatar = user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    // Fetch friends and pending requests on mount
    useEffect(() => {
        if (isAuthenticated) {
            // Sync user ID with backend first
            syncUserWithBackend();
            fetchFriends();
            fetchPendingRequests();
        }
    }, [isAuthenticated]);

    // Decrypt messages when they arrive
    useEffect(() => {
        const decryptNewMessages = async () => {
            const roomMsgs = messages[currentRoom] || [];
            for (const msg of roomMsgs) {
                const msgId = msg._id as string;
                if (msgId && !decryptedMessages[msgId] && msg.content?.startsWith('🔒')) {
                    const decrypted = await decrypt(msg.content);
                    setDecryptedMessages(prev => ({ ...prev, [msgId]: decrypted }));
                }
            }
        };
        decryptNewMessages();
    }, [messages, currentRoom, decrypt, decryptedMessages]);

    // Auto scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages[currentRoom]]);

    // Handle search with debounce
    const handleSearch = (query: string) => {
        setSearchQuery(query);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            searchUsers(query);
        }, 300);
    };

    // Handle friend selection for chat
    const handleSelectFriend = async (friend: Friend) => {
        console.log('👆 handleSelectFriend called with friend:', friend);
        console.log('👆 userId:', userId);

        setSelectedFriend(friend);
        const dmRoom = `dm_${[userId, friend._id].sort().join('_')}`;
        console.log('📱 Setting current room:', dmRoom, 'userId:', userId, 'friendId:', friend._id);
        setCurrentRoom(dmRoom);
        console.log('📱 setCurrentRoom called with:', dmRoom);
        clearUnread(dmRoom);
        setShowMobileMenu(false);

        // Fetch DM history
        try {
            const response = await fetch(`${API_URL}/api/friends/dm/${friend._id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Firebase-UID': user?.firebaseUid || user?.id || ''
                }
            });
            if (response.ok) {
                const data = await response.json();
                setMessages(dmRoom, data.messages);
            }
        } catch (error) {
            console.error('Failed to fetch DM history:', error);
        }
    };

    // Handle typing indicator
    const handleTyping = useCallback(() => {
        if (selectedFriend) {
            startTyping(currentRoom);
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            stopTyping(currentRoom);
        }, 2000);
    }, [currentRoom, startTyping, stopTyping, selectedFriend]);

    // Send message (with encryption)
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!currentMessage.trim() || !selectedFriend) {
            return;
        }

        const messageText = currentMessage.trim();
        setCurrentMessage('');

        // Encrypt the message if encryption is ready
        let finalMessage = messageText;
        if (encryptionReady) {
            finalMessage = await encrypt(messageText, selectedFriend._id);
            console.log('🔐 Message encrypted');
        }

        sendPrivateMessage(selectedFriend._id, finalMessage);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            stopTyping(currentRoom);
        }
    };

    // Handle file upload via Cloudinary
    const handleFileUpload = async (file: File, type: 'image' | 'video' | 'document') => {
        if (!selectedFriend || !user) return;

        // Check file size (100MB limit)
        const MAX_SIZE = 100 * 1024 * 1024; // 100MB
        if (file.size > MAX_SIZE) {
            alert(`File too large! Maximum size is 100MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setShowAttachmentMenu(false);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Determine endpoint based on file type
            let endpoint = `${API_URL}/api/media/upload/`;
            if (type === 'image') {
                endpoint += 'image';
            } else if (type === 'video') {
                endpoint += 'video';
            } else {
                endpoint += 'document';
            }

            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 85));
            }, 200);

            console.log('📤 Uploading via Cloudinary:', file.name);

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(95);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();
            setUploadProgress(100);

            console.log('✅ File uploaded to Cloudinary:', data.file.url);

            // Send message with file URL
            const fileMessage = type === 'image'
                ? `📷 [Image] ${data.file.url}`
                : type === 'video'
                    ? `🎬 [Video] ${data.file.url}`
                    : `📎 [File] ${file.name} - ${data.file.url}`;

            sendPrivateMessage(selectedFriend._id, fileMessage);

        } catch (error: any) {
            console.error('❌ Upload failed:', error);
            alert(`Upload failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // Handle file input change
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file, type);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Trigger file input
    const triggerFileInput = (accept: string, type: 'image' | 'video' | 'document') => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = accept;
            fileInputRef.current.setAttribute('data-type', type);
            fileInputRef.current.click();
        }
    };

    // Delete a single message
    const handleDeleteMessage = async (msgId: string) => {
        if (!selectedFriend || !currentRoom) return;

        try {
            // Delete from store
            deleteMessage(currentRoom, msgId);
            console.log('✅ Message deleted:', msgId);
        } catch (error) {
            console.error('❌ Failed to delete message:', error);
        }
    };

    // Delete all chats with current friend
    const handleDeleteAllChats = async () => {
        if (!selectedFriend || !currentRoom) return;

        if (!confirm(`Are you sure you want to delete all messages with ${selectedFriend.username}? This cannot be undone.`)) {
            return;
        }

        try {
            // Clear messages for this room using store function
            clearMessages(currentRoom);
            setShowFriendMenu(false);
            console.log('✅ All chats deleted for room:', currentRoom);
        } catch (error) {
            console.error('❌ Failed to delete all chats:', error);
        }
    };

    // Handle logout
    const handleLogout = () => {
        logout();
    };

    // Handle send friend request
    const handleSendRequest = async (targetUser: SearchUser) => {
        const success = await sendFriendRequest(targetUser._id);
        if (success) {
            // Emit socket event for real-time notification
        }
    };

    // Format time
    const formatTime = (time: string) => {
        return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Format last seen
    const formatLastSeen = (lastSeen?: string) => {
        if (!lastSeen) return 'Never';
        const date = new Date(lastSeen);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    // Get room messages
    const roomMessages = messages[currentRoom] || [];
    const roomTypingUsers = typingUsers.filter(u => u.room === currentRoom && u.userId !== userId);

    // Filter messages based on search query
    const filteredMessages = chatSearchQuery.trim()
        ? roomMessages.filter(msg => {
            const content = msg.content?.startsWith('🔒')
                ? (decryptedMessages[msg._id as string] || '')
                : msg.content || '';
            return content.toLowerCase().includes(chatSearchQuery.toLowerCase());
        })
        : roomMessages;

    // Only log when room changes or messages change
    if (selectedFriend) {
        console.log('📊 Room:', currentRoom, 'Messages count:', roomMessages.length);
    }

    return (
        <div className="flex h-full w-full relative z-20 font-sans">
            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {showMobileMenu && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden"
                        onClick={() => setShowMobileMenu(false)}
                    />
                )}
            </AnimatePresence>

            {/* Search Modal */}
            <AnimatePresence>
                {showSearchModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => {
                            setShowSearchModal(false);
                            clearSearch();
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-panel w-full max-w-md rounded-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-white">Find Friends</h2>
                                    <button
                                        onClick={() => {
                                            setShowSearchModal(false);
                                            clearSearch();
                                        }}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search by username..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                                        autoFocus
                                    />
                                </div>

                                <div className="max-h-80 overflow-y-auto space-y-2 scrollbar-thin">
                                    {searchResults.length === 0 && searchQuery.length >= 2 && (
                                        <div className="text-center py-8 text-gray-500">
                                            No users found
                                        </div>
                                    )}

                                    {searchResults.map((user) => (
                                        <div
                                            key={user._id}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                        >
                                            <div className="relative">
                                                <img
                                                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                                    alt={user.username}
                                                    className="w-12 h-12 rounded-full bg-gray-800 object-cover"
                                                />
                                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                                                    }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-white truncate">{user.username}</div>
                                                <div className="text-xs text-gray-500">
                                                    {user.status === 'online' ? 'Online' : `Last seen ${formatLastSeen(user.lastSeen)}`}
                                                </div>
                                            </div>
                                            <div>
                                                {user.isFriend ? (
                                                    <span className="px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 rounded-full">
                                                        Friends
                                                    </span>
                                                ) : user.requestSent ? (
                                                    <button
                                                        onClick={() => cancelFriendRequest(user._id)}
                                                        className="px-3 py-1.5 text-xs font-medium text-yellow-400 bg-yellow-500/10 rounded-full hover:bg-yellow-500/20 transition-colors flex items-center gap-1"
                                                    >
                                                        <Clock size={14} />
                                                        Pending
                                                    </button>
                                                ) : user.requestReceived ? (
                                                    <span className="px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 rounded-full">
                                                        Wants to connect
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSendRequest(user)}
                                                        className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-full transition-colors flex items-center gap-1"
                                                    >
                                                        <UserPlus size={14} />
                                                        Add
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Friend Requests Modal */}
            <AnimatePresence>
                {showRequestsModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowRequestsModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-panel w-full max-w-md rounded-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-white">Friend Requests</h2>
                                    <button
                                        onClick={() => setShowRequestsModal(false)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="max-h-80 overflow-y-auto space-y-2 scrollbar-thin">
                                    {pendingRequests.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            No pending requests
                                        </div>
                                    ) : (
                                        pendingRequests.map((request) => (
                                            <div
                                                key={request._id}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                                            >
                                                <img
                                                    src={request.sender.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.sender.username}`}
                                                    alt={request.sender.username}
                                                    className="w-12 h-12 rounded-full bg-gray-800 object-cover"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-white truncate">{request.sender.username}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Sent {formatLastSeen(request.createdAt)}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => acceptFriendRequest(request._id)}
                                                        className="p-2 text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors"
                                                        title="Accept"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => rejectFriendRequest(request._id)}
                                                        className="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                                                        title="Reject"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Settings Modal */}
            <AnimatePresence>
                {showProfileModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => {
                            setShowProfileModal(false);
                            clearError();
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-panel w-full max-w-md rounded-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-white">Profile Settings</h2>
                                    <button
                                        onClick={() => {
                                            setShowProfileModal(false);
                                            clearError();
                                        }}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Profile Preview */}
                                <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-white/5">
                                    <img
                                        src={avatar}
                                        alt={username}
                                        className="w-16 h-16 rounded-full bg-gray-800 object-cover"
                                    />
                                    <div>
                                        <div className="text-lg font-bold text-white">{username}</div>
                                        <div className="text-sm text-gray-400">{user?.email}</div>
                                    </div>
                                </div>

                                {/* Error Message */}
                                <AnimatePresence>
                                    {authError && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-4"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                            {authError}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Username Field */}
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider ml-1">
                                        Username
                                    </label>
                                    <div className="relative group">
                                        <Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                            placeholder={username}
                                            className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-black/40 transition-all font-medium"
                                            minLength={3}
                                            maxLength={20}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5 ml-1">3-20 characters</p>
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={async () => {
                                        if (newUsername.trim() && newUsername !== username) {
                                            const success = await updateUsername(newUsername.trim());
                                            if (success) {
                                                setNewUsername('');
                                                setShowProfileModal(false);
                                            }
                                        }
                                    }}
                                    disabled={authLoading || !newUsername.trim() || newUsername === username}
                                    className="w-full py-3.5 bg-linear-to-r from-cyan-600 to-purple-600 rounded-2xl font-bold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {authLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={18} />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={{ x: -300 }}
                animate={{ x: showMobileMenu ? 0 : 0 }}
                className={`fixed inset-y-0 left-0 z-40 w-[280px] h-full glass-panel flex flex-col md:relative md:translate-x-0 md:flex ${showMobileMenu ? 'flex' : 'hidden'}`}
            >
                {/* Header */}
                <div className="p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <MessageCircle size={20} className="text-white fill-white/20" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-200 via-purple-200 to-pink-200">
                                SonicChat
                            </h1>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Online</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowMobileMenu(false)}
                            className="md:hidden ml-auto p-1 text-gray-400"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search Button */}
                    <button
                        onClick={() => setShowSearchModal(true)}
                        className="mt-6 w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-all group"
                    >
                        <Search className="w-4 h-4 group-hover:text-purple-400 transition-colors" />
                        <span className="text-sm">Find friends...</span>
                    </button>
                </div>

                {/* Friends List */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 scrollbar-thin">
                    <div>
                        <div className="flex items-center justify-between px-2 mb-3">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Friends</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowRequestsModal(true)}
                                    className="relative p-1 text-gray-500 hover:text-white transition-colors"
                                    title="Friend Requests"
                                >
                                    <Bell size={16} />
                                    {pendingRequests.length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-red-500 text-[10px] font-bold text-white rounded-full">
                                            {pendingRequests.length}
                                        </span>
                                    )}
                                </button>
                                <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] text-gray-500">{friends.length}</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            {friends.length === 0 ? (
                                <div className="text-center py-8 px-4">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                        <Users size={24} className="text-gray-600" />
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2">No friends yet</p>
                                    <button
                                        onClick={() => setShowSearchModal(true)}
                                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                    >
                                        Find friends to chat with
                                    </button>
                                </div>
                            ) : (
                                friends.map((friend) => {
                                    const dmRoom = `dm_${[userId, friend._id].sort().join('_')}`;
                                    const unread = unreadCounts[dmRoom] || 0;
                                    const isActive = selectedFriend?._id === friend._id;

                                    return (
                                        <button
                                            key={friend._id}
                                            onClick={() => handleSelectFriend(friend)}
                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative overflow-hidden ${isActive
                                                ? 'bg-linear-to-r from-cyan-500/10 to-purple-500/10 border border-white/5 shadow-lg shadow-purple-500/5'
                                                : 'hover:bg-white/5 border border-transparent'
                                                }`}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeFriend"
                                                    className="absolute left-0 w-0.5 h-6 bg-linear-to-b from-cyan-400 to-purple-400 rounded-r-full"
                                                />
                                            )}
                                            <div className="relative">
                                                <img
                                                    src={friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`}
                                                    alt={friend.username}
                                                    className="w-10 h-10 rounded-full bg-gray-800 object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`;
                                                    }}
                                                />
                                                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${friend.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                                                    }`} />
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className={`font-medium text-sm truncate ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                                        {friend.username}
                                                    </span>
                                                    {unread > 0 && (
                                                        <span className="w-5 h-5 flex items-center justify-center bg-red-500 text-[10px] font-bold text-white rounded-full shadow-lg shadow-red-500/20">
                                                            {unread}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`text-xs ${friend.status === 'online' ? 'text-green-400' : 'text-gray-600'}`}>
                                                    {friend.status === 'online' ? 'Online' : `Last seen ${formatLastSeen(friend.lastSeen)}`}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* User Profile */}
                <div className="p-4 mt-auto border-t border-white/5 bg-black/20 backdrop-blur-xl">
                    <div className="flex items-center gap-3 p-2 rounded-xl group hover:bg-white/5 transition-all cursor-pointer relative"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <div className="relative">
                            <img
                                src={avatar}
                                alt={username}
                                className="w-10 h-10 rounded-full bg-gray-800 ring-2 ring-transparent group-hover:ring-purple-500/50 transition-all object-cover"
                            />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-200 text-sm truncate">{username}</div>
                            <div className="text-xs text-gray-500 truncate">Online</div>
                        </div>

                        <Settings size={18} className="text-gray-500 group-hover:text-white transition-colors" />

                        {/* User Popup Menu */}
                        <AnimatePresence>
                            {showUserMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute bottom-full left-0 right-0 mb-3 glass-panel rounded-xl shadow-2xl overflow-hidden z-50 origin-bottom"
                                >
                                    <div className="p-2 space-y-1">
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors">
                                            <Sun size={16} />
                                            <span>Light Mode</span>
                                        </button>
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors">
                                            <Bell size={16} />
                                            <span>Notifications</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowUserMenu(false);
                                                setShowProfileModal(true);
                                                setNewUsername(username);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <Edit3 size={16} />
                                            <span>Edit Profile</span>
                                        </button>
                                        <div className="h-px bg-white/10 my-1" />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLogout();
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <LogOut size={16} />
                                            <span>Sign Out</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-transparent h-full">
                {/* Header */}
                <header className="h-[72px] px-4 md:px-6 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                        <button
                            onClick={() => setShowMobileMenu(true)}
                            className="p-2 -ml-2 text-gray-400 hover:text-white md:hidden shrink-0"
                        >
                            <Users size={20} />
                        </button>

                        {selectedFriend ? (
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="relative shrink-0">
                                    <img
                                        src={selectedFriend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedFriend.username}`}
                                        alt={selectedFriend.username}
                                        className="w-10 h-10 rounded-full bg-gray-800 object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedFriend.username}`;
                                        }}
                                    />
                                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${selectedFriend.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                                        }`} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-white truncate">{selectedFriend.username}</h2>
                                        {encryptionReady && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium shrink-0">
                                                <Lock size={10} />
                                                E2E
                                            </span>
                                        )}
                                    </div>
                                    {/* Typing indicator */}
                                    {roomTypingUsers.some((t: { odlserId?: string; userId?: string }) => t.odlserId === selectedFriend._id || t.userId === selectedFriend._id) ? (
                                        <p className="text-xs font-medium text-purple-400 flex items-center gap-1">
                                            <span className="flex gap-0.5">
                                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </span>
                                            typing...
                                        </p>
                                    ) : (
                                        <p className={`text-xs font-medium ${selectedFriend.status === 'online' ? 'text-green-400' : 'text-gray-500'}`}>
                                            {selectedFriend.status === 'online' ? 'Online' : `Last seen ${formatLastSeen(selectedFriend.lastSeen)}`}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-lg font-bold text-white">Select a friend</h2>
                                <p className="text-xs text-gray-500">Choose someone to start chatting</p>
                            </div>
                        )}
                    </div>

                    {selectedFriend && (
                        <div className="flex items-center gap-2 relative">
                            {/* Search Toggle Button */}
                            <button
                                onClick={() => {
                                    setShowChatSearch(!showChatSearch);
                                    if (showChatSearch) setChatSearchQuery('');
                                }}
                                className={`p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors ${showChatSearch ? 'text-cyan-400 bg-white/5' : ''}`}
                            >
                                <Search size={20} />
                            </button>

                            {/* Chat Search Input */}
                            <AnimatePresence>
                                {showChatSearch && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 200, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <input
                                            type="text"
                                            placeholder="Search messages..."
                                            value={chatSearchQuery}
                                            onChange={(e) => setChatSearchQuery(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                                            autoFocus
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={() => setShowFriendMenu(!showFriendMenu)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <MoreVertical size={20} />
                            </button>

                            {/* Friend Options Menu */}
                            <AnimatePresence>
                                {showFriendMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute top-full right-0 mt-2 w-48 glass-panel rounded-xl shadow-2xl overflow-hidden z-50"
                                    >
                                        <div className="p-2 space-y-1">
                                            <button
                                                onClick={() => {
                                                    setShowFriendMenu(false);
                                                    alert(`${selectedFriend.username}\n\nStatus: ${selectedFriend.status || 'offline'}\nUser ID: ${selectedFriend._id}`);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <Users size={16} />
                                                <span>View Profile</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowFriendMenu(false);
                                                    alert('Mute notifications - Coming Soon!');
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <Bell size={16} />
                                                <span>Mute Notifications</span>
                                            </button>
                                            <div className="h-px bg-white/10 my-1" />
                                            <button
                                                onClick={handleDeleteAllChats}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                                <span>Delete All Chats</span>
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`Are you sure you want to unfriend ${selectedFriend.username}?`)) {
                                                        await removeFriend(selectedFriend._id);
                                                        setShowFriendMenu(false);
                                                    }
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <UserMinus size={16} />
                                                <span>Unfriend</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin">
                    {!selectedFriend ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-24 h-24 rounded-3xl bg-linear-to-tr from-cyan-500/10 to-purple-500/10 flex items-center justify-center mb-6 border border-white/5 shadow-2xl shadow-purple-500/5">
                                <MessageCircle className="w-10 h-10 text-purple-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-100 to-purple-100 mb-2">Welcome to SonicChat</h3>
                            <p className="text-gray-500 max-w-xs leading-relaxed mb-6">Select a friend from the sidebar or find new friends to start chatting!</p>
                            <button
                                onClick={() => setShowSearchModal(true)}
                                className="px-6 py-3 bg-linear-to-r from-cyan-600 to-purple-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                            >
                                <UserPlus size={18} />
                                Find Friends
                            </button>
                        </div>
                    ) : roomMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-0 animate-enter" style={{ animationDelay: '0.2s' }}>
                            <div className="w-24 h-24 rounded-3xl bg-linear-to-tr from-cyan-500/10 to-purple-500/10 flex items-center justify-center mb-6 border border-white/5 shadow-2xl shadow-purple-500/5">
                                <MessageCircle className="w-10 h-10 text-purple-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-100 to-purple-100 mb-2">Start a Conversation</h3>
                            <p className="text-gray-500 max-w-xs leading-relaxed">Say hi to {selectedFriend.username}! Be kind and have fun!</p>
                        </div>
                    ) : (
                        <>
                            {/* Search Results Indicator */}
                            {chatSearchQuery.trim() && (
                                <div className="mb-4 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-sm text-cyan-400">
                                    Found {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''} matching "{chatSearchQuery}"
                                </div>
                            )}
                            <AnimatePresence mode="popLayout" initial={false}>
                                {filteredMessages.map((msg, index) => {
                                    const isOwn = msg.sender === userId || msg.senderUsername === username;
                                    const showAvatar = index === 0 || filteredMessages[index - 1]?.senderUsername !== msg.senderUsername;
                                    const isConsecutive = !showAvatar;

                                    return (
                                        <motion.div
                                            key={msg._id || index}
                                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            layout
                                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group ${isConsecutive ? 'mt-1' : 'mt-6'}`}
                                        >
                                            <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                                                {!isOwn && (
                                                    <div className="w-8 shrink-0 flex flex-col items-center">
                                                        {showAvatar ? (
                                                            <img
                                                                src={selectedFriend?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderUsername}`}
                                                                alt={msg.senderUsername}
                                                                className="w-8 h-8 rounded-full bg-gray-800 shadow-lg object-cover"
                                                            />
                                                        ) : <div className="w-8" />}
                                                    </div>
                                                )}

                                                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                                    {showAvatar && !isOwn && (
                                                        <div className="flex items-center gap-2 mb-1 ml-1">
                                                            <span className="text-xs font-bold text-purple-400">
                                                                {msg.senderUsername}
                                                            </span>
                                                            <span className="text-[10px] text-gray-600">
                                                                {formatTime(msg.time || msg.createdAt || new Date().toISOString())}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div
                                                        className={`px-5 py-3 rounded-2xl relative shadow-md transition-all ${isOwn
                                                            ? 'bg-linear-to-br from-cyan-600 to-blue-600 text-white rounded-tr-sm hover:shadow-cyan-500/10'
                                                            : 'glass-panel-light text-gray-200 rounded-tl-sm hover:bg-white/5'
                                                            }`}
                                                    >
                                                        {/* Show lock icon for encrypted messages */}
                                                        {msg.content?.startsWith('🔒') && (
                                                            <Lock size={10} className={`absolute top-1 right-1 ${isOwn ? 'text-white/50' : 'text-green-400/70'}`} />
                                                        )}

                                                        {/* Render based on message content type */}
                                                        {(() => {
                                                            const content = msg.content?.startsWith('🔒')
                                                                ? (decryptedMessages[msg._id as string] || 'Decrypting...')
                                                                : msg.content || '';

                                                            // Check if it's an image message
                                                            if (content.startsWith('📷 [Image]')) {
                                                                const url = content.replace('📷 [Image] ', '').trim();
                                                                return (
                                                                    <div className="space-y-2">
                                                                        <img
                                                                            src={url}
                                                                            alt="Shared image"
                                                                            className="max-w-[300px] max-h-[300px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                                            onClick={() => window.open(url, '_blank')}
                                                                        />
                                                                        <a
                                                                            href={url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className={`flex items-center gap-1 text-xs ${isOwn ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                                                        >
                                                                            <Download size={12} />
                                                                            Download
                                                                        </a>
                                                                    </div>
                                                                );
                                                            }

                                                            // Check if it's a video message
                                                            if (content.startsWith('🎬 [Video]')) {
                                                                const url = content.replace('🎬 [Video] ', '').trim();
                                                                return (
                                                                    <div className="space-y-2">
                                                                        <video
                                                                            src={url}
                                                                            controls
                                                                            className="max-w-[300px] max-h-[200px] rounded-lg"
                                                                        />
                                                                        <a
                                                                            href={url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className={`flex items-center gap-1 text-xs ${isOwn ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                                                        >
                                                                            <Download size={12} />
                                                                            Download
                                                                        </a>
                                                                    </div>
                                                                );
                                                            }

                                                            // Check if it's a file message
                                                            if (content.startsWith('📎 [File]')) {
                                                                const parts = content.replace('📎 [File] ', '').split(' - ');
                                                                const fileName = parts[0] || 'File';
                                                                const url = parts[1]?.trim() || '';
                                                                return (
                                                                    <a
                                                                        href={url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={`flex items-center gap-3 p-3 rounded-lg ${isOwn ? 'bg-white/10 hover:bg-white/20' : 'bg-black/20 hover:bg-black/30'} transition-colors`}
                                                                    >
                                                                        <div className={`w-10 h-10 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-purple-500/20'} flex items-center justify-center`}>
                                                                            <File size={20} className={isOwn ? 'text-white' : 'text-purple-400'} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-gray-200'}`}>{fileName}</p>
                                                                            <p className={`text-xs ${isOwn ? 'text-white/60' : 'text-gray-500'}`}>Click to download</p>
                                                                        </div>
                                                                        <Download size={16} className={isOwn ? 'text-white/60' : 'text-gray-500'} />
                                                                    </a>
                                                                );
                                                            }

                                                            // Regular text message
                                                            return (
                                                                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-all">
                                                                    {content}
                                                                </p>
                                                            );
                                                        })()}
                                                    </div>

                                                    {isOwn && showAvatar && (
                                                        <span className="text-[10px] text-gray-600 mt-1 mr-1">
                                                            {formatTime(msg.time || msg.createdAt || new Date().toISOString())}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Delete button on hover (only for own messages) */}
                                                {isOwn && msg._id && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Delete this message?')) {
                                                                handleDeleteMessage(msg._id as string);
                                                            }
                                                        }}
                                                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all self-center"
                                                        title="Delete message"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </>
                    )}
                    <div ref={messagesEndRef} className="h-px" />
                </div>

                {/* Input Area */}
                {selectedFriend && (
                    <div className="p-6 pt-2">
                        <div className="p-2 rounded-2xl flex items-end gap-2 relative bg-black/40 backdrop-blur-xl shadow-2xl">
                            {/* Typing users overlay */}
                            <AnimatePresence>
                                {roomTypingUsers.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute bottom-full left-4 mb-2 flex items-center gap-2 text-gray-400 text-xs font-medium px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md"
                                    >
                                        <div className="flex gap-1 h-3 items-center">
                                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span>
                                            {selectedFriend.username} is typing...
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex-1 relative">
                                <textarea
                                    value={currentMessage}
                                    onChange={(e) => {
                                        setCurrentMessage(e.target.value);
                                        handleTyping();
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    rows={1}
                                    placeholder={`Message ${selectedFriend.username}...`}
                                    className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 focus:outline-none resize-none py-3 px-4 min-h-[44px] max-h-[120px] scrollbar-hide text-[15px]"
                                    style={{ height: 'auto', minHeight: '44px' }}
                                />
                            </div>

                            <div className="flex items-center gap-1 shrink-0 pb-1.5 relative">
                                {/* Hidden File Input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        const type = fileInputRef.current?.getAttribute('data-type') as 'image' | 'video' | 'document' || 'document';
                                        handleFileInputChange(e, type);
                                    }}
                                />

                                {/* Upload Progress Overlay */}
                                <AnimatePresence>
                                    {isUploading && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute bottom-full left-0 right-0 mb-2 bg-black/80 backdrop-blur-sm rounded-xl p-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                                        <span>Uploading...</span>
                                                        <span>{uploadProgress}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full bg-linear-to-r from-cyan-500 to-purple-500 rounded-full"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${uploadProgress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Attachment Menu */}
                                <AnimatePresence>
                                    {showAttachmentMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute bottom-full left-0 mb-2 z-50 glass-panel rounded-xl shadow-2xl overflow-hidden"
                                        >
                                            <div className="p-2 space-y-1 min-w-[180px]">
                                                <button
                                                    onClick={() => triggerFileInput('image/*', 'image')}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                                        <Image size={16} className="text-green-400" />
                                                    </div>
                                                    <span>Image</span>
                                                </button>
                                                <button
                                                    onClick={() => triggerFileInput('video/*', 'video')}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                        <Video size={16} className="text-purple-400" />
                                                    </div>
                                                    <span>Video</span>
                                                </button>
                                                <button
                                                    onClick={() => triggerFileInput('.pdf,.doc,.docx,.txt,.zip,.rar', 'document')}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                        <FileText size={16} className="text-blue-400" />
                                                    </div>
                                                    <span>Document</span>
                                                </button>
                                            </div>
                                            <div className="px-3 py-2 border-t border-white/5">
                                                <p className="text-[10px] text-gray-500">Max file size: 100MB</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Attachment Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAttachmentMenu(!showAttachmentMenu);
                                        setShowEmojiPicker(false);
                                    }}
                                    disabled={isUploading}
                                    className={`p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors ${showAttachmentMenu ? 'text-purple-400 bg-white/5' : ''} ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Paperclip size={20} />
                                </button>

                                {/* Emoji Picker */}
                                <AnimatePresence>
                                    {showEmojiPicker && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute bottom-full right-0 mb-2 z-50"
                                        >
                                            <EmojiPicker
                                                theme={Theme.DARK}
                                                onEmojiClick={(emojiData) => {
                                                    setCurrentMessage(prev => prev + emojiData.emoji);
                                                    setShowEmojiPicker(false);
                                                }}
                                                width={300}
                                                height={400}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEmojiPicker(!showEmojiPicker);
                                        setShowAttachmentMenu(false);
                                    }}
                                    className={`p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors ${showEmojiPicker ? 'text-yellow-400' : ''}`}
                                >
                                    <Smile size={20} />
                                </button>
                                {currentMessage.trim() ? (
                                    <button
                                        onClick={() => handleSendMessage()}
                                        className="p-2.5 bg-white text-black rounded-xl hover:bg-gray-200 transition-all transform active:scale-95 shadow-lg shadow-white/5"
                                    >
                                        <Send size={18} className="ml-0.5" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="p-2.5 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:opacity-90 transition-all transform active:scale-95 shadow-lg shadow-purple-500/20"
                                        title="Voice Message (Coming Soon)"
                                    >
                                        <Mic size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
