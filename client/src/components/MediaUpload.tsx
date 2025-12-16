import React, { useState, useRef, useEffect } from 'react';
import { useMediaStore } from '../stores/mediaStore';
import type { MediaFile } from '../stores/mediaStore';

interface MediaUploadProps {
    type: 'image' | 'video';
    onUpload?: (file: MediaFile) => void;
    onSelect?: (file: MediaFile) => void;
    showGallery?: boolean;
    compact?: boolean;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
    type,
    onUpload,
    onSelect,
    showGallery = true,
    compact = false,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const {
        images,
        videos,
        uploadProgress,
        isLoading,
        error,
        serviceReady,
        checkServiceStatus,
        uploadImage,
        uploadVideo,
        fetchImages,
        fetchVideos,
        clearError,
        removeFromProgress,
    } = useMediaStore();

    const files = type === 'image' ? images : videos;
    const uploadFn = type === 'image' ? uploadImage : uploadVideo;
    const fetchFn = type === 'image' ? fetchImages : fetchVideos;

    useEffect(() => {
        checkServiceStatus();
        if (showGallery) {
            fetchFn();
        }
    }, [type, showGallery]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file: File) => {
        // Validate file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (type === 'image' && !isImage) {
            alert('Please select an image file');
            return;
        }
        if (type === 'video' && !isVideo) {
            alert('Please select a video file');
            return;
        }

        setSelectedFile(file);

        // Create preview
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        const result = await uploadFn(selectedFile);

        if (result) {
            setSelectedFile(null);
            setPreviewUrl(null);
            onUpload?.(result);
        }
    };

    const handleFileSelect = (file: MediaFile) => {
        onSelect?.(file);
    };

    const formatFileSize = (sizeStr: string): string => {
        const size = parseInt(sizeStr);
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (!serviceReady) {
        return (
            <div className="media-upload-container" style={styles.container}>
                <div style={styles.serviceUnavailable}>
                    <span style={styles.warningIcon}>⚠️</span>
                    <p>Google Drive service is not available</p>
                    <small>Please configure the service credentials</small>
                </div>
            </div>
        );
    }

    return (
        <div className="media-upload-container" style={styles.container}>
            {error && (
                <div style={styles.errorBanner}>
                    <span>{error}</span>
                    <button onClick={clearError} style={styles.closeBtn}>×</button>
                </div>
            )}

            {/* Upload Zone */}
            <div
                style={{
                    ...styles.dropZone,
                    ...(dragActive ? styles.dropZoneActive : {}),
                    ...(compact ? styles.dropZoneCompact : {}),
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={type === 'image' ? 'image/*' : 'video/*'}
                    onChange={handleChange}
                    style={styles.hiddenInput}
                />

                {previewUrl ? (
                    <div style={styles.previewContainer}>
                        {type === 'image' ? (
                            <img src={previewUrl} alt="Preview" style={styles.previewImage} />
                        ) : (
                            <video src={previewUrl} style={styles.previewVideo} controls />
                        )}
                        <div style={styles.previewActions}>
                            <span style={styles.fileName}>{selectedFile?.name}</span>
                            <div style={styles.buttonGroup}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewUrl(null);
                                        setSelectedFile(null);
                                    }}
                                    style={styles.cancelBtn}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpload();
                                    }}
                                    style={styles.uploadBtn}
                                >
                                    Upload
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={styles.dropContent}>
                        <span style={styles.uploadIcon}>
                            {type === 'image' ? '🖼️' : '🎬'}
                        </span>
                        <p style={styles.dropText}>
                            Drag & drop {type === 'image' ? 'an image' : 'a video'} here
                        </p>
                        <span style={styles.orText}>or</span>
                        <span style={styles.browseText}>Click to browse</span>
                    </div>
                )}
            </div>

            {/* Upload Progress */}
            {uploadProgress.length > 0 && (
                <div style={styles.progressContainer}>
                    {uploadProgress.map((item) => (
                        <div key={item.fileId} style={styles.progressItem}>
                            <span style={styles.progressFileName}>{item.fileName}</span>
                            <div style={styles.progressBarBg}>
                                <div
                                    style={{
                                        ...styles.progressBar,
                                        width: item.status === 'uploading' ? '60%' :
                                            item.status === 'completed' ? '100%' : '0%',
                                        backgroundColor: item.status === 'error' ? '#ef4444' :
                                            item.status === 'completed' ? '#22c55e' : '#3b82f6',
                                    }}
                                />
                            </div>
                            <span style={styles.progressStatus}>
                                {item.status === 'uploading' && '⏳ Uploading...'}
                                {item.status === 'completed' && '✅ Complete'}
                                {item.status === 'error' && `❌ ${item.error}`}
                            </span>
                            {item.status !== 'uploading' && (
                                <button
                                    onClick={() => removeFromProgress(item.fileId)}
                                    style={styles.removeProgressBtn}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Gallery */}
            {showGallery && (
                <div style={styles.gallery}>
                    <h4 style={styles.galleryTitle}>
                        {type === 'image' ? '📷 Your Images' : '🎥 Your Videos'}
                    </h4>
                    {isLoading ? (
                        <div style={styles.loadingSpinner}>Loading...</div>
                    ) : files.length === 0 ? (
                        <div style={styles.emptyGallery}>
                            No {type}s uploaded yet
                        </div>
                    ) : (
                        <div style={styles.galleryGrid}>
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    style={styles.galleryItem}
                                    onClick={() => handleFileSelect(file)}
                                >
                                    {type === 'image' ? (
                                        <img
                                            src={file.thumbnailLink || file.url}
                                            alt={file.name}
                                            style={styles.galleryImage}
                                        />
                                    ) : (
                                        <div style={styles.videoThumbnail}>
                                            <span style={styles.playIcon}>▶️</span>
                                        </div>
                                    )}
                                    <div style={styles.fileInfo}>
                                        <span style={styles.fileNameSmall}>{file.name}</span>
                                        <span style={styles.fileSizeSmall}>
                                            {formatFileSize(file.size)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Styles
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        backgroundColor: 'rgba(30, 30, 40, 0.8)',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
    },
    serviceUnavailable: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px',
        textAlign: 'center',
        color: '#fbbf24',
    },
    warningIcon: {
        fontSize: '48px',
        marginBottom: '12px',
    },
    errorBanner: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        border: '1px solid rgba(239, 68, 68, 0.5)',
        borderRadius: '8px',
        color: '#fca5a5',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#fca5a5',
        fontSize: '20px',
        cursor: 'pointer',
    },
    dropZone: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        border: '2px dashed rgba(147, 51, 234, 0.5)',
        borderRadius: '12px',
        backgroundColor: 'rgba(147, 51, 234, 0.05)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
    },
    dropZoneActive: {
        borderColor: '#a855f7',
        backgroundColor: 'rgba(147, 51, 234, 0.15)',
        transform: 'scale(1.02)',
    },
    dropZoneCompact: {
        padding: '20px',
    },
    hiddenInput: {
        display: 'none',
    },
    dropContent: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    uploadIcon: {
        fontSize: '48px',
    },
    dropText: {
        fontSize: '16px',
        color: '#e0e0e0',
        margin: 0,
    },
    orText: {
        color: '#888',
        fontSize: '14px',
    },
    browseText: {
        color: '#a855f7',
        fontWeight: '600',
        textDecoration: 'underline',
    },
    previewContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        width: '100%',
    },
    previewImage: {
        maxWidth: '100%',
        maxHeight: '200px',
        borderRadius: '8px',
        objectFit: 'contain',
    },
    previewVideo: {
        maxWidth: '100%',
        maxHeight: '200px',
        borderRadius: '8px',
    },
    previewActions: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
    },
    fileName: {
        color: '#ccc',
        fontSize: '14px',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    buttonGroup: {
        display: 'flex',
        gap: '12px',
    },
    cancelBtn: {
        padding: '10px 20px',
        backgroundColor: 'transparent',
        border: '1px solid rgba(239, 68, 68, 0.5)',
        color: '#ef4444',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '500',
        transition: 'all 0.2s ease',
    },
    uploadBtn: {
        padding: '10px 24px',
        background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
        border: 'none',
        color: 'white',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'all 0.2s ease',
    },
    progressContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    progressItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
    },
    progressFileName: {
        flex: 1,
        color: '#ccc',
        fontSize: '13px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    progressBarBg: {
        width: '100px',
        height: '6px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '3px',
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: '3px',
        transition: 'width 0.3s ease',
    },
    progressStatus: {
        fontSize: '12px',
        color: '#888',
        minWidth: '100px',
    },
    removeProgressBtn: {
        background: 'none',
        border: 'none',
        color: '#888',
        fontSize: '16px',
        cursor: 'pointer',
    },
    gallery: {
        marginTop: '16px',
    },
    galleryTitle: {
        color: '#e0e0e0',
        fontSize: '16px',
        marginBottom: '12px',
    },
    loadingSpinner: {
        textAlign: 'center',
        color: '#888',
        padding: '20px',
    },
    emptyGallery: {
        textAlign: 'center',
        color: '#666',
        padding: '32px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
    },
    galleryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '12px',
    },
    galleryItem: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    galleryImage: {
        width: '100%',
        height: '100px',
        objectFit: 'cover',
    },
    videoThumbnail: {
        width: '100%',
        height: '100px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
    },
    playIcon: {
        fontSize: '32px',
    },
    fileInfo: {
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    fileNameSmall: {
        fontSize: '11px',
        color: '#ccc',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    fileSizeSmall: {
        fontSize: '10px',
        color: '#888',
    },
};

export default MediaUpload;
