// Cloudinary Configuration
const cloudinaryConfig = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',

    // Upload settings
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxVideoSize: 100 * 1024 * 1024, // 100MB
    maxDocumentSize: 20 * 1024 * 1024, // 20MB

    // Allowed file types
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp3'],
    allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],

    // Folders for organization
    folders: {
        images: 'sschats/images',
        videos: 'sschats/videos',
        audio: 'sschats/audio',
        documents: 'sschats/documents'
    }
};

export default cloudinaryConfig;
