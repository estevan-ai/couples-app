
import React, { useState } from 'react';
import { Bounty, ChatterNote } from '../types';
import BountyCard from './BountyCard';
import { User } from '../App';

interface BountyBoardProps {
    bounties: Bounty[];
    currentUser: User;
    onToggleStatus: (id: number) => void;
    onClaimBounty: (id: number) => void;
    chatter: Record<string, ChatterNote[]>;
    onAddNote: (contextId: string, text: string) => void;
}

const BountyBoard: React.FC<BountyBoardProps> = ({ 
    bounties, currentUser, onToggleStatus, onClaimBounty, chatter, onAddNote 
}) => {
    const [showFAQ, setShowFAQ] = useState(false);
    const availableBounties = bounties.filter(b => b.status === 'available');
    const myBounties = bounties.filter(b => b.status === 'claimed' && b.claimedBy === currentUser.name);
    const doneBounties = bounties.filter(b => b.status === 'done');

    return (
        <div className="animate-in fade-in duration-500">
            <header className="mb-10 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-gray-800 mb-1">Shared Favors</h1>
                    <p className="text-sm text-gray-500">Collaborate on tasks and intimacy rewards.</p>
                </div>
                <button 
                    onClick={() => setShowFAQ(!showFAQ)}
                    className="w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center text-blue-500 shadow-sm hover:shadow-md transition"
                >
                    ?
                </button>
            </header>

            {showFAQ && (
                <div className="mb-8 p-6 bg-blue-600 text-white rounded-[2rem] animate-in slide-in-from-top-4 duration-300">
                    <h3 className="font-bold mb-3 flex items-center gap-2"><span>💡</span> How it Works</h3>
                    <div className="space-y-4 text-sm opacity-90 leading-relaxed">
                        <p><strong>1. Post:</strong> Go to the Directory, find a term you want, and click "Convert to Favor". Add a task (e.g., "Do the laundry") and a deadline.</p>
                        <p><strong>2. Claim:</strong> Your partner sees the favor. If they claim it, they agree to do the task to earn the reward.</p>
                        <p><strong>3. Earn:</strong> Once they finish the task, they mark it complete, and it's time for you to fulfill the intimacy reward!</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <section>
                    <h2 className="text-xl font-serif font-bold text-blue-600 mb-6 flex items-center gap-2">
                        Available <span className="text-xs bg-blue-100 px-2 py-0.5 rounded-full">{availableBounties.length}</span>
                    </h2>
                    {availableBounties.length > 0 ? (
                        <div className="space-y-6">
                            {availableBounties.map(bounty => (
                                <BountyCard key={bounty.id} bounty={bounty} currentUser={currentUser} onClaim={onClaimBounty} onToggleStatus={onToggleStatus} chatter={chatter} onAddNote={onAddNote} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 px-6 bg-white border border-dashed border-gray-200 rounded-[2rem]">
                            <p className="text-gray-400 italic text-sm">No available favors.</p>
                             <p className="text-xs text-gray-400 mt-2">Create one from the <strong className="font-bold">Explore</strong> tab.</p>
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
                                <BountyCard key={bounty.id} bounty={bounty} currentUser={currentUser} onClaim={onClaimBounty} onToggleStatus={onToggleStatus} chatter={chatter} onAddNote={onAddNote} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 px-6 bg-white border border-dashed border-gray-200 rounded-[2rem]">
                            <p className="text-gray-400 italic text-sm">You have no claimed favors.</p>
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-serif font-bold text-green-600 mb-6 flex items-center gap-2">
                        Completed <span className="text-xs bg-green-100 px-2 py-0.5 rounded-full">{doneBounties.length}</span>
                    </h2>
                     {doneBounties.length > 0 ? (
                        <div className="space-y-6 opacity-60">
                            {doneBounties.map(bounty => (
                                <BountyCard key={bounty.id} bounty={bounty} currentUser={currentUser} onClaim={onClaimBounty} onToggleStatus={onToggleStatus} chatter={chatter} onAddNote={onAddNote} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 px-6 bg-white border border-dashed border-gray-200 rounded-[2rem]">
                            <p className="text-gray-400 italic text-sm">No completions yet.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default BountyBoard;
