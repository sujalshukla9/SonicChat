import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import gdriveConfig from '../config/gdrive';

// Type for service account credentials
interface ServiceAccountCredentials {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
}

// Type for upload result
export interface UploadResult {
    success: boolean;
    fileId?: string;
    webViewLink?: string;
    webContentLink?: string;
    thumbnailLink?: string;
    name?: string;
    mimeType?: string;
    size?: string;
    error?: string;
}

// Type for file info
export interface FileInfo {
    id: string;
    name: string;
    mimeType: string;
    size: string;
    webViewLink: string;
    webContentLink: string;
    thumbnailLink?: string;
    createdTime: string;
    modifiedTime: string;
}

class GoogleDriveService {
    private drive: drive_v3.Drive | null = null;
    private isInitialized: boolean = false;

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            // Check for service account credentials
            const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

            if (!credentialsJson) {
                console.warn('⚠️ GOOGLE_SERVICE_ACCOUNT_JSON not found in environment variables');
                console.warn('📋 Google Drive integration will not work without service account credentials');
                return;
            }

            const credentials: ServiceAccountCredentials = JSON.parse(credentialsJson);

            // Create JWT auth client
            const auth = new google.auth.JWT({
                email: credentials.client_email,
                key: credentials.private_key,
                scopes: gdriveConfig.scopes,
            });

            // Authorize
            await auth.authorize();

            // Create Drive client
            this.drive = google.drive({ version: 'v3', auth });
            this.isInitialized = true;

            console.log('✅ Google Drive service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Google Drive service:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Check if the service is ready to use
     */
    public isReady(): boolean {
        return this.isInitialized && this.drive !== null;
    }

    /**
     * Upload a file to Google Drive
     */
    async uploadFile(
        fileBuffer: Buffer,
        fileName: string,
        mimeType: string,
        type: 'image' | 'video'
    ): Promise<UploadResult> {
        if (!this.isReady()) {
            return {
                success: false,
                error: 'Google Drive service is not initialized. Please check your credentials.'
            };
        }

        try {
            // Validate file type
            const allowedTypes = type === 'image'
                ? gdriveConfig.allowedImageTypes
                : gdriveConfig.allowedVideoTypes;

            if (!allowedTypes.includes(mimeType)) {
                return {
                    success: false,
                    error: `Invalid file type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`
                };
            }

            // Validate file size
            const maxSize = type === 'image'
                ? gdriveConfig.maxImageSize
                : gdriveConfig.maxVideoSize;

            if (fileBuffer.length > maxSize) {
                return {
                    success: false,
                    error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
                };
            }

            // Get the appropriate folder ID
            const folderId = type === 'image'
                ? gdriveConfig.imageFolderId
                : gdriveConfig.videoFolderId;

            // Create readable stream from buffer
            const readableStream = new Readable();
            readableStream.push(fileBuffer);
            readableStream.push(null);

            // Generate unique filename with timestamp
            const uniqueFileName = `${Date.now()}_${fileName}`;

            // Upload file with supportsAllDrives for Shared Drives
            const response = await this.drive!.files.create({
                requestBody: {
                    name: uniqueFileName,
                    parents: [folderId],
                },
                media: {
                    mimeType: mimeType,
                    body: readableStream,
                },
                fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink',
                supportsAllDrives: true,  // Enable Shared Drive support
            });

            // Make the file publicly accessible
            await this.drive!.permissions.create({
                fileId: response.data.id!,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
                supportsAllDrives: true,  // Enable Shared Drive support
            });

            // Get the updated file info with sharing links
            const fileInfo = await this.drive!.files.get({
                fileId: response.data.id!,
                fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink',
            });

            return {
                success: true,
                fileId: fileInfo.data.id!,
                name: fileInfo.data.name!,
                mimeType: fileInfo.data.mimeType!,
                size: fileInfo.data.size!,
                webViewLink: fileInfo.data.webViewLink!,
                webContentLink: fileInfo.data.webContentLink || undefined,
                thumbnailLink: fileInfo.data.thumbnailLink || undefined,
            };
        } catch (error: any) {
            console.error('Error uploading file to Google Drive:', error);
            return {
                success: false,
                error: error.message || 'Failed to upload file to Google Drive'
            };
        }
    }

    /**
     * Get a direct download/view URL for a file
     */
    getDirectUrl(fileId: string, type: 'view' | 'download' = 'view'): string {
        if (type === 'download') {
            return `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
        // For images, use direct embedding URL
        return `https://drive.google.com/uc?id=${fileId}`;
    }

    /**
     * Get file information
     */
    async getFileInfo(fileId: string): Promise<FileInfo | null> {
        if (!this.isReady()) {
            console.error('Google Drive service is not initialized');
            return null;
        }

        try {
            const response = await this.drive!.files.get({
                fileId: fileId,
                fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, createdTime, modifiedTime',
            });

            return {
                id: response.data.id!,
                name: response.data.name!,
                mimeType: response.data.mimeType!,
                size: response.data.size!,
                webViewLink: response.data.webViewLink!,
                webContentLink: response.data.webContentLink!,
                thumbnailLink: response.data.thumbnailLink || undefined,
                createdTime: response.data.createdTime!,
                modifiedTime: response.data.modifiedTime!,
            };
        } catch (error) {
            console.error('Error getting file info from Google Drive:', error);
            return null;
        }
    }

    /**
     * List files in a folder
     */
    async listFiles(type: 'image' | 'video', limit: number = 50): Promise<FileInfo[]> {
        if (!this.isReady()) {
            console.error('Google Drive service is not initialized');
            return [];
        }

        try {
            const folderId = type === 'image'
                ? gdriveConfig.imageFolderId
                : gdriveConfig.videoFolderId;

            const response = await this.drive!.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'files(id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, createdTime, modifiedTime)',
                orderBy: 'createdTime desc',
                pageSize: limit,
            });

            return (response.data.files || []).map(file => ({
                id: file.id!,
                name: file.name!,
                mimeType: file.mimeType!,
                size: file.size!,
                webViewLink: file.webViewLink!,
                webContentLink: file.webContentLink!,
                thumbnailLink: file.thumbnailLink || undefined,
                createdTime: file.createdTime!,
                modifiedTime: file.modifiedTime!,
            }));
        } catch (error) {
            console.error('Error listing files from Google Drive:', error);
            return [];
        }
    }

    /**
     * Delete a file from Google Drive
     */
    async deleteFile(fileId: string): Promise<boolean> {
        if (!this.isReady()) {
            console.error('Google Drive service is not initialized');
            return false;
        }

        try {
            await this.drive!.files.delete({ fileId });
            return true;
        } catch (error) {
            console.error('Error deleting file from Google Drive:', error);
            return false;
        }
    }

    /**
     * Download a file as a buffer
     */
    async downloadFile(fileId: string): Promise<Buffer | null> {
        if (!this.isReady()) {
            console.error('Google Drive service is not initialized');
            return null;
        }

        try {
            const response = await this.drive!.files.get(
                { fileId, alt: 'media' },
                { responseType: 'arraybuffer' }
            );
            return Buffer.from(response.data as ArrayBuffer);
        } catch (error) {
            console.error('Error downloading file from Google Drive:', error);
            return null;
        }
    }
}

// Export singleton instance
export const gdriveService = new GoogleDriveService();
export default gdriveService;
