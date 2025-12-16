import { create } from 'zustand';
import { API_URL } from '../config/api';

// Types
export interface MediaFile {
    id: string;
    name: string;
    mimeType: string;
    size: string;
    url: string;
    downloadUrl: string;
    webViewLink: string;
    thumbnailLink?: string;
    createdTime?: string;
}

interface UploadProgress {
    fileId: string;
    fileName: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    error?: string;
}

interface MediaState {
    images: MediaFile[];
    videos: MediaFile[];
    uploadProgress: UploadProgress[];
    isLoading: boolean;
    error: string | null;
    serviceReady: boolean;

    // Actions
    checkServiceStatus: () => Promise<void>;
    uploadImage: (file: File) => Promise<MediaFile | null>;
    uploadVideo: (file: File) => Promise<MediaFile | null>;
    fetchImages: (limit?: number) => Promise<void>;
    fetchVideos: (limit?: number) => Promise<void>;
    deleteFile: (fileId: string) => Promise<boolean>;
    getFileInfo: (fileId: string) => Promise<MediaFile | null>;
    clearError: () => void;
    removeFromProgress: (fileId: string) => void;
}

export const useMediaStore = create<MediaState>((set, get) => ({
    images: [],
    videos: [],
    uploadProgress: [],
    isLoading: false,
    error: null,
    serviceReady: false,

    checkServiceStatus: async () => {
        try {
            const response = await fetch(`${API_URL}/api/media/status`);
            const data = await response.json();
            set({ serviceReady: data.ready });
        } catch (error) {
            console.error('Error checking media service status:', error);
            set({ serviceReady: false });
        }
    },

    uploadImage: async (file: File) => {
        const tempId = `temp_${Date.now()}`;

        // Add to progress tracking
        set((state) => ({
            uploadProgress: [
                ...state.uploadProgress,
                {
                    fileId: tempId,
                    fileName: file.name,
                    progress: 0,
                    status: 'uploading' as const,
                }
            ]
        }));

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/api/media/upload/image`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload image');
            }

            const data = await response.json();
            const uploadedFile: MediaFile = data.file;

            // Update progress to completed
            set((state) => ({
                uploadProgress: state.uploadProgress.map(p =>
                    p.fileId === tempId
                        ? { ...p, fileId: uploadedFile.id, progress: 100, status: 'completed' as const }
                        : p
                ),
                images: [uploadedFile, ...state.images],
            }));

            return uploadedFile;
        } catch (error: any) {
            // Update progress to error
            set((state) => ({
                uploadProgress: state.uploadProgress.map(p =>
                    p.fileId === tempId
                        ? { ...p, status: 'error' as const, error: error.message }
                        : p
                ),
                error: error.message,
            }));
            return null;
        }
    },

    uploadVideo: async (file: File) => {
        const tempId = `temp_${Date.now()}`;

        // Add to progress tracking
        set((state) => ({
            uploadProgress: [
                ...state.uploadProgress,
                {
                    fileId: tempId,
                    fileName: file.name,
                    progress: 0,
                    status: 'uploading' as const,
                }
            ]
        }));

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/api/media/upload/video`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload video');
            }

            const data = await response.json();
            const uploadedFile: MediaFile = data.file;

            // Update progress to completed
            set((state) => ({
                uploadProgress: state.uploadProgress.map(p =>
                    p.fileId === tempId
                        ? { ...p, fileId: uploadedFile.id, progress: 100, status: 'completed' as const }
                        : p
                ),
                videos: [uploadedFile, ...state.videos],
            }));

            return uploadedFile;
        } catch (error: any) {
            // Update progress to error
            set((state) => ({
                uploadProgress: state.uploadProgress.map(p =>
                    p.fileId === tempId
                        ? { ...p, status: 'error' as const, error: error.message }
                        : p
                ),
                error: error.message,
            }));
            return null;
        }
    },

    fetchImages: async (limit = 50) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/api/media/images?limit=${limit}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch images');
            }

            const data = await response.json();
            set({ images: data.files, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchVideos: async (limit = 50) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/api/media/videos?limit=${limit}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch videos');
            }

            const data = await response.json();
            set({ videos: data.files, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    deleteFile: async (fileId: string) => {
        try {
            const response = await fetch(`${API_URL}/api/media/file/${fileId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete file');
            }

            // Remove from local state
            set((state) => ({
                images: state.images.filter(f => f.id !== fileId),
                videos: state.videos.filter(f => f.id !== fileId),
            }));

            return true;
        } catch (error: any) {
            set({ error: error.message });
            return false;
        }
    },

    getFileInfo: async (fileId: string) => {
        try {
            const response = await fetch(`${API_URL}/api/media/file/${fileId}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get file info');
            }

            const data = await response.json();
            return data.file as MediaFile;
        } catch (error: any) {
            set({ error: error.message });
            return null;
        }
    },

    clearError: () => set({ error: null }),

    removeFromProgress: (fileId: string) => {
        set((state) => ({
            uploadProgress: state.uploadProgress.filter(p => p.fileId !== fileId)
        }));
    },
}));

export default useMediaStore;
