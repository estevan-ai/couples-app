
/**
 * Zero-Knowledge Encryption Utilities
 * Supports AES-GCM (Symmetric) and RSA-OAEP (Asymmetric)
 */

// --- 1. AES (Symmetric) Logic ---

// Generate a disposable AES key for ONE image/file
export async function generateAESKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

// Encrypt Blob with AES key
export async function encryptBlob(blob: Blob, key: CryptoKey): Promise<{ encryptedBlob: Blob; iv: Uint8Array }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const data = await blob.arrayBuffer();

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        data
    );

    // No need to combine IV here if we store it separately, 
    // BUT for the ZK architecture, we often want a single blob.
    // The user's snippet suggested: IV + EncryptedData.
    // Let's support both or follow the snippet. 
    // The snippet was: finalBuffer = iv + data.

    // We will return the raw parts for maximum flexibility, 
    // user snippet logic can be implemented in the caller or here.
    return {
        encryptedBlob: new Blob([encryptedBuffer], { type: 'application/octet-stream' }),
        iv: iv
    };
}

// Decrypt Blob with AES key
export async function decryptBlob(encryptedBlob: Blob, key: CryptoKey, iv: Uint8Array): Promise<Blob> {
    const data = await encryptedBlob.arrayBuffer();

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        data
    );

    return new Blob([decryptedBuffer]);
}

// --- 2. RSA (Asymmetric) Logic ---

// Generate RSA-OAEP Key Pair (2048-bit)
export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
}

// Export Public Key (SubjectPublicKeyInfo) -> Base64
export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return arrayBufferToBase64(exported);
}

// Import Public Key (SubjectPublicKeyInfo) <- Base64
export async function importPublicKey(pem: string): Promise<CryptoKey> {
    const binary = base64ToArrayBuffer(pem);
    return await window.crypto.subtle.importKey(
        "spki",
        binary,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt", "wrapKey"]
    );
}

// Export Private Key (PKCS8) -> Base64 (For backup/local storage)
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("pkcs8", key);
    return arrayBufferToBase64(exported);
}

// Import Private Key (PKCS8) <- Base64
export async function importPrivateKey(pem: string): Promise<CryptoKey> {
    const binary = base64ToArrayBuffer(pem);
    return await window.crypto.subtle.importKey(
        "pkcs8",
        binary,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt", "unwrapKey"]
    );
}

// --- 3. Hybrid Logic (Key Wrapping) ---

// Wrap (Encrypt) an AES Key using a Public RSA Key
export async function wrapAESKey(aesKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
    // Export raw AES bytes
    const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

    // Encrypt with RSA Public Key
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        rawAesKey
    );

    return arrayBufferToBase64(encryptedKeyBuffer);
}

// Unwrap (Decrypt) an AES Key using a Private RSA Key
export async function unwrapAESKey(encryptedKeyBase64: string, privateKey: CryptoKey): Promise<CryptoKey> {
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyBase64);

    const decryptedRawKey = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        encryptedKeyBuffer
    );

    return await window.crypto.subtle.importKey(
        "raw",
        decryptedRawKey,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
}


// --- 4. Helpers ---

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

// Legacy Helpers (from previous implementation)
export async function generateKeyOld(): Promise<CryptoKey> {
    return generateAESKey();
}
export async function exportKeyOld(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(exported);
}
export async function importKeyOld(keyStr: string): Promise<CryptoKey> {
    const binary = base64ToArrayBuffer(keyStr);
    return await window.crypto.subtle.importKey(
        "raw",
        binary,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
}
export function ivToString(iv: Uint8Array): string {
    return arrayBufferToBase64(iv);
}
export function stringToIv(ivStr: string): Uint8Array {
    return new Uint8Array(base64ToArrayBuffer(ivStr));
}
