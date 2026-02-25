import React from 'react';
import { Term } from '../types';

interface MentionSuggestionsProps {
    query: string;
    terms: Term[];
    onSelect: (term: Term) => void;
    position?: 'top' | 'bottom';
}

export const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({ query, terms, onSelect, position = 'bottom' }) => {
    if (!query) return null;

    const lowerQuery = query.toLowerCase();
    const matches = terms.filter(t =>
        t.name.toLowerCase().includes(lowerQuery)
    ).slice(0, 5);

    if (matches.length === 0) return null;

    return (
        <div className={`absolute left-4 right-4 z-[100] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mention a Topic</span>
            </div>
            {matches.map(term => (
                <button
                    key={term.id}
                    onClick={() => onSelect(term)}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition flex items-center gap-2"
                >
                    <span className="text-lg">🏷️</span>
                    <span className="font-bold text-gray-700">{term.name}</span>
                </button>
            ))}
        </div>
    );
};
