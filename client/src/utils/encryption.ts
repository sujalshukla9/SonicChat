// End-to-end encryption utilities using Web Crypto API

// Generate RSA key pair for asymmetric encryption
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
    return await window.crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
        },
        true, // extractable
        ['encrypt', 'decrypt']
    );
};

// Export public key to base64 string for storage/transmission
export const exportPublicKey = async (publicKey: CryptoKey): Promise<string> => {
    const exported = await window.crypto.subtle.exportKey('spki', publicKey);
    return arrayBufferToBase64(exported);
};

// Export private key to base64 string for local storage
export const exportPrivateKey = async (privateKey: CryptoKey): Promise<string> => {
    const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
    return arrayBufferToBase64(exported);
};

// Import public key from base64 string
export const importPublicKey = async (publicKeyBase64: string): Promise<CryptoKey> => {
    const keyData = base64ToArrayBuffer(publicKeyBase64);
    return await window.crypto.subtle.importKey(
        'spki',
        keyData,
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
        },
        true,
        ['encrypt']
    );
};

// Import private key from base64 string
export const importPrivateKey = async (privateKeyBase64: string): Promise<CryptoKey> => {
    const keyData = base64ToArrayBuffer(privateKeyBase64);
    return await window.crypto.subtle.importKey(
        'pkcs8',
        keyData,
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
        },
        true,
        ['decrypt']
    );
};

// Encrypt a message with recipient's public key
export const encryptMessage = async (message: string, publicKey: CryptoKey): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // RSA-OAEP can only encrypt limited data, so we use hybrid encryption
    // Generate a random AES key for the message
    const aesKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the message with AES
    const encryptedMessage = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        data
    );

    // Export and encrypt the AES key with RSA
    const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
    const encryptedAesKey = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        exportedAesKey
    );

    // Combine: IV (12 bytes) + encrypted AES key length (4 bytes) + encrypted AES key + encrypted message
    const encryptedKeyArray = new Uint8Array(encryptedAesKey);
    const encryptedMessageArray = new Uint8Array(encryptedMessage);

    const combined = new Uint8Array(12 + 4 + encryptedKeyArray.length + encryptedMessageArray.length);
    combined.set(iv, 0);
    combined.set(new Uint8Array(new Uint32Array([encryptedKeyArray.length]).buffer), 12);
    combined.set(encryptedKeyArray, 16);
    combined.set(encryptedMessageArray, 16 + encryptedKeyArray.length);

    return arrayBufferToBase64(combined.buffer);
};

// Decrypt a message with own private key
export const decryptMessage = async (encryptedData: string, privateKey: CryptoKey): Promise<string> => {
    try {
        const combined = new Uint8Array(base64ToArrayBuffer(encryptedData));

        // Extract IV
        const iv = combined.slice(0, 12);

        // Extract encrypted AES key length
        const keyLengthBytes = combined.slice(12, 16);
        const keyLength = new Uint32Array(keyLengthBytes.buffer)[0];

        // Extract encrypted AES key
        const encryptedAesKey = combined.slice(16, 16 + keyLength);

        // Extract encrypted message
        const encryptedMessage = combined.slice(16 + keyLength);

        // Decrypt the AES key with RSA
        const aesKeyData = await window.crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            privateKey,
            encryptedAesKey
        );

        // Import the AES key
        const aesKey = await window.crypto.subtle.importKey(
            'raw',
            aesKeyData,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        // Decrypt the message with AES
        const decryptedData = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            encryptedMessage
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
    } catch (error) {
        console.error('Decryption failed:', error);
        return '[Unable to decrypt message]';
    }
};

// Helper: ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

// Helper: Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

// Store keys in localStorage
const PRIVATE_KEY_STORAGE_KEY = 'sschats_private_key';
const PUBLIC_KEY_STORAGE_KEY = 'sschats_public_key';

export const storeKeys = async (keyPair: CryptoKeyPair): Promise<void> => {
    const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
    const privateKeyBase64 = await exportPrivateKey(keyPair.privateKey);

    localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, publicKeyBase64);
    localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKeyBase64);
};

export const getStoredPublicKey = (): string | null => {
    return localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
};

export const getStoredPrivateKey = async (): Promise<CryptoKey | null> => {
    const privateKeyBase64 = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    if (!privateKeyBase64) return null;

    try {
        return await importPrivateKey(privateKeyBase64);
    } catch (error) {
        console.error('Failed to import stored private key:', error);
        return null;
    }
};

export const hasStoredKeys = (): boolean => {
    return !!(localStorage.getItem(PUBLIC_KEY_STORAGE_KEY) && localStorage.getItem(PRIVATE_KEY_STORAGE_KEY));
};

// Initialize or get existing keys
export const initializeEncryption = async (): Promise<{ publicKey: string; privateKey: CryptoKey }> => {
    if (hasStoredKeys()) {
        const publicKey = getStoredPublicKey()!;
        const privateKey = await getStoredPrivateKey();
        if (privateKey) {
            console.log('🔐 Using existing encryption keys');
            return { publicKey, privateKey };
        }
    }

    // Generate new key pair
    console.log('🔐 Generating new encryption keys...');
    const keyPair = await generateKeyPair();
    await storeKeys(keyPair);

    const publicKey = await exportPublicKey(keyPair.publicKey);
    console.log('🔐 New encryption keys generated');

    return { publicKey, privateKey: keyPair.privateKey };
};
