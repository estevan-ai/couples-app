import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry, SessionSummary } from '../../types';
import { db, auth } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { CliffNoteHeader } from './CliffNoteHeader';
import AudioRecorder from '../AudioRecorder';

interface JournalThreadProps {
    coupleId: string;
    partnerId: string;
    threadId: string;
    initialContext?: string | null;
    onViewHistory: () => void;
}

export const JournalThread: React.FC<JournalThreadProps> = ({ coupleId, partnerId, threadId, initialContext, onViewHistory }) => {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [summary, setSummary] = useState<SessionSummary | null>(null);
    const [inputValue, setInputValue] = useState(initialContext ? `Reflecting on: "${initialContext}"\n\n` : '');
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const [category, setCategory] = useState<'reflection' | 'gratitude' | 'complication' | 'discovery' | 'general' | 'brain_dump' | 'event_log'>('reflection');
    const [isReopening, setIsReopening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isComposerExpanded, setIsComposerExpanded] = useState(!!initialContext);

    useEffect(() => {
        if (!auth.currentUser) return;

        // Listen to the session summary
        const summaryUnsub = onSnapshot(doc(db, 'sessionSummaries', threadId), (docSnap) => {
            if (docSnap.exists()) {
                setSummary(docSnap.data() as SessionSummary);
            }
        });

        // Listen to active journal entries
        const q = query(
            collection(db, 'users', auth.currentUser.uid, 'journalEntries'),
            where('thread_id', '==', threadId),
            orderBy('timestamp', 'asc')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
            setEntries(fetched);
            // Scroll to bottom
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        return () => {
            unsub();
            summaryUnsub();
        };
    }, []);

    const handleSend = async () => {
        if (!inputValue.trim() || !auth.currentUser) return;

        const isUpdatingSummary = summary?.status === 'summarized';
        if (isUpdatingSummary) {
            setIsReopening(true);
        }

        const newEntry = {
            thread_id: threadId,
            timestamp: Date.now(),
            rawInput: inputValue,
            summary: '',
            category: category,
            aiPerspective: ''
        };

        try {
            await addDoc(collection(db, 'users', auth.currentUser.uid, 'journalEntries'), newEntry);

            // If the thread was already summarized, reopening the session resets the cooldown
            if (isUpdatingSummary) {
                await updateDoc(doc(db, 'sessionSummaries', threadId), {
                    status: 'active',
                    last_activity: Date.now()
                });
            } else {
                // Just update the timestamp
                await updateDoc(doc(db, 'sessionSummaries', threadId), {
                    last_activity: Date.now()
                }).catch(() => {
                    console.log("No summary mapping exist to update last_activity yet.");
                });
            }

            setInputValue('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
            setIsReopening(false);
        } catch (e) {
            console.error(e);
            setIsReopening(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

    const handleAudioStop = async (blob: Blob) => {
        setIsProcessingAudio(true);
        try {
            // Simulated transcription for now, just append an indicator instead of raw Blob
            setInputValue(prev => prev + (prev ? ' ' : '') + '[Voice Note Recorded]');
        } catch (e) {
            console.error("Audio processing error", e);
        } finally {
            setIsProcessingAudio(false);
        }
    };

    return (
        <div className="fixed inset-x-0 bottom-[68px] sm:bottom-[80px] top-[72px] sm:top-[100px] bg-[#fdfdfd] md:bg-white md:rounded-t-3xl md:shadow-2xl md:border-x md:border-t border-gray-200/50 max-w-3xl mx-auto flex flex-col overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header / Top Context Area */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 shrink-0 flex justify-between items-center z-10 shadow-sm relative">

                <div className="flex items-center gap-3">
                    <div>
                        <h2 className="font-serif font-bold text-gray-800 text-lg leading-tight">Reflection Journal</h2>
                        <p className="text-xs text-gray-400 italic">Your private space to process and vent.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isReopening && (
                        <div className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1.5 animate-pulse shrink-0">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            Re-opening...
                        </div>
                    )}
                    <button onClick={onViewHistory} className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-[11px] uppercase tracking-wider rounded-lg transition-colors shrink-0 shadow-sm border border-gray-200">
                        History
                    </button>
                </div>
            </div>

            {/* Cliff Notes Header pinned just below the actual header */}
            {summary?.status === 'summarized' && summary.cliff_note_body && (
                <div className="shrink-0 z-10 bg-white">
                    <CliffNoteHeader
                        summary={summary.cliff_note_body}
                        markers={summary.emotional_markers || []}
                        amendments={summary.amendments}
                    />
                </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">


                {entries.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 mt-10">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm border border-blue-100">
                            📓
                        </div>
                        <h3 className="font-serif font-bold text-gray-800 text-xl mb-2">Welcome to your Journal</h3>
                        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                            This is a safe, private space designed to help you process your thoughts. When you're ready, just start typing or talking below.
                        </p>
                    </div>
                )}

                {entries.map(entry => (
                    <div key={entry.id} className="flex flex-col items-end mb-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[75%] shadow-md shadow-blue-100/50 leading-relaxed text-[15px]">
                            <p className="whitespace-pre-wrap">{entry.rawInput}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 mr-1">
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full">
                                {entry.category.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Composer Area - Antigravity Style */}
            <div className={`bg-white border-t border-gray-100 shrink-0 z-20 transition-all rounded-b-2xl relative ${isComposerExpanded ? 'p-2 sm:p-4' : 'p-2'}`}>
                {/* Collapse/Expand Toggle */}
                <button
                    onClick={() => setIsComposerExpanded(!isComposerExpanded)}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white border border-gray-100 border-b-0 rounded-t-lg px-4 py-0.5 text-gray-400 hover:text-blue-500 shadow-sm transition-colors z-30"
                    title={isComposerExpanded ? "Collapse Composer" : "Expand Composer"}
                >
                    <svg className={`w-4 h-4 transition-transform ${!isComposerExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                <div className="max-w-3xl mx-auto">
                    {isComposerExpanded ? (
                        <>
                            {/* Integrated Input Box */}
                            <div className="flex flex-col bg-[#f0f2f5] border border-transparent focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-100/50 rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Veni, vidi, venti. What's on your mind?"
                                    className="w-full bg-transparent px-4 py-3 text-[15px] sm:text-base text-gray-800 placeholder-gray-500 focus:placeholder-gray-400 resize-none outline-none min-h-[44px] max-h-[200px] overflow-y-auto"
                                    rows={1}
                                />

                                {/* Input Footer (Inside the box, one clean row) */}
                                <div className="flex justify-between items-center px-2 py-1.5 border-t border-transparent">

                                    {/* Left Actions: Category Dropdown */}
                                    <div className="flex items-center relative group">
                                        <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-gray-500">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                            </svg>
                                        </div>
                                        <select
                                            className="appearance-none bg-transparent hover:bg-gray-200 text-[12px] font-semibold text-gray-600 outline-none cursor-pointer transition-colors rounded-lg py-1.5 pl-6 pr-3 shadow-none"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value as any)}
                                        >
                                            <option value="reflection">Reflection</option>
                                            <option value="brain_dump">Brain Dump</option>
                                            <option value="event_log">Event Log</option>
                                            <option value="gratitude">Gratitude</option>
                                            <option value="discovery">Discovery</option>
                                            <option value="general">General Note</option>
                                        </select>
                                    </div>

                                    {/* Right Actions: Mic & Send */}
                                    <div className="flex items-center gap-1.5">
                                        <div className={`${isProcessingAudio ? "opacity-50 pointer-events-none" : ""}`}>
                                            <AudioRecorder onStop={handleAudioStop} minimal={true} />
                                        </div>

                                        <button
                                            onClick={handleSend}
                                            disabled={!inputValue.trim()}
                                            className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full transition-all disabled:opacity-0 disabled:scale-0 disabled:w-0 disabled:ml-0 duration-200 ease-out shadow-sm hover:bg-blue-700 hover:shadow"
                                            title="Save Entry"
                                        >
                                            <svg className="w-3.5 h-3.5 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                            </svg>
                                        </button>
                                    </div>

                                </div>
                            </div>
                            <div className="text-center mt-3 mb-1">
                                <p className="text-[10px] text-gray-400 font-medium">✨ Your entries are private and securely stored.</p>
                            </div>
                        </>
                    ) : (
                        <div
                            onClick={() => {
                                setIsComposerExpanded(true);
                                setTimeout(() => textareaRef.current?.focus(), 50);
                            }}
                            className="flex items-center gap-3 bg-gray-50 border border-gray-100 hover:border-blue-100 px-4 py-2.5 rounded-xl cursor-text transition-all group"
                        >
                            <span className="text-gray-400 text-sm flex-grow select-none truncate">
                                {inputValue || "Write a reflection..."}
                            </span>
                            <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                <div className={`${isProcessingAudio ? "pointer-events-none" : ""}`}>
                                    <AudioRecorder onStop={(blob) => { handleAudioStop(blob); setIsComposerExpanded(true); }} minimal={true} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JournalThread;
