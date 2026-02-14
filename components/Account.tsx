import React, { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
    initialTab?: 'profile' | 'activity' | 'privacy';
    onBackupIdentity?: () => Promise<string | null>;
    onRestoreIdentity?: (pem: string) => Promise<boolean>;
    onGenerateSyncCode?: () => Promise<string>;
    onConsumeSyncCode?: (code: string) => Promise<boolean>;
    onResetEncryption?: () => void;
    encryptionStatus?: 'locked' | 'unlocked' | 'initializing' | 'no-keys' | 'broken-identity';
    onUpdateProfile?: (data: Partial<User>) => Promise<void>;
}

const Account: React.FC<AccountProps> = ({
    currentUser, partner, onReset, onConnect, sharingSettings, setSharingSettings, onRedoQuiz, onResetHandlers, chatter, bounties, notificationSettings, setNotificationSettings, initialTab = 'profile',
    onBackupIdentity, onRestoreIdentity, onGenerateSyncCode, onConsumeSyncCode, onResetEncryption, encryptionStatus, onUpdateProfile
}) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'privacy'>(initialTab);

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const [partnerIdInput, setPartnerIdInput] = useState('');
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [qrData, setQrData] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [qrRevealed, setQrRevealed] = useState(false);
    const [showSyncCode, setShowSyncCode] = useState(false);
    const [showEnterCode, setShowEnterCode] = useState(false);
    const [syncCode, setSyncCode] = useState('');

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

                        <div className="mb-6">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Security Status</span>
                            {encryptionStatus === 'broken-identity' ? (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg inline-block border border-red-100 animate-pulse">
                                    <span>❌</span>
                                    <span className="text-xs font-bold">Identity Error (Repair Needed)</span>
                                </div>
                            ) : currentUser.encryptedSharedKey ? (
                                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg inline-block">
                                    <span>🔒</span>
                                    <span className="text-xs font-bold">End-to-End Encrypted</span>
                                </div>
                            ) : currentUser.sharedKeyBase64 ? (
                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg inline-block">
                                    <span>⚠️</span>
                                    <span className="text-xs font-bold">Legacy Encryption (Upgrading...)</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-gray-400 bg-gray-50 px-3 py-2 rounded-lg inline-block">
                                    <span>🔓</span>
                                    <span className="text-xs font-bold">Not Encrypted</span>
                                </div>
                            )}
                        </div>

                        {/* Emergency Encryption Reset */}
                        {(currentUser.encryptedSharedKey && !currentUser.sharedKeyBase64) || encryptionStatus === 'broken-identity' ? (
                            <div className="mt-2 mb-4">
                                <button
                                    onClick={() => {
                                        if (confirm("⚠️ SYSTEM RESET: This will fix the 'OperationError' by creating a new identity. You will lose access to old encrypted messages unless you have a backup. Continue?")) {
                                            onResetEncryption?.();
                                        }
                                    }}
                                    className="w-full text-xs font-bold text-red-500 border border-red-200 bg-red-50 px-4 py-3 rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2"
                                >
                                    <span>🛠️</span> Fix "OperationError" / Reset Keys
                                </button>
                            </div>
                        ) : null}

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

                    {/* AI Customization Section */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-[2.5rem] shadow-sm border border-indigo-100 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">🧞‍♂️</div>
                            <div>
                                <h3 className="text-lg font-serif font-bold text-indigo-900">AI Personalization</h3>
                                <p className="text-xs text-indigo-500">Teach the AI how to help you best.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 block">Relationship Context</label>
                                <textarea
                                    className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-100 focus:border-indigo-400 outline-none min-h-[80px] placeholder-gray-300"
                                    placeholder="e.g. Married 5 years, high stress jobs, trying to communicate better..."
                                    defaultValue={currentUser.relationshipContext || ''}
                                    onBlur={(e) => onUpdateProfile?.({ relationshipContext: e.target.value })}
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">
                                    The AI uses this to tailor advice (e.g. "Since you are long-distance...").
                                </p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 block">Current Focus (Working On)</label>
                                <textarea
                                    className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-100 focus:border-indigo-400 outline-none min-h-[80px] placeholder-gray-300"
                                    placeholder="e.g. Improving communication, rebuilding trust, more quality time..."
                                    defaultValue={currentUser.workingOn || ''}
                                    onBlur={(e) => onUpdateProfile?.({ workingOn: e.target.value })}
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">
                                    The AI will prioritize features and tips that help with this goal.
                                </p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 block">Agent Persona (Therapist Mode)</label>
                                <textarea
                                    className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-100 focus:border-indigo-400 outline-none min-h-[80px] placeholder-gray-300"
                                    placeholder="e.g. Friendly & Casual, Stern & Clinical, Funny & Lighthearted..."
                                    defaultValue={currentUser.agentPersona || ''}
                                    onBlur={(e) => onUpdateProfile?.({ agentPersona: e.target.value })}
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">
                                    Defines how the AI speaks to you (e.g. "Coach", "Best Friend", "Therapist").
                                </p>
                            </div>
                        </div>
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
                                label="Share 'Not Interested' (👎)"
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
                            <button onClick={() => { if (window.confirm("Clear all items marked as 'Not Interested'?")) onResetHandlers?.('boundaries'); }} className="p-4 bg-white text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-600 hover:text-white transition shadow-sm border border-gray-100">
                                Reset 'Not Interested'
                            </button>
                        </div>

                        <button onClick={() => { if (window.confirm("Delete ALL your bookmarks/history? Cannot be undone.")) onResetHandlers?.('all_discovery'); }} className="w-full py-4 bg-red-100 text-red-800 font-bold rounded-xl text-xs hover:bg-red-600 hover:text-white transition">
                            🔥 Factory Reset My Data
                        </button>
                    </div>

                    {/* Device Management Widget */}
                    <div className="bg-indigo-50 rounded-[2.5rem] shadow-sm border border-indigo-100 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">📱</div>
                            <div>
                                <h3 className="text-lg font-serif font-bold text-indigo-900">Device Management</h3>
                                <p className="text-xs text-indigo-500">Sync your identity across devices</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Export Section */}
                            <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm flex flex-col gap-3">
                                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                    <span>📤</span> Export This Identity
                                </h4>
                                <p className="text-[10px] text-gray-400 leading-tight">
                                    Use this device to log in on a new phone or laptop.
                                </p>
                                <div className="mt-auto flex flex-col gap-2">
                                    <button
                                        onClick={async () => {
                                            if (onBackupIdentity) {
                                                const key = await onBackupIdentity();
                                                if (key) {
                                                    setQrData(key);
                                                    setShowQR(true);
                                                } else {
                                                    alert("No identity found. Refresh to generate one.");
                                                }
                                            }
                                        }}
                                        className="w-full py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition shadow-sm"
                                    >
                                        Show QR Code
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (onGenerateSyncCode) {
                                                const code = await onGenerateSyncCode();
                                                setSyncCode(code);
                                                setShowSyncCode(true);
                                            }
                                        }}
                                        className="w-full py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl text-xs hover:bg-indigo-100 transition border border-indigo-100"
                                    >
                                        ✨ Get Magic Code
                                    </button>
                                </div>
                            </div>

                            {/* Import Section */}
                            <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm flex flex-col gap-3">
                                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                    <span>📥</span> Import Identity
                                </h4>
                                <p className="text-[10px] text-gray-400 leading-tight">
                                    Log in here using your primary device.
                                </p>
                                <div className="mt-auto flex flex-col gap-2">
                                    <button
                                        onClick={() => setShowScanner(true)}
                                        className="w-full py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition shadow-sm"
                                    >
                                        📷 Scan QR
                                    </button>
                                    <button
                                        onClick={() => setShowEnterCode(true)}
                                        className="w-full py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl text-xs hover:bg-indigo-100 transition border border-indigo-100"
                                    >
                                        🔢 Enter Magic Code
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Advanced / Manual Fallback */}
                        <div className="mt-4 text-center">
                            <button
                                onClick={async () => {
                                    const key = prompt("Paste your Private Key here to manually restore:");
                                    if (key && onRestoreIdentity) {
                                        if (confirm("WARNING: Overwrite current identity?")) {
                                            const success = await onRestoreIdentity(key);
                                            if (success) {
                                                alert("Success! Reloading...");
                                                window.location.reload();
                                            } else {
                                                alert("Invalid key.");
                                            }
                                        }
                                    }
                                }}
                                className="text-[10px] text-indigo-300 font-bold hover:text-indigo-500 underline decoration-indigo-200"
                            >
                                Can't use camera? Paste Key Manually
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />

            {/* QR Export Modal */}
            {showQR && qrData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowQR(false)}>
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 className="text-xl font-serif font-bold text-gray-800 flex items-center gap-2">
                                <span>🔑</span> Secret Identity Key
                            </h2>
                            <button onClick={() => setShowQR(false)} className="bg-white rounded-full p-2 text-gray-400 hover:text-gray-600 shadow-sm">✕</button>
                        </div>
                        <div className="p-8 flex flex-col items-center gap-6">
                            <div
                                className="relative group cursor-pointer transition-transform hover:scale-[1.02]"
                                onClick={() => setQrRevealed(!qrRevealed)}
                            >
                                {!qrRevealed && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                        <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-sm animate-pulse">
                                            Click to Reveal
                                        </span>
                                    </div>
                                )}
                                <div className={`p-4 bg-white rounded-xl shadow-inner border border-gray-100 transition-all duration-500 ${qrRevealed ? 'blur-none' : 'blur-md'}`}>
                                    <QRCodeSVG value={qrData} size={200} level="M" />
                                </div>
                            </div>

                            <div className="text-center space-y-2">
                                <p className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg inline-block">SENSITIVE: DO NOT SHARE THIS SCREEN</p>
                                <p className="text-xs text-gray-500 px-4">
                                    Scan this with your other device to log in there.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(qrData);
                                    alert("Copied. Paste into 'Paste Key' on other device.");
                                }}
                                className="text-xs text-blue-500 font-bold hover:text-blue-700 underline"
                            >
                                Copy Text to Clipboard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Scanner Modal */}
            {showScanner && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 relative">
                        <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 text-gray-800 shadow-md">✕</button>
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-center mb-4">Scan Identity QR</h2>
                            <div id="reader" className="rounded-xl overflow-hidden"></div>
                            <p className="text-center text-xs text-gray-500 mt-4">Point your camera at the "Export Key" QR code on your other device.</p>
                        </div>
                        <ScannerInitializer
                            onScan={async (decodedText) => {
                                setShowScanner(false);
                                if (onRestoreIdentity) {
                                    if (confirm("Identity found! Restore and overwrite current data?")) {
                                        const success = await onRestoreIdentity(decodedText);
                                        if (success) {
                                            alert("Success! Reloading...");
                                            window.location.reload();
                                        } else {
                                            alert("Failed to decode valid key.");
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// Separate component to handle scanner lifecycle
import { Html5Qrcode } from 'html5-qrcode';

const ScannerInitializer = ({ onScan }: { onScan: (text: string) => void }) => {
    React.useEffect(() => {
        const html5QrCode = new Html5Qrcode("reader");

        const startScanner = async () => {
            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        onScan(decodedText);
                        html5QrCode.stop().catch(console.error);
                    },
                    (errorMessage) => {
                        // parse error, ignore
                    }
                );
            } catch (err) {
                console.error("Error starting scanner", err);
            }
        };

        startScanner();

        return () => {
            if (html5QrCode.isScanning) {
                html5QrCode.stop().catch(console.error);
            }
            html5QrCode.clear();
        };
    }, []);
    return null;
};

const PrivacyModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-2">
                        <span>🛡️</span> Zero-Knowledge Security
                    </h2>
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm">✕</button>
                </div>
                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                    <div className="bg-green-50 p-4 rounded-xl text-green-800 text-sm border border-green-100">
                        <p className="font-bold mb-1 flex items-center gap-2"><span className="text-lg">🔒</span> Mathematically Secure</p>
                        Your data is encrypted using military-grade AES-256 and RSA-2048 algorithms. We (the developers) literally cannot read your messages because we don't have your Private Key.
                    </div>

                    <section className="space-y-4">
                        <div className="flex gap-4">
                            <div className="text-2xl">📱</div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Device-Only Storage</h3>
                                <p className="text-sm text-gray-500">Your "Identity" (Private Key) is generated on this device and saved <strong>only</strong> to this browser. It never touches our cloud servers.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="text-2xl">🤝</div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Two-Part Encryption (Lockbox)</h3>
                                <p className="text-sm text-gray-500">When you connect, you exchange "Public Lockboxes". You put data in their box, and only their Private Key can open it.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="text-2xl">🔄</div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Safe Syncing</h3>
                                <p className="text-sm text-gray-500">To use a new device, you must physically authorize it by scanning your "Identity QR". This ensures no hacker can log in as you from across the world.</p>
                            </div>
                        </div>
                    </section>
                </div>
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="px-6 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition">Close & Stay Safe</button>
                </div>
            </div>
        </div>
    );
};

export default Account;
