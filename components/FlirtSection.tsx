
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User } from '../types';
import { ChatterNote } from '../types';
import { termsData } from '../constants';
import { GoogleGenAI } from '@google/genai';
import { storage } from '../firebase';
import { ref, uploadBytes, uploadBytesResumable, getBlob } from 'firebase/storage';
import { encryptBlob, decryptBlob, stringToIv, ivToString, generateAESKey, wrapAESKey, unwrapAESKey, importPublicKey } from '../utils/encryption';
import { getPrivateKey } from '../utils/keyStorage';
import { compressImage } from '../utils/image';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface SecurePhotoProps {
    path?: string; // Legacy
    storagePath?: string; // ZK
    ivStr?: string;
    encryptedKey?: string; // ZK: Wrapped AES Key
    sharedKey: CryptoKey | null; // Legacy
    timestamp: number;
    isMine: boolean;
}

const SecurePhoto: React.FC<SecurePhotoProps> = ({ path, storagePath, ivStr, encryptedKey, sharedKey, timestamp, isMine }) => {
    const [url, setUrl] = useState<string | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDecrypt = async () => {
        setIsDecrypting(true);
        setError(null);
        try {
            let blob: Blob;

            // Scenario A: Zero-Knowledge (Hybrid)
            if (encryptedKey && storagePath) {
                // BLIND DROP: If I sent this, I cannot open it.
                if (isMine) {
                    throw new Error("Blind Drop: Only partner can view.");
                }

                // 1. Get My Private Key
                const myPrivateKey = await getPrivateKey();
                if (!myPrivateKey) throw new Error("Private Key not found on device.");

                // 2. Unwrap the AES Key
                const aesKey = await unwrapAESKey(encryptedKey, myPrivateKey);

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
            setError(err.message === "Blind Drop: Only partner can view." ? "Blind Drop" : "Locked");
        } finally {
            setIsDecrypting(false);
        }
    };

    // Auto-decrypt only if NOT mine (or if legacy shared key exists which both have)
    useEffect(() => {
        if (!url && (encryptedKey || sharedKey)) {
            // If ZK and Mine, don't auto-decrypt, just show placeholder
            if (encryptedKey && isMine) return;
            handleDecrypt();
        }
    }, [sharedKey, encryptedKey, path, storagePath, ivStr, isMine]);

    if (url) return <img src={url} alt="Secure content" className="rounded-xl w-full max-h-64 object-cover mt-2 shadow-sm border border-gray-100" />;

    // Sender View (Blind Drop)
    if (encryptedKey && isMine) {
        return (
            <div className="mt-2 p-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 inline-block text-center">
                <span className="text-2xl block mb-1">🕵️‍♂️</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Secret Sent</span>
                <span className="text-[9px] text-gray-400 opacity-70">(Only they can view)</span>
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

const TimeLeft: React.FC<{ timestamp: number }> = ({ timestamp }) => {
    const calculateTimeLeft = () => {
        const now = Date.now();
        const expires = timestamp + (48 * 60 * 60 * 1000);
        const diff = expires - now;

        if (diff <= 0) return 'Expired';
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${h}h ${m}m left`;
    };

    const [left, setLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setLeft(calculateTimeLeft());
        }, 60000);
        return () => clearInterval(timer);
    }, [timestamp]);

    return <span className="text-[10px] font-mono text-xs opacity-70 flex items-center gap-1">⏳ {left}</span>;
};

interface FlirtSectionProps {
    currentUser: User;
    partner: User | null;
    chatter: Record<string, ChatterNote[]>;
    onAddNote: (contextId: string, text: string, photoPath?: string, photoIv?: string, subject?: string, extra?: { encryptedKey?: string, storagePath?: string, senderId?: string }) => void;
    sharedKey: CryptoKey | null;
    onDeleteNote: (id: string) => void;
    onPinInsight: (text: string, source: string) => void;
    onNavigateContext?: (contextId: string) => void;
    flirts?: import('../types').Flirt[];
}

const FlirtSection: React.FC<FlirtSectionProps> = ({ currentUser, partner, chatter, onAddNote, sharedKey, onDeleteNote, onPinInsight, onNavigateContext, flirts }) => {
    const [subTab, setSubTab] = useState<'flirts' | 'inbox'>('flirts');
    const [draft, setDraft] = useState('');
    const [isDrafting, setIsDrafting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'compressing' | 'encrypting' | 'uploading'>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [aiTone, setAiTone] = useState<'sweet' | 'spicy' | 'thoughtful'>('sweet');
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [compSubject, setCompSubject] = useState('');
    const [compText, setCompText] = useState('');

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // 1. Thread Computation
    const threads = useMemo(() => {
        const t: Record<string, { subject: string; lastNote: ChatterNote; notes: ChatterNote[] }> = {};
        Object.keys(chatter).forEach(ctx => {
            if (ctx.startsWith('thread-')) {
                const threadNotes = [...chatter[ctx]].sort((a, b) => a.timestamp - b.timestamp);
                if (threadNotes.length > 0) {
                    t[ctx] = {
                        subject: threadNotes[0].subject || "Untitled Thread",
                        lastNote: threadNotes[threadNotes.length - 1],
                        notes: threadNotes
                    };
                }
            }
        });
        return t;
    }, [chatter]);

    const sortedThreadIds = useMemo(() => {
        return Object.keys(threads).sort((a, b) => threads[b].lastNote.timestamp - threads[a].lastNote.timestamp);
    }, [threads]);

    // 2. Activity Computation for "Fast Flirts"
    const flirtActivity = useMemo(() => {
        const activity: any[] = [];
        const now = Date.now();
        const EXPIRE_MS = 48 * 60 * 60 * 1000;

        Object.keys(chatter).forEach(contextId => {
            const notes = chatter[contextId];
            notes.forEach(note => {
                if (now - note.timestamp > EXPIRE_MS) return;

                let contextName = "General";
                let termCategory: string | undefined = undefined;

                if (contextId.startsWith('term-')) {
                    const id = parseInt(contextId.split('-')[1]);
                    const term = termsData.find(t => t.id === id);
                    contextName = term?.name || "Intimacy Term";
                    termCategory = term?.category; // 'Touch', 'Service', etc. 
                    // Or if we want mapping to 'love'/'like' colors, we check bookmarks? 
                    // User said "Showcase those just like we have on the bank".
                    // Bank uses Category colors (Physical Touch -> Pink/Red?).
                    // Let's use Category.
                } else if (contextId.startsWith('flirt-')) {
                    const id = contextId.replace('flirt-', '');
                    // Look up in flirts prop
                    const foundFlirt = flirts?.find(f => f.id === id);
                    contextName = foundFlirt ? `Flirt: ${foundFlirt.text.substring(0, 15)}...` : "Flirt";
                } else if (contextId.includes('thread-')) {
                    // Skip inbox threads in the "Flirt" feed unless they are contextually relevant
                    // For now, let's keep them separate to keep "Flirts" clean
                    return;
                }
                activity.push({ ...note, contextId, contextName, termCategory });
            });
        });
        return activity.sort((a, b) => a.timestamp - b.timestamp);
    }, [chatter, flirts]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [flirtActivity, activeThreadId, threads]);

    const handleSendFlirt = (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim()) return;
        onAddNote('general-flirt', draft.trim());
        setDraft('');
    };

    const handleSendThreadReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim() || !activeThreadId || !threads[activeThreadId]) return;
        onAddNote(activeThreadId, draft.trim(), undefined, undefined, threads[activeThreadId].subject);
        setDraft('');
    };

    const handleStartThread = (e: React.FormEvent) => {
        e.preventDefault();
        if (!compSubject.trim() || !compText.trim()) return;
        const threadId = `thread-${Date.now()}`;
        onAddNote(threadId, compText.trim(), undefined, undefined, compSubject.trim());
        setCompSubject('');
        setCompText('');
        setIsComposing(false);
        setActiveThreadId(threadId);
    };

    const generateAIDraft = async () => {
        setIsDrafting(true);
        try {
            const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY;
            console.log("AI Key Status:", apiKey ? `Present (Len: ${apiKey.length})` : "MISSING");
            if (!apiKey) throw new Error("API Key missing from environment");

            const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
            const systemPrompt = `You are a helpful romantic assistant. 
            Write a short, 1-2 sentence message from ${currentUser.name} to their partner ${partner?.name || 'Partner'}.
            The tone should be ${aiTone}.`;

            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview',
                history: [
                    { role: 'user', parts: [{ text: `INSTRUCTION: ${systemPrompt}` }] },
                    { role: 'model', parts: [{ text: "Understood. I will draft messages in that tone." }] }
                ]
            });

            const history = flirtActivity.slice(-5).map(a => `${a.author}: ${a.text}`).join('\n');
            const prompt = `
                Existing conversation context:
                ${history}

                User's Current Draft (if any): "${draft || ''}"
                
                Instruction:
                ${draft ? "The user has started typing. Refine, complete, or improve their draft while maintaining their intent. Do NOT change the meaning, just polish it." : "Generate a new message now. Make it feel natural, private, and sincere."}
                Do not use hashtags or emojis unless the user used them. Keep it short.
            `;

            const result = await chat.sendMessage({ message: prompt });
            const text = result.text || '';
            setDraft(text.replace(/"/g, '').trim());
        } catch (err: any) {
            console.error("AI Drafting Error Detail:", err);
            const errMsg = err?.message || "AI connection error";
            setDraft(`Error: ${errMsg.slice(0, 50)}${errMsg.length > 50 ? '...' : ''}`);
        } finally {
            setIsDrafting(false);
        }
    };

    const [showSecurityInfo, setShowSecurityInfo] = useState(false);

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

    const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToastMessage(msg);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Removed debugLogs state and addDebugLog function

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;


        console.log(`Selected file: ${file.name}`);


        try {
            // 1. Fetch Partner's Public Key (ZK Check)
            let partnerPubKey: CryptoKey | null = null;
            if (partner) {
                // We'll read it fresh to be safe
                const userDoc = await getDoc(doc(db, 'users', partner.connectId || '')); // Assuming partner.id/connectId logic
                // Actually partner object in props has data, let's see if we have 'publicKey' field
                // If not, fetch it.
                // For robustness, let's assume we need to fetch 'users/{partner.uid}' 
                // Wait, 'partner' prop is type User. We need their UID. 
                // The 'partner' object in App.tsx comes from 'users' collection, so it has data.
                if ((partner as any).publicKey) {
                    partnerPubKey = await importPublicKey((partner as any).publicKey);
                    console.log("Partner Public Key found. Using Zero-Knowledge Mode.");
                } else {
                    console.log("Partner has no Public Key. Falling back to Legacy Mode.");
                }
            }

            if (!partnerPubKey && !sharedKey) {
                const error = "No secure channel available. Ask partner to update app.";
                showToast(error, 'error');
                alert(error);
                return;
            }

            setUploadStatus('compressing');
            let blobToEncrypt = await compressImage(file).catch(() => file);

            setUploadStatus('encrypting');

            let uploadedFilename = '';
            let finalIv = '';
            let finalEncryptedKey = ''; // For ZK
            let finalStoragePath = ''; // For ZK
            let encryptedBlob: Blob;

            // --- ZK MODE ---
            if (partnerPubKey) {
                // A. Generate Disposable Key
                const disposableKey = await generateAESKey();

                // B. Encrypt Blob
                const result = await encryptBlob(blobToEncrypt, disposableKey);
                encryptedBlob = result.encryptedBlob;
                finalIv = ivToString(result.iv);

                // C. Wrap Disposable Key
                finalEncryptedKey = await wrapAESKey(disposableKey, partnerPubKey);

                // D. Prepare Path
                finalStoragePath = `encrypted_chats/${currentUser.connectId}_${Date.now()}.bin`;
                uploadedFilename = finalStoragePath;

            } else {
                // --- LEGACY MODE ---
                if (!sharedKey) throw new Error("No Shared Key");
                const result = await encryptBlob(blobToEncrypt, sharedKey);
                encryptedBlob = result.encryptedBlob;
                finalIv = ivToString(result.iv);
                uploadedFilename = `photos/${currentUser.connectId}/${Date.now()}.enc`;
            }

            setUploadStatus('uploading');
            setUploadProgress(0);
            // addDebugLog(`Uploading to ${uploadedFilename}...`);

            const storageRef = ref(storage, uploadedFilename);

            // Fix: Use Resumable Upload to get progress and avoid "stall" feeling
            const uploadTask = uploadBytesResumable(storageRef, encryptedBlob);

            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(Math.round(progress));
                        if (progress % 20 === 0) console.log(`Progress: ${Math.round(progress)}%`);
                    },
                    (error) => {
                        console.error("Upload Error:", error);
                        reject(error);
                    },
                    () => {
                        resolve();
                    }
                );
            });

            console.log("Upload complete. Saving metadata...");

            try {
                onAddNote(
                    activeThreadId || 'general-flirt',
                    "[Secure Photo]",
                    !partnerPubKey ? uploadedFilename : undefined, // Legacy path
                    finalIv,
                    activeThreadId ? threads[activeThreadId]?.subject : undefined,
                    partnerPubKey ? {
                        encryptedKey: finalEncryptedKey,
                        storagePath: finalStoragePath,
                        senderId: currentUser.connectId
                    } : undefined
                );
            } catch (firestoreError: any) {
                console.error("ERROR Saving Note: " + firestoreError.message);
                // If note fails, we technically uploaded the image but user won't see it. 
                // Consider this a failure.
                throw firestoreError;
            }

            setUploadStatus('idle');
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';
            showToast("Encrypted & Sent!", 'success');

        } catch (err: any) {
            showToast(`Upload failed: ${err.message}`, 'error');
            console.error(err);
            setUploadStatus('idle');
        }
    }


    return (
        <div className="max-w-6xl mx-auto py-6 px-4">
            {/* Security Alert */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex items-center gap-3 text-sm text-blue-800 shadow-sm animate-in slide-in-from-top-2 duration-500">
                <span className="text-lg">🔒</span>
                <span className="font-medium">Your messages are End-to-End Encrypted. Only you and your partner hold the keys.</span>
            </div>

            <header className="mb-8 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-serif font-bold text-gray-800">Connection Center</h1>
                        <button onClick={() => setShowSecurityInfo(true)} className="text-gray-400 hover:text-green-600 transition" title="Is this secure?">
                            🛡️
                        </button>
                    </div>
                    <p className="text-gray-500">Fast flirts and deep thoughts, all in one private place.</p>
                </div>
                {/* Security Modal */}
                {showSecurityInfo && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSecurityInfo(false)}>
                        <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg flex items-center gap-2"><span className="text-2xl">🔒</span> End-to-End Encrypted</h3>
                                <button onClick={() => setShowSecurityInfo(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                            <div className="space-y-3 text-sm text-gray-600">
                                <p><strong className="text-gray-800">AES-GCM 256-bit Encryption:</strong> Your photos are scrambled on your phone before they ever touch the internet.</p>
                                <p><strong className="text-gray-800">Zero Knowledge:</strong> We (the app developers) do not have the key. Only you and your partner do.</p>
                                <p><strong className="text-gray-800">Ephemeral:</strong> Keys are stored locally on your device.</p>
                            </div>
                            <button onClick={() => setShowSecurityInfo(false)} className="mt-6 w-full py-3 bg-green-50 text-green-700 font-bold rounded-xl hover:bg-green-100">Got it, thanks!</button>
                        </div>
                    </div>
                )}
                {/* Debug Log Overlay */}
                {/* Toast Notification */}
                {toastMessage && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${toastType === 'success' ? 'bg-green-600 text-white border-green-500' :
                            toastType === 'error' ? 'bg-red-600 text-white border-red-500' :
                                'bg-gray-800 text-white border-gray-700'
                            }`}>
                            <span className="text-xl">{toastType === 'success' ? '✅' : toastType === 'error' ? '⚠️' : 'ℹ️'}</span>
                            <span className="font-bold text-sm">{toastMessage}</span>
                        </div>
                    </div>
                )}
                <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full sm:w-auto">
                    <button
                        onClick={() => setSubTab('flirts')}
                        className={`flex-1 sm:px-8 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${subTab === 'flirts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        💘 Fast Flirts
                    </button>
                    <button
                        onClick={() => setSubTab('inbox')}
                        className={`flex-1 sm:px-8 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${subTab === 'inbox' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        📩 Inbox
                    </button>
                </div>
            </header>

            {subTab === 'flirts' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Chat Column */}
                    <div className="lg:col-span-5 h-[600px] flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Quick Connect</h3>
                            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Ephemeral (48h)</span>
                        </div>
                        <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#f9f9fb] scroll-smooth">
                            {flirtActivity.length === 0 ? (
                                <div className="h-full flex flex-col justify-center items-center text-gray-400 opacity-50">
                                    <div className="text-4xl mb-2">💌</div>
                                    <p className="text-sm">No recent activity.</p>
                                </div>
                            ) : (
                                flirtActivity.map((note, idx) => (
                                    <div key={idx} className={`flex flex-col ${note.author === currentUser.name ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-300 group`}>
                                        <div className="flex items-center gap-2 max-w-[90%] justify-end">
                                            {note.author === currentUser.name && (
                                                <button onClick={() => onDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition px-2">
                                                    🗑️
                                                </button>
                                            )}
                                            <div className={`relative p-4 rounded-2xl text-sm shadow-sm transition-all ${note.author === currentUser.name ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                                                {(note.photoPath && note.photoIv) || (note.storagePath && note.encryptedKey) ? (
                                                    <SecurePhoto
                                                        path={note.photoPath}
                                                        storagePath={note.storagePath}
                                                        ivStr={note.photoIv}
                                                        encryptedKey={note.encryptedKey}
                                                        sharedKey={sharedKey}
                                                        timestamp={note.timestamp}
                                                        isMine={note.author === currentUser.name}
                                                    />
                                                ) : (
                                                    <p className="leading-relaxed font-medium text-[15px]">{note.text}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-3 px-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${note.author === currentUser.name ? 'text-blue-500' : 'text-gray-400'}`}>
                                                {note.author}
                                            </span>
                                            <span className="text-[9px] text-gray-300">•</span>
                                            <TimeLeft timestamp={note.timestamp} />
                                            <>
                                                <span className="text-[9px] text-gray-300">•</span>

                                                <button
                                                    onClick={() => onNavigateContext && onNavigateContext(note.contextId)}
                                                    className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border transition cursor-pointer ${(note as any).termCategory ?
                                                        // Simple hash or lookup for category colors
                                                        ['Physical Touch', 'Sex', 'Intimacy'].includes((note as any).termCategory) ? 'bg-pink-50 text-pink-500 border-pink-100 hover:bg-pink-100' :
                                                            ['Service', 'Gifts'].includes((note as any).termCategory) ? 'bg-orange-50 text-orange-500 border-orange-100 hover:bg-orange-100' :
                                                                ['Words', 'Time'].includes((note as any).termCategory) ? 'bg-blue-50 text-blue-500 border-blue-100 hover:bg-blue-100' :
                                                                    'bg-purple-50 text-purple-500 border-purple-100 hover:bg-purple-100'
                                                        : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                                                        }`}
                                                    title="View Context"
                                                >
                                                    {note.contextName} 🔗
                                                </button>
                                            </>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Composer Column */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
                            <h2 className="text-xl font-serif font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span>✨</span> AI Flirt Drafting
                            </h2>
                            <div className="flex gap-2 mb-6">
                                {(['sweet', 'thoughtful', 'spicy'] as const).map(tone => (
                                    <button key={tone} onClick={() => setAiTone(tone)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${aiTone === tone ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                        {tone}
                                    </button>
                                ))}
                            </div>
                            <button onClick={generateAIDraft} disabled={isDrafting} className="w-full bg-indigo-50 text-indigo-600 font-bold py-3 rounded-2xl hover:bg-indigo-100 transition border border-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 mb-6 font-serif">
                                {isDrafting ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> : '🪄 Help me say something...'}
                            </button>
                            <form onSubmit={handleSendFlirt} className="space-y-4">
                                <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Type it yourself or use the magic wand above..." rows={3} className="w-full bg-gray-50 p-4 rounded-2xl border border-transparent focus:border-blue-500 focus:bg-white outline-none transition text-sm" />
                                <div className="flex gap-2 items-center">
                                    <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={uploadStatus !== 'idle'} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition disabled:opacity-50" title="Take Photo">
                                        <span className="text-lg">{uploadStatus !== 'idle' ? '⏳' : '📸'}</span>
                                    </button>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadStatus !== 'idle'} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition disabled:opacity-50" title="Upload Image">
                                        <span className="text-lg">{uploadStatus !== 'idle' ? '...' : '🖼️'}</span>
                                    </button>
                                    <button type="submit" disabled={!draft.trim() || uploadStatus !== 'idle'} className="flex-grow bg-blue-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition disabled:opacity-50">
                                        {uploadStatus === 'idle' ? 'Send Flirt' :
                                            uploadStatus === 'uploading' ? `Uploading ${uploadProgress}%` :
                                                `${uploadStatus.charAt(0).toUpperCase() + uploadStatus.slice(1)}...`}
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                                <input type="file" ref={cameraInputRef} onChange={handlePhotoUpload} accept="image/*" capture="environment" className="hidden" />
                            </form>
                            <div className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-400">
                                <p className="flex items-center gap-2 mb-1 font-bold text-gray-500">
                                    <span className="text-lg">🔒</span> Privacy & Encryption
                                </p>
                                <p className="opacity-80 leading-relaxed">
                                    Photos are <strong>End-to-End Encrypted</strong> using your partner's specific digital key.
                                    Once sent, even you cannot view them (Blind Drop mode). Only your partner's device can unlock the image.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[650px]">
                    {/* Thread List Sidebar */}
                    <div className="lg:col-span-4 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                            <h3 className="font-bold text-gray-800">Message Threads</h3>
                            <button onClick={() => setIsComposing(true)} className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg shadow-indigo-100 hover:scale-110 transition">+</button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 space-y-3">
                            {sortedThreadIds.length === 0 ? (
                                <div className="py-10 text-center text-gray-400 italic text-sm">No threads yet. Click + to start one.</div>
                            ) : (
                                sortedThreadIds.map(tid => {
                                    const thread = threads[tid];
                                    return (
                                        <button
                                            key={tid}
                                            onClick={() => { setActiveThreadId(tid); setIsComposing(false); }}
                                            className={`w-full text-left p-4 rounded-2xl transition border ${activeThreadId === tid ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-gray-50'}`}
                                        >
                                            <p className="font-bold text-gray-800 text-sm mb-1 truncate">{thread.subject}</p>
                                            <p className="text-[10px] text-gray-500 truncate mb-2">{thread.lastNote.author}: {thread.lastNote.text}</p>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{new Date(thread.lastNote.timestamp).toLocaleDateString()} {new Date(thread.lastNote.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Thread Detail / Composition Area */}
                    <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden relative">
                        {isComposing ? (
                            <div className="p-8 h-full flex flex-col">
                                <header className="mb-8 flex justify-between items-center">
                                    <h2 className="text-2xl font-serif font-bold text-gray-800">New Message</h2>
                                    <button onClick={() => setIsComposing(false)} className="text-gray-400 hover:text-gray-600">Cancel</button>
                                </header>
                                <form onSubmit={handleStartThread} className="flex-grow flex flex-col gap-4">
                                    <input
                                        value={compSubject}
                                        onChange={e => setCompSubject(e.target.value)}
                                        placeholder="Subject"
                                        className="w-full bg-gray-50 p-4 rounded-2xl border-none focus:ring-2 focus:ring-indigo-100 outline-none font-bold"
                                    />
                                    <textarea
                                        value={compText}
                                        onChange={e => setCompText(e.target.value)}
                                        placeholder="Write your long-form message here..."
                                        className="flex-grow w-full bg-gray-50 p-4 rounded-2xl border-none focus:ring-2 focus:ring-indigo-100 outline-none text-sm resize-none"
                                    />
                                    <button type="submit" className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition">Send Thread</button>
                                </form>
                            </div>
                        ) : activeThreadId && threads[activeThreadId] ? (
                            <>
                                <header className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                    <div>
                                        <h2 className="font-black uppercase tracking-tighter text-gray-800">{threads[activeThreadId].subject}</h2>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Threaded Conversation</p>
                                    </div>
                                    <button onClick={() => setActiveThreadId(null)} className="sm:hidden text-indigo-600 font-bold">Back</button>
                                </header>
                                <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-6 bg-[#f9f9fb] scroll-smooth">
                                    {threads[activeThreadId].notes.map((note, idx) => (
                                        <div key={idx} className={`flex flex-col ${note.author === currentUser.name ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}>
                                            <div className="flex items-center gap-2 max-w-[85%] justify-end">
                                                {note.author === currentUser.name && (
                                                    <div className="flex bg-gray-50 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onPinInsight(note.text, "Flirt Thread"); }}
                                                            className="text-yellow-400 hover:text-yellow-600 px-2 text-sm"
                                                            title="Pin to Insights"
                                                        >
                                                            📌
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                                                            className="text-red-300 hover:text-red-500 px-2 text-sm"
                                                            title="Delete"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                )}
                                                <div className={`p-4 rounded-3xl text-sm shadow-sm ${note.author === currentUser.name ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                                                    {(note.photoPath && note.photoIv) || (note.storagePath && note.encryptedKey) ? (
                                                        <SecurePhoto
                                                            path={note.photoPath}
                                                            storagePath={note.storagePath}
                                                            ivStr={note.photoIv}
                                                            encryptedKey={note.encryptedKey}
                                                            sharedKey={sharedKey}
                                                            timestamp={note.timestamp}
                                                            isMine={note.author === currentUser.name}
                                                        />
                                                    ) : (
                                                        <p className="leading-relaxed whitespace-pre-wrap">{note.text}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-2 flex gap-2 px-1">
                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{note.author}</span>
                                                <span className="text-[9px] text-gray-400 capitalize">{new Date(note.timestamp).toLocaleDateString()} at {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-5 border-t border-gray-100">
                                    <form onSubmit={handleSendThreadReply} className="flex gap-3 items-center">
                                        <textarea
                                            value={draft}
                                            onChange={e => setDraft(e.target.value)}
                                            placeholder="Reply to this thread..."
                                            rows={2}
                                            className="flex-grow bg-gray-50 p-4 rounded-2xl border-none focus:ring-2 focus:ring-indigo-100 outline-none text-sm resize-none"
                                        />
                                        <div className="flex flex-col gap-2">
                                            <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={uploadStatus !== 'idle'} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition disabled:opacity-50" title="Take Photo">
                                                {uploadStatus !== 'idle' ? '⏳' : '📸'}
                                            </button>
                                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadStatus !== 'idle'} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition disabled:opacity-50" title="Upload Image">
                                                {uploadStatus !== 'idle' ? '...' : '🖼️'}
                                            </button>
                                            <button type="submit" disabled={!draft.trim() || uploadStatus !== 'idle'} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition disabled:opacity-50">
                                                {uploadStatus === 'idle' ? '🚀' : '...'}
                                            </button>
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                                        <input type="file" ref={cameraInputRef} onChange={handlePhotoUpload} accept="image/*" capture="environment" className="hidden" />
                                    </form>
                                </div>
                            </>
                        ) : activeThreadId ? (
                            <div className="h-full flex flex-col justify-center items-center text-gray-400 opacity-50 space-y-4">
                                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-bold">Creating Thread...</p>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col justify-center items-center text-gray-400 opacity-50 p-10 text-center">
                                <div className="text-6xl mb-4">📥</div>
                                <h3 className="text-xl font-serif font-bold text-gray-600 mb-2">Message Center</h3>
                                <p className="text-sm max-w-xs">Select a thread on the left or click the "+" button to start a new subject-based conversation.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlirtSection;
