import { Bookmark } from '../types';
import { ivToString, stringToIv } from './encryption';

export interface EncryptedBookmark {
    id: string | number;
    encryptedType: string; // Base64 JSON string of the bookmark type
    ivStr: string;
}

// Helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export async function encryptBookmark(termId: string | number, type: Bookmark, sharedKey: CryptoKey): Promise<EncryptedBookmark> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const jsonPayload = JSON.stringify({ type });
    const encodedPayload = new TextEncoder().encode(jsonPayload);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        sharedKey,
        encodedPayload
    );

    return {
        id: termId,
        encryptedType: arrayBufferToBase64(encryptedBuffer),
        ivStr: ivToString(iv)
    };
}

export async function decryptBookmark(encryptedBookmark: EncryptedBookmark, sharedKey: CryptoKey): Promise<Bookmark | null> {
    try {
        if (!encryptedBookmark.encryptedType || !encryptedBookmark.ivStr) {
            // It might be a legacy unencrypted bookmark
            return (encryptedBookmark as any).type as Bookmark;
        }

        const iv = stringToIv(encryptedBookmark.ivStr);
        const encryptedBuffer = base64ToArrayBuffer(encryptedBookmark.encryptedType);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv as any },
            sharedKey,
            encryptedBuffer
        );

        const jsonPayload = new TextDecoder().decode(decryptedBuffer);
        const data = JSON.parse(jsonPayload);

        return data.type as Bookmark;
    } catch (e) {
        console.error("Failed to decrypt bookmark:", e);
        return null;
    }
}
