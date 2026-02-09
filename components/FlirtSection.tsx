
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
import ActivityFeed from './ActivityFeed';
import MessageBubble from './MessageBubble';
import SecurePhoto from './SecurePhoto';
import SecureAudio from './SecureAudio';
import TimeLeft from './TimeLeft';

// SecurePhoto and SecureAudio extracted to separate files

const AudioRecorder: React.FC<{ onStop: (blob: Blob) => void }> = ({ onStop }) => {
    const [recording, setRecording] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);

    const startTimeRef = useRef<number>(0);
    const stoppingRef = useRef<boolean>(false); // Track if stop was requested while starting

    const start = async () => {
        stoppingRef.current = false;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // If stop was pressed while we were getting the stream, abort immediately
            if (stoppingRef.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            let mimeType = '';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            } else {
                mimeType = '';
            }

            console.log(`Using MIME type: ${mimeType || 'default'}`);

            mediaRecorder.current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            chunks.current = [];

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.current.push(e.data);
            };

            mediaRecorder.current.onstop = () => {
                const duration = Date.now() - startTimeRef.current;

                // Allow slightly shorter duration (300ms) or handle logic better
                if (duration < 500) {
                    console.warn(`Recording too short (${duration}ms). Discarding.`);
                    stream.getTracks().forEach(t => t.stop());

                    // Visual feedback for short recording
                    const btn = document.getElementById('record-btn');
                    if (btn) {
                        btn.style.backgroundColor = '#fee2e2'; // Light red
                        setTimeout(() => btn.style.backgroundColor = '', 500);
                    }
                    return;
                }

                const type = mimeType || 'audio/webm';
                const blob = new Blob(chunks.current, { type });
                console.log(`Recording stopped. Blob size: ${blob.size} bytes. Type: ${blob.type}. Duration: ${duration}ms`);

                if (blob.size === 0) {
                    alert("Recording failed (0 bytes). Check microphone permissions.");
                    return;
                }
                onStop(blob);
                stream.getTracks().forEach(t => t.stop());
            };

            // Start immediately
            mediaRecorder.current.start();
            setRecording(true);
            startTimeRef.current = Date.now();

            // Double check if stop was triggered right after stream acquisition but before start
            if (stoppingRef.current) {
                mediaRecorder.current.stop();
                setRecording(false);
            }

        } catch (e: any) {
            console.error("Mic Error", e);
            alert(`Could not access microphone: ${e.message}`);
        }
    };

    const stop = () => {
        stoppingRef.current = true; // Signal intention to stop
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
            setRecording(false);
        } else {
            // If mediaRecorder isn't ready, we set stoppingRef = true, so start() will handle it.
            setRecording(false);
        }
    };

    return (
        <button
            id="record-btn"
            type="button"
            onMouseDown={start}
            onMouseUp={stop}
            onTouchStart={start}
            onTouchEnd={stop}
            onMouseLeave={stop} // Safety: if they drag out
            className={`p-4 rounded-2xl transition ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
            title="Hold to Record"
        >
            <span className="text-lg">{recording ? '🎙️' : '🎤'}</span>
        </button>
    );
};

// TimeLeft removed (imported)

import { EMOJI_PATTERNS } from '../constants/emojiPatterns';

interface FlirtSectionProps {
    currentUser: User;
    partner: User | null;
    chatter: Record<string, ChatterNote[]>;
    onAddNote: (contextId: string, text: string, photoPath?: string, photoIv?: string, subject?: string, extra?: { encryptedKey?: string, storagePath?: string, senderId?: string, expiresAt?: number, audioPath?: string, audioIv?: string }) => void;
    sharedKey: CryptoKey | null;
    onDeleteNote: (id: string) => void;
    onPinInsight: (text: string, source: string) => void;
    onNavigateContext?: (contextId: string) => void;
    flirts?: import('../types').Flirt[];
    onMarkRead: (noteId: string, authorUid: string) => void;
    onMarkAllRead: () => void;
    onMarkAllUnread: () => void;
    onToggleReaction: (noteId: string, authorUid: string, emoji: string) => void;
    onToggleRead: (noteId: string, currentStatus: string | undefined, authorUid: string) => void;
}

const FlirtSection: React.FC<FlirtSectionProps> = ({ currentUser, partner, chatter, onAddNote, sharedKey, onDeleteNote, onPinInsight, onNavigateContext, flirts, onMarkRead, onToggleReaction, onMarkAllRead, onMarkAllUnread, onToggleRead }) => {
    // ... code ...


    // ... (rest of component) ...
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


    // 2. Activity Feed (Notifications)
    const activityFeed = useMemo(() => {
        const activity: any[] = [];
        const now = Date.now();
        const EXPIRE_MS = 48 * 60 * 60 * 1000;

        Object.keys(chatter).forEach(contextId => {
            const notes = chatter[contextId];
            notes.forEach(note => {
                if (now - note.timestamp > EXPIRE_MS) return;

                // Construct context name for generic items
                let contextName = 'Unknown';
                if (contextId === 'general-flirt') {
                    contextName = 'Fast Flirt';
                } else if (contextId.startsWith('flirt-')) {
                    const id = contextId.replace('flirt-', '');
                    const foundFlirt = flirts?.find(f => f.id === id);
                    contextName = foundFlirt ? `Flirt: ${foundFlirt.text.substring(0, 15)}...` : "Flirt";
                } else if (contextId.startsWith('thread-')) {
                    const thread = threads[contextId];
                    contextName = thread ? `Thread: ${thread.subject}` : "Thread";
                } else if (contextId.includes('term-')) {
                    contextName = 'Directory Update';
                } else if (contextId.includes('bounty-')) {
                    contextName = 'Favor Update';
                }

                activity.push({
                    ...note,
                    contextId,
                    contextName,
                    authorUid: note.author === currentUser.name ? currentUser.uid : (partner?.uid || ''),
                    type: 'note'
                });

                // Add Reactions as separate activity items
                if (note.reactions && Array.isArray(note.reactions)) {
                    note.reactions.forEach(reaction => {
                        // Only show reactions from partner (or maybe my own too? let's show all for now)
                        // If sorting by timestamp, we need a timestamp. 
                        // Legacy reactions won't have it, so we default to note timestamp + 1s
                        const reactionTime = reaction.timestamp || (note.timestamp + 1000);

                        if (now - reactionTime > EXPIRE_MS) return;

                        activity.push({
                            id: `reaction-${note.id}-${reaction.emoji}-${reaction.author}`, // Unique ID for key
                            firestoreId: note.firestoreId, // Link back to original note for read status toggling? Maybe not needed for reaction itself but good context
                            timestamp: reactionTime,
                            author: reaction.author,
                            text: `Reacted ${reaction.emoji} to: "${note.text.substring(0, 20)}..."`,
                            contextId,
                            contextName,
                            type: 'reaction',
                            status: 'read', // Reactions don't strictly have read status yet, default to read
                            authorUid: reaction.author === currentUser.name ? currentUser.uid : (partner?.uid || '')
                        });
                    });
                }
            });
        });
        return activity.sort((a, b) => b.timestamp - a.timestamp);
    }, [chatter, flirts, threads, currentUser.uid, partner?.uid]);

    // 3. Flirt Activity (Direct Messages)
    const flirtActivity = useMemo(() => {
        const activity: any[] = [];
        const now = Date.now();
        const EXPIRE_MS = 48 * 60 * 60 * 1000;

        Object.keys(chatter).forEach(contextId => {
            const notes = chatter[contextId];
            notes.forEach(note => {
                if (now - note.timestamp > EXPIRE_MS) return;
                if (contextId === 'general-flirt') {
                    activity.push({ ...note, contextId, contextName: 'Fast Flirt' });
                } else if (contextId.startsWith('flirt-')) {
                    const id = contextId.replace('flirt-', '');
                    const foundFlirt = flirts?.find(f => f.id === id);
                    const contextName = foundFlirt ? `Flirt: ${foundFlirt.text.substring(0, 15)}...` : "Flirt";
                    activity.push({ ...note, contextId, contextName });
                }
            });
        });
        return activity.sort((a, b) => a.timestamp - b.timestamp);
    }, [chatter, flirts]);

    const [subTab, setSubTab] = useState<'flirts' | 'inbox' | 'activity'>('flirts');

    // Auto-mark read when viewing flirts
    useEffect(() => {
        if (subTab === 'flirts') {
            const unread = Object.values(chatter).flat().filter((n: ChatterNote) =>
                n.author !== currentUser.name && n.status !== 'read'
            );
            unread.forEach(note => {
                onMarkRead(note.firestoreId || note.id, note.author === currentUser.name ? currentUser.uid : (partner?.uid || ''));
            });
        }
    }, [chatter, subTab, currentUser, partner]);

    const [draft, setDraft] = useState('');
    const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);
    const [isDrafting, setIsDrafting] = useState(false);
    const [isComposerExpanded, setIsComposerExpanded] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'compressing' | 'encrypting' | 'uploading'>('idle');
    const [compSubject, setCompSubject] = useState('');
    const [compText, setCompText] = useState('');
    const [aiTone, setAiTone] = useState<'sweet' | 'spicy' | 'thoughtful'>('sweet');
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [isComposing, setIsComposing] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    useEffect(() => {
        if (scrollRef.current && !highlightedNoteId) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [flirtActivity, activeThreadId, threads, highlightedNoteId]);

    // Scroll to highlighted note
    useEffect(() => {
        if (highlightedNoteId && (subTab === 'flirts' || subTab === 'inbox')) {
            setTimeout(() => {
                const el = document.getElementById(`note-${highlightedNoteId}`);
                if (el) {
                    // Calculate position to be 20% from top
                    // We need to account for the container's scroll position if it's within a container, 
                    // or window scroll if it's the main window. 
                    // FlirtSection's list is in `scrollRef`.
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Keep center for now as fallback or if calculation fails. 

                    // Actually, let's try to align it to the top with some padding.
                    // block: 'start' puts it at the very top.
                    // We can use scrollIntoView({ block: 'start', behavior: 'smooth' }) and add scroll-margin-top to the CSS, 
                    // but we can't easily change CSS dynamically here.

                    // Let's try manual scroll on the container
                    if (scrollRef.current) {
                        const container = scrollRef.current;
                        const elementTop = el.offsetTop;
                        const containerHeight = container.clientHeight;
                        // Target position: Element top should be at 20% of container height
                        const targetScrollTop = elementTop - (containerHeight * 0.2);

                        container.scrollTo({
                            top: Math.max(0, targetScrollTop),
                            behavior: 'smooth'
                        });
                    }

                    el.classList.add('ring-4', 'ring-indigo-200', 'rounded-xl');
                    setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-200', 'rounded-xl'), 2000);
                    setHighlightedNoteId(null);
                }
            }, 500);
        }
    }, [highlightedNoteId, subTab, flirtActivity, threads]);

    const [stagedImage, setStagedImage] = useState<File | null>(null);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setStagedImage(file);
    };

    const handleSendFlirt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim() && !audioBlob && !stagedImage) return;

        let audioPath: string | undefined;
        let audioIv: string | undefined;

        // Image Vars
        let photoPath: string | undefined;
        let photoIv: string | undefined;
        let encryptedKey: string | undefined;
        let storagePath: string | undefined;

        setUploadStatus('uploading'); // Generic busy state

        try {
            // 1. Handle Audio
            if (audioBlob) {
                if (!sharedKey) {
                    showToast("Encryption key missing for audio.", 'error');
                    setUploadStatus('idle');
                    return;
                }
                setUploadStatus('encrypting');
                const { encryptedBlob, iv } = await encryptBlob(audioBlob, sharedKey);
                const filename = `audio/${currentUser.connectId}/${Date.now()}.enc`;
                const storageRef = ref(storage, filename);

                setUploadStatus('uploading');
                await uploadBytes(storageRef, encryptedBlob);

                audioPath = filename;
                audioIv = ivToString(iv);
            }

            // 2. Handle Image
            if (stagedImage) {
                // 1. Fetch Partner's Public Key (ZK Check)
                let partnerPubKey: CryptoKey | null = null;
                if (partner && (partner as any).publicKey) {
                    partnerPubKey = await importPublicKey((partner as any).publicKey);
                }

                if (!partnerPubKey && !sharedKey) {
                    throw new Error("No secure channel available.");
                }

                setUploadStatus('compressing');
                let blobToEncrypt = await compressImage(stagedImage).catch(() => stagedImage);

                setUploadStatus('encrypting');
                let encryptedBlob: Blob;

                // --- ZK MODE ---
                if (partnerPubKey) {
                    const disposableKey = await generateAESKey();
                    const result = await encryptBlob(blobToEncrypt, disposableKey);
                    encryptedBlob = result.encryptedBlob;
                    photoIv = ivToString(result.iv);
                    encryptedKey = await wrapAESKey(disposableKey, partnerPubKey);
                    storagePath = `encrypted_chats/${currentUser.connectId}_${Date.now()}.bin`;
                } else {
                    // --- LEGACY MODE ---
                    if (!sharedKey) throw new Error("No Shared Key");
                    const result = await encryptBlob(blobToEncrypt, sharedKey);
                    encryptedBlob = result.encryptedBlob;
                    photoIv = ivToString(result.iv);
                    photoPath = `photos/${currentUser.connectId}/${Date.now()}.enc`;
                }

                setUploadStatus('uploading');
                // Use the correct path based on mode
                const uploadRef = ref(storage, storagePath || photoPath);
                await uploadBytes(uploadRef, encryptedBlob);
            }

            const expiresAt = Date.now() + expiration;

            onAddNote(
                'general-flirt',
                draft.trim() || (audioPath ? "[Voice Note]" : "") || (stagedImage ? "[Secure Photo]" : ""),
                photoPath,
                photoIv,
                undefined,
                {
                    expiresAt,
                    audioPath,
                    audioIv,
                    encryptedKey,
                    storagePath,
                    senderId: currentUser.connectId
                }
            );

            setDraft('');
            setAudioBlob(null);
            setStagedImage(null);
            setUploadStatus('idle');
            showToast("Sent!", 'success');
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';

        } catch (err: any) {
            console.error(err);
            showToast(`Failed: ${err.message}`, 'error');
            setUploadStatus('idle');
        }
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
    const [expiration, setExpiration] = useState<number>(48 * 60 * 60 * 1000); // Default 48h

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

    const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToastMessage(msg);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 3000);
    };

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
            </header>

            {/* Collapsible Composer Section */}
            <div className="max-w-4xl mx-auto px-4 mb-6">
                {!isComposerExpanded ? (
                    // Collapsed State
                    <div
                        onClick={() => setIsComposerExpanded(true)}
                        className="bg-white rounded-full shadow-sm border border-gray-100 p-2 pl-6 flex items-center justify-between cursor-text hover:shadow-md transition-shadow group"
                    >
                        <span className="text-gray-400 font-medium text-lg">Draft a flirt or deep thought...</span>
                        <div className="flex gap-2">
                            <button className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center hover:bg-indigo-100 transition">
                                ✨
                            </button>
                            <button className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 transition">
                                📸
                            </button>
                        </div>
                    </div>
                ) : (
                    // Expanded State
                    <div className="bg-white rounded-3xl shadow-xl border border-indigo-50 p-6 animate-in zoom-in-95 duration-200">
                        <div className="mb-4">
                            <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">
                                AI Mood Assistant
                            </p>
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        {/* Desktop/Tablet: Buttons */}
                                        <div className="hidden sm:flex gap-2">
                                            {(['sweet', 'thoughtful', 'spicy'] as const).map(tone => (
                                                <button
                                                    key={tone}
                                                    onClick={() => setAiTone(tone)}
                                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition flex items-center gap-1.5 ${aiTone === tone ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-100' : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50 hover:border-gray-200'}`}
                                                >
                                                    <span>{tone === 'sweet' ? '🍬' : tone === 'thoughtful' ? '🤔' : '🌶️'}</span>
                                                    {tone}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Mobile: Dropdown */}
                                        <div className="sm:hidden relative">
                                            <select
                                                value={aiTone}
                                                onChange={(e) => setAiTone(e.target.value as any)}
                                                className="appearance-none bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-indigo-100 outline-none pr-8"
                                            >
                                                <option value="sweet">🍬 Sweet</option>
                                                <option value="thoughtful">🤔 Thoughtful</option>
                                                <option value="spicy">🌶️ Spicy</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-700">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    {aiTone && (
                                        <div className="mt-1 bg-indigo-50/50 rounded-xl p-3 border border-indigo-50 animate-in fade-in slide-in-from-top-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg">{aiTone === 'sweet' ? '🥰' : aiTone === 'thoughtful' ? '🌟' : '🔥'}</span>
                                                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                                                    {aiTone === 'sweet' ? 'Sweet & Romantic' : aiTone === 'thoughtful' ? 'Deep & Appreciation' : 'Hot & Spicy'}
                                                </p>
                                            </div>
                                            <p className="text-xs text-indigo-700 italic">
                                                "{aiTone === 'sweet' ? "Thinking of you..." : aiTone === 'thoughtful' ? "I appreciate how you..." : "Can't wait to see you..."}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setIsComposerExpanded(false)} className="text-xs font-bold text-gray-300 hover:text-gray-500 px-3 py-1 bg-gray-50 rounded-full hover:bg-gray-100 transition uppercase tracking-widest flex items-center justify-center">
                                    <span className="sm:hidden text-lg">✕</span>
                                    <span className="hidden sm:inline">Cancel</span>
                                </button>
                            </div>
                        </div>

                        <div className="relative mb-4">
                            <textarea
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                placeholder="Type it yourself or use the magic wand above, or try a combination of the two..."
                                rows={4}
                                className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-100 text-lg font-medium text-gray-700 resize-none"
                                autoFocus
                            />
                            {/* Attachments & Preview */}
                            {stagedImage && (
                                <div className="absolute bottom-4 left-4 z-10">
                                    <div className="relative group">
                                        <img src={URL.createObjectURL(stagedImage)} alt="Draft" className="w-20 h-20 rounded-xl object-cover shadow-lg border-2 border-white" />
                                        <button onClick={() => setStagedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm">✕</button>
                                    </div>
                                </div>
                            )}
                            {audioBlob && (
                                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold">
                                    <span>🎤 Voice Note Ready</span>
                                    <button onClick={() => setAudioBlob(null)} className="ml-2 w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center">✕</button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                            <div className="flex gap-2 items-center justify-between sm:justify-start">
                                <div className="flex gap-2">
                                    <button type="button" onClick={generateAIDraft} disabled={isDrafting} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition" title="AI Draft">
                                        {isDrafting ? <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> : <span className="text-xl">✨</span>}
                                    </button>
                                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition" title="Camera">
                                        <span className="text-xl">📸</span>
                                    </button>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition" title="Gallery">
                                        <span className="text-xl">🖼️</span>
                                    </button>
                                    <AudioRecorder onStop={(blob) => setAudioBlob(blob)} />
                                </div>
                                <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block"></div>
                                <select
                                    value={expiration}
                                    onChange={(e) => setExpiration(Number(e.target.value))}
                                    className="bg-transparent text-xs font-bold text-gray-500 border-none outline-none cursor-pointer"
                                >
                                    <option value={30 * 60 * 1000}>30m</option>
                                    <option value={2 * 60 * 60 * 1000}>2h</option>
                                    <option value={24 * 60 * 60 * 1000}>24h</option>
                                    <option value={48 * 60 * 60 * 1000}>48h</option>
                                </select>
                            </div>
                            <button
                                onClick={(e) => {
                                    handleSendFlirt(e as any);
                                    setIsComposerExpanded(false);
                                }}
                                disabled={!draft.trim() && !stagedImage && !audioBlob}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 w-full sm:w-auto"
                            >
                                SEND
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center mb-6">
                <div className="bg-gray-100 p-1 rounded-2xl inline-flex">
                    <button
                        onClick={() => setSubTab('flirts')}
                        className={`px-6 py-2 rounded-xl font-bold transition-all text-sm ${subTab === 'flirts' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Latest Flirts
                    </button>
                    <button
                        onClick={() => setSubTab('activity')}
                        className={`px-6 py-2 rounded-xl font-bold transition-all text-sm relative flex items-center gap-2 ${subTab === 'activity' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Activity Log
                        {activityFeed.filter(item => item.author !== currentUser.name && item.status !== 'read').length > 0 && (
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setSubTab('inbox')}
                        className={`px-6 py-2 rounded-xl font-bold transition-all text-sm ${subTab === 'inbox' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Threads
                    </button>
                </div>
            </div>

            {/* Activity View */}
            {subTab === 'activity' && (
                <div className="flex justify-end gap-2 mb-4 px-4">
                    <button onClick={onMarkAllRead} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">
                        Mark All Read
                    </button>
                    <button onClick={onMarkAllUnread} className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
                        Mark All Unread
                    </button>
                </div>
            )}
            {subTab === 'activity' && (
                <div className="max-w-2xl mx-auto mb-10">
                    <ActivityFeed
                        activity={activityFeed}
                        onNavigateContext={(ctx, targetId) => {
                            if (ctx === 'general-flirt' || ctx.startsWith('flirt-')) {
                                setSubTab('flirts');
                                if (targetId) setHighlightedNoteId(targetId);
                            } else if (ctx.startsWith('thread-')) {
                                setSubTab('inbox');
                                setActiveThreadId(ctx);
                                if (targetId) setHighlightedNoteId(targetId);
                            } else {
                                // For external contexts (terms, bounties), use the prop
                                if (onNavigateContext) onNavigateContext(ctx);
                            }
                        }}
                        onToggleRead={onToggleRead}
                    />
                </div>
            )}

            {/* Flirts View */}
            {subTab === 'flirts' && (
                <div className="max-w-4xl mx-auto mb-10">
                    <div className="h-[600px] flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Direct Messages</h3>
                            <span className="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Ephemeral (48h)</span>
                        </div>
                        <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#f9f9fb] scroll-smooth">
                            {flirtActivity.length === 0 ? (
                                <div className="h-full flex flex-col justify-center items-center text-gray-400 opacity-50">
                                    <div className="text-4xl mb-2">💌</div>
                                    <p className="text-sm">No recent activity.</p>
                                </div>
                            ) : (
                                flirtActivity.map((note, idx) => (
                                    <div id={`note-${note.firestoreId || note.id}`} key={note.id || idx} className={`flex flex-col ${note.author === currentUser.name ? 'items-end' : 'items-start'} mb-6 animate-in fade-in slide-in-from-bottom-1 duration-300 group`}>
                                        <div className={`flex gap-3 max-w-[85%] ${note.author === currentUser.name ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm mt-auto ${note.author === currentUser.name ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                                                {note.author[0]}
                                            </div>

                                            {/* Message Content Bubble */}
                                            <MessageBubble
                                                note={note}
                                                currentUser={currentUser}
                                                partner={partner}
                                                sharedKey={sharedKey}
                                                onToggleReaction={onToggleReaction}
                                                onMarkRead={onMarkRead}
                                                onDeleteNote={onDeleteNote}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="text-center mt-4">
                            <p className="text-[9px] text-gray-300 font-mono">
                                ✓ Sent • ✓✓ Read
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Inbox View */}
            {
                subTab === 'inbox' && (
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
                                            <div id={`note-${note.firestoreId || note.id}`} key={idx} className={`flex flex-col ${note.author === currentUser.name ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}>
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
                                                    {/* Content */}
                                                    <MessageBubble
                                                        note={note}
                                                        currentUser={currentUser}
                                                        partner={partner}
                                                        sharedKey={sharedKey}
                                                        onToggleReaction={onToggleReaction}
                                                        onMarkRead={onMarkRead}
                                                        onDeleteNote={onDeleteNote}
                                                    />
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
                            )
                            }
                        </div >
                    </div >
                )
            }
        </div >
    );
};

export default FlirtSection;
