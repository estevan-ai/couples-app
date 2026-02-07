
import React, { useState, useEffect } from 'react';
import { Term, Bounty } from '../types';

interface BountyModalProps {
    isOpen: boolean;
    onClose: () => void;
    term: Term | null;
    onAddBounty: (bounty: Omit<Bounty, 'id' | 'status' | 'postedBy' | 'claimedBy'>) => void;
}

const taskSuggestions = ['Plan our next date night', 'Give a 20-minute massage', 'Cook a romantic dinner', 'Do the dishes tonight'];
const deadlineSuggestions = ['This evening', 'Tomorrow', 'This weekend', 'Next week'];

const BountyModal: React.FC<BountyModalProps> = ({ isOpen, onClose, term, onAddBounty }) => {
    const [task, setTask] = useState('');
    const [deadline, setDeadline] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTask('');
            setDeadline('');
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
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" aria-modal="true" role="dialog">
            {/* Fix: Use casting to any to allow CSS variables in the style object for React */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-in-scale" style={{ '--tw-scale-x': '1', '--tw-scale-y': '1', opacity: 1 } as any}>
                <button onClick={onClose} className="absolute top-3 right-4 text-3xl font-light text-gray-500 hover:text-gray-800 transition">&times;</button>
                <h2 className="text-2xl font-serif font-bold text-gray-800">Request Favor</h2>
                <p className="mb-6 text-gray-600">You've selected <strong className="text-blue-600">{term.name}</strong> as the reward. What needs to be done to earn it?</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="task" className="font-bold text-sm mb-2 block text-gray-700">What is the task?</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {taskSuggestions.map(suggestion => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => setTask(suggestion)}
                                    className={`px-4 py-1.5 text-sm rounded-full transition font-semibold ${task === suggestion ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                        <textarea
                            id="task"
                            value={task}
                            onChange={e => setTask(e.target.value)}
                            placeholder="Or type a custom task..."
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            rows={3}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="deadline" className="font-bold text-sm mb-2 block text-gray-700">When does this need to be done by?</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {deadlineSuggestions.map(suggestion => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => setDeadline(suggestion)}
                                    className={`px-4 py-1.5 text-sm rounded-full transition font-semibold ${deadline === suggestion ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            id="deadline"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                            placeholder="Or type a custom deadline..."
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 font-bold bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                            Cancel
                        </button>
                        <button type="submit" className="px-6 py-2 font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            Create Favor
                        </button>
                    </div>
                </form>
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
