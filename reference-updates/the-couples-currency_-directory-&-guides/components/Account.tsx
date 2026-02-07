
import React, { useState, useMemo } from 'react';
import { User } from '../App';
import { Invite, SharingSettings, ChatterNote, Bounty } from '../types';
import { termsData } from '../constants';

interface AccountProps {
    currentUser: User;
    partner: User | null;
    invites: Invite[];
    setInvites: React.Dispatch<React.SetStateAction<Invite[]>>;
    onReset: () => void;
    onConnect: (partnerName: string, id: string) => void;
    sharingSettings: SharingSettings;
    setSharingSettings: React.Dispatch<React.SetStateAction<SharingSettings>>;
    chatter: Record<string, ChatterNote[]>;
    bounties: Bounty[];
    defaultInbox?: boolean;
}

const Account: React.FC<AccountProps> = ({ 
    currentUser, partner, onReset, onConnect, sharingSettings, setSharingSettings, chatter, invites, bounties, defaultInbox = false
}) => {
    const [partnerIdInput, setPartnerIdInput] = useState('');
    const [activeSubTab, setActiveSubTab] = useState<'settings' | 'inbox'>(defaultInbox ? 'inbox' : 'settings');

    const flattenedActivity = useMemo(() => {
        const activity: any[] = [];
        Object.keys(chatter).forEach(contextId => {
            const notes = chatter[contextId];
            notes.forEach(note => {
                let contextName = "Unknown";
                if (contextId.startsWith('term-')) {
                    const id = parseInt(contextId.split('-')[1]);
                    contextName = termsData.find(t => t.id === id)?.name || "Intimacy Term";
                } else if (contextId.startsWith('favor-')) {
                    const id = parseInt(contextId.split('-')[1]);
                    contextName = bounties.find(b => b.id === id)?.task || "Favor";
                }
                activity.push({ ...note, contextName, contextType: contextId.startsWith('term-') ? 'Term' : 'Favor' });
            });
        });
        return activity.sort((a, b) => b.timestamp - a.timestamp);
    }, [chatter, bounties]);

    const Toggle = ({ label, active, onToggle, disabled = false }: { label: string, active: boolean, onToggle: () => void, disabled?: boolean }) => (
        <div className={`flex items-center justify-between p-4 bg-gray-50/50 rounded-xl mb-3 ${disabled ? 'opacity-50' : ''}`}>
            <span className="text-gray-700 font-medium text-sm">{label}</span>
            <button disabled={disabled} onClick={onToggle} className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
        </div>
    );

    return (
        <div className="max-w-xl mx-auto py-4">
            {activeSubTab === 'settings' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1 block">Your Connect ID</span>
                        <h2 className="text-3xl font-serif font-bold text-gray-800 mb-6">{currentUser.connectId}</h2>
                        
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Pairing</h3>
                            {!partner ? (
                                <form onSubmit={(e) => { e.preventDefault(); onConnect(partnerIdInput.split('-')[0], partnerIdInput); }} className="flex gap-2">
                                    <input value={partnerIdInput} onChange={e => setPartnerIdInput(e.target.value)} placeholder="Partner's ID" className="flex-grow px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none border border-transparent focus:border-blue-400 font-mono" />
                                    <button disabled={!partnerIdInput.trim() || currentUser.isDemo} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 text-sm">Sync</button>
                                </form>
                            ) : (
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                                    <span className="font-bold text-blue-700">Connected to {partner.name}</span>
                                    <span className="text-xs text-blue-400">Active</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Privacy & Sharing</h3>
                        <Toggle label="Share All Discovery Lists" active={sharingSettings.shareAll} onToggle={() => {}} disabled={currentUser.isDemo} />
                        <Toggle label="Share 'Favors' History" active={sharingSettings.shareFavors} onToggle={() => {}} disabled={currentUser.isDemo} />
                    </div>

                    <button onClick={onReset} className="w-full p-6 text-red-500 font-bold bg-white border border-red-100 rounded-[2rem] hover:bg-red-50 transition">
                        Logout & Reset Cache
                    </button>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                        <div className="p-8 border-b border-gray-100">
                            <h3 className="text-2xl font-serif font-bold text-gray-800">Inbox</h3>
                            <p className="text-sm text-gray-500 italic">Latest flirts and notes</p>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {flattenedActivity.length === 0 ? (
                                <div className="p-16 text-center">
                                    <div className="text-5xl mb-4">📭</div>
                                    <p className="text-gray-400 font-bold">Your inbox is empty.</p>
                                    <p className="text-xs text-gray-400 mt-2">Start a conversation on any term to see it here.</p>
                                </div>
                            ) : (
                                flattenedActivity.map((note, idx) => (
                                    <div key={idx} className="p-6 hover:bg-gray-50 transition">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-700 px-2 py-1 rounded-md">{note.author}</span>
                                            <span className="text-[10px] text-gray-400">{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-gray-800 text-sm mb-3 font-medium">"{note.text}"</p>
                                        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">Regarding {note.contextType}: {note.contextName}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Account;
