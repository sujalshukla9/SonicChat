import express from 'express';
import multer from 'multer';
import cloudinaryService from '../services/cloudinaryService';
import cloudinaryConfig from '../config/cloudinary';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: cloudinaryConfig.maxVideoSize, // Use the larger limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            ...cloudinaryConfig.allowedImageTypes,
            ...cloudinaryConfig.allowedVideoTypes,
            ...cloudinaryConfig.allowedDocumentTypes
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`));
        }
    }
});

/**
 * @route   POST /api/media/upload/image
 * @desc    Upload an image to Cloudinary
 */
router.post('/upload/image', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        if (!cloudinaryService.isReady()) {
            res.status(503).json({
                error: 'Cloudinary service is not available',
                message: 'Please configure Cloudinary credentials in environment variables'
            });
            return;
        }

        const result = await cloudinaryService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'image'
        );

        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        res.status(201).json({
            message: 'Image uploaded successfully',
            file: {
                url: result.url,
                publicId: result.publicId,
                format: result.format,
                width: result.width,
                height: result.height,
                size: result.bytes,
            }
        });
    } catch (error: any) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: error.message || 'Failed to upload image' });
    }
});

/**
 * @route   POST /api/media/upload/video
 * @desc    Upload a video to Cloudinary
 */
router.post('/upload/video', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        if (!cloudinaryService.isReady()) {
            res.status(503).json({
                error: 'Cloudinary service is not available',
                message: 'Please configure Cloudinary credentials in environment variables'
            });
            return;
        }

        const result = await cloudinaryService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'video'
        );

        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        res.status(201).json({
            message: 'Video uploaded successfully',
            file: {
                url: result.url,
                publicId: result.publicId,
                format: result.format,
                size: result.bytes,
            }
        });
    } catch (error: any) {
        console.error('Error uploading video:', error);
        res.status(500).json({ error: error.message || 'Failed to upload video' });
    }
});

/**
 * @route   POST /api/media/upload/audio
 * @desc    Upload an audio file to Cloudinary
 */
router.post('/upload/audio', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        if (!cloudinaryService.isReady()) {
            res.status(503).json({
                error: 'Cloudinary service is not available',
                message: 'Please configure Cloudinary credentials in environment variables'
            });
            return;
        }

        const result = await cloudinaryService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'audio'
        );

        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        res.status(201).json({
            message: 'Audio uploaded successfully',
            file: {
                url: result.url,
                publicId: result.publicId,
                format: result.format,
                size: result.bytes,
            }
        });
    } catch (error: any) {
        console.error('Error uploading audio:', error);
        res.status(500).json({ error: error.message || 'Failed to upload audio' });
    }
});

/**
 * @route   POST /api/media/upload/document
 * @desc    Upload a document to Cloudinary
 */
router.post('/upload/document', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        if (!cloudinaryService.isReady()) {
            res.status(503).json({
                error: 'Cloudinary service is not available',
                message: 'Please configure Cloudinary credentials in environment variables'
            });
            return;
        }

        const result = await cloudinaryService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'document'
        );

        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        res.status(201).json({
            message: 'Document uploaded successfully',
            file: {
                url: result.url,
                publicId: result.publicId,
                name: req.file.originalname,
                size: result.bytes,
            }
        });
    } catch (error: any) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: error.message || 'Failed to upload document' });
    }
});

/**
 * @route   DELETE /api/media/file/:publicId
 * @desc    Delete a file from Cloudinary
 */
router.delete('/file/:publicId', async (req, res) => {
    try {
        if (!cloudinaryService.isReady()) {
            res.status(503).json({
                error: 'Cloudinary service is not available'
            });
            return;
        }

        const { publicId } = req.params;
        const resourceType = (req.query.type as 'image' | 'video' | 'raw') || 'image';

        const success = await cloudinaryService.deleteFile(publicId, resourceType);

        if (!success) {
            res.status(404).json({ error: 'File not found or could not be deleted' });
            return;
        }

        res.json({ message: 'File deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: error.message || 'Failed to delete file' });
    }
});

/**
 * @route   GET /api/media/status
 * @desc    Check Cloudinary service status
 */
router.get('/status', (req, res) => {
    res.json({
        ready: cloudinaryService.isReady(),
        provider: 'Cloudinary',
        maxImageSize: `${cloudinaryConfig.maxImageSize / (1024 * 1024)}MB`,
        maxVideoSize: `${cloudinaryConfig.maxVideoSize / (1024 * 1024)}MB`,
        maxDocumentSize: `${cloudinaryConfig.maxDocumentSize / (1024 * 1024)}MB`,
        allowedImageTypes: cloudinaryConfig.allowedImageTypes,
        allowedVideoTypes: cloudinaryConfig.allowedVideoTypes,
        allowedDocumentTypes: cloudinaryConfig.allowedDocumentTypes,
    });
});

export default router;
