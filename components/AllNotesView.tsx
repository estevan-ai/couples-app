
import React, { useMemo } from 'react';
import { ChatterNote } from '../types';
import { termsData } from '../constants';

interface AllNotesViewProps {
    isOpen: boolean;
    onClose: () => void;
    chatter: Record<string, ChatterNote[]>;
    currentUser: any; // Using any for simplicity if User type isn't exported deeply, but ideally User
}

const AllNotesView: React.FC<AllNotesViewProps> = ({ isOpen, onClose, chatter, currentUser }) => {

    const notesList = useMemo(() => {
        const all: { termName: string; note: ChatterNote }[] = [];

        Object.entries(chatter).forEach(([contextId, notes]) => {
            // Find term name if possible
            const term = termsData.find(t => t.id.toString() === contextId);
            const termName = term ? term.name : "General / Unknown";

            notes.forEach(note => {
                all.push({ termName, note });
            });
        });

        // Sort by timestamp desc
        return all.sort((a, b) => b.note.timestamp - a.note.timestamp);
    }, [chatter]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[2.5rem] shadow-2xl z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                <header className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-gray-800">All Notes</h2>
                        <p className="text-sm text-gray-500">Everything you've jotted down.</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition font-bold text-gray-500 text-xl border border-gray-200">
                        &times;
                    </button>
                </header>

                <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-white">
                    {notesList.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <span className="text-4xl block mb-2">📝</span>
                            <p>No notes found yet.</p>
                        </div>
                    ) : (
                        notesList.map((item, idx) => (
                            <div key={idx} className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                        {item.termName}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-bold">
                                        {new Date(item.note.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-gray-700 leading-relaxed text-sm">
                                    {item.note.text}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AllNotesView;
