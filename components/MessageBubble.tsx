import React, { useState } from 'react';
import { ChatterNote, User } from '../types';
import { EMOJI_CATEGORIES, SEXTING_PATTERNS } from '../constants/emojiPatterns';
import SecurePhoto from './SecurePhoto';
import SecureAudio from './SecureAudio';
import TimeLeft from './TimeLeft';

interface MessageBubbleProps {
    note: ChatterNote;
    currentUser: User;
    partner: User | null;
    sharedKey: CryptoKey | null;
    onToggleReaction: (noteId: string, authorUid: string, emoji: string) => void;
    onMarkRead: (noteId: string, authorUid: string) => void;
    isThreadContext?: boolean;
    onDeleteNote?: (id: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ note, currentUser, partner, sharedKey, onToggleReaction, onMarkRead, isThreadContext, onDeleteNote }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const isMine = note.author === currentUser.name;
    // Fallback: If partner is null, try to use note.authorUid if it exists on the note object (it should!)
    // If not, we have a problem.
    const authorUid = isMine ? currentUser.uid : (partner?.uid || (note as any).authorUid || '');

    if (!authorUid && !isMine) {
        console.warn(`[MessageBubble] Warning: Could not determine authorUid for note ${note.id}. Partner loaded? ${!!partner}`);
    }

    // Normalize reactions (handle legacy vs array)
    const reactions = Array.isArray(note.reactions)
        ? note.reactions
        : (note.reactions && typeof note.reactions === 'object'
            ? Object.entries(note.reactions).map(([uid, emoji]) => ({
                author: uid === currentUser.uid ? currentUser.name : (partner?.name || 'Partner'),
                emoji: typeof emoji === 'string' ? emoji : (emoji as any).emoji || '❤️'
            }))
            : []);

    return (
        <div className={`group relative p-6 rounded-3xl border transition-all hover:shadow-md ${isMine ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-100'}`}>
            {/* Author Badge Removed - Handled by parent view */}

            {/* Content */}
            <div className="mb-2">
                {note.category && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1 block">
                        #{note.category}
                    </span>
                )}
                {note.text && <p className="text-lg text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">{note.text}</p>}
                {note.audioPath && <SecureAudio
                    path={note.audioPath}
                    ivStr={note.audioIv}
                    encryptedKey={note.encryptedKey}
                    sharedKey={sharedKey}
                    isMine={isMine}
                />}
                {(note.photoPath || note.storagePath) && <SecurePhoto
                    path={note.photoPath}
                    ivStr={note.photoIv}
                    storagePath={note.storagePath}
                    encryptedKey={note.encryptedKey}
                    sharedKey={sharedKey}
                    timestamp={note.timestamp}
                    isMine={isMine}
                />}
            </div>

            {/* Metadata & Reactions */}
            <div className={`mt-1.5 flex items-center gap-2 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 opacity-60">
                    {isMine ? 'YOU' : note.author.toUpperCase()}
                </span>
                <div className="opacity-60">
                    <TimeLeft timestamp={note.timestamp} expiresAt={note.expiresAt} />
                </div>
                {note.status === 'read' && isMine && (
                    <span className="text-[10px] text-green-500 font-bold" title={`Read at ${new Date(note.readAt || 0).toLocaleTimeString()}`}>✓✓</span>
                )}

                {/* Delete Button (If Applicable) */}
                {isMine && onDeleteNote && (
                    <div className="flex items-center gap-1 ml-2">
                        {isDeleteMode ? (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("Delete this message?")) onDeleteNote(note.id);
                                    }}
                                    className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded hover:bg-red-100 transition"
                                    title="Confirm Delete"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDeleteMode(false);
                                    }}
                                    className="text-[10px] text-gray-400 hover:text-gray-600 px-1"
                                    title="Cancel"
                                >
                                    ✕
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDeleteMode(true);
                                }}
                                className="text-[10px] text-gray-300 hover:text-blue-500 transition"
                                title="Edit/Delete"
                            >
                                ✏️
                            </button>
                        )}
                    </div>
                )}

                {/* Reactions Display */}
                {reactions.length > 0 && (
                    <div className="flex -space-x-1 ml-2">
                        {reactions.map((r, i) => (
                            <span key={i} className="bg-white rounded-full p-0.5 shadow-sm border border-gray-100 relative z-10 animate-in zoom-in" style={{ fontSize: '1.25em' }} title={`Reaction from ${r.author}`}>
                                {r.emoji}
                            </span>
                        ))}
                    </div>
                )}

                {/* Reaction Drawer Trigger & UI */}
                <div className="relative z-20 ml-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsDrawerOpen(!isDrawerOpen);
                        }}
                        className={`text-xs p-1 rounded-full transition-colors ${isDrawerOpen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-indigo-500 hover:bg-gray-50'}`}
                        title="Add Reaction"
                    >
                        ☺+
                    </button>

                    {isDrawerOpen && (
                        <>
                            {/* Backdrop to close */}
                            <div
                                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm cursor-default"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDrawerOpen(false);
                                }}
                            />

                            {/* Drawer Container */}
                            <div className={`
                                fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-xl shadow-2xl border border-gray-100 bg-white z-50 animate-in zoom-in-95 duration-200 w-[85vw] max-w-xs max-h-[60vh] overflow-y-auto custom-scrollbar
                                sm:w-96 sm:max-w-md sm:p-6
                            `}>
                                {!showGuide ? (
                                    <>
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase">Reactions</h4>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowGuide(true); }}
                                                className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold hover:bg-indigo-100"
                                            >
                                                📖 Guide
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                                                <div key={category}>
                                                    <h4 className="text-[10px] uppercase font-bold text-gray-400 mb-1">{category}</h4>
                                                    <div className="grid grid-cols-5 gap-1">
                                                        {emojis.map(emoji => {
                                                            const isSelected = reactions.some(r => r.author === currentUser.name && r.emoji === emoji);
                                                            return (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onToggleReaction(note.firestoreId || note.id, authorUid, emoji);
                                                                    }}
                                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition text-lg active:scale-90 ${isSelected ? 'bg-blue-100 ring-2 ring-blue-300' : 'hover:bg-indigo-50'}`}
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-2 sticky top-0 bg-white pb-2 border-b border-gray-100">
                                            <h4 className="text-xs font-bold text-gray-800">Sexting Emoji Guide</h4>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowGuide(false); }}
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                ✕ Close
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {SEXTING_PATTERNS.map((pattern, i) => (
                                                <div key={i} className="text-xs border-b border-gray-50 last:border-0 pb-2">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-mono text-base bg-gray-50 px-1 rounded">{pattern.combo}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${pattern.level === 'Beginner' ? 'bg-green-100 text-green-700' :
                                                            pattern.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {pattern.level}
                                                        </span>
                                                    </div>
                                                    <div className="font-bold text-gray-700 mb-0.5">{pattern.meaning}</div>
                                                    <div className="italic text-gray-400 leading-tight">{pattern.translation}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Done Button */}
                                <div className="mt-3 pt-2 border-t border-gray-50 text-center">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsDrawerOpen(false);
                                            setShowGuide(false);
                                        }}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;