import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where, writeBatch } from 'firebase/firestore';
import { PrivateUserSummary } from '../../types';

interface JournalDashboardProps {
    onSelectThread: (threadId: string) => void;
    onBack: () => void;
}

export const JournalDashboard: React.FC<JournalDashboardProps> = ({ onSelectThread, onBack }) => {
    const [summaries, setSummaries] = useState<PrivateUserSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;

        const q = query(
            collection(db, 'users', auth.currentUser.uid, 'journalSessions'),
            orderBy('last_activity', 'desc')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PrivateUserSummary));
            setSummaries(fetched);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const handleDelete = async (e: React.MouseEvent, summary: PrivateUserSummary) => {
        e.stopPropagation();
        if (!auth.currentUser || !summary.thread_id) return;

        const confirmDelete = window.confirm("Are you sure you want to permanently delete this journal session? Operations cannot be undone.");
        if (!confirmDelete) return;

        try {
            const batch = writeBatch(db);

            // Delete Private User Summary
            if (summary.id) {
                const privateRef = doc(db, 'users', auth.currentUser.uid, 'journalSessions', summary.id);
                batch.delete(privateRef);
            }

            // Optional: delete raw entries for this thread to completely scrub it
            // Assuming querying them and putting in batch here.

            // Delete Relational Bridge Summary (if it exists)
            const bridgeRef = doc(db, 'sessionSummaries', summary.thread_id);
            batch.delete(bridgeRef);

            await batch.commit();

        } catch (error) {
            console.error("Error deleting session: ", error);
        }
    };

    const handleExport = () => {
        if (!summaries || summaries.length === 0) {
            alert("No journal history to export yet.");
            return;
        }

        let exportText = `Journal Export - The Couple's Currency\nGenerated: ${new Date().toLocaleDateString()}\n\n`;
        exportText += `=================================================\n\n`;

        summaries.forEach((sum, idx) => {
            exportText += `Session ${summaries.length - idx}: ${sum.title || 'Untitled'}\n`;
            exportText += `Date: ${new Date(sum.last_activity).toLocaleDateString()}\n`;
            if (sum.categories && sum.categories.length > 0) {
                exportText += `Tags: ${sum.categories.map(c => c.replace('_', ' ')).join(', ')}\n`;
            }
            exportText += `\nDetailed Summary:\n${sum.detailed_summary || 'No summary generated yet.'}\n`;
            exportText += `\n=================================================\n\n`;
        });

        const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `journal_export_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleNewSession = () => {
        // Generate a new thread ID (can just be a random string or let the Thread view handle it)
        const newThreadId = `sess_${Date.now()}`;
        onSelectThread(newThreadId);
    };

    return (
        <div className="fixed inset-x-0 bottom-[68px] sm:bottom-[80px] top-[72px] sm:top-[100px] bg-[#fdfdfd] md:bg-white md:rounded-t-3xl md:shadow-2xl md:border-x md:border-t border-gray-200/50 max-w-3xl mx-auto flex flex-col overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 shrink-0 flex justify-between items-center z-10 shadow-sm relative">
                <div>
                    <h2 className="font-serif font-bold text-gray-800 text-xl leading-tight">My Journal History</h2>
                    <p className="text-sm text-gray-400 italic">Your private timeline of thoughts & reflections.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        className="p-2 text-gray-400 hover:text-gray-600 transition shrink-0"
                        title="Export Journal (PDF/Text)"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                    <button onClick={onBack} className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition-colors shrink-0" title="Back to Journal">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* List View */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f5f7fa]">

                {/* New Session Button */}
                <button
                    onClick={handleNewSession}
                    className="w-full bg-white border-2 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors p-4 rounded-2xl font-bold flex flex-col items-center justify-center mb-6 shadow-sm shadow-blue-50/50"
                >
                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Start a New Session
                </button>

                {loading ? (
                    <div className="text-center py-10 text-gray-400 animate-pulse">Loading history...</div>
                ) : summaries.length === 0 ? (
                    <div className="text-center py-10 px-4">
                        <div className="text-4xl mb-3">📓</div>
                        <p className="text-gray-500 font-medium text-[15px]">No journal history yet.</p>
                        <p className="text-gray-400 text-sm mt-1">Start a new session to begin tracking your thoughts.</p>
                    </div>
                ) : (
                    summaries.map((summary) => (
                        <div
                            key={summary.id}
                            onClick={() => onSelectThread(summary.thread_id)}
                            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer relative group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-800 text-[15px] pr-8 truncate">
                                    {summary.title || "Journal Session"}
                                </h3>
                                <span className="text-xs font-medium text-gray-400 shrink-0">
                                    {new Date(summary.last_activity).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>

                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3 pr-2">
                                {summary.detailed_summary || "Session is currently active or awaiting summary..."}
                            </p>

                            <div className="flex flex-wrap gap-1.5">
                                {summary.categories?.map(tag => (
                                    <span key={tag} className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-md">
                                        {tag.replace('_', ' ')}
                                    </span>
                                ))}
                                {summary.status === 'active' && (
                                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                                        Active
                                    </span>
                                )}
                            </div>

                            {/* Delete Button (Visible on Hover) */}
                            <button
                                onClick={(e) => handleDelete(e, summary)}
                                className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete Session"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
