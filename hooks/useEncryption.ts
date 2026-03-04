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
    importKeyOld,
    getKeyThumbprint
} from '../utils/encryption';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface EncryptionState {
    privateKey: CryptoKey | null;
    publicKey: CryptoKey | null;
    publicKeyBase64: string | null;
    sharedKey: CryptoKey | null;
    legacySharedKey: CryptoKey | null; // For backwards compatibility
    status: 'locked' | 'unlocked' | 'initializing' | 'no-keys' | 'broken-identity';
}

const STORAGE_KEY_PRIVATE = 'couple_currency_private_key';

export const useEncryption = (userUid: string | undefined, userData?: any) => {
    const [state, setState] = useState<EncryptionState>({
        privateKey: null,
        publicKey: null,
        publicKeyBase64: null,
        sharedKey: null,
        legacySharedKey: null,
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
                privateKey = await importPrivateKey(storedPem);
                const thumb = await getKeyThumbprint(privateKey);
                console.warn(`[useEncryption] Loaded Private Identity. Thumbprint: ${thumb}`);
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
                    const serverThumb = data.publicKey ? await getKeyThumbprint(await importPublicKey(data.publicKey)) : 'none';
                    const localThumb = await getKeyThumbprint(privateKey);

                    console.log(`[useEncryption] Auth Check: Server=${serverThumb}, Local=${localThumb}`);

                    // MODERN: Unwrap with Identity
                    try {
                        const sharedKey = await unwrapAESKey(data.encryptedSharedKey, privateKey);
                        let legacySharedKey: CryptoKey | null = null;

                        // Fallback: Also load the legacy key if it exists, for old messages
                        if (data.sharedKeyBase64) {
                            try {
                                legacySharedKey = await importKeyOld(data.sharedKeyBase64);
                            } catch (e) {
                                console.warn("Could not load legacy shared key fallback:", e);
                            }
                        }

                        setState(prev => ({ ...prev, status: 'unlocked', sharedKey, legacySharedKey, privateKey, publicKey, publicKeyBase64: data.publicKey }));
                        setLastError(null);
                    } catch (e) {
                        console.error("Failed to unlock shared key:", e);
                        const msg = (serverThumb !== localThumb)
                            ? `Identity Mismatch: This device (ID: ${localThumb}) doesn't match the server profile (ID: ${serverThumb}).`
                            : "Decryption Failed: Shared key is corrupted or encrypted with a different key.";
                        setLastError(msg);
                        setState(prev => ({ ...prev, status: 'broken-identity' }));
                    }
                } else if (!data.encryptedSharedKey && data.sharedKeyBase64) {
                    // LEGACY: Import old key & Migrate
                    try {
                        const sharedKey = await importKeyOld(data.sharedKeyBase64);
                        setState(prev => ({ ...prev, sharedKey, legacySharedKey: sharedKey, status: 'unlocked' }));

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
            legacySharedKey: null,
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
    const restoreIdentity = async (pemOrJson: string): Promise<boolean> => {
        try {
            let privPem: string;
            let sharedB64: string | null = null;
            let pubPem: string | null = null;

            try {
                // Try parsing as JSON (New format)
                const parsed = JSON.parse(pemOrJson);
                privPem = parsed.privPem;
                sharedB64 = parsed.sharedB64;
                pubPem = parsed.pubPem;
                console.log("[useEncryption] Restoring from Full Recovery payload...");
            } catch (e) {
                // Fallback to raw PEM (Legacy format)
                privPem = pemOrJson;
                console.log("[useEncryption] Restoring from Legacy PEM format.");
            }

            const privateKey = await importPrivateKey(privPem);
            // Save to local storage
            localStorage.setItem(`${STORAGE_KEY_PRIVATE}_${userUid}`, privPem);

            // Update Local State
            const updateState: any = { privateKey, status: 'locked' };

            if (sharedB64) {
                const { importKeyOld } = await import('../utils/encryption');
                const sharedKey = await importKeyOld(sharedB64);
                updateState.sharedKey = sharedKey;
                updateState.status = 'unlocked';
            }

            if (pubPem) {
                const { importPublicKey } = await import('../utils/encryption');
                updateState.publicKeyBase64 = pubPem;
                try {
                    updateState.publicKey = await importPublicKey(pubPem);
                } catch (e) {
                    console.error("Failed to import public key during restore", e);
                }
            }

            setState(prev => ({ ...prev, ...updateState }));

            // Reload identity to ensure full sync with Firestore
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

        // 3. Prepare Payload (Private Key + Public Key + Shared Key if exists)
        const privPem = await exportPrivateKey(state.privateKey);
        const pubPem = state.publicKeyBase64; // Already a PEM-like string
        const sharedB64 = state.sharedKey ? await import('../utils/encryption').then(m => m.exportKeyOld(state.sharedKey!)) : null;

        const syncPayload = JSON.stringify({
            privPem,
            pubPem,
            sharedB64,
            timestamp: Date.now()
        });

        // 4. Encrypt Payload
        const enc = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(syncPayload)
        );

        // 5. Upload to Firestore
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
                const decryptedText = dec.decode(decryptedBuffer);

                let privPem: string;
                let pubPem: string | null = null;
                let sharedB64: string | null = null;

                try {
                    // Try parsing as JSON (New format)
                    const parsed = JSON.parse(decryptedText);
                    privPem = parsed.privPem;
                    pubPem = parsed.pubPem;
                    sharedB64 = parsed.sharedB64;
                } catch (e) {
                    // Fallback to raw PEM (Legacy format)
                    privPem = decryptedText;
                }

                // Restore Identity Locally
                const success = await restoreIdentity(privPem);
                if (!success) return false;

                // REPAIR SERVER STATE
                // This makes this device 'Authoritative'
                const updateData: any = {};

                // 1. Restore Server Public Key if we have it
                if (pubPem) {
                    updateData.publicKey = pubPem;
                }

                // 2. Restore Server Encrypted Shared Key if we have local sharedKey
                if (sharedB64) {
                    const { importKeyOld, importPublicKey, wrapAESKey } = await import('../utils/encryption');
                    const sharedKey = await importKeyOld(sharedB64);
                    // Wrap with THE restored public key (to be safe)
                    const rawPub = await importPublicKey(pubPem || snap.data().publicKey);
                    const wrapped = await wrapAESKey(sharedKey, rawPub);
                    updateData.encryptedSharedKey = wrapped;

                    // Also update local state to be 'unlocked' immediately
                    setState(prev => ({ ...prev, sharedKey, status: 'unlocked' }));
                }

                if (Object.keys(updateData).length > 0) {
                    console.warn("[useEncryption] Repairing server state with restored keys...");
                    await updateDoc(userRef, updateData);
                }

                // Cleanup Sync Payload
                await updateDoc(userRef, { tempSyncPayload: null });

                return true;
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
