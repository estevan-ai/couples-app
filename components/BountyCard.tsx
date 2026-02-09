
import React, { useState } from 'react';
import { Bounty, ChatterNote } from '../types';
import { User } from '../types';

interface BountyCardProps {
    bounty: Bounty;
    currentUser: User;
    chatter: Record<string, ChatterNote[]>;
    onToggleStatus: (id: number | string) => void;
    onClaim: (id: number | string) => void;
    onAddNote: (contextId: string, text: string) => void;
    onDelete: (id: number | string) => void;
    onUpdate: (id: number | string, updates: Partial<Bounty>) => void;
    onArchive?: (id: number | string) => void;
    onRepublish?: (bountyData: Omit<Bounty, 'id' | 'status' | 'postedBy' | 'claimedBy'>) => void;
    onDeleteNote: (id: string) => void;
    isHighlighted?: boolean;
}

const BountyCard: React.FC<BountyCardProps> = ({
    bounty, currentUser, chatter, onToggleStatus, onClaim, onAddNote, onDelete, onUpdate, onArchive, onRepublish, onDeleteNote, isHighlighted
}) => {
    const [showChatter, setShowChatter] = useState(false);
    const [noteInput, setNoteInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isRepublishing, setIsRepublishing] = useState(false);
    const [editTask, setEditTask] = useState(bounty.task);
    const [editDeadline, setEditDeadline] = useState(bounty.deadline);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

    // Auto-open if highlighted
    React.useEffect(() => {
        if (isHighlighted) {
            setShowChatter(true);
        }
    }, [isHighlighted]);

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

    const handleSaveEdit = () => {
        onUpdate(bounty.id, { task: editTask, deadline: editDeadline });
        setIsEditing(false);
    };

    const handlePublishNew = () => {
        if (onRepublish) {
            onRepublish({
                task: editTask,
                deadline: editDeadline,
                rewardTerm: bounty.rewardTerm
            });
            setIsRepublishing(false);
        }
    };

    const borderColor = () => {
        if (bounty.status === 'done') return 'border-green-500';
        if (bounty.status === 'claimed') return 'border-orange-500';
        if (bounty.status === 'archived') return 'border-gray-300';
        return 'border-blue-500';
    };

    if (isEditing || isRepublishing) {
        return (
            <div className="bg-white p-6 rounded-[2rem] shadow-lg border-2 border-blue-200">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">{isRepublishing ? 'Republish Favor' : 'Editing Favor'}</h3>
                <div className="space-y-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Task</label>
                        <textarea
                            value={editTask}
                            onChange={e => setEditTask(e.target.value)}
                            className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-serif"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Due</label>
                        <input
                            type="text"
                            value={editDeadline}
                            onChange={e => setEditDeadline(e.target.value)}
                            className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={isRepublishing ? handlePublishNew : handleSaveEdit} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex-grow hover:bg-blue-700">
                        {isRepublishing ? 'Check & Publish' : 'Save Changes'}
                    </button>
                    <button onClick={() => { setIsEditing(false); setIsRepublishing(false); }} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-gray-200">Cancel</button>
                </div>
                {!isRepublishing && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => {
                                if (window.confirm("Are you sure you want to delete this favor?")) {
                                    onDelete(bounty.id);
                                }
                            }}
                            className="w-full text-red-400 hover:text-red-600 text-xs font-bold py-2 border border-red-100 rounded-xl hover:bg-red-50 transition"
                        >
                            Delete Favor
                        </button>
                    </div>
                )}
            </div>
        )
    }

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
                <div className="flex items-center gap-2">
                    <span>Due: <span className="text-gray-600">{bounty.deadline}</span></span>
                    {isMyPost && (
                        <div className="flex bg-gray-50 rounded-lg p-1">
                            <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-600 px-2" title="Edit">
                                ✏️
                            </button>
                        </div>
                    )}
                </div>
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
                    <div className="flex gap-2">
                        <button
                            onClick={() => onToggleStatus(bounty.id)}
                            className="flex-grow py-3 text-gray-400 font-bold bg-gray-50 rounded-xl cursor-default"
                        >
                            Completed ✨
                        </button>
                        {onArchive && (
                            <button
                                onClick={() => onArchive(bounty.id)}
                                className="px-4 py-3 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl font-bold transition"
                                title="Archive this favor"
                            >
                                📦
                            </button>
                        )}
                    </div>
                )}
                {bounty.status === 'archived' && (
                    <div className="flex gap-2">
                        <button
                            disabled
                            className="flex-grow py-3 text-gray-400 font-bold bg-gray-50 rounded-xl cursor-not-allowed"
                        >
                            Archived 📦
                        </button>
                        {onRepublish && (
                            <button
                                onClick={() => setIsRepublishing(true)}
                                className="px-4 py-3 text-white hover:text-white bg-blue-300 hover:bg-blue-500 rounded-xl font-bold transition shadow-sm"
                                title="Remake as New Favor"
                            >
                                🔄
                            </button>
                        )}
                    </div>
                )}

                {/* Inline Chatter */}
                <div className="mt-4 border-t border-gray-100 pt-4 flex flex-col gap-3">
                    {notes.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-3 flex gap-3 items-start">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
                                {notes[notes.length - 1].author[0]}
                            </div>
                            <div className="flex-grow">
                                <div className="flex justify-between items-start">
                                    <p className="text-xs text-gray-700 leading-snug">{notes[notes.length - 1].text}</p>
                                    {notes[notes.length - 1].author === currentUser.name && (
                                        <div className="flex items-center gap-1 ml-2">
                                            {editingNoteId === (notes[notes.length - 1].firestoreId || notes[notes.length - 1].id) ? (
                                                <>
                                                    <button
                                                        onClick={() => onDeleteNote(notes[notes.length - 1].firestoreId || notes[notes.length - 1].id)}
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
                                                    onClick={() => setEditingNoteId(notes[notes.length - 1].firestoreId || notes[notes.length - 1].id)}
                                                    className="text-[10px] text-gray-300 hover:text-blue-500 transition"
                                                    title="Edit Note"
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {notes.length > 1 && (
                                    <p className="text-[9px] text-blue-400 mt-1 font-bold uppercase tracking-wide cursor-pointer hover:text-blue-600" onClick={() => setShowChatter(!showChatter)}>
                                        {showChatter ? 'Hide history' : `+ ${notes.length - 1} more comments`}
                                    </p>
                                )}
                                {showChatter && notes.length > 1 && (
                                    <div className="mt-2 text-[10px] space-y-2 border-t border-gray-200 pt-2">
                                        {notes.slice(0, notes.length - 1).map(n => (
                                            <div key={n.id} className="flex justify-between hover:bg-gray-100 p-1 rounded">
                                                <p className="text-gray-500"><span className="font-bold">{n.author}:</span> {n.text}</p>
                                                {n.author === currentUser.name && (
                                                    <div className="flex items-center gap-1 ml-2">
                                                        {editingNoteId === (n.firestoreId || n.id) ? (
                                                            <>
                                                                <button
                                                                    onClick={() => onDeleteNote(n.firestoreId || n.id)}
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
                                                                onClick={() => setEditingNoteId(n.firestoreId || n.id)}
                                                                className="text-[10px] text-gray-300 hover:text-blue-500 transition"
                                                                title="Edit Note"
                                                            >
                                                                ✏️
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleNoteSubmit} className="flex gap-2 items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs flex-shrink-0 text-gray-400">
                            Me
                        </div>
                        <input
                            value={noteInput}
                            onChange={e => setNoteInput(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-grow px-4 py-2 text-xs bg-gray-50 rounded-xl border border-gray-100 outline-none focus:bg-white focus:border-blue-400"
                        />
                        {noteInput.trim() && (
                            <button type="submit" className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 animate-in zoom-in">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BountyCard;
