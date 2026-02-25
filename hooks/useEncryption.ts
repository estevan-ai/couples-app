import { useState, useEffect } from 'react';
import {
    generateRSAKeyPair,
    exportPublicKey,
    exportPrivateKey,
    importPrivateKey,
    importPublicKey,
    generateAESKey,
    wrapAESKey,
    unwrapAESKey,
    arrayBufferToBase64,
    base64ToArrayBuffer,
    importKeyOld
} from '../utils/encryption';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface EncryptionState {
    privateKey: CryptoKey | null;
    publicKey: CryptoKey | null;
    publicKeyBase64: string | null;
    sharedKey: CryptoKey | null;
    status: 'locked' | 'unlocked' | 'initializing' | 'no-keys' | 'broken-identity';
}

const STORAGE_KEY_PRIVATE = 'couple_currency_private_key';

export const useEncryption = (userUid: string | undefined, userData?: any) => {
    const [state, setState] = useState<EncryptionState>({
        privateKey: null,
        publicKey: null,
        publicKeyBase64: null,
        sharedKey: null,
        status: 'initializing'
    });

    // Track internal errors for the UI
    const [lastError, setLastError] = useState<string | null>(null);

    // 1. Load Keys on Mount
    useEffect(() => {
        if (!userUid) {
            setState(s => ({ ...s, status: 'no-keys' }));
            return;
        }
        loadIdentity();
    }, [userUid]);

    // Initial Load Logic
    const loadIdentity = async () => {
        try {
            // A. Try Local Storage for Private Key
            const storedPem = localStorage.getItem(`${STORAGE_KEY_PRIVATE}_${userUid}`);
            let privateKey: CryptoKey | null = null;

            if (storedPem) {
                console.warn(`[useEncryption] Loaded Private Key starting with: ${storedPem.substring(0, 20)}...`);
                privateKey = await importPrivateKey(storedPem);
            }

            // B. Check userData or Fetch from Firestore
            const data = userData || (userUid ? (await getDoc(doc(db, 'users', userUid))).data() : null);

            if (data) {
                // 1. Load Public Key if present
                let publicKey: CryptoKey | null = null;
                if (data.publicKey) {
                    publicKey = await importPublicKey(data.publicKey);
                    setState(prev => ({
                        ...prev,
                        privateKey,
                        publicKey,
                        publicKeyBase64: data.publicKey,
                        status: 'locked'
                    }));
                } else {
                    setState(prev => ({ ...prev, privateKey, status: 'no-keys' }));
                }

                // 2. Try to Unlock (Modern vs Legacy)
                if (data.encryptedSharedKey && privateKey) {
                    // MODERN: Unwrap with Identity
                    try {
                        const sharedKey = await unwrapAESKey(data.encryptedSharedKey, privateKey);
                        setState(prev => ({ ...prev, status: 'unlocked', sharedKey, privateKey, publicKey, publicKeyBase64: data.publicKey }));
                        setLastError(null);
                    } catch (e) {
                        console.error("Failed to unlock shared key:", e);
                        setLastError("Identity Mismatch: Keys on this device don't match your partner link.");
                        setState(prev => ({ ...prev, status: 'broken-identity' }));
                    }
                } else if (!data.encryptedSharedKey && data.sharedKeyBase64) {
                    // LEGACY: Import old key & Migrate
                    try {
                        const sharedKey = await importKeyOld(data.sharedKeyBase64);
                        setState(prev => ({ ...prev, sharedKey, status: 'unlocked' }));

                        // Auto-Migrate if we have Identity
                        if (publicKey && privateKey) {
                            console.log("Auto-migrating legacy key to encrypted...");
                            const wrapped = await wrapAESKey(sharedKey, publicKey);
                            await updateDoc(doc(db, 'users', userUid!), { encryptedSharedKey: wrapped });
                        }
                    } catch (e) {
                        console.error("Failed to load legacy shared key:", e);
                    }
                } else if (data.encryptedSharedKey && !privateKey) {
                    // WE HAVE A KEY ON SERVER BUT NO LOCAL Identity
                    setState(prev => ({ ...prev, status: 'broken-identity' }));
                    setLastError("Identity Missing: This device is missing the private key needed to unlock your connection.");
                }
            }
        } catch (e) {
            console.error("Error loading encryption identity:", e);
            setState(prev => ({ ...prev, status: 'no-keys' }));
        }
    };

    // React to Firestore data changes
    useEffect(() => {
        if (userData && userUid) {
            loadIdentity();
        }
    }, [userData?.encryptedSharedKey, userData?.publicKey]);

    // 2. Generate New Identity (Onboarding)
    const generateIdentity = async (): Promise<{ publicKeyBase64: string; privateKey: CryptoKey; publicKey: CryptoKey }> => {
        if (!userUid) throw new Error("No User UID");

        const keyPair = await generateRSAKeyPair();
        const pubBase64 = await exportPublicKey(keyPair.publicKey);
        const privBase64 = await exportPrivateKey(keyPair.privateKey);

        // Store Private Key LOCALLY ONLY
        localStorage.setItem(`${STORAGE_KEY_PRIVATE}_${userUid}`, privBase64);

        // Update State
        setState({
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
            publicKeyBase64: pubBase64,
            sharedKey: null,
            status: 'locked'
        });

        return { publicKeyBase64: pubBase64, privateKey: keyPair.privateKey, publicKey: keyPair.publicKey };
    };

    // 3. Create Shared Folder (First Pairing)
    const createSharedFolder = async (overridePublicKey?: CryptoKey): Promise<{ wrappedKey: string; sharedKey: CryptoKey }> => {
        const activePubKey = overridePublicKey || state.publicKey;
        if (!activePubKey) throw new Error("No Public Key available for encryption.");

        // Generate Random Scheme Key
        const newSharedKey = await generateAESKey();

        // Wrap for MYSELF
        const wrappedKey = await wrapAESKey(newSharedKey, activePubKey);

        // Save to State
        setState(prev => ({ ...prev, sharedKey: newSharedKey, status: 'unlocked' }));

        return { wrappedKey, sharedKey: newSharedKey };
    };

    // 4. Export Identity (Backup)
    const backupIdentity = async (): Promise<string | null> => {
        if (!state.privateKey) return null;
        return await exportPrivateKey(state.privateKey);
    };

    // 5. Restore Identity (Import)
    const restoreIdentity = async (pem: string): Promise<boolean> => {
        try {
            const privateKey = await importPrivateKey(pem);
            // Save to local storage
            const base64 = await exportPrivateKey(privateKey);
            localStorage.setItem(`${STORAGE_KEY_PRIVATE}_${userUid}`, base64);

            // Reload state
            setState(prev => ({ ...prev, privateKey, status: 'locked' }));

            // Attempt to re-sync with Firestore public key loop will happen on next mount or we force it?
            // Ideally we just reload the page or re-run loadIdentity
            await loadIdentity();
            return true;
        } catch (e) {
            console.error("Failed to restore identity:", e);
            return false;
        }
    };

    // 6. Magic Sync Code (Rotating OTP)
    const generateSyncCode = async (): Promise<string> => {
        if (!state.privateKey) throw new Error("No private key to share.");

        // 1. Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Generate Salt & Derive Key
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const key = await import('../utils/encryption').then(m => m.deriveKeyFromCode(code, salt));

        // 3. Encrypt Private Key
        const privPem = await exportPrivateKey(state.privateKey);
        const enc = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(privPem)
        );

        // 4. Upload to Firestore (TTL handled by logic or not)
        const payload = {
            salt: import('../utils/encryption').then(m => m.arrayBufferToBase64(salt.buffer)),
            iv: import('../utils/encryption').then(m => m.arrayBufferToBase64(iv.buffer)),
            data: import('../utils/encryption').then(m => m.arrayBufferToBase64(encryptedBuffer)),
            timestamp: Date.now()
        };

        // Resolve promises (lazy implementation above corrected below)
        const [saltB64, ivB64, dataB64] = await Promise.all([
            import('../utils/encryption').then(m => m.arrayBufferToBase64(salt.buffer)),
            import('../utils/encryption').then(m => m.arrayBufferToBase64(iv.buffer)),
            import('../utils/encryption').then(m => m.arrayBufferToBase64(encryptedBuffer))
        ]);

        await updateDoc(doc(db, 'users', userUid!), {
            tempSyncPayload: { salt: saltB64, iv: ivB64, data: dataB64, timestamp: Date.now() }
        });

        return code;
    };

    const consumeSyncCode = async (code: string): Promise<boolean> => {
        try {
            const userRef = doc(db, 'users', userUid!);
            const snap = await getDoc(userRef);
            if (!snap.exists()) return false;

            const payload = snap.data().tempSyncPayload;
            if (!payload) return false;

            // Check Expiry (5 mins)
            if (Date.now() - payload.timestamp > 5 * 60 * 1000) {
                console.error("Sync code expired");
                return false;
            }

            // Decrypt
            const salt = (await import('../utils/encryption')).base64ToArrayBuffer(payload.salt);
            const iv = (await import('../utils/encryption')).base64ToArrayBuffer(payload.iv);
            const data = (await import('../utils/encryption')).base64ToArrayBuffer(payload.data);

            const key = await (await import('../utils/encryption')).deriveKeyFromCode(code, new Uint8Array(salt));

            try {
                const decryptedBuffer = await window.crypto.subtle.decrypt(
                    { name: "AES-GCM", iv: new Uint8Array(iv) },
                    key,
                    data
                );

                const dec = new TextDecoder();
                const privPem = dec.decode(decryptedBuffer);

                return await restoreIdentity(privPem);
            } catch (e) {
                console.error("Wrong code or decryption failed", e);
                return false;
            }
        } catch (e) {
            console.error("Consume sync code error:", e);
            return false;
        }
    };

    const resetEncryptionIdentity = async () => {
        if (!userUid) return;

        console.warn("RESETTING ENCRYPTION IDENTITY");
        // 1. Clear Local Storage
        localStorage.removeItem(`${STORAGE_KEY_PRIVATE}_${userUid}`);

        // 2. Generate New Identity
        try {
            const result = await generateIdentity();

            // 3. Update Firestore (Clear old encrypted keys)
            const userRef = doc(db, 'users', userUid);
            await updateDoc(userRef, {
                publicKey: result.publicKeyBase64,
                encryptedSharedKey: null, // Nuke the old broken key
                sharedKeyBase64: null // Nuke legacy key
            });

            console.log("Encryption identity reset complete.");
            // No reload needed if we are reactive, but let's be safe
            window.location.reload();
        } catch (e) {
            console.error("Failed to reset identity:", e);
        }
    };

    return {
        ...state,
        lastError,
        generateIdentity,
        createSharedFolder,
        backupIdentity,
        restoreIdentity,
        generateSyncCode,
        consumeSyncCode,
        resetEncryptionIdentity
    };
};
