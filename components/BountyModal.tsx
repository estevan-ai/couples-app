
import React, { useState, useEffect } from 'react';
import { Term, Bounty, Bookmark } from '../types';
import { termsData } from '../constants';

interface BountyModalProps {
    isOpen: boolean;
    onClose: () => void;
    term: Term | null;
    onAddBounty: (bounty: Omit<Bounty, 'id' | 'status' | 'postedBy' | 'claimedBy'>) => void;
    partnerBookmarks?: Record<number, Bookmark>;
}

const taskSuggestions = ['Plan our next date night', 'Give a 20-minute massage', 'Cook a romantic dinner', 'Do the dishes tonight'];
const deadlineSuggestions = ['This evening', 'Tomorrow', 'This weekend', 'Next week'];

const BountyModal: React.FC<BountyModalProps> = ({ isOpen, onClose, term, onAddBounty, partnerBookmarks = {} }) => {
    const [task, setTask] = useState('');
    const [deadline, setDeadline] = useState('');
    const [selectedModifiers, setSelectedModifiers] = useState<Term[]>([]);
    const [showModifierStart, setShowModifierStart] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTask('');
            setDeadline('');
            setSelectedModifiers([]);
            setShowModifierStart(false);
        }
    }, [isOpen]);

    if (!isOpen || !term) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!task || !deadline) return;

        onAddBounty({
            rewardTerm: term,
            task,
            deadline,
            additionalTerms: selectedModifiers
        });
        onClose();
    };

    // Filter terms for modifiers (ID >= 400)
    const modifierTerms = termsData.filter(t => t.id >= 400);
    const modifiersByCategory = modifierTerms.reduce((acc, t) => {
        const key = t.subCategory || 'Other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(t);
        return acc;
    }, {} as Record<string, Term[]>);

    const toggleModifier = (mod: Term) => {
        if (selectedModifiers.find(m => m.id === mod.id)) {
            setSelectedModifiers(prev => prev.filter(m => m.id !== mod.id));
        } else {
            setSelectedModifiers(prev => [...prev, mod]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" aria-modal="true" role="dialog">
            {/* Fix: Use casting to any to allow CSS variables in the style object for React */}
            <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-2xl w-full relative transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-in-scale flex flex-col max-h-[90vh]" style={{ '--tw-scale-x': '1', '--tw-scale-y': '1', opacity: 1 } as any}>
                <button onClick={onClose} className="absolute top-4 right-6 text-3xl font-light text-gray-400 hover:text-gray-800 transition">&times;</button>

                <div className="mb-6">
                    <h2 className="text-3xl font-serif font-bold text-gray-800 mb-1">Request Favor</h2>
                    <div className="flex items-center gap-2 text-gray-500">
                        <span>Reward:</span>
                        <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm">{term.name}</span>
                        {selectedModifiers.length > 0 && (
                            <span className="text-sm">+ {selectedModifiers.length} extras</span>
                        )}
                    </div>
                </div>

                <div className="overflow-y-auto flex-grow px-1 -mx-1">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Task & Deadline Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="task" className="font-bold text-xs uppercase tracking-widest text-gray-400 mb-2 block">The Task</label>
                                <textarea
                                    id="task"
                                    value={task}
                                    onChange={e => setTask(e.target.value)}
                                    placeholder="What needs to be done?"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:bg-white transition resize-none h-32"
                                    required
                                />
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {taskSuggestions.map(suggestion => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => setTask(suggestion)}
                                            className="px-3 py-1 text-[10px] uppercase font-bold rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="deadline" className="font-bold text-xs uppercase tracking-widest text-gray-400 mb-2 block">Target Date</label>
                                <input
                                    type="text"
                                    id="deadline"
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                    placeholder="When?"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:bg-white transition mb-2"
                                    required
                                />
                                <div className="flex flex-wrap gap-2">
                                    {deadlineSuggestions.map(suggestion => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => setDeadline(suggestion)}
                                            className="px-3 py-1 text-[10px] uppercase font-bold rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modifiers Section */}
                        <div className="border-t border-gray-100 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <label className="font-bold text-xs uppercase tracking-widest text-gray-400 block">
                                    Spice it Up (Optional)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowModifierStart(!showModifierStart)}
                                    className="text-blue-600 text-xs font-bold hover:underline"
                                >
                                    {showModifierStart ? 'Hide Options' : 'Add Modifiers'}
                                </button>
                            </div>

                            {selectedModifiers.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {selectedModifiers.map(m => (
                                        <span key={m.id} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                            {m.name}
                                            <button type="button" onClick={() => toggleModifier(m)} className="hover:text-purple-900">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {showModifierStart && (
                                <div className="space-y-6 bg-gray-50 p-6 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2">
                                    {Object.entries(modifiersByCategory).map(([category, mods]) => (
                                        <div key={category}>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 border-b border-gray-200 pb-1">{category}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {mods.map(mod => {
                                                    const isSelected = selectedModifiers.find(m => m.id === mod.id);
                                                    const isPartnerLove = partnerBookmarks[mod.id] === 'love';
                                                    return (
                                                        <button
                                                            key={mod.id}
                                                            type="button"
                                                            onClick={() => toggleModifier(mod)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition text-left flex items-center gap-1 ${isSelected
                                                                ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-105'
                                                                : isPartnerLove
                                                                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300'
                                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                                                                }`}
                                                        >
                                                            {isPartnerLove && <span className="text-[10px]">❤️</span>}
                                                            {mod.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-2">
                    <button type="button" onClick={onClose} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} type="button" className="px-8 py-3 font-bold bg-gray-900 text-white rounded-xl hover:bg-black transition shadow-lg transform hover:-translate-y-0.5 active:translate-y-0">
                        Create Favor Request
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-scale { animation: fadeInScale 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default BountyModal;
