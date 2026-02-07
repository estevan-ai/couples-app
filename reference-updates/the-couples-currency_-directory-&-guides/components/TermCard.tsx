
import React, { useState } from 'react';
import { Term, Bookmark, ChatterNote } from '../types';

interface TermCardProps {
  term: Term;
  bookmarks: Record<number, Bookmark>;
  chatter: Record<string, ChatterNote[]>;
  onBookmarkToggle: (term: Term, type: Bookmark) => void;
  onMakeFavor: (term: Term) => void;
  onAddNote: (contextId: string, text: string) => void;
  onAIDeepDive: (term: Term) => void;
  isDemo?: boolean;
}

const categoryColors: { [key: string]: string } = {
  "Sweet & Safe": "border-l-[#ffc0cb]",
  "Flirty & Teasing": "border-l-[#ff69b4]",
  "Sexy & Physical": "border-l-[#dc3545]",
  "Kinky & Playful": "border-l-[#8a2be2]",
  "Wild & Advanced": "border-l-[#4b0082]",
};

const TermCard: React.FC<TermCardProps> = ({ 
    term, bookmarks, chatter, onBookmarkToggle, onMakeFavor, onAddNote, onAIDeepDive,
    isDemo = false
}) => {
  const [showChatter, setShowChatter] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  const borderColorClass = categoryColors[term.category] || "border-l-gray-300";
  const isLoved = bookmarks[term.id] === 'love';
  const isLiked = bookmarks[term.id] === 'like';
  const notes = chatter[`term-${term.id}`] || [];

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (noteInput.trim()) {
        onAddNote(`term-${term.id}`, noteInput.trim());
        setNoteInput('');
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-6 flex flex-col border border-gray-100 border-l-4 ${borderColorClass}`}>
      <div className="flex justify-between items-start">
        <div className="flex-grow pr-4">
            <h3 className="text-xl font-bold font-serif text-gray-800 leading-tight">{term.name}</h3>
            <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-4 mt-1">
                {term.category}
            </div>
        </div>
        <div className="flex-shrink-0 flex gap-1.5">
            <button 
                onClick={() => onBookmarkToggle(term, 'like')}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition ${isLiked ? 'bg-yellow-400 text-white shadow-sm scale-110' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                title="I think I might like this"
            >
                🤔
            </button>
            <button 
                onClick={() => onBookmarkToggle(term, 'love')}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition ${isLoved ? 'bg-red-400 text-white shadow-sm scale-110' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                title="I love this"
            >
                ❤️
            </button>
        </div>
      </div>
      
      <p className="text-gray-600 flex-grow mb-6 text-sm leading-relaxed">{term.definition}</p>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {term.tags.map(tag => (
          <span key={tag} className="bg-gray-50 text-gray-400 py-1 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-tight">
            #{tag}
          </span>
        ))}
      </div>
      
      <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-gray-50">
        <div className="flex gap-2">
            <button
                onClick={() => onAIDeepDive(term)}
                className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                title="AI Insight"
            >
                ✨
            </button>
            <button
                onClick={() => onMakeFavor(term)}
                className="flex-grow bg-blue-50 text-blue-600 font-bold py-2 rounded-xl hover:bg-blue-100 transition text-xs"
            >
                Convert to Favor
            </button>
            <button
                onClick={() => setShowChatter(!showChatter)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition relative ${showChatter ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
            >
                Notes
                {notes.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white">
                        {notes.length}
                    </span>
                )}
            </button>
        </div>

        {showChatter && (
            <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                <div className="max-h-40 overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-hide">
                    {notes.length === 0 ? (
                        <p className="text-[10px] text-center text-gray-400 italic py-2">No notes yet. Start the chatter!</p>
                    ) : (
                        notes.map(note => (
                            <div key={note.id} className="bg-gray-50 rounded-lg p-2.5">
                                <p className="text-[10px] font-bold text-indigo-600 mb-0.5">{note.author}</p>
                                <p className="text-xs text-gray-700">{note.text}</p>
                            </div>
                        ))
                    )}
                </div>
                <form onSubmit={handleNoteSubmit} className="flex gap-2">
                    <input 
                        value={noteInput}
                        onChange={e => setNoteInput(e.target.value)}
                        placeholder="Add a note..."
                        className="flex-grow px-3 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200 outline-none focus:bg-white focus:border-indigo-400"
                    />
                    <button type="submit" className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                    </button>
                </form>
            </div>
        )}
      </div>
    </div>
  );
};

export default TermCard;
