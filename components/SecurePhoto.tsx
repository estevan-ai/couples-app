import React, { useState, useEffect } from 'react';
import { storage } from '../firebase';
import { ref, getBlob } from 'firebase/storage';
import { decryptBlob, stringToIv, unwrapAESKey } from '../utils/encryption';
import { getPrivateKey } from '../utils/keyStorage';
import ImageModal from './ImageModal';

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
    const [showModal, setShowModal] = useState(false);

    const handleDecrypt = async () => {
        if (isDecrypting) return; // Prevent double-fire

        setIsDecrypting(true);
        setError(null);

        // Timeout Race to prevent infinite hanging
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Decryption timed out")), 15000)
        );

        try {
            await Promise.race([
                (async () => {
                    let blob: Blob;

                    // Scenario A: Zero-Knowledge (Hybrid)
                    if (encryptedKey && storagePath) {
                        if (isMine) {
                            throw new Error("Blind Drop: Key not saved for sender.");
                        }

                        // 1. Get My Private Key (Props now)
                        if (!privateKey) throw new Error("Private Key not found.");

                        // 2. Unwrap the AES Key
                        console.log("[SecurePhoto] Unwrapping key...");
                        const aesKey = await unwrapAESKey(encryptedKey, privateKey);

                        // 3. Download Encrypted Blob
                        console.log("[SecurePhoto] Downloading blob...", storagePath);
                        const blobRef = ref(storage, storagePath);
                        const encryptedBlob = await getBlob(blobRef);

                        // 4. Decrypt Image
                        console.log("[SecurePhoto] Decrypting blob...");
                        const iv = ivStr ? stringToIv(ivStr) : new Uint8Array(12);
                        blob = await decryptBlob(encryptedBlob, aesKey, iv);
                    }
                    // Scenario B: Legacy Symmetric
                    else if (sharedKey && path && ivStr) {
                        console.log("[SecurePhoto] Legacy decryption...");
                        const storageRef = ref(storage, path);
                        const encryptedBlob = await getBlob(storageRef);
                        blob = await decryptBlob(encryptedBlob, sharedKey, stringToIv(ivStr));
                    } else {
                        throw new Error("Missing decryption parameters");
                    }

                    setUrl(URL.createObjectURL(blob));
                })(),
                timeoutPromise
            ]);
        } catch (err: any) {
            console.error("Decryption Error:", err);
            // Show the actual error message if it's not a Blind Drop
            setError(err.message.includes("Blind Drop") ? "Blind Drop" :
                (err.message || "Decryption Failed"));
        } finally {
            setIsDecrypting(false);
        }
    };

    // Auto-decrypt restored (with timeout protection)
    // This attempts to decrypt immediately. If it hangs >15s, it sets 'error' and shows retry button.
    useEffect(() => {
        if (!url && (encryptedKey || sharedKey)) {
            // Wait for private key if it's a ZK message
            if (encryptedKey && !privateKey && !isMine) return;

            // Sender view logic handled by render, shouldn't trigger decrypt
            if (encryptedKey && isMine) return;

            handleDecrypt();
        }
    }, [sharedKey, encryptedKey, path, storagePath, ivStr, isMine, privateKey, url]);

    if (url) {
        return (
            <>
                {/* Thumbnail Preview (Click to Open) */}
                <div
                    className="relative mt-2 inline-block cursor-pointer group"
                    onClick={() => setShowModal(true)}
                >
                    <img
                        src={url}
                        alt="Secure content"
                        className="rounded-xl w-full max-h-64 object-cover shadow-sm border border-gray-100 blur-xl opacity-60 transition-all duration-300 group-hover:opacity-80 group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <button className="bg-white/90 backdrop-blur text-gray-800 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transform transition-transform group-hover:scale-105 group-active:scale-95">
                            <span>👁️</span> View Secret Image
                        </button>
                    </div>
                </div>

                {/* Full Screen Modal */}
                <ImageModal
                    src={url}
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                />
            </>
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
        <div className="mt-2 relative inline-block group mb-8">
            <button
                onClick={handleDecrypt}
                disabled={isDecrypting}
                className={`relative w-48 h-48 rounded-2xl overflow-hidden flex flex-col items-center justify-center transition-all shadow-sm border border-gray-200 ${isDecrypting ? 'bg-gray-100 cursor-wait' : 'bg-gray-100 hover:bg-gray-200 active:scale-95 cursor-pointer'}`}
                title={error ? "Tap to Retry Decryption" : "Tap to Decrypt"}
            >
                {/* Visual Placeholder */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                {/* Icon & Label */}
                <div className="z-10 flex flex-col items-center gap-2 px-4 text-center">
                    <span className="text-4xl filter drop-shadow-sm">
                        {isDecrypting ? '⏳' : error === 'Blind Drop' ? '🕵️‍♂️' : error ? '⚠️' : '🔐'}
                    </span>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-tight">
                        {isDecrypting ? 'Decrypting...' : error ? 'Error' : 'Tap to Reveal'}
                    </span>
                </div>

                {/* Loading Progress Bar (Fake) */}
                {isDecrypting && (
                    <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 animate-[width_15s_linear_forwards]" style={{ width: '0%' }}></div>
                )}
            </button>

            {error && error !== 'Blind Drop' && (
                <div className="absolute -bottom-8 left-0 w-max max-w-[250px] z-20">
                    <p className="text-[10px] text-red-600 font-bold bg-white shadow-xl px-3 py-1.5 rounded-lg border border-red-100 whitespace-normal break-words leading-tight">{error}</p>
                </div>
            )}
        </div>
    );
};

export default SecurePhoto;
