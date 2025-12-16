// Google Drive Configuration
export const gdriveConfig = {
    // Your Google Drive Folder IDs
    imageFolderId: process.env.GDRIVE_IMAGE_FOLDER_ID || '19z-sLL6Ex8Q7inh0DXVAy3A6vO4g_N0_',
    videoFolderId: process.env.GDRIVE_VIDEO_FOLDER_ID || '1ZOulhTpE_sOdxkQG1JTVq2Ant8AX6-yy',

    // File size limits (in bytes)
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxVideoSize: 100 * 1024 * 1024, // 100MB

    // Allowed file types
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],

    // Google API Scopes
    scopes: ['https://www.googleapis.com/auth/drive.file'],
};

export default gdriveConfig;
