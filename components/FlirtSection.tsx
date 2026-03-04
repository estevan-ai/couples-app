import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, ChatterNote } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { storage } from '../firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { encryptBlob, ivToString, importPublicKey, wrapAESKey, generateAESKey } from '../utils/encryption';
import { compressImage } from '../utils/image';
import ActivityFeed from './ActivityFeed';
import MessageBubble from './MessageBubble';
import AudioRecorder from './AudioRecorder';
import { MentionSuggestions } from './MentionSuggestions';

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
    onEditNote: (id: string, newText: string) => void;
    privateKey: CryptoKey | null;
    onReflect?: (text: string) => void;
    initialTab?: 'flirts' | 'thoughts' | 'activity';
    targetThreadId?: string | null; // New Prop
    terms?: import('../types').Term[];
    partnerBookmarks?: Record<number, import('../types').Bookmark>;
}

const FlirtSection: React.FC<FlirtSectionProps> = ({
    currentUser,
    partner,
    chatter,
    onAddNote,
    onDeleteNote,
    onPinInsight,
    sharedKey,
    onNavigateContext,
    onMarkRead,
    onToggleReaction,
    onMarkAllRead,
    onMarkAllUnread,
    onToggleRead,
    onEditNote,
    privateKey,
    onReflect,
    initialTab = 'flirts',
    targetThreadId,
    terms,
    partnerBookmarks,
    flirts
}) => {

    // --- STATE ---
    // Renamed 'chat' -> 'flirts', 'threads' -> 'thoughts'
    const [activeTab, setActiveTab] = useState<'flirts' | 'thoughts' | 'activity'>(initialTab || 'flirts');

    // Effect to update activeTab if initialTab changes
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);



    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

    // Deep Link Effect
    useEffect(() => {
        if (targetThreadId) {
            setActiveThreadId(targetThreadId);
        }
    }, [targetThreadId]);

    const [isComposerExpanded, setIsComposerExpanded] = useState(false);

    // Composer State
    const [draft, setDraft] = useState('');
    const [threadSubject, setThreadSubject] = useState('');
    const [stagedImage, setStagedImage] = useState<File | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isDrafting, setIsDrafting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'compressing' | 'encrypting' | 'uploading'>('idle');
    const [aiTone, setAiTone] = useState<'sweet' | 'spicy' | 'thoughtful'>('sweet');

    // Mention State
    const [mentionQuery, setMentionQuery] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, setter: (val: string) => void) => {
        const value = e.target.value;
        const pos = e.target.selectionStart || 0;
        setter(value);
        setCursorPosition(pos);

        // Check for @
        const lastAt = value.lastIndexOf('@', pos);
        if (lastAt !== -1) {
            const query = value.slice(lastAt + 1, pos);
            if (!query.includes(' ')) {
                setMentionQuery(query);
            } else {
                setMentionQuery('');
            }
        } else {
            setMentionQuery('');
        }
    };

    const handleMentionSelect = (term: import('../types').Term, setter: (val: any) => void, currentValue: string) => {
        const lastAt = currentValue.lastIndexOf('@', cursorPosition);
        if (lastAt !== -1) {
            const newValue = currentValue.slice(0, lastAt) + `@${term.name} ` + currentValue.slice(cursorPosition);
            setter(newValue);
            setMentionQuery('');
            // Focus back
            // setTimeout(() => inputRef.current?.focus(), 10);
        }
    };

    // Clear draft when tab changes
    useEffect(() => {
        setDraft('');
        setStagedImage(null);
        setAudioBlob(null);
        setThreadSubject('');
    }, [activeTab, activeThreadId]);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const draftInputRef = useRef<HTMLTextAreaElement>(null);

    // --- 1. CHAT (FLIRTS) FEED LOGIC ---
    const messages = useMemo(() => {
        const uniqueIds = new Set();
        const feed: any[] = [];
        const EXPIRE_MS = 48 * 60 * 60 * 1000; // 48h default

        // Helper to process notes
        const processNotes = (notes: ChatterNote[], contextType: 'flirt' | 'thread' | 'favor') => {
            notes.forEach(note => {
                if (uniqueIds.has(note.id)) return;

                // Expiration Check for Flirts (Strict)
                if (contextType === 'flirt') {
                    if (note.expiresAt) {
                        if (Date.now() > note.expiresAt) return;
                    } else {
                        // Legacy fallback
                        if (Date.now() - note.timestamp > EXPIRE_MS) return;
                    }
                }

                feed.push({ ...note, contextType });
                uniqueIds.add(note.id);
            });
        };

        // If in a specific Thread (Thought), only show those messages
        if (activeTab === 'thoughts' && activeThreadId) {
            if (chatter[activeThreadId]) {
                processNotes(chatter[activeThreadId], 'thread');
            }
            return feed.sort((a, b) => a.timestamp - b.timestamp);
        }

        // Main Flirts Feed (excludes specific threads)
        if (activeTab === 'flirts') {
            if (flirts) processNotes(flirts as any[], 'flirt'); // Legacy Flirts prop if used
            if (chatter['general-flirt']) processNotes(chatter['general-flirt'], 'flirt');
            // We deliberately EXCLUDE 'thread-' keys here
        }

        // Sort Chronologically
        return feed.sort((a, b) => a.timestamp - b.timestamp);
    }, [chatter, flirts, activeTab, activeThreadId]);

    // --- 1.5 THOUGHTS LIST LOGIC ---
    const threadsList = useMemo(() => {
        const threads: { id: string, subject: string, lastMsg: ChatterNote, count: number }[] = [];
        Object.keys(chatter).forEach(key => {
            const isThread = key.startsWith('thread-');
            const isTerm = key.startsWith('term-');

            if (isThread || isTerm) {
                const notes = chatter[key];
                if (notes.length > 0) {
                    const sorted = [...notes].sort((a, b) => b.timestamp - a.timestamp);

                    let subject = "Conversation";
                    if (isThread) {
                        subject = notes[0].subject || key.replace('thread-', '').replace(/-/g, ' ');
                    } else if (isTerm && terms) {
                        const termId = parseInt(key.replace('term-', ''));
                        const term = terms.find(t => t.id === termId);
                        subject = term ? `Directory: ${term.name}` : "Directory Item";
                    }

                    threads.push({
                        id: key,
                        subject: subject,
                        lastMsg: sorted[0],
                        count: notes.length
                    });
                }
            }
        });
        return threads.sort((a, b) => b.lastMsg.timestamp - a.lastMsg.timestamp);
    }, [chatter, terms]);

    // --- 2. ACTIVITY FEED LOGIC ---
    const activityFeed = useMemo(() => {
        const activity: any[] = [];
        const now = Date.now();
        const EXPIRE_MS = 48 * 60 * 60 * 1000;

        Object.keys(chatter).forEach(contextId => {
            const notes = chatter[contextId];
            notes.forEach(note => {
                let contextName = 'Unknown';

                if (contextId.includes('term-')) {
                    contextName = 'Directory Update';
                } else if (contextId.includes('bounty-') || !isNaN(Number(contextId))) {
                    contextName = 'Favor Update';
                } else {
                    if (contextId === 'general-flirt') contextName = 'Fast Flirt';
                    else if (contextId.startsWith('thread-')) contextName = 'Thought'; // Renamed Thread -> Thought
                    else contextName = 'Favor Update';
                }

                // Filter out Flirts from Activity Feed (Show Thoughts & Favors & Directory)
                if (contextName === 'Fast Flirt') return;

                activity.push({
                    ...note,
                    contextId,
                    contextName,
                    sender: note.author,
                    authorUid: note.author === currentUser.name ? currentUser.uid : (partner?.uid || 'partner-uid'),
                    type: 'note'
                });

                // Reactions
                if (note.reactions && Array.isArray(note.reactions)) {
                    note.reactions.forEach(reaction => {
                        const reactionTime = reaction.timestamp || (note.timestamp + 1000);
                        if (now - reactionTime > EXPIRE_MS) return;

                        activity.push({
                            id: `reaction-${note.id}-${reaction.emoji}-${reaction.author}`,
                            firestoreId: note.firestoreId,
                            timestamp: reactionTime,
                            author: reaction.author,
                            text: `Reacted ${reaction.emoji} to: "${note.text.substring(0, 20)}..."`,
                            contextId,
                            contextName,
                            type: 'reaction',
                            status: 'read',
                            authorUid: reaction.author === currentUser.name ? currentUser.uid : (partner?.uid || '')
                        });
                    });
                }
            });
        });
        return activity.sort((a, b) => b.timestamp - a.timestamp); // Newest First
    }, [chatter, currentUser.uid, partner?.uid]);


    // --- 4. AUTO SCROLL ---
    useEffect(() => {
        if ((activeTab === 'flirts' || (activeTab === 'thoughts' && activeThreadId)) && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length, messages[messages.length - 1]?.id, activeTab, activeThreadId]);

    // --- 2. TABS CONFIG ---
    const tabs = [
        { id: 'flirts', label: 'FLIRTS', icon: '💌' },
        { id: 'thoughts', label: 'THOUGHTS', icon: '💭' },
        { id: 'activity', label: 'ACTIVITY', icon: '🔔' }
    ];

    // --- 5. MARK READ ON VIEW ---
    useEffect(() => {
        if (activeTab === 'flirts' || (activeTab === 'thoughts' && activeThreadId)) {
            const timer = setTimeout(() => {
                const unread = messages.filter(m => m.author !== currentUser.name && m.status !== 'read');
                if (unread.length > 0) {
                    unread.forEach(m => onMarkRead(m.firestoreId || m.id, partner?.uid || ''));
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [messages, currentUser.name, partner?.uid, onMarkRead, activeTab, activeThreadId]);

    // Auto-focus when expanding
    useEffect(() => {
        if (isComposerExpanded && draftInputRef.current) {
            draftInputRef.current.focus();
        }
    }, [isComposerExpanded]);


    // --- 6. HANDLERS ---
    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setStagedImage(file);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim() && !audioBlob && !stagedImage) return;

        let audioPath: string | undefined;
        let audioIv: string | undefined;
        let photoPath: string | undefined;
        let photoIv: string | undefined;
        let encryptedKey: string | undefined;
        let storagePath: string | undefined;

        setUploadStatus('uploading');

        try {
            // 1. Audio
            if (audioBlob) {
                if (!sharedKey) throw new Error("Encryption key missing for audio.");
                setUploadStatus('encrypting');
                const { encryptedBlob, iv } = await encryptBlob(audioBlob, sharedKey);
                const filename = `audio/${currentUser.connectId}/${Date.now()}.enc`;
                await uploadBytes(ref(storage, filename), encryptedBlob);
                audioPath = filename;
                audioIv = ivToString(iv);
            }

            // 2. Image
            if (stagedImage) {
                let partnerPubKey: CryptoKey | null = null;
                if (partner && (partner as any).publicKey) {
                    partnerPubKey = await importPublicKey((partner as any).publicKey);
                }

                if (!partnerPubKey && !sharedKey) throw new Error("No secure channel available.");

                setUploadStatus('compressing');
                const blobToEncrypt = await compressImage(stagedImage).catch(() => stagedImage);

                setUploadStatus('encrypting');
                let encryptedBlob: Blob;

                if (partnerPubKey) {
                    console.warn(`[FlirtSection] Encrypting image for partner using Public Key starting with: ${(partner as any).publicKey.substring(0, 20)}...`);
                    const disposableKey = await generateAESKey();
                    const result = await encryptBlob(blobToEncrypt, disposableKey);
                    encryptedBlob = result.encryptedBlob;
                    photoIv = ivToString(result.iv);
                    encryptedKey = await wrapAESKey(disposableKey, partnerPubKey);
                    storagePath = `encrypted_chats/${currentUser.connectId}_${Date.now()}.bin`;
                } else {
                    if (!sharedKey) throw new Error("No Shared Key");
                    const result = await encryptBlob(blobToEncrypt, sharedKey);
                    encryptedBlob = result.encryptedBlob;
                    photoIv = ivToString(result.iv);
                    photoPath = `photos/${currentUser.connectId}/${Date.now()}.enc`;
                }

                setUploadStatus('uploading');
                await uploadBytes(ref(storage, storagePath || photoPath), encryptedBlob);
            }

            // 3. Send
            const expiresAt = Date.now() + (48 * 60 * 60 * 1000);

            // Determine Context
            let contextId = 'general-flirt';
            let finalSubject = undefined;

            if (activeTab === 'thoughts') { // Logic for Thoughts
                if (activeThreadId) {
                    contextId = activeThreadId;
                } else if (threadSubject.trim()) {
                    // New Thought (Thread)
                    const cleanSubject = threadSubject.trim().replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '-').toLowerCase();
                    contextId = `thread-${cleanSubject}-${Date.now()}`;
                    finalSubject = threadSubject.trim();
                }
            }

            onAddNote(
                contextId,
                draft.trim() || (audioPath ? "[Voice Note]" : "") || (stagedImage ? "[Secure Photo]" : ""),
                photoPath,
                photoIv,
                finalSubject, // Pass subject for new threads
                { expiresAt, audioPath, audioIv, encryptedKey, storagePath, senderId: currentUser.connectId }
            );

            // Reset
            setDraft('');
            setThreadSubject('');
            setAudioBlob(null);
            setStagedImage(null);
            setUploadStatus('idle');
            setIsComposerExpanded(false);

        } catch (err: any) {
            console.error(err);
            alert(`Failed: ${err.message}`);
            setUploadStatus('idle');
        }
    };

    const generateAIDraft = async () => {
        setIsDrafting(true);
        try {
            const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY;
            if (!apiKey) throw new Error("AI Key missing");

            // Fix AI Model (Use public gemini-1.5-flash)
            const ai = new GoogleGenerativeAI(apiKey);
            // Personalized System Prompt
            const relationshipContext = currentUser.relationshipContext ? `\nRELATIONSHIP CONTEXT: "${currentUser.relationshipContext}"` : "";
            const persona = currentUser.agentPersona ? `\nYOUR PERSONA: ${currentUser.agentPersona}` : "\nYOUR PERSONA: A helpful, romantic communication assistant.";

            const systemPrompt = `You are a helpful romantic assistant for ${currentUser.name} messaging ${partner?.name || 'Partner'}.${relationshipContext}${persona}\n\nCURRENT TONE TARGET: ${aiTone}. \nGOAL: Help the user draft a short, romantic message (1-2 sentences) that fits their relationship context and tone. CRITICAL OUTPUT INSTRUCTIONS: ONLY return the text of the flirt. Do NOT add any chatty commentary, greetings, quotes, or conversational filler. Return just the text.`;

            const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
            const chat = model.startChat({
                history: [
                    { role: 'user', parts: [{ text: systemPrompt }] }
                ]
            });

            const context = messages.slice(-5).map(m => `${m.author}: ${m.text}`).join('\n');
            const prompt = `Context:\n${context}\n\nDraft: "${draft}"\n\nTask: ${draft ? "Polish/Complete this draft." : "Write a new message."}`;

            const result = await chat.sendMessage(prompt);
            const response = await result.response;
            setDraft(response.text().replace(/"/g, '').trim());

        } catch (e) {
            console.error("AI Generation Error", e);
            alert("AI Error. Check console.");
        } finally {
            setIsDrafting(false);
        }
    };

    const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

    // --- 7. RENDER ---
    return (
        <div className="fixed inset-x-0 bottom-[68px] sm:bottom-[80px] top-[72px] sm:top-[100px] bg-[#fdfdfd] md:bg-white md:rounded-t-3xl md:shadow-2xl md:border-x md:border-t border-gray-200/50 max-w-3xl mx-auto flex flex-col overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ... privacy ... */}

            {/* ... header ... */}

            {/* Sticky Quick Flirt Removed from here */}

            {/* ... content ... */}

            {/* --- PRIVACY BANNER (Restored & Interactive) --- */}
            <button
                onClick={() => setShowPrivacyInfo(true)}
                className="bg-indigo-50/50 p-2 text-center border-b border-indigo-100 flex items-center justify-center gap-2 w-full hover:bg-indigo-100 transition-colors"
            >
                <span className="text-indigo-400 text-xs">🔒</span>
                <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest">
                    Your messages are End-to-End Encrypted. Only you and your partner hold the keys.
                </p>
            </button>

            {/* --- ENCRYPTION INFO MODAL --- */}
            {showPrivacyInfo && (
                <div className="absolute inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 relative">
                        <button
                            onClick={() => setShowPrivacyInfo(false)}
                            className="absolute top-4 right-4 text-gray-300 hover:text-gray-500"
                        >
                            ✕
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">🔒</span>
                            <h3 className="font-serif text-xl font-bold text-gray-800">End-to-End Encrypted</h3>
                        </div>

                        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                            <p>
                                <span className="font-bold text-gray-800">AES-GCM 256-bit Encryption:</span> Your photos are scrambled on your phone before they ever touch the internet.
                            </p>
                            <p>
                                <span className="font-bold text-gray-800">Zero Knowledge:</span> We (the app developers) do not have the key. Only you and your partner do.
                            </p>
                            <p>
                                <span className="font-bold text-gray-800">Ephemeral:</span> Keys are stored locally on your device. For more details visit the Privacy Section.
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setShowPrivacyInfo(false);
                                onNavigateContext?.('privacy-settings');
                            }}
                            className="mt-6 w-full py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition"
                        >
                            Open Privacy Settings
                        </button>
                    </div>
                </div>
            )}

            {/* --- HEADER --- */}
            <header className="bg-white/90 backdrop-blur-md p-3 border-b border-gray-100 z-20">
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-3">
                        {/* Back Button for Thread (Thought) Detail */}
                        {activeTab === 'thoughts' && activeThreadId ? (
                            <button onClick={() => setActiveThreadId(null)} className="p-2 -ml-2 text-gray-500 hover:text-indigo-600 font-bold flex items-center gap-1">
                                ⬅ <span className="text-xs uppercase tracking-wide">Thoughts</span>
                            </button>
                        ) : (
                            <div className="relative">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold shadow-sm text-sm">
                                    {partner?.name?.[0] || '?'}
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                            </div>
                        )}
                        {/* Title Logic */}
                        <div>
                            <h2 className="font-bold text-gray-800 leading-tight">
                                {activeTab === 'thoughts' && activeThreadId ? (
                                    threadsList.find(t => t.id === activeThreadId)?.subject || 'Thought'
                                ) : (
                                    partner?.name || 'Partner'
                                )}
                            </h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{activeTab === 'thoughts' && activeThreadId ? 'Conversation' : (activeTab === 'flirts' ? 'CONNECTION CENTER' : activeTab.toUpperCase())}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'thoughts' && activeThreadId && onReflect && (
                            <button
                                onClick={() => {
                                    const threadTitle = threadsList.find(t => t.id === activeThreadId)?.subject || "this thought";
                                    onReflect(threadTitle);
                                }}
                                className="p-2 text-indigo-400 hover:text-indigo-600 transition text-xs font-bold flex items-center gap-1 bg-indigo-50 rounded-lg"
                                title="Reflect in Journal"
                            >
                                <span>📓</span> Reflect
                            </button>
                        )}
                        <button onClick={onMarkAllRead} className="p-2 text-gray-400 hover:text-indigo-600 transition text-xs font-bold" title="Mark All Read">✓✓ Read</button>
                    </div>
                </div>

                {/* TABS (Hidden when inside a thought detail) */}
                {!activeThreadId && (
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('flirts')}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'flirts' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <span>💌</span> FLIRTS
                        </button>
                        <button
                            onClick={() => setActiveTab('thoughts')}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'thoughts' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <span>💭</span> THOUGHTS
                        </button>
                        <button
                            onClick={() => setActiveTab('activity')}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'activity' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <span>🔔</span> ACTIVITY
                            {activityFeed.some(a => a.status !== 'read') && (
                                <span className="ml-1 w-2 h-2 bg-red-500 rounded-full inline-block"></span>
                            )}
                        </button>
                    </div>
                )}
            </header>

            {/* --- CONTENT AREA --- */}
            {activeTab === 'activity' ? (
                /* --- ACTIVITY FEED --- */
                <div className="flex-grow overflow-y-auto bg-gray-50/50 p-4">
                    <ActivityFeed
                        activity={activityFeed}
                        onNavigateContext={(ctx) => {
                            if (ctx.startsWith('thread-') || ctx.startsWith('term-')) {
                                setActiveTab('thoughts');
                                setActiveThreadId(ctx);
                            } else if (ctx === 'general-flirt' || ctx.startsWith('flirt-')) {
                                setActiveTab('flirts');
                            } else {
                                // Pass everything else (bounties, terms, etc) to App.tsx
                                if (onNavigateContext) onNavigateContext(ctx);
                            }
                        }}
                        onToggleRead={onToggleRead}
                    />
                </div>
            ) : activeTab === 'thoughts' && !activeThreadId ? (
                /* --- THOUGHTS LIST --- */
                <div className="flex-grow overflow-y-auto bg-white p-4 space-y-3 relative">
                    {/* Top Input Trigger */}
                    <button
                        onClick={() => setIsComposerExpanded(true)}
                        className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl p-3 flex items-center gap-3 transition-all text-left group mb-4 shadow-sm"
                    >
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors">
                            <span className="text-lg">+</span>
                        </div>
                        <span className="text-gray-400 text-sm font-medium group-hover:text-gray-600">Start a new thought...</span>
                    </button>

                    {threadsList.length === 0 ? (
                        <div className="text-center py-10 px-6 opacity-60">
                            <div className="text-4xl mb-3">💭</div>
                            <h3 className="text-lg font-serif font-bold text-indigo-900 mb-2">Thoughts</h3>
                            <p className="text-sm text-indigo-700 max-w-xs mx-auto mb-4">
                                See thoughts connected to other parts of the app, or start a random thought for you and your partner to discuss.
                            </p>
                            <p className="text-xs text-indigo-500 max-w-xs mx-auto">
                                See a topic you'd like to explore more in the journal? Hover over and click "Think Deeper" action words that appear just above like other action items.
                            </p>
                            {/* Shared Interests Section */}
                            {partner && partnerBookmarks && terms && (
                                <div className="mt-8 animate-in slide-in-from-top-4 duration-500 text-left">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 pl-2">
                                        Topics {partner.name} Loves (Tap to Discuss)
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {terms.filter(t => partnerBookmarks[t.id] === 'love' || (partnerBookmarks[t.id] === 'like' && partner.sharingSettings?.shareLikes)).slice(0, 5).map(term => (
                                            <button
                                                key={term.id}
                                                onClick={() => {
                                                    setIsComposerExpanded(true);
                                                    setThreadSubject(term.name);
                                                    setDraft(prev => prev ? prev : `I saw you liked "${term.name}"... tell me more?`);
                                                }}
                                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs px-3 py-1.5 rounded-full transition font-medium border border-indigo-100"
                                            >
                                                {partnerBookmarks[term.id] === 'love' ? '❤️' : '🤔'} {term.name}
                                            </button>
                                        ))}
                                        {terms.filter(t => partnerBookmarks[t.id] === 'love').length === 0 && (
                                            <p className="text-xs text-gray-400 italic pl-2">No shared favorites yet.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Shared Interests Section (Top of list) */}
                            {partner && partnerBookmarks && terms && (
                                <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 pl-2">
                                        Topics {partner.name} Loves (Tap to Discuss)
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {terms.filter(t => partnerBookmarks[t.id] === 'love' || (partnerBookmarks[t.id] === 'like' && partner.sharingSettings?.shareLikes)).slice(0, 5).map(term => (
                                            <button
                                                key={term.id}
                                                onClick={() => {
                                                    setIsComposerExpanded(true);
                                                    setThreadSubject(term.name);
                                                    setDraft(prev => prev ? prev : `I saw you liked "${term.name}"... tell me more?`);
                                                }}
                                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs px-3 py-1.5 rounded-full transition font-medium border border-indigo-100"
                                            >
                                                {partnerBookmarks[term.id] === 'love' ? '❤️' : '🤔'} {term.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {threadsList.map(thread => (
                                <div
                                    key={thread.id}
                                    onClick={() => setActiveThreadId(thread.id)}
                                    className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition cursor-pointer flex justify-between items-center group relative overflow-hidden"
                                >
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-100 group-hover:bg-indigo-500 transition-colors"></div>
                                    <div className="pl-2">
                                        <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 transition">{thread.subject}</h3>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1 opacity-80">
                                            <span className="font-semibold">{thread.lastMsg.author}:</span> {thread.lastMsg.text}
                                        </p>
                                        <p className="text-[9px] text-gray-300 mt-2 uppercase tracking-wide">
                                            {new Date(thread.lastMsg.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-1 rounded-full">{thread.count}</span>
                                        <span className="text-gray-300">›</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* --- MESSAGES FEED (Flirts OR Thought Detail) --- */
                <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-2 bg-[#f9f9fb] scroll-smooth pb-4">

                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center text-gray-400 opacity-50 space-y-4">
                            <div className="text-6xl animate-bounce">👋</div>
                            <p className="font-medium text-sm">
                                {activeTab === 'thoughts' ? 'Start this thought!' : `Send a quick flirt to ${partner?.name}!`}
                            </p>
                            <p className="text-xs">{activeTab === 'flirts' ? 'Flirts disappear after 48h.' : 'Thoughts are forever.'}</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={msg.id || idx} id={`note-${msg.firestoreId || msg.id}`}>
                                <MessageBubble
                                    note={msg}
                                    currentUser={currentUser}
                                    partner={partner}
                                    sharedKey={sharedKey}
                                    onToggleReaction={onToggleReaction}
                                    onMarkRead={onMarkRead}
                                    onDeleteNote={onDeleteNote}
                                    onEditNote={onEditNote}
                                    privateKey={privateKey}
                                    onPinInsight={onPinInsight}
                                    onReflect={onReflect}
                                />
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* --- INTEGRATED COMPOSER AREA --- */}
            {activeTab !== 'activity' && (
                <div className={`bg-white border-t border-gray-100 shrink-0 z-20 transition-all rounded-b-2xl relative ${isComposerExpanded ? 'p-2 sm:p-4' : 'p-2'}`}>
                    <button
                        onClick={() => setIsComposerExpanded(!isComposerExpanded)}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white border border-gray-100 border-b-0 rounded-t-lg px-4 py-0.5 text-gray-400 hover:text-indigo-500 shadow-sm transition-colors z-30"
                        title={isComposerExpanded ? "Collapse Composer" : "Expand Composer"}
                    >
                        <svg className={`w-4 h-4 transition-transform ${!isComposerExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <div className="max-w-3xl mx-auto flex flex-col gap-2">
                        {isComposerExpanded ? (
                            <>
                                {/* Thread Subject Input (Thoughts only) */}
                                {activeTab === 'thoughts' && !activeThreadId && (
                                    <div className="mb-2 px-2 relative">
                                        <input
                                            type="text"
                                            placeholder="What's on your mind? (Title)"
                                            className="w-full text-base font-bold bg-transparent border-b border-gray-200 py-1 outline-none focus:border-indigo-400 placeholder-gray-400 transition-colors"
                                            onChange={(e) => handleInputChange(e, setThreadSubject)}
                                            value={threadSubject}
                                        />
                                        <MentionSuggestions
                                            query={mentionQuery}
                                            terms={terms || []}
                                            onSelect={(term) => handleMentionSelect(term, setThreadSubject, threadSubject)}
                                            position="top"
                                        />
                                    </div>
                                )}

                                {/* AI Assistant Explanatory Copy */}
                                <div className="px-2 mb-1.5 mt-1">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="text-indigo-400">✨ AI Assist</span> Let AI draft a message based on your context.
                                    </p>
                                </div>

                                {/* Top Context Bar / Tone Selectors */}
                                <div className="flex items-center gap-2 px-2 mb-1">
                                    <div className="flex bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                                        {(['sweet', 'spicy', 'thoughtful'] as const).map(tone => (
                                            <button
                                                key={tone}
                                                onClick={() => setAiTone(tone)}
                                                className={`px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all ${aiTone === tone ? (activeTab === 'flirts' ? 'bg-white text-pink-600 shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                            >
                                                {tone === 'sweet' ? '🍬 Sweet' : tone === 'spicy' ? '🌶️ Spicy' : '🤔 Deep'}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={generateAIDraft}
                                        disabled={isDrafting}
                                        className={`ml-auto p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold ${activeTab === 'flirts' ? 'bg-pink-50 text-pink-500 hover:bg-pink-100' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100'}`}
                                        title="Magic Write"
                                    >
                                        {isDrafting ? <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div> : '✨ Help me say something...'}
                                    </button>
                                </div>

                                {/* Integrated Input Box */}
                                <div className={`flex flex-col bg-[#f0f2f5] border border-transparent focus-within:ring-2 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 relative ${activeTab === 'flirts' ? 'focus-within:border-pink-400 focus-within:ring-pink-100/50' : 'focus-within:border-indigo-400 focus-within:ring-indigo-100/50'}`}>

                                    <textarea
                                        ref={draftInputRef}
                                        value={draft}
                                        onChange={(e) => handleInputChange(e, setDraft)}
                                        placeholder={
                                            activeTab === 'thoughts'
                                                ? (activeThreadId ? "Reply to thought..." : "Start a new thought...")
                                                : "Type it yourself, use the magic wand above, or a combination of the two..."
                                        }
                                        className="w-full bg-transparent px-4 py-3 text-[15px] sm:text-base text-gray-800 placeholder-gray-500 focus:placeholder-gray-400 resize-none outline-none min-h-[44px] max-h-[120px] overflow-y-auto"
                                        rows={1}
                                    />
                                    <MentionSuggestions
                                        query={mentionQuery}
                                        terms={terms || []}
                                        onSelect={(term) => handleMentionSelect(term, setDraft, draft)}
                                        position="top"
                                    />

                                    {/* Attachments Preview */}
                                    {(stagedImage || audioBlob) && (
                                        <div className="flex gap-3 px-4 pb-2">
                                            {stagedImage && (
                                                <div className="relative group">
                                                    <img src={URL.createObjectURL(stagedImage)} className="w-12 h-12 rounded-lg object-cover shadow-sm border border-gray-200" alt="Preview" />
                                                    <button onClick={() => setStagedImage(null)} className="absolute -top-1 -right-1 bg-white text-red-500 rounded-full w-4 h-4 text-[10px] shadow-sm flex items-center justify-center border border-gray-100 hover:bg-gray-50">✕</button>
                                                </div>
                                            )}
                                            {audioBlob && (
                                                <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-2 py-1 h-8 rounded-lg text-xs font-bold mt-auto">
                                                    <span>🎤 Voice Note</span>
                                                    <button onClick={() => setAudioBlob(null)} className="text-blue-400 hover:text-blue-700">✕</button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Input Footer */}
                                    <div className="flex justify-between items-center px-2 py-1.5 border-t border-transparent">
                                        {/* Left Actions */}
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => cameraInputRef.current?.click()} className="p-2 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-white transition-all">📸</button>
                                            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-white transition-all">🖼️</button>
                                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                                            <div className="scale-90 opacity-70 hover:opacity-100 transition-opacity Origin-left">
                                                <AudioRecorder onStop={setAudioBlob} minimal={true} />
                                            </div>
                                        </div>

                                        {/* Right Actions */}
                                        <div className="flex items-center gap-2">
                                            {activeTab === 'flirts' && (
                                                <select className="bg-transparent text-[10px] font-bold text-gray-400 outline-none cursor-pointer hover:text-gray-600 mix-blend-multiply">
                                                    <option>48h</option>
                                                    <option>1h</option>
                                                    <option>Never</option>
                                                </select>
                                            )}
                                            <button
                                                onClick={handleSend}
                                                disabled={(!draft.trim() && !stagedImage && !audioBlob) || uploadStatus !== 'idle' || (activeTab === 'thoughts' && !activeThreadId && !threadSubject.trim())}
                                                className={`w-8 h-8 flex items-center justify-center text-white rounded-full transition-all disabled:opacity-0 disabled:scale-0 disabled:w-0 disabled:ml-0 duration-200 ease-out shadow-sm ${activeTab === 'flirts' ? 'bg-pink-500 hover:bg-pink-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                                title={activeTab === 'thoughts' && !activeThreadId ? "Start Thought" : "Send"}
                                            >
                                                {uploadStatus !== 'idle' ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <svg className="w-3.5 h-3.5 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div
                                onClick={() => {
                                    setIsComposerExpanded(true);
                                    setTimeout(() => draftInputRef.current?.focus(), 50);
                                }}
                                className="flex items-center gap-3 bg-gray-50 border border-gray-100 hover:border-indigo-100 px-4 py-2.5 rounded-xl cursor-text transition-all group"
                            >
                                <span className="text-gray-400 text-sm flex-grow select-none truncate">
                                    {draft || (activeTab === 'thoughts' ? (activeThreadId ? "Reply to thought..." : "Start a new thought...") : "Type it yourself, use the magic wand above, or a combination of the two...")}
                                </span>
                                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div className={`${uploadStatus !== 'idle' ? "pointer-events-none" : ""}`}>
                                        <AudioRecorder onStop={(blob) => { setAudioBlob(blob); setIsComposerExpanded(true); }} minimal={true} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Hidden Inputs */}
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
            <input type="file" ref={cameraInputRef} onChange={handlePhotoUpload} accept="image/*" capture="environment" className="hidden" />
        </div>
    );
};

export default FlirtSection;
