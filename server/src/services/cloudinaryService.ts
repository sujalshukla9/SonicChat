import { v2 as cloudinary } from 'cloudinary';
import cloudinaryConfig from '../config/cloudinary';

interface UploadResult {
    success: boolean;
    url?: string;
    publicId?: string;
    format?: string;
    resourceType?: string;
    width?: number;
    height?: number;
    bytes?: number;
    error?: string;
}

class CloudinaryService {
    private initialized: boolean = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        if (!cloudinaryConfig.cloudName || !cloudinaryConfig.apiKey || !cloudinaryConfig.apiSecret) {
            console.log('⚠️ Cloudinary credentials not found in environment variables');
            console.log('📋 Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
            return;
        }

        cloudinary.config({
            cloud_name: cloudinaryConfig.cloudName,
            api_key: cloudinaryConfig.apiKey,
            api_secret: cloudinaryConfig.apiSecret,
            secure: true
        });

        this.initialized = true;
        console.log('✅ Cloudinary service initialized successfully');
    }

    isReady(): boolean {
        return this.initialized;
    }

    /**
     * Upload a file to Cloudinary
     */
    async uploadFile(
        fileBuffer: Buffer,
        fileName: string,
        mimeType: string,
        type: 'image' | 'video' | 'audio' | 'document'
    ): Promise<UploadResult> {
        if (!this.isReady()) {
            return {
                success: false,
                error: 'Cloudinary service is not initialized. Please check your credentials.'
            };
        }

        try {
            // Validate file type
            let allowedTypes: string[];
            let maxSize: number;
            let resourceType: 'image' | 'video' | 'raw';
            let folder: string;

            switch (type) {
                case 'image':
                    allowedTypes = cloudinaryConfig.allowedImageTypes;
                    maxSize = cloudinaryConfig.maxImageSize;
                    resourceType = 'image';
                    folder = cloudinaryConfig.folders.images;
                    break;
                case 'video':
                    allowedTypes = cloudinaryConfig.allowedVideoTypes;
                    maxSize = cloudinaryConfig.maxVideoSize;
                    resourceType = 'video';
                    folder = cloudinaryConfig.folders.videos;
                    break;
                case 'audio':
                    allowedTypes = cloudinaryConfig.allowedVideoTypes; // Re-use video types list or separate them if preferred
                    maxSize = cloudinaryConfig.maxVideoSize;
                    resourceType = 'video'; // Cloudinary uses 'video' for audio files
                    folder = cloudinaryConfig.folders.audio;
                    break;
                case 'document':
                    allowedTypes = cloudinaryConfig.allowedDocumentTypes;
                    maxSize = cloudinaryConfig.maxDocumentSize;
                    resourceType = 'raw';
                    folder = cloudinaryConfig.folders.documents;
                    break;
                default:
                    return { success: false, error: 'Invalid file type' };
            }

            if (!allowedTypes.includes(mimeType)) {
                return {
                    success: false,
                    error: `Invalid file type: ${mimeType}. Allowed: ${allowedTypes.join(', ')}`
                };
            }

            if (fileBuffer.length > maxSize) {
                return {
                    success: false,
                    error: `File too large. Maximum: ${maxSize / (1024 * 1024)}MB`
                };
            }

            // Generate unique filename
            const uniqueFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

            // Upload to Cloudinary
            const result = await new Promise<any>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: folder,
                        public_id: uniqueFileName.replace(/\.[^/.]+$/, ''), // Remove extension
                        resource_type: resourceType,
                        overwrite: true,
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(fileBuffer);
            });

            console.log(`✅ File uploaded to Cloudinary: ${result.secure_url}`);

            return {
                success: true,
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                resourceType: result.resource_type,
                width: result.width,
                height: result.height,
                bytes: result.bytes
            };
        } catch (error: any) {
            console.error('❌ Error uploading file to Cloudinary:', error);
            return {
                success: false,
                error: error.message || 'Failed to upload file to Cloudinary'
            };
        }
    }

    /**
     * Delete a file from Cloudinary
     */
    async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<boolean> {
        if (!this.isReady()) return false;

        try {
            await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
            console.log(`✅ File deleted from Cloudinary: ${publicId}`);
            return true;
        } catch (error: any) {
            console.error('❌ Error deleting file from Cloudinary:', error);
            return false;
        }
    }

    /**
     * Get optimized URL for an image
     */
    getOptimizedImageUrl(publicId: string, options: { width?: number; height?: number; quality?: string } = {}): string {
        return cloudinary.url(publicId, {
            fetch_format: 'auto',
            quality: options.quality || 'auto',
            width: options.width,
            height: options.height,
            crop: options.width || options.height ? 'fill' : undefined
        });
    }
}

// Export singleton instance
const cloudinaryService = new CloudinaryService();
export default cloudinaryService;
