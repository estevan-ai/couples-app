
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
    onDeleteNote: (id: string) => void;
    highlightedBountyId?: number | string | null;
}

const BountyBoard: React.FC<BountyBoardProps> = ({
    bounties, currentUser, onToggleStatus, onClaimBounty, chatter, onAddNote, bookmarks, onAddBounty, onDeleteBounty, onDeleteNote, highlightedBountyId
}) => {
    const [activeTab, setActiveTab] = React.useState<'shared' | 'offers'>('shared');

    // Scroll to highlighted bounty
    React.useEffect(() => {
        if (highlightedBountyId) {
            // Ensure we are on the right tab? Bounties can be in 'shared' (available/done) or 'offers' (but usually shared)
            // We'll traverse tabs or assume shared for now, or check where the bounty is.
            // If navigating from chat, it's likely a shared bounty.
            setActiveTab('shared');

            setTimeout(() => {
                const el = document.getElementById(`bounty-${highlightedBountyId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    const myLoves = termsData.filter(t => bookmarks[t.id] === 'love');
    const myLikes = termsData.filter(t => bookmarks[t.id] === 'like');
    const myWork = termsData.filter(t => bookmarks[t.id] === 'work');
    const myWishes = [...myLoves, ...myLikes, ...myWork];

    const handleCreateOffer = (termId: number) => {
        if (!offerTask.trim()) return;

        const term = termsData.find(t => t.id === termId);
        if (!term) return;

        onAddBounty({
            rewardTerm: term,
            task: offerTask, // In this context, the task is what the user OFFERS to do
            deadline: 'Open',
        });
        setOfferTerm(null);
        setOfferTask('');
        alert('Offer posted! Your partner can now claim this favor.');
    };



    return (
        <div className="animate-in fade-in duration-500 pb-24">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-serif font-bold text-gray-800">Shared Favors</h1>
                <p className="text-lg text-gray-500 max-w-3xl mx-auto">Collaborate on tasks and rewards.</p>

                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={() => setActiveTab('shared')}
                        className={`px-6 py-2 rounded-full font-bold transition ${activeTab === 'shared' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                        Active Favors
                    </button>
                    <button
                        onClick={() => setActiveTab('offers')}
                        className={`px-6 py-2 rounded-full font-bold transition ${activeTab === 'offers' ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                        Will Work For...
                    </button>
                </div>
            </header>

            {activeTab === 'shared' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <section>
                        <h2 className="text-xl font-serif font-bold text-blue-600 mb-6 flex items-center gap-2">
                            Available <span className="text-xs bg-blue-100 px-2 py-0.5 rounded-full">{availableBounties.length}</span>
                        </h2>
                        {availableBounties.length > 0 ? (
                            <div className="space-y-6">
                                {availableBounties.map(bounty => (
                                    <BountyCard key={bounty.id} bounty={bounty} currentUser={currentUser} onClaim={onClaimBounty} onToggleStatus={onToggleStatus} chatter={chatter} onAddNote={onAddNote} onDelete={onDeleteBounty} onDeleteNote={onDeleteNote} isHighlighted={bounty.id === highlightedBountyId || bounty.id.toString() === highlightedBountyId?.toString()} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                                <div className="text-4xl mb-4 opacity-20">🎫</div>
                                <p className="text-gray-400 font-bold text-sm">No available favors.</p>
                                <p className="text-[10px] text-gray-300 mt-2 uppercase tracking-tight">Tag a term in the Directory to post a new favor.</p>
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-xl font-serif font-bold text-orange-600 mb-6 flex items-center gap-2">
                            My To-Do <span className="text-xs bg-orange-100 px-2 py-0.5 rounded-full">{myBounties.length}</span>
                        </h2>
                        {myBounties.length > 0 ? (
                            <div className="space-y-6">
                                {myBounties.map(bounty => (
                                    <BountyCard key={bounty.id} bounty={bounty} currentUser={currentUser} onClaim={onClaimBounty} onToggleStatus={onToggleStatus} chatter={chatter} onAddNote={onAddNote} onDelete={onDeleteBounty} onDeleteNote={onDeleteNote} isHighlighted={bounty.id === highlightedBountyId || bounty.id.toString() === highlightedBountyId?.toString()} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                                <div className="text-4xl mb-4 opacity-20">🎯</div>
                                <p className="text-gray-400 font-bold text-sm">You have no claimed favors.</p>
                                <p className="text-gray-300 text-[10px] mt-2">Get to work!</p>
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-xl font-serif font-bold text-green-600 mb-6 flex items-center gap-2">
                            Completed <span className="text-xs bg-green-100 px-2 py-0.5 rounded-full">{doneBounties.length}</span>
                        </h2>
                        {doneBounties.length > 0 ? (
                            <div className="space-y-6 opacity-80">
                                {doneBounties.map(bounty => (
                                    <BountyCard key={bounty.id} bounty={bounty} currentUser={currentUser} onClaim={onClaimBounty} onToggleStatus={onToggleStatus} chatter={chatter} onAddNote={onAddNote} onDelete={onDeleteBounty} onDeleteNote={onDeleteNote} isHighlighted={bounty.id === highlightedBountyId || bounty.id.toString() === highlightedBountyId?.toString()} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 px-6 bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                                <div className="text-4xl mb-4 opacity-20">✅</div>
                                <p className="text-gray-400 font-bold text-sm">No completed favors yet.</p>
                            </div>
                        )}
                    </section>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto">
                    <div className="bg-purple-50 border border-purple-100 p-8 rounded-[2.5rem] mb-10 text-center">
                        <h2 className="text-2xl font-serif font-bold text-purple-900 mb-2">Offer Your Services</h2>
                        <p className="text-purple-700 max-w-xl mx-auto">Select something you love or like, and list what you are willing to do to get it. Your partner can then accept the deal!</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {myWishes.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-gray-400">
                                <p className="text-6xl mb-4">🤷</p>
                                <p className="font-bold">You haven't Loved or Liked anything yet.</p>
                                <p className="text-sm mt-2">Go to the Directory to add items to your wishlist.</p>
                            </div>
                        ) : (
                            myWishes.map(term => (
                                <div key={term.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition group">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold font-serif text-gray-800">{term.name}</h3>
                                        <span className={`text-2xl ${bookmarks[term.id] === 'love' ? 'text-red-500' : 'text-yellow-500'}`}>
                                            {bookmarks[term.id] === 'love' ? '❤️' : '🤔'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-6 line-clamp-2">{term.definition}</p>

                                    {offerTerm === term.id ? (
                                        <div className="bg-gray-50 p-4 rounded-xl animate-in zoom-in-95 duration-200">
                                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">I will...</p>
                                            <input
                                                autoFocus
                                                value={offerTask}
                                                onChange={e => setOfferTask(e.target.value)}
                                                placeholder="e.g. Do the dishes, give a massage..."
                                                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 mb-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                                onKeyDown={e => e.key === 'Enter' && handleCreateOffer(term.id)}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleCreateOffer(term.id)}
                                                    className="flex-grow bg-purple-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-purple-700 transition"
                                                >
                                                    Post Offer
                                                </button>
                                                <button
                                                    onClick={() => { setOfferTerm(null); setOfferTask(''); }}
                                                    className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-bold text-xs hover:bg-gray-300 transition"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setOfferTerm(term.id)}
                                            className="w-full py-3 rounded-xl bg-purple-50 text-purple-700 font-bold text-sm hover:bg-purple-100 transition border border-purple-100"
                                        >
                                            Will Work For This
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BountyBoard;
