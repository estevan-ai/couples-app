
import React, { useState } from 'react';
import { Bounty, ChatterNote } from '../types';
import { User } from '../App';

interface BountyCardProps {
    bounty: Bounty;
    currentUser: User;
    chatter: Record<string, ChatterNote[]>;
    onToggleStatus: (id: number) => void;
    onClaim: (id: number) => void;
    onAddNote: (contextId: string, text: string) => void;
}

const BountyCard: React.FC<BountyCardProps> = ({ 
    bounty, currentUser, chatter, onToggleStatus, onClaim, onAddNote 
}) => {
    const [showChatter, setShowChatter] = useState(false);
    const [noteInput, setNoteInput] = useState('');

    const isMyPost = bounty.postedBy === currentUser.name;
    const isMyClaim = bounty.claimedBy === currentUser.name;
    const notes = chatter[`favor-${bounty.id}`] || [];

    const handleNoteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (noteInput.trim()) {
            onAddNote(`favor-${bounty.id}`, noteInput.trim());
            setNoteInput('');
        }
    };
    
    const borderColor = () => {
        if (bounty.status === 'done') return 'border-green-500';
        if (bounty.status === 'claimed') return 'border-orange-500';
        return 'border-blue-500';
    };

    return (
        <div className={`bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 border-l-4 ${borderColor()} transition-all hover:shadow-md`}>
            <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Requested Task</p>
                <p className="text-gray-800 text-lg font-serif">{bounty.task}</p>
            </div>
            
            <div className="mb-6 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">The Reward</p>
                <p className="font-bold text-blue-800">{bounty.rewardTerm.name}</p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-tighter mb-6">
                <div>Posted By: <span className="text-gray-600">{bounty.postedBy === currentUser.name ? 'Me' : bounty.postedBy}</span></div>
                <div>Due: <span className="text-gray-600">{bounty.deadline}</span></div>
            </div>

            <div className="flex flex-col gap-2">
                {bounty.status === 'available' && !isMyPost && (
                    <button 
                        onClick={() => onClaim(bounty.id)}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                    >
                        Claim this Favor
                    </button>
                )}
                {bounty.status === 'claimed' && isMyClaim && (
                    <button 
                        onClick={() => onToggleStatus(bounty.id)}
                        className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition"
                    >
                        Mark Completed
                    </button>
                )}
                {bounty.status === 'done' && (
                    <button 
                        onClick={() => onToggleStatus(bounty.id)}
                        className="w-full py-3 text-gray-400 font-bold bg-gray-50 rounded-xl"
                        disabled
                    >
                        Completed ✨
                    </button>
                )}

                <button 
                    onClick={() => setShowChatter(!showChatter)}
                    className={`mt-2 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${showChatter ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Chatter ({notes.length})
                </button>
            </div>

            {showChatter && (
                <div className="mt-4 animate-in slide-in-from-top-2 duration-200 border-t border-gray-50 pt-4">
                    <div className="space-y-3 mb-4 max-h-40 overflow-y-auto scrollbar-hide pr-1">
                        {notes.length === 0 ? (
                            <p className="text-[10px] text-gray-400 italic text-center py-2">No chatter yet.</p>
                        ) : (
                            notes.map(note => (
                                <div key={note.id} className={`p-3 rounded-2xl text-xs ${note.author === currentUser.name ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'}`}>
                                    <p className="font-bold text-[9px] uppercase text-gray-400 mb-1">{note.author}</p>
                                    <p className="text-gray-700">{note.text}</p>
                                </div>
                            ))
                        )}
                    </div>
                    <form onSubmit={handleNoteSubmit} className="flex gap-2">
                        <input 
                            value={noteInput}
                            onChange={e => setNoteInput(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-grow px-4 py-2 text-xs bg-gray-50 rounded-xl border border-gray-100 outline-none focus:bg-white focus:border-blue-400"
                        />
                        <button type="submit" className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default BountyCard;
