import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { API_URL } from '../config/api';
import {
    initializeEncryption,
    encryptMessage,
    decryptMessage,
    importPublicKey
} from '../utils/encryption';

interface UseEncryptionReturn {
    isReady: boolean;
    encrypt: (message: string, recipientId: string) => Promise<string>;
    decrypt: (encryptedMessage: string) => Promise<string>;
}

// Cache for recipient public keys
const publicKeyCache = new Map<string, CryptoKey>();

export const useEncryption = (): UseEncryptionReturn => {
    const { token, user } = useAuthStore();
    const [isReady, setIsReady] = useState(false);
    const privateKeyRef = useRef<CryptoKey | null>(null);
    const initializingRef = useRef(false);

    // Initialize encryption on mount
    useEffect(() => {
        const init = async () => {
            if (!token || !user || initializingRef.current) return;

            initializingRef.current = true;

            try {
                const { publicKey, privateKey } = await initializeEncryption();
                privateKeyRef.current = privateKey;

                // Upload public key to server
                await fetch(`${API_URL}/api/auth/public-key`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ publicKey })
                });

                console.log('🔐 E2E encryption initialized');
                setIsReady(true);
            } catch (error) {
                console.error('Failed to initialize encryption:', error);
            } finally {
                initializingRef.current = false;
            }
        };

        init();
    }, [token, user]);

    // Get recipient's public key (with caching)
    const getRecipientPublicKey = useCallback(async (recipientId: string): Promise<CryptoKey | null> => {
        // Check cache first
        if (publicKeyCache.has(recipientId)) {
            return publicKeyCache.get(recipientId)!;
        }

        try {
            const response = await fetch(`${API_URL}/api/auth/public-key/${recipientId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.warn(`No public key found for user ${recipientId}`);
                return null;
            }

            const { publicKey: publicKeyBase64 } = await response.json();
            const publicKey = await importPublicKey(publicKeyBase64);

            // Cache the key
            publicKeyCache.set(recipientId, publicKey);

            return publicKey;
        } catch (error) {
            console.error('Failed to get recipient public key:', error);
            return null;
        }
    }, [token]);

    // Encrypt a message for a recipient
    const encrypt = useCallback(async (message: string, recipientId: string): Promise<string> => {
        if (!isReady) {
            console.warn('Encryption not ready, sending unencrypted');
            return message;
        }

        const recipientPublicKey = await getRecipientPublicKey(recipientId);

        if (!recipientPublicKey) {
            console.warn('Recipient has no public key, sending unencrypted');
            return message;
        }

        try {
            const encrypted = await encryptMessage(message, recipientPublicKey);
            return `🔒${encrypted}`; // Prefix to identify encrypted messages
        } catch (error) {
            console.error('Encryption failed:', error);
            return message;
        }
    }, [isReady, getRecipientPublicKey]);

    // Decrypt a message
    const decrypt = useCallback(async (encryptedMessage: string): Promise<string> => {
        // Check if message is encrypted (has 🔒 prefix)
        if (!encryptedMessage.startsWith('🔒')) {
            return encryptedMessage; // Not encrypted
        }

        if (!privateKeyRef.current) {
            console.warn('No private key available for decryption');
            return '[Encrypted message - key not available]';
        }

        try {
            const ciphertext = encryptedMessage.substring(2); // Remove 🔒 prefix
            return await decryptMessage(ciphertext, privateKeyRef.current);
        } catch (error) {
            console.error('Decryption failed:', error);
            return '[Unable to decrypt message]';
        }
    }, []);

    return { isReady, encrypt, decrypt };
};
