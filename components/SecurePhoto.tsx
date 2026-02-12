import React, { useState, useEffect } from 'react';
import { storage } from '../firebase';
import { ref, getBlob } from 'firebase/storage';
import { decryptBlob, stringToIv, unwrapAESKey } from '../utils/encryption';
import { getPrivateKey } from '../utils/keyStorage';

interface SecurePhotoProps {
    path?: string; // Legacy
    storagePath?: string; // ZK
    ivStr?: string;
    encryptedKey?: string; // ZK: Wrapped AES Key
    sharedKey: CryptoKey | null; // Legacy
    timestamp: number;
    isMine: boolean;
    privateKey?: CryptoKey | null;
}

const SecurePhoto: React.FC<SecurePhotoProps> = ({ path, storagePath, ivStr, encryptedKey, sharedKey, timestamp, isMine, privateKey }) => {
    const [url, setUrl] = useState<string | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);

    const handleDecrypt = async () => {
        setIsDecrypting(true);
        setError(null);
        try {
            let blob: Blob;

            // Scenario A: Zero-Knowledge (Hybrid)
            if (encryptedKey && storagePath) {
                if (isMine) {
                    throw new Error("Blind Drop: Key not saved for sender.");
                }

                // 1. Get My Private Key (Props now)
                if (!privateKey) throw new Error("Private Key not found.");

                // 2. Unwrap the AES Key
                const aesKey = await unwrapAESKey(encryptedKey, privateKey);

                // 3. Download Encrypted Blob
                const blobRef = ref(storage, storagePath);
                const encryptedBlob = await getBlob(blobRef);

                // 4. Decrypt Image
                const iv = ivStr ? stringToIv(ivStr) : new Uint8Array(12);
                blob = await decryptBlob(encryptedBlob, aesKey, iv);
            }
            // Scenario B: Legacy Symmetric
            else if (sharedKey && path && ivStr) {
                const storageRef = ref(storage, path);
                const encryptedBlob = await getBlob(storageRef);
                blob = await decryptBlob(encryptedBlob, sharedKey, stringToIv(ivStr));
            } else {
                throw new Error("Missing decryption parameters");
            }

            setUrl(URL.createObjectURL(blob));
        } catch (err: any) {
            console.error("Decryption Error:", err);
            setError(err.message.includes("Blind Drop") ? "Blind Drop" : "Locked");
        } finally {
            setIsDecrypting(false);
        }
    };

    // Auto-decrypt only if NOT mine (or if legacy shared key exists which both have)
    useEffect(() => {
        if (!url && (encryptedKey || sharedKey)) {
            // Try to decrypt everything we can
            if (encryptedKey && isMine) return;
            handleDecrypt();
        }
    }, [sharedKey, encryptedKey, path, storagePath, ivStr, isMine]);

    if (url) {
        return (
            <div
                className="relative mt-2 inline-block select-none touch-none"
                onMouseDown={() => setIsRevealed(true)}
                onMouseUp={() => setIsRevealed(false)}
                onMouseLeave={() => setIsRevealed(false)}
                onTouchStart={() => setIsRevealed(true)}
                onTouchEnd={() => setIsRevealed(false)}
                style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
            >
                <img
                    src={url}
                    alt="Secure content"
                    className={`rounded-xl w-full max-h-64 object-cover shadow-sm border border-gray-100 transition-all duration-200 pointer-events-none ${isRevealed ? 'filter-none' : 'blur-xl opacity-50'}`}
                />
                {!isRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-2xl drop-shadow-md">👆 Hold</span>
                    </div>
                )}
            </div>
        );
    }

    // Sender View (Blind Drop)
    if (encryptedKey && isMine) {
        return (
            <div className="mt-2 p-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 inline-block text-center">
                <span className="text-2xl block mb-1">🕵️‍♂️</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Secret Sent</span>
                <span className="text-[9px] text-gray-400 opacity-70">(End-to-End Encrypted)</span>
            </div>
        );
    }

    return (
        <div className="mt-2 p-1 rounded-xl border border-gray-100 bg-gray-50 inline-block">
            <button
                onClick={handleDecrypt}
                disabled={isDecrypting}
                className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-xl hover:bg-gray-300 transition relative"
                title="View Photo"
            >
                {isDecrypting ? '⏳' : error === 'Blind Drop' ? '🕵️‍♂️' : error ? '🔒' : '🖼️'}
            </button>
            {error && error !== 'Blind Drop' && <p className="text-[10px] text-red-500 mt-1 max-w-[100px] leading-tight">{error}</p>}
        </div>
    );
};

export default SecurePhoto;
