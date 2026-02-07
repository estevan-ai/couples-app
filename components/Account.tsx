import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { Invite, SharingSettings, ChatterNote, Bounty, Term, Bookmark } from '../types';
import { InstallPWA } from './InstallPWA';
import { PushNotificationManager } from './PushNotificationManager';

interface AccountProps {
    currentUser: User;
    partner: User | null;
    invites: Invite[];
    setInvites: React.Dispatch<React.SetStateAction<Invite[]>>;
    onReset: () => void;
    onResetHandlers?: (type: 'loves' | 'likes' | 'favors' | 'boundaries' | 'all_discovery' | 'history') => void;
    onConnect: (partnerName: string, id: string) => void;
    sharingSettings: SharingSettings;
    setSharingSettings: React.Dispatch<React.SetStateAction<SharingSettings>>;
    chatter: Record<string, ChatterNote[]>;
    bounties: Bounty[];
    onRedoQuiz?: () => void;
    defaultInbox?: boolean;
    notificationSettings?: import('../types').NotificationSettings;
    setNotificationSettings?: React.Dispatch<React.SetStateAction<import('../types').NotificationSettings>>;
}

const Account: React.FC<AccountProps> = ({
    currentUser, partner, onReset, onConnect, sharingSettings, setSharingSettings, onRedoQuiz, onResetHandlers, chatter, bounties, notificationSettings, setNotificationSettings
}) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'privacy'>('profile');
    const [partnerIdInput, setPartnerIdInput] = useState('');
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);

    // --- Activity Feed Logic ---
    const activityFeed = useMemo(() => {
        const allNotes = Object.values(chatter).flat();
        // Determine context name helper
        const getContextName = (cid: string) => {
            if (cid.startsWith('term-')) return `REGARDING TERM: ${cid.split('-')[1]}`; // Simplified, ideally we'd look up the term name
            if (cid.startsWith('bounty-')) {
                const b = bounties.find(b => b.id.toString() === cid.replace('bounty-', ''));
                return b ? `REGARDING FAVOR: ${b.task.toUpperCase()}` : 'REGARDING FAVOR';
            }
            if (cid === 'general-flirt') return 'GENERAL FLIRT';
            return 'CONTEXT';
        };

        return allNotes.sort((a, b) => b.timestamp - a.timestamp).map(note => ({
            ...note,
            contextLabel: getContextName(note.contextId)
        }));
    }, [chatter, bounties]);


    const Toggle = ({ label, active, onToggle, disabled = false }: { label: string, active: boolean, onToggle: () => void, disabled?: boolean }) => (
        <div className={`flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 mb-3 ${disabled ? 'opacity-50' : ''}`}>
            <span className="text-gray-700 font-medium text-sm">{label}</span>
            <button disabled={disabled} onClick={onToggle} className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${active ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto py-8 pb-32 px-4 animate-in fade-in duration-500">

            {/* Centered Tabs */}
            <div className="flex justify-center mb-8">
                <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1 shadow-inner max-w-md w-full">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        👤 Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'activity' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        📄 Activity
                    </button>
                    <button
                        onClick={() => setActiveTab('privacy')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'privacy' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        🛡️ Privacy
                    </button>
                </div>
            </div>

            {/* --- TAB CONTENT --- */}

            {/* 1. PROFILE TAB */}
            {activeTab === 'profile' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    {/* Header */}
                    <div className="text-center mb-4">
                        <h2 className="text-3xl font-serif font-bold text-gray-800">Your Identity</h2>
                        <p className="text-gray-500 text-sm">Manage your profile & pairing</p>
                    </div>

                    <InstallPWA />
                    <PushNotificationManager currentUser={currentUser} />

                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1 block">Your Connect ID</span>
                        <h2 className="text-4xl font-serif font-bold text-gray-800 mb-8">{currentUser.connectId}</h2>

                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Pairing</h3>
                            {!partner ? (
                                <form onSubmit={(e) => { e.preventDefault(); onConnect(partnerIdInput.split('-')[0], partnerIdInput); }} className="flex gap-2">
                                    <input value={partnerIdInput} onChange={e => setPartnerIdInput(e.target.value)} placeholder="Partner's ID" className="flex-grow px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none border border-transparent focus:border-blue-400 font-mono" />
                                    <button disabled={!partnerIdInput.trim()} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 text-sm">Sync</button>
                                </form>
                            ) : (
                                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-200 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">{partner.name[0]}</div>
                                        <div>
                                            <span className="font-bold text-blue-800 block leading-tight">Connected to {partner.name}</span>
                                            <span className="text-xs text-blue-500">Sync Active</span>
                                        </div>
                                    </div>
                                    <button onClick={() => { if (window.confirm("Disconnect partner? This will remove shared keys.")) onConnect('', ''); }} className="text-xs text-blue-400 hover:text-blue-600 underline">Unlink</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2.5rem] shadow-sm border border-amber-100 p-8">
                        <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-4">Membership & Data</h3>
                        <button
                            onClick={onRedoQuiz}
                            className="w-full flex items-center justify-between p-4 bg-white/80 text-amber-900 font-bold rounded-2xl hover:bg-white transition border border-amber-100 shadow-sm group"
                        >
                            <span className="flex items-center gap-3">
                                <span className="text-xl group-hover:scale-110 transition">✨</span>
                                Revisit Onboarding Quiz
                            </span>
                            <span className="text-amber-400">→</span>
                        </button>
                    </div>

                    <button onClick={onReset} className="w-full p-4 text-red-400 hover:text-red-600 font-bold transition text-sm">
                        Log Out of Device
                    </button>
                </div>
            )}

            {/* 2. ACTIVITY TAB */}
            {activeTab === 'activity' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="text-center mb-4">
                        <h2 className="text-3xl font-serif font-bold text-gray-800">Global Activity</h2>
                        <p className="text-gray-500 text-sm">Consolidated history of notes and chatter</p>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 min-h-[400px]">
                        {activityFeed.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400 opacity-50">
                                <span className="text-4xl mb-2">📭</span>
                                <p>No activity yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-8 relative before:absolute before:left-4 before:top-0 before:h-full before:w-px before:bg-gray-100 pl-8 from-gray-50">
                                {activityFeed.map((note, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-[37px] top-0 w-5 h-5 rounded-full border-4 border-white bg-gray-200 shadow-sm"></div>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${note.author === currentUser.name ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                                {note.author}
                                            </span>
                                            <span className="text-[9px] text-gray-400 font-mono">
                                                {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-gray-800 font-medium mb-2 leading-relaxed">
                                            "{note.text}"
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">
                                                {note.contextLabel}
                                            </span>
                                            {/* Link helper could go here */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 3. PRIVACY TAB */}
            {activeTab === 'privacy' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="text-center mb-4">
                        <h2 className="text-3xl font-serif font-bold text-gray-800">Privacy & Data</h2>
                        <p className="text-gray-500 text-sm">Control what you share and reset your lists</p>
                    </div>

                    {/* Sharing Section */}
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                        <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-6">Partner Sharing Controls</h3>
                        <Toggle
                            label="Share Everything"
                            active={sharingSettings.shareAll}
                            onToggle={() => setSharingSettings(prev => ({ ...prev, shareAll: !prev.shareAll }))}
                        />

                        <div className={`space-y-1 transition-all duration-300 pl-4 border-l-2 border-gray-100 ${!sharingSettings.shareAll ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <Toggle
                                label="Share 'Loves' (❤️)"
                                active={sharingSettings.shareLoves}
                                onToggle={() => setSharingSettings(prev => ({ ...prev, shareLoves: !prev.shareLoves }))}
                            />
                            <Toggle
                                label="Share 'Likes' (🤔)"
                                active={sharingSettings.shareLikes}
                                onToggle={() => setSharingSettings(prev => ({ ...prev, shareLikes: !prev.shareLikes }))}
                            />
                            <Toggle
                                label="Share 'Will Work For' (🎟️)"
                                active={sharingSettings.shareWillWorkFor}
                                onToggle={() => setSharingSettings(prev => ({ ...prev, shareWillWorkFor: !prev.shareWillWorkFor }))}
                            />
                            <Toggle
                                label="Share 'Unsure' (❔)"
                                active={sharingSettings.shareUnsure}
                                onToggle={() => setSharingSettings(prev => ({ ...prev, shareUnsure: !prev.shareUnsure }))}
                            />
                            <Toggle
                                label="Share 'Boundaries' (🚫)"
                                active={sharingSettings.shareBoundaries}
                                onToggle={() => setSharingSettings(prev => ({ ...prev, shareBoundaries: !prev.shareBoundaries }))}
                            />
                        </div>
                    </div>

                    {/* Notification Settings */}
                    {notificationSettings && setNotificationSettings && (
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-6">Notification Preferences</h3>
                            <Toggle
                                label="New Chatter"
                                active={notificationSettings.chatter}
                                onToggle={() => setNotificationSettings(prev => ({ ...prev, chatter: !prev.chatter }))}
                            />
                            <div className="pl-4 border-l-2 border-gray-100 space-y-1">
                                <Toggle
                                    label="Quick Flirts"
                                    active={notificationSettings.quickFlirts}
                                    onToggle={() => setNotificationSettings(prev => ({ ...prev, quickFlirts: !prev.quickFlirts }))}
                                />
                                <Toggle
                                    label="All Flirts"
                                    active={notificationSettings.allFlirts}
                                    onToggle={() => setNotificationSettings(prev => ({ ...prev, allFlirts: !prev.allFlirts }))}
                                />
                            </div>
                            <Toggle
                                label="Direct Messages"
                                active={notificationSettings.messages}
                                onToggle={() => setNotificationSettings(prev => ({ ...prev, messages: !prev.messages }))}
                            />
                            <Toggle
                                label="Partner Thoughts"
                                active={notificationSettings.thoughts}
                                onToggle={() => setNotificationSettings(prev => ({ ...prev, thoughts: !prev.thoughts }))}
                            />
                            <Toggle
                                label="New Bounties / Favors"
                                active={notificationSettings.newFavors}
                                onToggle={() => setNotificationSettings(prev => ({ ...prev, newFavors: !prev.newFavors }))}
                            />
                        </div>
                    )}

                    {/* Reset Section */}
                    <div className="bg-red-50/50 rounded-[2.5rem] shadow-sm border border-red-100 p-8">
                        <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-6">Danger Zone / Resets</h3>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button onClick={() => { if (window.confirm('Clear all items marked as LOVE?')) onResetHandlers?.('loves'); }} className="p-4 bg-white text-red-600 font-bold rounded-xl text-xs hover:bg-red-600 hover:text-white transition shadow-sm border border-red-100">
                                Reset Loves
                            </button>
                            <button onClick={() => { if (window.confirm('Clear all items marked as LIKE?')) onResetHandlers?.('likes'); }} className="p-4 bg-white text-yellow-600 font-bold rounded-xl text-xs hover:bg-yellow-500 hover:text-white transition shadow-sm border border-yellow-100">
                                Reset Likes
                            </button>
                            <button onClick={() => { if (window.confirm('Clear all items marked as WORK FOR?')) onResetHandlers?.('favors'); }} className="p-4 bg-white text-indigo-600 font-bold rounded-xl text-xs hover:bg-indigo-600 hover:text-white transition shadow-sm border border-indigo-100">
                                Reset 'Work For'
                            </button>
                            <button onClick={() => { if (window.confirm('Clear all items marked as BOUNDARIES?')) onResetHandlers?.('boundaries'); }} className="p-4 bg-white text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-600 hover:text-white transition shadow-sm border border-gray-100">
                                Reset Boundaries
                            </button>
                        </div>

                        <button onClick={() => { if (window.confirm("Delete ALL your bookmarks/history? Cannot be undone.")) onResetHandlers?.('all_discovery'); }} className="w-full py-4 bg-red-100 text-red-800 font-bold rounded-xl text-xs hover:bg-red-600 hover:text-white transition">
                            🔥 Factory Reset My Data
                        </button>
                    </div>

                    <div className="pt-4 flex justify-center">
                        <button onClick={() => setShowPrivacyModal(true)} className="text-xs text-gray-400 hover:text-blue-500 underline decoration-dotted underline-offset-4 transition">
                            How we protect your privacy & photos 🛡️
                        </button>
                    </div>
                </div>
            )}

            <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
        </div>
    );
};

const PrivacyModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-2">
                        <span>🛡️</span> Zero-Knowledge Privacy
                    </h2>
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm">✕</button>
                </div>
                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                    <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm">
                        <p className="font-bold mb-1">Your secrets are mathematically secure.</p>
                        We use AES-GCM 256-bit encryption for your photos and messages. Keys are stored only on your device.
                    </div>

                    <section>
                        <h3 className="font-bold text-gray-900 mb-2">How We Keep You Safe</h3>
                        <ul className="space-y-3 text-sm text-gray-600 list-disc pl-4">
                            <li><strong>Device-Local Keys:</strong> We generate encryption keys in your browser. Our servers only see jumbled ciphertext.</li>
                            <li><strong>Shared Key Sync:</strong> When you pair, you securely share a key to unlock each other's content.</li>
                            <li><strong>Ephemeral By Design:</strong> Fast flirts are meant to be temporary.</li>
                        </ul>
                    </section>
                </div>
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="px-6 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900">Close</button>
                </div>
            </div>
        </div>
    );
};

export default Account;
