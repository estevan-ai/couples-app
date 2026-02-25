import { Bounty } from '../types';
import { ivToString, stringToIv } from './encryption';

export interface EncryptedBounty {
    id: string | number;
    status: Bounty['status'];
    postedBy: string; // Needed for querying who owns it easily
    claimedBy: string | null; // Needed for filtering claimed vs unclaimed
    encryptedPayload: string; // Base64 JSON string of the rest of the Bounty
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

export async function encryptBounty(bounty: Bounty, sharedKey: CryptoKey): Promise<EncryptedBounty> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Extract the public fields that Firebase needs to query/filter
    const { id, status, postedBy, claimedBy, ...privateData } = bounty;

    const jsonPayload = JSON.stringify(privateData);
    const encodedPayload = new TextEncoder().encode(jsonPayload);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        sharedKey,
        encodedPayload
    );

    return {
        id,
        status,
        postedBy,
        claimedBy,
        encryptedPayload: arrayBufferToBase64(encryptedBuffer),
        ivStr: ivToString(iv)
    };
}

export async function decryptBounty(encryptedBounty: EncryptedBounty, sharedKey: CryptoKey): Promise<Bounty | null> {
    try {
        if (!encryptedBounty.encryptedPayload || !encryptedBounty.ivStr) {
            // It might be a legacy unencrypted bounty
            return encryptedBounty as any as Bounty;
        }

        const iv = stringToIv(encryptedBounty.ivStr);
        const encryptedBuffer = base64ToArrayBuffer(encryptedBounty.encryptedPayload);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv as any },
            sharedKey,
            encryptedBuffer
        );

        const jsonPayload = new TextDecoder().decode(decryptedBuffer);
        const privateData = JSON.parse(jsonPayload);

        return {
            ...privateData,
            id: encryptedBounty.id,
            status: encryptedBounty.status,
            postedBy: encryptedBounty.postedBy,
            claimedBy: encryptedBounty.claimedBy
        } as Bounty;
    } catch (e) {
        console.error("Failed to decrypt bounty:", e);
        return null; // Silent fail (will be filtered out)
    }
}
