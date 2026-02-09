import React, { useState } from 'react';
import { Term, Bookmark, ChatterNote } from '../types';

interface TermCardProps {
    term: Term;
    bookmarks: Record<number, Bookmark>;
    partnerBookmarks?: Record<number, Bookmark>;
    chatter: Record<string, ChatterNote[]>;
    onBookmarkToggle: (term: Term, type: Bookmark) => void;
    onMakeFavor: (term: Term) => void;
    onAddNote: (contextId: string, text: string) => void;
    onAIDeepDive: (term: Term) => void;
    isDemo?: boolean;
    onDeleteNote?: (id: string) => void;
    viewMode?: 'grid' | 'list';
    onTagClick?: (tag: string) => void;
    selectedTags?: Set<string>;
    isHighlighted?: boolean;
    onFocus?: (term: Term) => void;
    currentUser?: import('../types').User;
}

const categoryColors: { [key: string]: string } = {
    "Sweet & Safe": "border-l-[#ffc0cb]",
    "Flirty & Teasing": "border-l-[#ff69b4]",
    "Sexy & Physical": "border-l-[#dc3545]",
    "Kinky & Playful": "border-l-[#8a2be2]",
    "Wild & Advanced": "border-l-[#4b0082]",
};

const TermCard: React.FC<TermCardProps> = ({
    term, bookmarks, partnerBookmarks, chatter, onBookmarkToggle, onMakeFavor, onAddNote, onAIDeepDive, onDeleteNote,
    isDemo = false, viewMode = 'grid', onTagClick, selectedTags, isHighlighted, onFocus, currentUser
}) => {
    const [showChatter, setShowChatter] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // For list view
    const [noteInput, setNoteInput] = useState('');
    const [showTray, setShowTray] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

    // Effect to handle highlighting/expansion
    React.useEffect(() => {
        if (isHighlighted) {
            if (viewMode === 'list') {
                setIsExpanded(true);
            } else {
                setShowChatter(true);
            }
        }
    }, [isHighlighted, viewMode]);

    const borderColorClass = categoryColors[term.category] || "border-l-gray-300";
    const isLoved = bookmarks[term.id] === 'love';
    const isLiked = bookmarks[term.id] === 'like';
    const isWork = bookmarks[term.id] === 'work';
    const isUnsure = bookmarks[term.id] === 'unsure';
    const isSkipped = bookmarks[term.id] === 'skip';

    const partnerMark = partnerBookmarks ? partnerBookmarks[term.id] : undefined;
    const partnerSymbol = partnerMark === 'love' ? '❤️' : partnerMark === 'like' ? '🤔' : partnerMark === 'work' ? '🎟️' : partnerMark === 'unsure' ? '❔' : partnerMark === 'skip' ? '👎' : null;

    const notes = chatter[`term-${term.id}`] || [];

    const handleNoteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (noteInput.trim()) {
            onAddNote(`term-${term.id}`, noteInput.trim());
            setNoteInput('');
        }
    };

    if (viewMode === 'list') {
        const isRated = isLoved || isLiked || isWork || isUnsure || isSkipped;
        const currentEmoji = isLoved ? "❤️" : isLiked ? "👍" : isWork ? "🎟️" : isUnsure ? "❔" : isSkipped ? "👎" : null;
        const anchorEmoji = currentEmoji || "💭";

        return (
            <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 border-l-4 ${borderColorClass} ${isSkipped ? 'opacity-70 bg-gray-50/50' : ''} relative`}>

                {/* Reaction Anchor (Top Right) - Adapted for List View */}
                <div className="absolute top-3 right-3 z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowTray(!showTray); }}
                        className={`text-xl w-8 h-8 flex items-center justify-center rounded-full transition-all ${showTray || isRated ? 'bg-white shadow-md border border-gray-100 scale-110' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                    >
                        {anchorEmoji}
                    </button>

                    {/* Reaction Tray */}
                    {showTray && (
                        <div className="absolute top-10 right-0 bg-white shadow-xl rounded-full p-1.5 flex gap-1 border border-gray-100 animate-in slide-in-from-top-2 z-30 min-w-max">
                            <button onClick={(e) => { e.stopPropagation(); onBookmarkToggle(term, 'love'); setShowTray(false); }} className="text-lg hover:scale-125 transition p-1" title="Love">❤️</button>
                            <button onClick={(e) => { e.stopPropagation(); onBookmarkToggle(term, 'like'); setShowTray(false); }} className="text-lg hover:scale-125 transition p-1" title="Like">👍</button>
                            <button onClick={(e) => { e.stopPropagation(); onBookmarkToggle(term, 'unsure'); setShowTray(false); }} className="text-lg hover:scale-125 transition p-1" title="Maybe">❔</button>
                            <button onClick={(e) => { e.stopPropagation(); onBookmarkToggle(term, 'skip'); setShowTray(false); }} className="text-lg hover:scale-125 transition p-1" title="Not Interested">👎</button>
                        </div>
                    )}
                </div>

                <div onClick={() => setIsExpanded(!isExpanded)} className="p-4 flex flex-col sm:flex-row gap-4 cursor-pointer group pr-12">
                    <div className="flex-grow">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold font-serif text-gray-800 leading-tight group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                    {term.name}
                                    <span className={`text-gray-300 transform transition-transform text-xs ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                </h3>
                                {/* "Thinking" / Definition displayed by default in List View */}
                                <p className="text-gray-500 text-sm mt-1 line-clamp-2 leading-relaxed max-w-[90%]">{term.definition}</p>
                            </div>

                            {/* Partner Status (Right aligned but left of thumb) */}
                            <div className="flex-shrink-0 flex items-center gap-2 mr-8">
                                {partnerSymbol && (
                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full border border-gray-200" title={`Partner: ${partnerMark}`}>
                                        P: {partnerSymbol}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expanded Section */}
                {isExpanded && (
                    <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-1 border-t border-gray-50 mt-2">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mt-3 mb-4">
                            <span className="bg-blue-50 text-blue-400 py-0.5 px-2 rounded text-[9px] font-bold uppercase tracking-tight">{term.category}</span>
                            {term.tags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                                    className={`py-0.5 px-2 rounded text-[9px] font-bold uppercase tracking-tight transition ${selectedTags?.has(tag) ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>

                        {/* Action Bar (Aligned with Card View style) */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            {/* Actions (Now full width since ratings moved) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onAIDeepDive(term); }}
                                className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-100 transition flex items-center justify-center gap-1"
                            >
                                <span>✨</span> Insight
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); onMakeFavor(term); }}
                                className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 border border-indigo-100 transition flex items-center justify-center gap-1"
                            >
                                <span>🎁</span> Favor
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); onBookmarkToggle(term, 'work'); }}
                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 ${isWork ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-100'}`}
                            >
                                <span>🎟️</span> Will Do
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowChatter(!showChatter);
                                }}
                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 ${showChatter || notes.length > 0 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border-gray-200'}`}
                            >
                                <span>💭</span> {notes.length > 0 ? notes.length : 'Thoughts'}
                            </button>
                        </div>

                        {/* Inline Chatter Drawer for List View */}
                        {showChatter && (
                            <div className="mt-4 border-t border-gray-100 pt-3" onClick={e => e.stopPropagation()}>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Discussion / Notes</h4>
                                {notes.length > 0 && (
                                    <div className="space-y-3 mb-3">
                                        {notes.map(n => (
                                            <div key={n.id} className="bg-blue-50/30 rounded-lg p-2.5 border border-blue-100 flex gap-3 items-start">
                                                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[8px] font-bold text-blue-600 flex-shrink-0 border border-blue-200 shadow-sm">
                                                    {n.author[0]}
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <span className="text-[10px] font-bold text-blue-900">{n.author}</span>
                                                        <span className="text-[9px] text-blue-300">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-700 leading-snug">{n.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <form onSubmit={handleNoteSubmit} className="flex gap-2">
                                    <input
                                        value={noteInput}
                                        onChange={e => setNoteInput(e.target.value)}
                                        placeholder="Add a thought..."
                                        className="flex-grow px-3 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
                                    />
                                    <button type="submit" className="text-xs font-bold text-white bg-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-700">Send</button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Grid View (Default)
    const isRated = isLoved || isLiked || isWork || isUnsure || isSkipped;
    const currentEmoji = isLoved ? "❤️" : isLiked ? "👍" : isWork ? "🎟️" : isUnsure ? "❔" : isSkipped ? "👎" : null;
    const anchorEmoji = currentEmoji || "💭"; // Changed to Thought Balloon as requested

    return (
        <div className={`bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all p-6 flex flex-col border border-gray-100 border-l-4 ${borderColorClass} ${isSkipped ? 'opacity-70 bg-gray-50/50' : ''} relative`}>

            {/* Reaction Anchor (Top Right) */}
            <div className="absolute top-4 right-4 z-20">
                <button
                    onClick={() => setShowTray(!showTray)}
                    className={`text-2xl w-10 h-10 flex items-center justify-center rounded-full transition-all ${showTray || isRated ? 'bg-white shadow-md border border-gray-100 scale-110' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                >
                    {anchorEmoji}
                </button>

                {/* Reaction Tray */}
                {showTray && (
                    <div className="absolute top-12 right-0 bg-white shadow-xl rounded-full p-2 flex gap-2 border border-gray-100 animate-in slide-in-from-top-2 z-30">
                        <button onClick={() => { onBookmarkToggle(term, 'love'); setShowTray(false); }} className="text-xl hover:scale-125 transition p-1" title="Love">❤️</button>
                        <button onClick={() => { onBookmarkToggle(term, 'like'); setShowTray(false); }} className="text-xl hover:scale-125 transition p-1" title="Like">👍</button>
                        <button onClick={() => { onBookmarkToggle(term, 'unsure'); setShowTray(false); }} className="text-xl hover:scale-125 transition p-1" title="Maybe">❔</button>
                        <button onClick={() => { onBookmarkToggle(term, 'skip'); setShowTray(false); }} className="text-xl hover:scale-125 transition p-1" title="Not Interested">👎</button>
                    </div>
                )}
            </div>

            {/* Header: Title & Category */}
            <div className="mb-4 pr-12">
                <h3 className="text-xl font-bold font-serif text-gray-800 leading-tight mb-2">{term.name}</h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-gray-50 text-gray-500 border border-transparent mr-1">{term.category}</span>
                    {term.tags && term.tags.map(tag => {
                        const isSelected = selectedTags?.has(tag);
                        return (
                            <span
                                key={tag}
                                onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest cursor-pointer transition border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 text-gray-500 border-transparent hover:border-gray-200 hover:text-indigo-600'}`}
                            >
                                #{tag}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Definition */}
            <p className="text-gray-600 flex-grow mb-6 text-sm leading-relaxed">{term.definition}</p>

            {/* Explicit Partner Status Message */}
            {partnerMark && (
                <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border ${partnerMark === 'love' ? 'bg-red-50 text-red-600 border-red-100' :
                    partnerMark === 'like' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                        partnerMark === 'work' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                            partnerMark === 'unsure' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                    <span className="text-lg">{partnerSymbol}</span>
                    <span>Partner: {partnerMark.toUpperCase()}</span>
                </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-2 border-t border-gray-50 pt-3 mt-auto">
                {/* Insight Button */}
                <button
                    onClick={() => onAIDeepDive(term)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition"
                    title="Get AI Advice"
                >
                    <span className="text-base">✨</span>
                    <span>Insight</span>
                </button>

                {/* Favor Button */}
                <button
                    onClick={() => onMakeFavor(term)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
                    title="Request Favor"
                >
                    <span className="text-base">🎁</span>
                    <span>Favor</span>
                </button>

                {/* Will Do Button */}
                <button
                    onClick={() => onBookmarkToggle(term, 'work')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold hover:bg-purple-100 transition ${isWork ? 'text-purple-700 bg-purple-100 ring-2 ring-purple-200' : 'text-purple-600 bg-purple-50'}`}
                    title="I will do this for you"
                >
                    <span className="text-base">🎟️</span>
                    <span>Will Do</span>
                </button>

                {/* Thoughts Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!showChatter) {
                            onFocus?.(term);
                        }
                        setShowChatter(!showChatter);
                    }}
                    className={`flex-none w-12 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition ${showChatter || notes.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                    title="Thoughts & Discussion"
                >
                    <span className="text-base">💭</span>
                    {notes.length > 0 && <span>{notes.length}</span>}
                </button>
            </div>

            {/* Slide-out Thoughts Drawer */}
            {showChatter && (
                <div className="mt-4 border-t border-gray-100 pt-4 flex flex-col gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
                    {/* Latest Note (if any) */}
                    {notes.length > 0 && (
                        <div className="space-y-3">
                            {notes.map(n => (
                                <div key={n.id} className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 flex gap-3 items-start group">
                                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0 border border-blue-200 shadow-sm">
                                        {n.author[0]}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <span className="text-[10px] font-bold text-blue-900">{n.author}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] text-blue-300">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {currentUser && n.author === currentUser.name && onDeleteNote && (
                                                    <div className="flex items-center gap-1">
                                                        {editingNoteId === n.id ? (
                                                            <>
                                                                <button
                                                                    onClick={() => onDeleteNote(n.id)}
                                                                    className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded hover:bg-red-100 transition"
                                                                    title="Confirm Delete"
                                                                >
                                                                    Delete
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingNoteId(null)}
                                                                    className="text-[10px] text-gray-400 hover:text-gray-600 px-1"
                                                                    title="Cancel"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => setEditingNoteId(n.id)}
                                                                className="text-[10px] text-gray-300 hover:text-blue-500 transition ml-1"
                                                                title="Edit Note"
                                                            >
                                                                ✏️
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-700 leading-snug break-words">{n.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Input Field */}
                    <form onSubmit={handleNoteSubmit} className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold flex-shrink-0 text-gray-500 border border-gray-200">
                            YOU
                        </div>
                        <div className="flex-grow relative">
                            <input
                                value={noteInput}
                                onChange={e => setNoteInput(e.target.value)}
                                placeholder="Add a thought..."
                                className="w-full px-4 py-2 text-xs bg-gray-50 rounded-xl border border-gray-200 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition pr-10"
                                autoFocus
                            />
                            {noteInput.trim() && (
                                <button type="submit" className="absolute right-1 top-1 bottom-1 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm animate-in zoom-in flex items-center justify-center transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
export default TermCard;
