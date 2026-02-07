import React, { useMemo } from 'react';
import { User, Bounty, ChatterNote, Bookmark } from '../types';
import { termsData } from '../constants';

interface DashboardProps {
    currentUser: User;
    partner: User | null;
    bounties: Bounty[];
    chatter: Record<string, ChatterNote[]>;
    bookmarks: Record<number, Bookmark>;
    partnerBookmarks: Record<number, Bookmark>;
    onNavigate: (tab: string) => void;
    onTagClick?: (tag: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
    currentUser,
    partner,
    bounties,
    chatter,
    bookmarks,
    partnerBookmarks = {},
    onNavigate,
    onTagClick
}) => {

    // --- Stats Logic ---
    const newFlirtsCount = useMemo(() => {
        // Mock logic: flirts in last 24h or unread? 
        // For now, just count mentions of 'flirt' context or general recent notes
        return Object.values(chatter).flat().filter(n => n.contextId === 'general-flirt' && n.timestamp > Date.now() - 86400000).length;
    }, [chatter]);

    const inboxCount = 0; // Placeholder until Inbox feature is fully built
    const chatCount = Object.values(chatter).flat().length;
    const thoughtsCount = 0; // Placeholder

    // --- Alignment Logic (Migrated from ChemistryGuide) ---
    const alignment = useMemo(() => {
        const sharedLoves: string[] = [];
        const complementary: string[] = [];
        const growth: string[] = [];

        if (!partner) return { sharedLoves, complementary, growth };

        Object.keys(bookmarks).forEach(key => {
            const id = parseInt(key);
            const myMark = bookmarks[id];
            const pMark = partnerBookmarks[id];
            const termName = termsData.find(t => t.id === id)?.name || "Unknown";

            if (!pMark) return;

            if (myMark === 'love' && pMark === 'love') {
                sharedLoves.push(termName);
            } else if ((myMark === 'love' && (pMark === 'like' || pMark === 'work')) || (pMark === 'love' && (myMark === 'like' || myMark === 'work'))) {
                complementary.push(termName);
            } else if ((myMark === 'love' && pMark === 'unsure') || (pMark === 'love' && myMark === 'unsure')) {
                growth.push(termName);
            }
        });

        return { sharedLoves, complementary, growth };
    }, [bookmarks, partnerBookmarks, partner]);

    // --- Favor Logic ---
    const rewardsReady = bounties.filter(b => b.status === 'available').length;
    const activeTasks = bounties.filter(b => b.status === 'claimed').length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 w-full md:w-1/2 mx-auto">

            {/* Stats Grid - 4 Box Layout */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'NEW FLIRTS', count: newFlirtsCount, icon: '❤️', tab: 'flirts' },
                    { label: 'INBOX', count: inboxCount, icon: '📥', tab: 'flirts' },
                    { label: 'ALIGNMENT', count: alignment.sharedLoves.length + alignment.complementary.length + alignment.growth.length, icon: '💞', tab: 'chemistry' },
                    { label: 'THOUGHTS', count: thoughtsCount, icon: '📓', tab: 'journal' }
                ].map((stat, i) => (
                    <button
                        key={i}
                        onClick={() => onNavigate(stat.tab)}
                        className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition flex flex-col items-center justify-center gap-2 group aspect-square sm:aspect-auto"
                    >
                        <span className="text-2xl group-hover:scale-110 transition-transform">{stat.icon}</span>
                        <div className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{stat.label}</div>
                        <div className="text-3xl font-serif font-bold text-gray-800">{stat.count}</div>
                    </button>
                ))}
            </div>

            {/* Dynamic Alignment Section */}
            {
                partner && (
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 mb-2">
                                <span className="text-2xl">💞</span>
                                <h2 className="font-serif text-2xl font-bold text-gray-800">Your Dynamic Alignment</h2>
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Snapshot of your connection</p>
                            <div className="mt-4 flex justify-center md:absolute md:top-8 md:right-8 md:mt-0">
                                <button className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition">
                                    <span>🧬</span> Explain with AI
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {/* Shared Loves */}
                            <div className="bg-pink-50/50 rounded-2xl p-5 border border-pink-100">
                                <h3 className="font-bold text-pink-700 mb-1 flex items-center gap-2 text-sm">
                                    <span>🔥</span> Shared Loves ({alignment.sharedLoves.length})
                                </h3>
                                <p className="text-[10px] text-pink-400 mb-4 font-medium">High-octane connection points.</p>
                                <div className="flex flex-wrap gap-2">
                                    {alignment.sharedLoves.map(t => (
                                        <button onClick={() => onTagClick?.(t)} key={t} className="px-2 py-1 bg-white rounded-md text-[10px] font-bold text-pink-600 shadow-sm border border-pink-50 hover:bg-pink-100 transition cursor-pointer">{t}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Complementary */}
                            <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                                <h3 className="font-bold text-blue-700 mb-1 flex items-center gap-2 text-sm">
                                    <span>🧩</span> Complementary ({alignment.complementary.length})
                                </h3>
                                <p className="text-[10px] text-blue-400 mb-4 font-medium">Where one leads and the other follows.</p>
                                <div className="flex flex-wrap gap-2">
                                    {alignment.complementary.map(t => (
                                        <button onClick={() => onTagClick?.(t)} key={t} className="px-2 py-1 bg-white rounded-md text-[10px] font-bold text-blue-600 shadow-sm border border-blue-50 hover:bg-blue-100 transition cursor-pointer">{t}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Growth Areas */}
                            <div className="bg-purple-50/50 rounded-2xl p-5 border border-purple-100">
                                <h3 className="font-bold text-purple-700 mb-1 flex items-center gap-2 text-sm">
                                    <span>🌱</span> Growth Areas ({alignment.growth.length})
                                </h3>
                                <p className="text-[10px] text-purple-400 mb-4 font-medium">Opportunities for new discovery.</p>
                                {alignment.growth.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {alignment.growth.map(t => (
                                            <button onClick={() => onTagClick?.(t)} key={t} className="px-2 py-1 bg-white rounded-md text-[10px] font-bold text-purple-600 shadow-sm border border-purple-50 hover:bg-purple-100 transition cursor-pointer">{t}</button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-purple-300 italic">No mismatch growth areas currently.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Favor Board Widget */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg flex items-center justify-center text-3xl text-white flex-shrink-0">
                            🎁
                        </div>
                        <div>
                            <h2 className="font-serif text-2xl font-bold text-gray-800 mb-1">Shared Favor Board</h2>
                            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">Gamify your connection by completing tasks to earn intimacy rewards.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onNavigate('favors')}
                        className="text-[10px] font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition uppercase tracking-widest border border-orange-100 self-start"
                    >
                        Intimacy Market
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orange-50/50 rounded-2xl p-6 border border-orange-100 flex flex-col justify-center">
                        <div className="text-[10px] font-black uppercase text-orange-400 tracking-widest mb-1">Rewards Ready</div>
                        <div className="text-4xl font-serif font-bold text-orange-600">{rewardsReady}</div>
                    </div>
                    <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 flex flex-col justify-center">
                        <div className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">Active Tasks</div>
                        <div className="text-4xl font-serif font-bold text-blue-600">{activeTasks}</div>
                    </div>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chemistry Link */}
                <button
                    onClick={() => onNavigate('chemistry')}
                    className="bg-white p-6 rounded-[2rem] text-left border border-gray-100 hover:shadow-md transition flex items-center gap-4 group"
                >
                    <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        🧪
                    </div>
                    <div>
                        <div className="text-[9px] font-black uppercase text-teal-400 tracking-widest mb-0.5">Intimacy Science</div>
                        <h3 className="font-serif text-lg font-bold text-gray-800">Chemistry Sync Guide</h3>
                        <p className="text-[10px] text-gray-400">The hormones that drive your bond.</p>
                    </div>
                </button>

                {/* Session Link */}
                <button
                    onClick={() => onNavigate('session')}
                    className="bg-white p-6 rounded-[2rem] text-left border border-gray-100 hover:shadow-md transition flex items-center gap-4 group"
                >
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        🧘
                    </div>
                    <div>
                        <div className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-0.5">Interactive</div>
                        <h3 className="font-serif text-lg font-bold text-gray-800">Guided Couples Session</h3>
                        <p className="text-[10px] text-gray-400">A structured dialogue workshop.</p>
                    </div>
                </button>
            </div>

            {/* New Thought Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] p-8 text-center text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
                    📓
                </div>
                <h2 className="font-serif text-xl font-bold mb-2">New Thought?</h2>
                <p className="text-xs text-blue-100 mb-6 drop-shadow-sm">Talk to your AI coach.</p>
                <button onClick={() => onNavigate('journal')} className="bg-white text-blue-600 font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all text-xs uppercase tracking-widest">
                    Open Journal
                </button>
            </div>

        </div >
    );
};

export default Dashboard;
