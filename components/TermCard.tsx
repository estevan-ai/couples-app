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
    isDemo = false, viewMode = 'grid', onTagClick, selectedTags, isHighlighted
}) => {
    const [showChatter, setShowChatter] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // For list view
    const [noteInput, setNoteInput] = useState('');
    const [showTray, setShowTray] = useState(false);

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
    const partnerSymbol = partnerMark === 'love' ? '❤️' : partnerMark === 'like' ? '🤔' : partnerMark === 'work' ? '🎟️' : partnerMark === 'unsure' ? '❔' : partnerMark === 'skip' ? '🚫' : null;

    const notes = chatter[`term-${term.id}`] || [];

    const handleNoteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (noteInput.trim()) {
            onAddNote(`term-${term.id}`, noteInput.trim());
            setNoteInput('');
        }
    };

    if (viewMode === 'list') {
        return (
            <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 border-l-4 ${borderColorClass} ${isSkipped ? 'opacity-70 bg-gray-50/50' : ''}`}>
                <div className="p-4 flex items-center gap-4">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="flex-grow flex items-center text-left gap-3">
                        <span className={`text-gray-400 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                        <div>
                            <h3 className="text-lg font-bold font-serif text-gray-800 leading-tight">{term.name}</h3>
                            {partnerSymbol && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md border border-gray-200 mt-1 inline-block">
                                    Partner: {partnerSymbol}
                                </span>
                            )}
                        </div>
                    </button>

                    {/* List View Actions (Condensed) */}
                    <div className="flex items-center gap-1">
                        <button onClick={() => onBookmarkToggle(term, 'love')} className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${isLoved ? 'bg-red-100 text-red-500' : 'bg-gray-50 text-gray-300 hover:bg-gray-200'}`}>❤️</button>
                        <button onClick={() => onBookmarkToggle(term, 'like')} className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${isLiked ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-50 text-gray-300 hover:bg-gray-200'}`}>🤔</button>
                        <button onClick={() => onBookmarkToggle(term, 'work')} className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${isWork ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-50 text-gray-300 hover:bg-gray-200'}`} title="Will Work For">🎟️</button>
                    </div>
                </div>

                {isExpanded && (
                    <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-1">
                        <p className="text-gray-600 text-sm mb-4 pl-6 border-l-2 border-gray-100 ml-1">{term.definition}</p>
                        <div className="flex flex-wrap gap-1 mt-3 pl-6">
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
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => onAIDeepDive(term)}
                                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100"
                            >
                                ✨ Insight
                            </button>
                            <button
                                onClick={() => onMakeFavor(term)}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100"
                            >
                                Favor
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Grid View (Default)
    const isRated = isLoved || isLiked || isWork || isUnsure || isSkipped;
    const currentEmoji = isLoved ? "❤️" : isLiked ? "👍" : isWork ? "🎟️" : isUnsure ? "❔" : isSkipped ? "❌" : null;
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
                        <button onClick={() => { onBookmarkToggle(term, 'skip'); setShowTray(false); }} className="text-xl hover:scale-125 transition p-1" title="No">❌</button>
                    </div>
                )}
            </div>

            {/* Header: Title & Category */}
            <div className="mb-4 pr-12">
                <h3 className="text-xl font-bold font-serif text-gray-800 leading-tight mb-2">{term.name}</h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 mr-1">{term.category}</span>
                    {term.tags && term.tags.map(tag => {
                        const isSelected = selectedTags?.has(tag);
                        return (
                            <span
                                key={tag}
                                onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight cursor-pointer transition ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600'}`}
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
            <div className="flex items-center justify-between gap-1 border-t border-gray-50 pt-3 mt-auto">
                {/* Insight Button */}
                <button
                    onClick={() => onAIDeepDive(term)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition border border-transparent hover:border-gray-100"
                    title="Get AI Advice"
                >
                    <span className="text-base">✨</span>
                    <span>Insight</span>
                </button>

                <div className="w-px h-6 bg-gray-100 mx-1"></div>

                {/* Favor Button */}
                <button
                    onClick={() => onMakeFavor(term)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition border border-transparent hover:border-indigo-100"
                    title="Request Favor"
                >
                    <span className="text-base">🎁</span>
                    <span>Favor</span>
                </button>

                <div className="w-px h-6 bg-gray-100 mx-1"></div>

                {/* Will Do Button (New) */}
                {/* Note: User asked for 'Will Do Favor For', assuming this maps to adding to 'work' list or similar? 
                     But 'Will Work For' is a status. Maybe they mean 'Offer'? 
                     For now, I'll stick to what we have or map it to Toggle Status 'Work'?
                     Actually, standard interactions are Love/Like etc.
                     The user specifically asked: "Comment, Will Do Favor For, Request Favor, Message"
                     "Request Favor" -> onMakeFavor (already there)
                     "Comment" -> Chat/Notes
                     "Message" -> Separate from Comment? Or same?
                     "Will Do Favor For" -> Set status to 'Works For Me'?
                     Let's add a "Will Do" button that toggles the "Work" status.
                 */}
                <button
                    onClick={() => onBookmarkToggle(term, 'work')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold hover:bg-indigo-50 transition border border-transparent hover:border-indigo-100 ${isWork ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500'}`}
                    title="I will do this for you"
                >
                    <span className="text-base">🎟️</span>
                    <span>Will Do</span>
                </button>

                <div className="w-px h-6 bg-gray-100 mx-1"></div>

                {/* Chat/Thoughts Button */}
                <button
                    onClick={() => setShowChatter(!showChatter)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition border border-transparent hover:border-blue-100 ${showChatter || notes.length > 0 ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <span className="text-base">💭</span>
                    <span>{notes.length > 0 ? notes.length : 'Thoughts'}</span>
                </button>
            </div>

            {/* Notes Area */}
            {showChatter && (
                <div className="mt-4 animate-in slide-in-from-top-2 duration-200 border-t border-gray-100 pt-4">
                    <div className="max-h-40 overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                        {notes.length === 0 ? (
                            <p className="text-[10px] text-center text-gray-400 italic py-2">No thoughts yet. Add one!</p>
                        ) : (
                            notes.map(note => (
                                <div key={note.id} className="bg-gray-50 rounded-lg p-2.5 flex justify-between group">
                                    <div>
                                        <p className="text-[10px] font-bold text-indigo-600 mb-0.5">{note.author}</p>
                                        <p className="text-xs text-gray-700 leading-snug">{note.text}</p>
                                    </div>
                                    {onDeleteNote && (
                                        <button
                                            onClick={() => onDeleteNote(note.id)}
                                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-2 self-start transition-opacity"
                                            title="Delete Note"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    <form onSubmit={handleNoteSubmit} className="flex gap-2">
                        <input
                            value={noteInput}
                            onChange={e => setNoteInput(e.target.value)}
                            placeholder="Add a thought..."
                            className="flex-grow px-3 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200 outline-none focus:bg-white focus:border-indigo-400 transition"
                        />
                        <button type="submit" className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
export default TermCard;
