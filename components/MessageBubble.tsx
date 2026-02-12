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
    onEditNote?: (id: string, newText: string) => void;
    privateKey?: CryptoKey | null;
    onPinInsight?: (text: string, source: string) => void;
    onReflect?: (text: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ note, currentUser, partner, sharedKey, onToggleReaction, onMarkRead, isThreadContext, onDeleteNote, onEditNote, privateKey, onPinInsight, onReflect }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(note.text || '');
    const isMine = note.author === currentUser.name;

    // Fallback: If partner is null, try to use note.authorUid if it exists
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

    const handleSaveEdit = () => {
        if (onEditNote && editText.trim() !== '' && editText !== note.text) {
            onEditNote(note.firestoreId || note.id, editText);
        }
        setIsEditing(false);
    };

    return (
        <div className={`group relative w-full flex ${isMine ? 'justify-end' : 'justify-start'} mb-6 px-2`}>
            <div className={`max-w-[85%] sm:max-w-[70%] relative px-4 py-3 shadow-sm transition-all ${isMine
                ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl rounded-tr-sm'
                : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                }`}>

                {/* Content */}
                <div className="mb-1">
                    {note.category && (
                        <span className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${isMine ? 'text-indigo-100 opacity-80' : 'text-indigo-500'}`}>
                            #{note.category}
                        </span>
                    )}
                    {note.text && (
                        isEditing ? (
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full p-2 text-gray-800 rounded-lg outline-none bg-white/90"
                                rows={3}
                                autoFocus
                            />
                        ) : (
                            <p className="text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap">{note.text}</p>
                        )
                    )}
                    {note.audioPath && <SecureAudio
                        path={note.audioPath}
                        ivStr={note.audioIv}
                        encryptedKey={note.encryptedKey}
                        sharedKey={sharedKey}
                        isMine={isMine}
                        privateKey={privateKey}
                    />}
                    {(note.photoPath || note.storagePath) && <SecurePhoto
                        path={note.photoPath}
                        ivStr={note.photoIv}
                        storagePath={note.storagePath}
                        encryptedKey={note.encryptedKey}
                        sharedKey={sharedKey}
                        timestamp={note.timestamp}
                        isMine={isMine}
                        privateKey={privateKey}
                    />}
                </div>

                {/* Metadata */}
                <div className={`flex items-center gap-2 mt-1 opacity-70 ${isMine ? 'justify-end text-indigo-100' : 'justify-start text-gray-400'}`}>
                    <span className="text-[9px] font-bold uppercase tracking-widest hidden sm:inline">
                        {isMine ? 'YOU' : note.author.toUpperCase()}
                    </span>
                    <div className="scale-90 origin-left">
                        <TimeLeft timestamp={note.timestamp} expiresAt={note.expiresAt} />
                    </div>
                    {isMine && (
                        <span className="text-[9px] font-bold text-white/90">
                            {note.status === 'read' ? '✓✓ Read' : '✓ Sent'}
                        </span>
                    )}
                </div>

                {/* Reactions Display (Overlapping) */}
                {reactions.length > 0 && (
                    <div className={`absolute -bottom-3 ${isMine ? 'right-4' : 'left-4'} flex -space-x-1 z-20`}>
                        {reactions.map((r, i) => (
                            <span key={i} className="bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-100 text-xs" title={`Reaction from ${r.author}`}>
                                {r.emoji}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Buttons (Floating to the side) */}
            <div className={`absolute top-1/2 -translate-y-1/2 ${isMine ? 'left-auto right-full mr-2' : 'right-auto left-full ml-2'} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 z-10`}>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsDrawerOpen(!isDrawerOpen); }}
                    className="text-gray-400 hover:text-indigo-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-gray-100 hover:scale-110 transition"
                    title="Add Reaction"
                >
                    ☺+
                </button>
                {/* Pin Action */}
                {onPinInsight && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPinInsight(note.text, "Chat Message");
                        }}
                        className="text-gray-400 hover:text-yellow-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-gray-100 hover:scale-110 transition"
                        title="Pin to Insights"
                    >
                        📌
                    </button>
                )}
                {/* Reflect Action */}
                {onReflect && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onReflect(note.text || '');
                        }}
                        className="text-gray-400 hover:text-teal-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-gray-100 hover:scale-110 transition"
                        title="Think Deeper (Journal)"
                    >
                        📓
                    </button>
                )}
                {isMine && onEditNote && note.text && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditText(note.text || ''); }}
                        className="text-gray-400 hover:text-blue-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-gray-100 hover:scale-110 transition"
                        title="Edit"
                    >
                        ✏️
                    </button>
                )}
                {isMine && onDeleteNote && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this message?")) onDeleteNote(note.id);
                        }}
                        className="text-gray-400 hover:text-red-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-gray-100 hover:scale-110 transition"
                        title="Delete"
                    >
                        🗑️
                    </button>
                )}
            </div>

            {/* Reaction Drawer */}
            {isDrawerOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm cursor-default"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsDrawerOpen(false);
                    }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-xl shadow-2xl max-w-xs w-full max-h-[60vh] overflow-y-auto border border-gray-100 animate-in zoom-in-95 duration-200">
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
                                                                setIsDrawerOpen(false);
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
                </div>
            )}
        </div>
    );
};

export default MessageBubble;
