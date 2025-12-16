import React, { useState, useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';

interface FeedbackFormProps {
    userId?: string;
    username?: string;
    onSubmit?: (success: boolean) => void;
    compact?: boolean;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
    userId = 'anonymous',
    username = 'Anonymous',
    onSubmit,
    compact = false,
}) => {
    const [feedbackType, setFeedbackType] = useState<string>('general');
    const [message, setMessage] = useState<string>('');
    const [rating, setRating] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [hoveredRating, setHoveredRating] = useState<number>(0);

    const { submitFeedback, serviceReady, checkServiceStatus, error, clearError } = useDataStore();

    useEffect(() => {
        checkServiceStatus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim()) {
            return;
        }

        setIsSubmitting(true);
        clearError();

        const success = await submitFeedback(
            userId,
            username,
            feedbackType,
            message,
            rating > 0 ? rating : undefined
        );

        setIsSubmitting(false);

        if (success) {
            setSubmitted(true);
            setMessage('');
            setRating(0);
            setFeedbackType('general');

            setTimeout(() => {
                setSubmitted(false);
            }, 3000);
        }

        onSubmit?.(success);
    };

    const feedbackTypes = [
        { value: 'general', label: '💬 General', color: '#6366f1' },
        { value: 'bug', label: '🐛 Bug Report', color: '#ef4444' },
        { value: 'feature', label: '✨ Feature Request', color: '#22c55e' },
        { value: 'improvement', label: '🔧 Improvement', color: '#f59e0b' },
    ];

    if (!serviceReady) {
        return (
            <div style={styles.container}>
                <div style={styles.serviceUnavailable}>
                    <span style={styles.warningIcon}>⚠️</span>
                    <p>Feedback service is not available</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div style={styles.container}>
                <div style={styles.successMessage}>
                    <span style={styles.successIcon}>✅</span>
                    <h3 style={styles.successTitle}>Thank you for your feedback!</h3>
                    <p style={styles.successText}>Your input helps us improve SSCHATS.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...styles.container, ...(compact ? styles.containerCompact : {}) }}>
            <h3 style={styles.title}>📝 Send Feedback</h3>

            {error && (
                <div style={styles.errorBanner}>
                    <span>{error}</span>
                    <button onClick={clearError} style={styles.closeBtn}>×</button>
                </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
                {/* Feedback Type */}
                <div style={styles.typeSelector}>
                    {feedbackTypes.map((type) => (
                        <button
                            key={type.value}
                            type="button"
                            onClick={() => setFeedbackType(type.value)}
                            style={{
                                ...styles.typeButton,
                                backgroundColor: feedbackType === type.value
                                    ? type.color
                                    : 'rgba(255, 255, 255, 0.05)',
                                borderColor: type.color,
                                color: feedbackType === type.value ? 'white' : '#ccc',
                            }}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                {/* Rating */}
                <div style={styles.ratingSection}>
                    <label style={styles.label}>How would you rate your experience?</label>
                    <div style={styles.starContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                style={styles.starButton}
                            >
                                <span style={{
                                    ...styles.star,
                                    color: star <= (hoveredRating || rating) ? '#fbbf24' : '#4b5563',
                                }}>
                                    {star <= (hoveredRating || rating) ? '★' : '☆'}
                                </span>
                            </button>
                        ))}
                        {rating > 0 && (
                            <span style={styles.ratingText}>
                                {rating === 1 && 'Poor'}
                                {rating === 2 && 'Fair'}
                                {rating === 3 && 'Good'}
                                {rating === 4 && 'Very Good'}
                                {rating === 5 && 'Excellent'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Message */}
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Your Feedback</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us what's on your mind..."
                        style={styles.textarea}
                        rows={compact ? 3 : 5}
                        required
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    style={{
                        ...styles.submitButton,
                        opacity: isSubmitting || !message.trim() ? 0.6 : 1,
                    }}
                >
                    {isSubmitting ? (
                        <>
                            <span style={styles.spinner}>⏳</span>
                            Sending...
                        </>
                    ) : (
                        <>
                            <span>📤</span>
                            Send Feedback
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

// Styles
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px',
        backgroundColor: 'rgba(30, 30, 40, 0.9)',
        borderRadius: '16px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    containerCompact: {
        padding: '16px',
        gap: '12px',
    },
    title: {
        color: '#fff',
        fontSize: '20px',
        fontWeight: '600',
        margin: 0,
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
    successMessage: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px',
        textAlign: 'center',
    },
    successIcon: {
        fontSize: '48px',
        marginBottom: '16px',
    },
    successTitle: {
        color: '#22c55e',
        fontSize: '20px',
        margin: '0 0 8px 0',
    },
    successText: {
        color: '#9ca3af',
        margin: 0,
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    typeSelector: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
    },
    typeButton: {
        padding: '8px 16px',
        borderRadius: '20px',
        border: '1px solid',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
    },
    ratingSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        color: '#9ca3af',
        fontSize: '14px',
    },
    starContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    starButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        transition: 'transform 0.1s ease',
    },
    star: {
        fontSize: '28px',
        transition: 'color 0.1s ease',
    },
    ratingText: {
        marginLeft: '12px',
        color: '#fbbf24',
        fontSize: '14px',
        fontWeight: '500',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    textarea: {
        padding: '14px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '15px',
        resize: 'vertical',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        fontFamily: 'inherit',
    },
    submitButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '14px 24px',
        background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
        border: 'none',
        borderRadius: '12px',
        color: 'white',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    spinner: {
        animation: 'spin 1s linear infinite',
    },
};

export default FeedbackForm;
