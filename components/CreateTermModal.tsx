import React, { useState } from 'react';
import { allCategories, primaryTags } from '../constants';
import { Term } from '../types';

interface CreateTermModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (term: any) => void;
    existingCount: number;
    maxCount: number;
}

const CreateTermModal: React.FC<CreateTermModalProps> = ({ isOpen, onClose, onSubmit, existingCount, maxCount }) => {
    const [name, setName] = useState('');
    const [definition, setDefinition] = useState('');
    const [category, setCategory] = useState('Sweet & Safe');
    const [tags, setTags] = useState<string[]>([]);

    // Hardcoded for now, or import from constants if exported
    const categories = [
        "Sweet & Safe",
        "Flirty & Teasing",
        "Sexy & Physical",
        "Kinky & Playful",
        "Wild & Advanced"
    ];

    const availableTags = [
        'Couple', 'Emotional', 'Communication', 'Sexual', 'Kinky', 'Wild',
        'Psychological', 'Sensual', 'Playful', 'Beginner', 'Advanced', 'Lifestyle',
        'Toys', 'Bondage', 'Roleplay', 'Fetish', 'Oral', 'Anal'
    ];

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !definition.trim()) return;

        onSubmit({
            name,
            definition,
            category,
            tags
        });

        // Reset
        setName('');
        setDefinition('');
        setCategory('Sweet & Safe');
        setTags([]);
        onClose();
    };

    const toggleTag = (tag: string) => {
        if (tags.includes(tag)) {
            setTags(tags.filter(t => t !== tag));
        } else {
            setTags([...tags, tag]);
        }
    };

    const isLimitReached = existingCount >= maxCount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="text-2xl font-serif font-bold text-gray-800">New Custom Term</h2>
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm transition">✕</button>
                </div>

                {isLimitReached ? (
                    <div className="p-12 text-center">
                        <div className="text-5xl mb-4">🛑</div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Limit Reached</h3>
                        <p className="text-gray-500">You can only add up to {maxCount} custom terms. Please delete an existing one to add more.</p>
                        <button onClick={onClose} className="mt-6 px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300">Got it</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">Term Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-blue-500 outline-none transition font-serif text-lg text-gray-800 placeholder-gray-300"
                                placeholder="e.g., Morning Coffee Cuddle"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-blue-500 outline-none transition"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">Definition / Description</label>
                            <textarea
                                value={definition}
                                onChange={(e) => setDefinition(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-blue-500 outline-none transition h-24 resize-none"
                                placeholder="Describe what this means to you..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">Tags (Optional)</label>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.map(tag => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => toggleTag(tag)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition ${tags.includes(tag)
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4">
                            <button type="submit" className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition shadow-lg transform hover:-translate-y-0.5 active:translate-y-0">
                                Create Term
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CreateTermModal;
