
import React from 'react';
import { Bounty, ChatterNote, Bookmark } from '../types';
import BountyCard from './BountyCard';
import { User } from '../types';
import { termsData } from '../constants';


interface BountyBoardProps {
    bounties: Bounty[];
    currentUser: User;
    onToggleStatus: (id: number) => void;
    onClaimBounty: (id: number) => void;
    chatter: Record<string, ChatterNote[]>;
    onAddNote: (contextId: string, text: string) => void;
    bookmarks: Record<number, Bookmark>;
    onAddBounty: (bounty: Omit<Bounty, 'id' | 'status' | 'postedBy' | 'claimedBy'>) => void;
    onDeleteBounty: (id: number | string) => void;
    onUpdateBounty: (id: number | string, updates: Partial<Bounty>) => void;
    onArchiveBounty: (id: number | string) => void;
    onDeleteNote: (id: string) => void;
    onEditNote: (id: string, text: string) => void;
    highlightedBountyId?: number | string | null;
    partnerBookmarks?: Record<number, Bookmark>;
}

const BountyBoard: React.FC<BountyBoardProps> = ({
    bounties, currentUser, onToggleStatus, onClaimBounty, chatter, onAddNote, bookmarks, onAddBounty, onDeleteBounty, onUpdateBounty, onArchiveBounty, onDeleteNote, onEditNote, highlightedBountyId, partnerBookmarks = {}
}) => {
    const [activeTab, setActiveTab] = React.useState<'shared' | 'offers' | 'archives'>('shared');
    const [willWorkForTab, setWillWorkForTab] = React.useState<'mine' | 'partner' | 'partner_offers'>('mine');
    const [showGuide, setShowGuide] = React.useState(false);

    // Scroll to highlighted bounty
    React.useEffect(() => {
        if (highlightedBountyId) {
            setActiveTab('shared');
            setTimeout(() => {
                const el = document.getElementById(`bounty-${highlightedBountyId}`);
                if (el) {
                    const elementTop = el.getBoundingClientRect().top + window.scrollY;
                    const offset = window.innerHeight * 0.2;
                    window.scrollTo({ top: elementTop - offset, behavior: 'smooth' });
                    el.classList.add('ring-4', 'ring-blue-300');
                    setTimeout(() => el.classList.remove('ring-4', 'ring-blue-300'), 2000);
                }
            }, 300);
        }
    }, [highlightedBountyId]);

    const [offerTerm, setOfferTerm] = React.useState<number | null>(null);
    const [offerTask, setOfferTask] = React.useState('');

    const availableBounties = bounties.filter(b => b.status === 'available');
    const myBounties = bounties.filter(b => b.status === 'claimed' && b.claimedBy === currentUser.name);
    const doneBounties = bounties.filter(b => b.status === 'done');
    const [showFullArchive, setShowFullArchive] = React.useState(false);
    const archivedBounties = bounties.filter(b => b.status === 'archived');

    const recentArchives = archivedBounties.slice(0, 5);
    const visibleArchives = showFullArchive ? archivedBounties : recentArchives;

    const myLoves = termsData.filter(t => bookmarks[t.id] === 'love');
    const myLikes = termsData.filter(t => bookmarks[t.id] === 'like');
    const myWork = termsData.filter(t => bookmarks[t.id] === 'work');
    const myWishes = [...myLoves, ...myLikes, ...myWork];

    const partnerLoves = termsData.filter(t => partnerBookmarks[t.id] === 'love');
    const partnerLikes = termsData.filter(t => partnerBookmarks[t.id] === 'like');
    const partnerWork = termsData.filter(t => partnerBookmarks[t.id] === 'work');

    // "Partner's Goals" = Loves + Likes (Things they want but haven't offered to work for?)
    // "Partner's Offers" = Work (Things they explicitly said they will work for)
    // Actually, "Partner's Goals" usually includes everything, but let's separate for clarity if requested.
    // User said "list all of the partner's will work for... similar to will work for".

    let currentWishes: typeof termsData = [];
    if (willWorkForTab === 'mine') currentWishes = myWishes;
    else if (willWorkForTab === 'partner') currentWishes = [...partnerLoves, ...partnerLikes]; // Exclude 'work' here? Or keep all? Let's exclude 'work' to avoid duplicates if we have a separate tab.
    else if (willWorkForTab === 'partner_offers') currentWishes = partnerWork;

    const handleCreateOffer = (termId: number) => {
        if (!offerTask.trim()) return;
        const term = termsData.find(t => t.id === termId);
        if (!term) return;

        onAddBounty({
            rewardTerm: term,
            task: offerTask,
            deadline: 'Open',
        });
        setOfferTerm(null);
        setOfferTask('');
        alert('Favor created! It is now available on the board.');
    };

    return (
        <div className="animate-in fade-in duration-500 pb-24">
            <header className="text-center mb-8 relative">
                <button onClick={() => setShowGuide(true)} className="absolute top-0 right-0 md:right-10 w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center hover:bg-blue-100 transition shadow-sm z-10" title="How this works">?</button>
                <h1 className="text-4xl font-serif font-bold text-gray-800">Shared Favors</h1>
                <p className="text-lg text-gray-500 max-w-3xl mx-auto">Collaborate on tasks and rewards.</p>
                <div className="flex justify-center gap-4 mt-6">
                    <div className="bg-gray-100 p-1 rounded-2xl inline-flex overflow-x-auto max-w-full scrollbar-hide">
                        {['shared', 'offers', 'archives'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-6 py-2 rounded-xl font-bold transition-all text-sm whitespace-nowrap ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab === 'shared' ? 'Active Favors' : tab === 'offers' ? 'Will Work For...' : 'Archives'}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {activeTab === 'shared' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <section>
                        <h2 className="text-xl font-serif font-bold text-blue-600 mb-6 flex items-center gap-2">Available <span className="text-xs bg-blue-100 px-2 py-0.5 rounded-full">{availableBounties.length}</span></h2>
                        {availableBounties.length > 0 ? (
                            <div className="space-y-6">{availableBounties.map(b => <BountyCard key={b.id} bounty={b} currentUser={currentUser} onClaim={onClaimBounty} onToggleStatus={onToggleStatus} chatter={chatter} onAddNote={onAddNote} onDelete={onDeleteBounty} onUpdate={onUpdateBounty} onArchive={onArchiveBounty} onDeleteNote={onDeleteNote} onEditNote={onEditNote} isHighlighted={b.id === highlightedBountyId || b.id.toString() === highlightedBountyId?.toString()} />)}</div>
                        ) : (
                            <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                                <div className="text-4xl mb-4 opacity-20">🎫</div>
                                <p className="text-gray-400 font-bold text-sm">No available favors.</p>
                                <p className="text-[10px] text-gray-300 mt-2 uppercase tracking-tight">Tag a term in the Directory to post a new favor.</p>
                            </div>
                        )}
                    </section>
                    <section>
                        <h2 className="text-xl font-serif font-bold text-orange-600 mb-6 flex items-center gap-2">My To-Do <span className="text-xs bg-orange-100 px-2 py-0.5 rounded-full">{myBounties.length}</span></h2>
                        {myBounties.length > 0 ? (
                            <div className="space-y-6">{myBounties.map(b => <BountyCard key={b.id} bounty={b} currentUser={currentUser} onClaim={onClaimBounty} onToggleStatus={onToggleStatus} chatter={chatter} onAddNote={onAddNote} onDelete={onDeleteBounty} onUpdate={onUpdateBounty} onArchive={onArchiveBounty} onDeleteNote={onDeleteNote} onEditNote={onEditNote} isHighlighted={b.id === highlightedBountyId || b.id.toString() === highlightedBountyId?.toString()} />)}</div>
                        ) : (
                            <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                                <div className="text-4xl mb-4 opacity-20">🎯</div>
                                <p className="text-gray-400 font-bold text-sm">You have no claimed favors.</p>
                            </div>
                        )}
                    </section>
                    <section>
                        <h2 className="text-xl font-serif font-bold text-green-600 mb-6 flex items-center gap-2">Completed <span className="text-xs bg-green-100 px-2 py-0.5 rounded-full">{doneBounties.length}</span></h2>
                        {doneBounties.length > 0 ? (
                            <div className="space-y-6 opacity-80">
                                {doneBounties.slice(0, 5).map(b => <BountyCard key={b.id} bounty={b} currentUser={currentUser} onClaim={onClaimBounty} onToggleStatus={onToggleStatus} chatter={chatter} onAddNote={onAddNote} onDelete={onDeleteBounty} onUpdate={onUpdateBounty} onArchive={onArchiveBounty} onDeleteNote={onDeleteNote} onEditNote={onEditNote} isHighlighted={b.id === highlightedBountyId || b.id.toString() === highlightedBountyId?.toString()} />)}
                                {doneBounties.length > 5 && <button onClick={() => setActiveTab('archives')} className="w-full py-3 text-center text-gray-400 text-sm font-bold bg-gray-50 rounded-2xl hover:bg-gray-100 transition">View All {doneBounties.length} Completed</button>}
                            </div>
                        ) : (
                            <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem]"><div className="text-4xl mb-4 opacity-20">✅</div><p className="text-gray-400 font-bold text-sm">No completed favors yet.</p></div>
                        )}
                    </section>
                </div>
            )}

            {activeTab === 'offers' && (
                <div className="max-w-4xl mx-auto">
                    <div className={`${willWorkForTab === 'mine' ? 'bg-purple-50 border-purple-100' : willWorkForTab === 'partner' ? 'bg-pink-50 border-pink-100' : 'bg-indigo-50 border-indigo-100'} border p-8 rounded-[2.5rem] mb-6 text-center transition-colors duration-300`}>
                        <h2 className={`text-2xl font-serif font-bold mb-2 ${willWorkForTab === 'mine' ? 'text-purple-900' : willWorkForTab === 'partner' ? 'text-pink-900' : 'text-indigo-900'}`}>
                            {willWorkForTab === 'mine' ? 'Offer Your Services' : willWorkForTab === 'partner' ? 'Grant a Wish' : 'Partner\'s Work Offers'}
                        </h2>
                        <p className={`${willWorkForTab === 'mine' ? 'text-purple-700' : willWorkForTab === 'partner' ? 'text-pink-700' : 'text-indigo-700'} max-w-xl mx-auto text-sm`}>
                            {willWorkForTab === 'mine' ? "Select something you desire, and offer a task you're willing to do for it."
                                : willWorkForTab === 'partner' ? "Your partner wants these. Create a favor to give it to them!"
                                    : "Your partner is WILLING to work for these. Assign a task!"}
                        </p>
                    </div>

                    <div className="flex justify-center mb-8">
                        <div className="bg-gray-100 p-1 rounded-xl flex flex-wrap justify-center gap-1">
                            <button onClick={() => { setWillWorkForTab('mine'); setOfferTerm(null); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${willWorkForTab === 'mine' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>My Wishlist</button>
                            <button onClick={() => { setWillWorkForTab('partner'); setOfferTerm(null); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${willWorkForTab === 'partner' ? 'bg-white shadow text-pink-600' : 'text-gray-500 hover:text-gray-700'}`}>Partner's Wishes</button>
                            <button onClick={() => { setWillWorkForTab('partner_offers'); setOfferTerm(null); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${willWorkForTab === 'partner_offers' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Partner's Offers</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {currentWishes.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-gray-400">
                                <p className="text-6xl mb-4">🤷</p>
                                <p className="font-bold">
                                    {willWorkForTab === 'mine' ? "You haven't Loved/Liked anything yet."
                                        : willWorkForTab === 'partner' ? "Partner hasn't Loved/Liked anything."
                                            : "Partner currently hasn't offered to work for anything."}
                                </p>
                            </div>
                        ) : (
                            currentWishes.map(term => {
                                const mark = willWorkForTab === 'mine' ? bookmarks[term.id] : partnerBookmarks[term.id];
                                return (
                                    <div key={term.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition group">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-xl font-bold font-serif text-gray-800">{term.name}</h3>
                                            <span className={`text-2xl ${mark === 'love' ? 'text-red-500' : mark === 'like' ? 'text-yellow-500' : 'text-indigo-500'}`}>
                                                {mark === 'love' ? '❤️' : mark === 'like' ? '🤔' : mark === 'work' ? '🎟️' : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-6 line-clamp-2">{term.definition}</p>

                                        {offerTerm === term.id ? (
                                            <div className="bg-gray-50 p-4 rounded-xl animate-in zoom-in-95 duration-200">
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                                                    {willWorkForTab === 'mine' ? 'I will...' : willWorkForTab === 'partner' ? 'I will grant this if you...' : 'Partner must...'}
                                                </p>
                                                <input
                                                    autoFocus
                                                    value={offerTask}
                                                    onChange={e => setOfferTask(e.target.value)}
                                                    placeholder={willWorkForTab === 'mine' ? "e.g. Do the dishes..." : willWorkForTab === 'partner' ? "e.g. Give me a massage..." : "e.g. Clean the garage..."}
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 mb-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                                    onKeyDown={e => e.key === 'Enter' && handleCreateOffer(term.id)}
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleCreateOffer(term.id)} className="flex-grow bg-purple-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-purple-700 transition">
                                                        {willWorkForTab === 'mine' ? 'Post Offer' : willWorkForTab === 'partner' ? 'Create Favor' : 'Assign Task'}
                                                    </button>
                                                    <button onClick={() => { setOfferTerm(null); setOfferTask(''); }} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-bold text-xs hover:bg-gray-300 transition">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => setOfferTerm(term.id)} className={`w-full py-3 rounded-xl font-bold text-sm hover:opacity-80 transition border ${willWorkForTab === 'mine' ? 'bg-purple-50 text-purple-700 border-purple-100' : willWorkForTab === 'partner' ? 'bg-pink-50 text-pink-700 border-pink-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                                {willWorkForTab === 'mine' ? 'Will Work For This' : willWorkForTab === 'partner' ? 'Create Favor For This' : 'Assign Task for This'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {
                activeTab === 'archives' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-gray-50 border border-gray-100 p-8 rounded-[2.5rem] mb-10 text-center">
                            <h2 className="text-2xl font-serif font-bold text-gray-700 mb-2">Favor Archives</h2>
                            <p className="text-gray-500 max-w-xl mx-auto">A history of all the good deeds and completed tasks.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                            {visibleArchives.length > 0 ? (
                                visibleArchives.map(bounty => (
                                    <BountyCard key={bounty.id} bounty={bounty} currentUser={currentUser} onClaim={onClaimBounty} onToggleStatus={onToggleStatus} chatter={chatter} onAddNote={onAddNote} onDelete={onDeleteBounty} onUpdate={onUpdateBounty} onArchive={onArchiveBounty} onRepublish={onAddBounty} onDeleteNote={onDeleteNote} onEditNote={onEditNote} isHighlighted={bounty.id === highlightedBountyId || bounty.id.toString() === highlightedBountyId?.toString()} />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-20 text-gray-400">
                                    <p className="text-6xl mb-4">🕸️</p>
                                    <p className="font-bold">The archives are empty.</p>
                                </div>
                            )}
                            {archivedBounties.length > 5 && !showFullArchive && (
                                <div className="col-span-full">
                                    <button
                                        onClick={() => setShowFullArchive(true)}
                                        className="w-full py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition"
                                    >
                                        Expand Full Archives ({archivedBounties.length})
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
            {showGuide && (
                <div
                    className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setShowGuide(false)}
                >
                    <div
                        className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-8 relative animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowGuide(false)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition"
                        >
                            ✕
                        </button>

                        <div className="text-center mb-6">
                            <span className="text-4xl mb-2 block">💡</span>
                            <h2 className="text-2xl font-serif font-bold text-gray-800">How Favors Work</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="text-2xl pt-1">🎟️</div>
                                <div>
                                    <h3 className="font-bold text-gray-800">Available Favors</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        These are rewards that have been created. If you see a task you can do,
                                        <strong> Claim it!</strong> Once you complete the task, you get the reward.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="text-2xl pt-1">🤝</div>
                                <div>
                                    <h3 className="font-bold text-gray-800">Will Work For...</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed mb-2">
                                        This section helps you negotiate for things you or your partner want.
                                    </p>
                                    <ul className="text-xs text-gray-500 space-y-2 bg-gray-50 p-3 rounded-xl">
                                        <li><strong>My Wishlist:</strong> Things you want. Offer a task ("I will cook") to get them.</li>
                                        <li><strong>Partner's Goals:</strong> Things they want. Create a Favor ("If you cook...") to give it to them.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-700 font-bold text-center">
                                Tip: Don't see what you want? Use the (+) button in the Directory to add custom items!
                            </div>
                        </div>

                        <button
                            onClick={() => setShowGuide(false)}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-6 hover:bg-blue-700 transition"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
};

export default BountyBoard;
