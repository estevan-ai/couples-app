import React, { useState, useRef } from 'react';
import { storage } from '../firebase';
import { ref, getBlob } from 'firebase/storage';
import { decryptBlob, stringToIv, unwrapAESKey } from '../utils/encryption';
import { getPrivateKey } from '../utils/keyStorage';

interface SecureAudioProps {
    path?: string;
    ivStr?: string;
    encryptedKey?: string;
    sharedKey: CryptoKey | null;
    isMine: boolean;
    privateKey?: CryptoKey | null;
}

const SecureAudio: React.FC<SecureAudioProps> = ({ path, ivStr, encryptedKey, sharedKey, isMine, privateKey }) => {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const handleLoad = async () => {
        if (audioUrl) {
            if (audioRef.current) {
                if (isPlaying) {
                    audioRef.current.pause();
                } else {
                    audioRef.current.play().catch(e => console.error("Playback failed:", e));
                }
                setIsPlaying(!isPlaying);
            }
            return;
        }

        try {
            let blob: Blob;

            // Scenario A: Legacy/Group (Shared Key)
            if (sharedKey && path && ivStr) {
                const storageRef = ref(storage, path);
                const encryptedBlob = await getBlob(storageRef);
                blob = await decryptBlob(encryptedBlob, sharedKey, stringToIv(ivStr));
            }
            // Scenario B: Zero-Knowledge (Hybrid)
            else if (encryptedKey && path) {
                // Note: 'path' prop is reused for storagePath in some contexts, or we need a specific prop.
                // In MessageBubble, we pass 'path={note.audioPath}'.
                // If it's a ZK audio, 'audioPath' might be the storage path.

                if (isMine) throw new Error("Blind Drop: Cannot decrypt my own sent ZK audio without local storage?");

                if (isMine) throw new Error("Blind Drop: Cannot decrypt my own sent ZK audio without local storage?");

                if (!privateKey) throw new Error("No private key provided.");

                const aesKey = await unwrapAESKey(encryptedKey, privateKey);
                const storageRef = ref(storage, path);
                const encryptedBlob = await getBlob(storageRef);
                blob = await decryptBlob(encryptedBlob, aesKey, stringToIv(ivStr || ''));
            } else {
                console.error("Missing audio decryption params");
                return;
            }

            const url = URL.createObjectURL(blob);
            setAudioUrl(url);

            // Auto-play after load
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.play().catch(e => console.error("Auto-play failed:", e));
                    setIsPlaying(true);
                }
            }, 100);

        } catch (e) {
            console.error("Audio Load Error", e);
        }
    };

    return (
        <div className="flex items-center gap-2 mt-1">
            <button onClick={handleLoad} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition text-xs font-bold text-gray-700">
                <span>{isPlaying ? '⏸️' : '▶️'}</span>
                <span>Voice Note</span>
            </button>
            <audio
                ref={audioRef}
                src={audioUrl || undefined}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                className="hidden"
            />
        </div>
    );
};

export default SecureAudio;
