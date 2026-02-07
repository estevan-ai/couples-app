import React, { useState, useMemo } from 'react';
import { termsData } from '../constants';
import { Bookmark } from '../types';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';

interface UserSetupProps {
    onSetupComplete: (name: string, isDemo?: boolean, email?: string, initialBookmarks?: Record<number, Bookmark>) => void;
    initialStep?: 'age' | 'auth' | 'name' | 'spice_intro' | 'onboarding' | 'tour';
    initialName?: string;
    initialEmail?: string;
}

const tourSteps = [
    {
        icon: "🏠",
        highlight: "Explore",
        title: "Intimacy Directory",
        desc: "Browse hundreds of terms for physical and emotional connection. Bookmark your favorites and boundaries to build a shared language with your partner."
    },
    {
        icon: "🎟️",
        highlight: "Collaborate",
        title: "Shared Favors",
        desc: "Turn your 'Willing to Work For' terms into rewards. Post tasks for each other to earn intimacy favors, gamifying your connection with care."
    },
    {
        icon: "📓",
        highlight: "Reflect",
        title: "Reflection Journal",
        desc: "Your private space to talk with an AI coach. Process your feelings and get mirrored insights to help you communicate better with your partner."
    },
    {
        icon: "🧘",
        highlight: "Connect",
        title: "Guided Sessions",
        desc: "When you're ready for deep conversation, use our structured guides to walk through the 'Giving & Receiving' framework together."
    }
];

const UserSetup: React.FC<UserSetupProps> = ({ onSetupComplete, initialStep = 'age', initialName = '', initialEmail = '' }) => {
    const [name, setName] = useState(initialName);
    const [email, setEmail] = useState(initialEmail);
    const [step, setStep] = useState<'age' | 'auth' | 'name' | 'spice_intro' | 'onboarding' | 'tour'>(initialStep);

    const [selectedSpice, setSelectedSpice] = useState<string | null>(null);
    const [selectedTermIds, setSelectedTermIds] = useState<number[]>([]);
    const [currentBookmarks, setCurrentBookmarks] = useState<Record<number, Bookmark>>({});
    const [tourStep, setTourStep] = useState(0);

    const categories = [
        { name: "Sweet & Safe", icon: "🧸", desc: "Gentle affection.", color: "bg-pink-50 text-pink-600" },
        { name: "Flirty & Teasing", icon: "💋", desc: "Building spark.", color: "bg-rose-50 text-rose-600" },
        { name: "Sexy & Physical", icon: "🔥", desc: "Body-focused.", color: "bg-red-50 text-red-600" },
        { name: "Kinky & Playful", icon: "⛓️", desc: "Power dynamics.", color: "bg-purple-50 text-purple-600" },
        { name: "Wild & Advanced", icon: "🎭", desc: "Deep exploration.", color: "bg-indigo-50 text-indigo-600" }
    ];

    const galleryTerms = useMemo(() => {
        if (!selectedSpice) return [];
        return termsData
            .filter(t => t.category === selectedSpice)
            .slice(0, 6);
    }, [selectedSpice]);

    const spiceIndex = categories.findIndex(c => c.name === selectedSpice);

    const isCategoryComplete = (catName: string) => {
        const catTerms = termsData.filter(t => t.category === catName).slice(0, 6);
        return catTerms.every(t => currentBookmarks[t.id]);
    };

    const handleBatchAction = (type: Bookmark) => {
        const newBookmarks = { ...currentBookmarks };
        selectedTermIds.forEach(id => {
            newBookmarks[id] = type;
        });
        setCurrentBookmarks(newBookmarks);
        setSelectedTermIds([]);

        // Check completion and auto-advance
        const currentCatTerms = termsData.filter(t => t.category === selectedSpice).slice(0, 6);
        const allSorted = currentCatTerms.every(t => newBookmarks[t.id]);

        if (allSorted) {
            if (spiceIndex < categories.length - 1) {
                setTimeout(() => {
                    setSelectedSpice(categories[spiceIndex + 1].name);
                }, 400);
            } else {
                setTimeout(() => setStep('tour'), 500);
            }
        }
    };

    const toggleTermSelection = (id: number) => {
        if (currentBookmarks[id]) return;
        setSelectedTermIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            // Auto-fill details if available
            if (result.user.displayName) setName(result.user.displayName.split(' ')[0]);
            if (result.user.email) setEmail(result.user.email);
            setStep('name'); // Advance to name confirmation/input
        } catch (error) {
            console.error("Google Sign In Error:", error);
            alert("Could not sign in with Google. Please try again.");
        }
    };

    const handleDemo = async (who: 'Jane' | 'John') => {
        try {
            await signInAnonymously(auth);
            onSetupComplete(`${who} Doe 1234`, true, `${who.toLowerCase()}doe@testemail.com`);
        } catch (e) {
            console.error("Error signing in anonymously:", e);
        }
    };

    const completedCategoriesCount = categories.filter(cat => isCategoryComplete(cat.name)).length;

    return (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4 z-[100]">
            <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-6 sm:p-10 text-center relative border border-white/20 overflow-hidden min-h-[720px] flex flex-col justify-center animate-in zoom-in-95 duration-500">
                {initialStep && (
                    <button
                        onClick={() => onSetupComplete(name, false, email, currentBookmarks)}
                        className="absolute top-6 right-6 z-50 p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                        aria-label="Exit setup"
                    >
                        ✕
                    </button>
                )}

                {step === 'age' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="text-center mb-10">
                            <img src="/logo.png" alt="Couples Currency" className="w-[280px] mx-auto mb-8 drop-shadow-2xl" />
                            <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2">The Couples' Currency</h1>
                            <p className="text-lg font-serif italic text-gray-500">Investing in Us.</p>
                        </div>
                        <button onClick={() => setStep('auth')} className="w-full py-6 text-xl font-bold bg-blue-600 text-white rounded-[2rem] hover:bg-blue-700 transition shadow-xl">I am 18+</button>
                    </div>
                )}

                {step === 'auth' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="text-5xl">🔐</div>
                        <h1 className="text-3xl font-serif font-bold text-gray-800">Choose Access</h1>

                        <button
                            onClick={handleGoogleLogin}
                            className="w-full py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-[1.5rem] flex items-center justify-center gap-3 hover:bg-gray-50 transition shadow-sm"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                            Sign in with Google
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="h-px bg-gray-200 flex-grow"></div>
                            <span className="text-xs text-gray-400 font-bold uppercase">Or use email</span>
                            <div className="h-px bg-gray-200 flex-grow"></div>
                        </div>

                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="email@example.com"
                            className="w-full px-6 py-4 bg-gray-50 rounded-[1.5rem] text-center text-lg font-medium outline-none"
                        />
                        <button
                            onClick={() => setStep('name')}
                            disabled={!email.includes('@')}
                            className="w-full py-5 text-xl font-bold bg-gray-800 text-white rounded-[1.5rem] disabled:opacity-50"
                        >
                            Continue
                        </button>
                        <div className="pt-4 flex flex-col gap-2">
                            <div className="flex gap-2">
                                <button onClick={() => handleDemo('Jane')} className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100 border border-gray-100 transition">Jane Doe (Demo)</button>
                                <button onClick={() => handleDemo('John')} className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100 border border-gray-100 transition">John Doe (Demo)</button>
                            </div>
                            <p className="text-[10px] text-center text-gray-300 font-medium">Test Accounts with Pre-filled Data</p>
                        </div>
                    </div>
                )}

                {step === 'name' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="text-5xl">👤</div>
                        <h1 className="text-3xl font-serif font-bold text-gray-800">What's your name?</h1>
                        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep('spice_intro'); }} className="space-y-6">
                            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" className="w-full px-6 py-6 text-center text-3xl font-serif bg-gray-50 rounded-[2rem] outline-none" required />
                            <button type="submit" className="w-full py-6 text-xl font-bold bg-blue-600 text-white rounded-[2rem] shadow-xl">Set Spice Levels</button>
                        </form>
                    </div>
                )}

                {step === 'spice_intro' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                        <div className="text-left bg-blue-50/50 p-5 rounded-[2rem] border border-blue-100 mb-2">
                            <h2 className="text-xl font-serif font-bold text-gray-800 mb-1">Spice Spectrum</h2>
                            <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                                💡 <span className="text-blue-600 font-bold uppercase">How it works:</span> Click a category to see terms. Tap multiple cards to group-save them. Finish all 5 to complete setup!
                            </p>
                        </div>

                        <div className="flex-grow grid grid-cols-1 gap-3 overflow-y-auto pr-1 scrollbar-hide py-2">
                            {categories.map((cat, idx) => {
                                const isDone = isCategoryComplete(cat.name);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => { setSelectedSpice(cat.name); setStep('onboarding'); }}
                                        className={`group relative flex items-center gap-4 p-4 rounded-3xl border text-left transition-all active:scale-95 ${isDone ? 'bg-green-50/40 border-green-200 shadow-none' : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'}`}
                                    >
                                        <div className={`w-14 h-14 ${cat.color} rounded-2xl shadow-inner flex items-center justify-center text-3xl flex-shrink-0 relative`}>
                                            {cat.icon}
                                            {isDone && (
                                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white animate-in zoom-in">✓</div>
                                            )}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-black text-xs uppercase tracking-tight text-gray-800">{cat.name}</p>
                                            <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{cat.desc}</p>
                                        </div>
                                        {!isDone && <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold pr-2">Start →</span>}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <span className="text-[10px] font-black uppercase text-gray-400">Total Progress</span>
                                <span className="text-xs font-bold text-blue-600">{completedCategoriesCount} / 5 Levels Completed</span>
                            </div>
                            <button
                                onClick={() => setStep('tour')}
                                className={`w-full py-5 text-xl font-bold rounded-[2rem] transition-all shadow-xl ${completedCategoriesCount > 0 ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                disabled={completedCategoriesCount === 0}
                            >
                                {completedCategoriesCount === 5 ? 'Finish & Explore' : 'Continue to Dashboard'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'onboarding' && (
                    <div key={selectedSpice} className="animate-in slide-in-from-right-4 duration-400 flex flex-col h-full relative">
                        <header className="flex items-center justify-between mb-6">
                            <button onClick={() => setStep('spice_intro')} className="text-gray-400 text-xs font-black uppercase tracking-widest flex items-center gap-1 hover:text-gray-800 transition-colors">
                                <span>←</span> Back
                            </button>
                            <div className="text-center">
                                <h2 className="text-lg font-serif font-bold text-gray-800">{selectedSpice}</h2>
                                <div className="text-[8px] font-black uppercase text-blue-500 tracking-widest">Select cards below</div>
                            </div>
                            <div className="text-[10px] font-black text-blue-500 bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-100 shadow-sm">
                                {galleryTerms.filter(t => currentBookmarks[t.id]).length}/6
                            </div>
                        </header>

                        <div className="flex-grow overflow-y-auto pr-1 scrollbar-hide">
                            <div className="grid grid-cols-2 gap-3 pb-56">
                                {galleryTerms.map(term => {
                                    const isSelected = selectedTermIds.includes(term.id);
                                    const bookmark = currentBookmarks[term.id];
                                    return (
                                        <button
                                            key={term.id}
                                            onClick={() => toggleTermSelection(term.id)}
                                            className={`relative p-4 rounded-3xl border-2 text-left transition-all h-44 flex flex-col justify-between ${bookmark ? 'bg-gray-50 border-gray-100 opacity-40 grayscale pointer-events-none shadow-none' :
                                                isSelected ? 'bg-blue-50 border-blue-500 ring-4 ring-blue-50' :
                                                    'bg-white border-gray-100 hover:border-gray-300 shadow-sm'
                                                }`}
                                        >
                                            <div className="overflow-hidden">
                                                <p className="font-bold text-sm text-gray-800 leading-tight mb-2 truncate">{term.name}</p>
                                                <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-4">{term.definition}</p>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white shadow-md border-2 border-white animate-in zoom-in">✓</div>
                                            )}
                                            {bookmark && (
                                                <div className="absolute bottom-2 right-2 text-2xl filter drop-shadow-sm">
                                                    {bookmark === 'love' ? '❤️' : bookmark === 'like' ? '🤔' : bookmark === 'work' ? '🎟️' : bookmark === 'unsure' ? '❔' : '🚫'}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Minimalist Floating Action Bar - Updated to 3+2 layout */}
                        <div className={`absolute bottom-0 left-0 right-0 p-4 z-10 transition-all duration-500 transform ${selectedTermIds.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
                            <div className="bg-white/95 backdrop-blur-md border border-gray-200 p-5 rounded-[2.5rem] shadow-2xl space-y-3">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Group Sort ({selectedTermIds.length})</p>
                                    <button onClick={() => setSelectedTermIds([])} className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors">Clear</button>
                                </div>

                                {/* Row 1: 3 columns */}
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { type: 'like' as Bookmark, icon: '🤔', label: 'Like', color: 'bg-yellow-400' },
                                        { type: 'love' as Bookmark, icon: '❤️', label: 'Love', color: 'bg-red-500' },
                                        { type: 'work' as Bookmark, icon: '🎟️', label: 'Work', color: 'bg-indigo-600' }
                                    ].map(action => (
                                        <button
                                            key={action.type}
                                            onClick={() => handleBatchAction(action.type)}
                                            className={`py-3.5 ${action.color} text-white rounded-2xl flex flex-col items-center gap-1 shadow-md active:scale-95 transition-all`}
                                        >
                                            <span className="text-xl">{action.icon}</span>
                                            <span className="text-[9px] font-black uppercase tracking-tighter">{action.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Row 2: 2 columns */}
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { type: 'skip' as Bookmark, icon: '🚫', label: 'No Interest', color: 'bg-gray-400' },
                                        { type: 'unsure' as Bookmark, icon: '❔', label: 'Unsure/Skip', color: 'bg-gray-200 text-gray-600' }
                                    ].map(action => (
                                        <button
                                            key={action.type}
                                            onClick={() => handleBatchAction(action.type)}
                                            className={`py-3.5 ${action.color} ${action.type === 'unsure' ? '' : 'text-white'} rounded-2xl flex flex-col items-center gap-1 shadow-md active:scale-95 transition-all`}
                                        >
                                            <span className="text-xl">{action.icon}</span>
                                            <span className="text-[9px] font-black uppercase tracking-tighter">{action.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Quiet empty state prompt */}
                        {selectedTermIds.length === 0 && (
                            <div className="absolute bottom-10 left-0 right-0 pointer-events-none animate-in fade-in duration-700">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">Tap terms to sort</p>
                            </div>
                        )}
                    </div>
                )}

                {step === 'tour' && (
                    <div className="animate-in slide-in-from-right-4 duration-500 flex flex-col h-full">
                        <div className="flex-grow flex flex-col items-center justify-center space-y-6">
                            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] shadow-xl flex items-center justify-center text-5xl animate-bounce">
                                {tourSteps[tourStep].icon}
                            </div>
                            <div className="space-y-3 px-4">
                                <p className="text-[9px] font-black text-blue-400 tracking-widest uppercase tracking-widest">{tourSteps[tourStep].highlight}</p>
                                <h2 className="text-3xl font-serif font-bold text-gray-800">{tourSteps[tourStep].title}</h2>
                                <p className="text-gray-500 text-xs leading-relaxed">
                                    {tourSteps[tourStep].desc}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6 mt-8">
                            <div className="flex justify-center gap-2">
                                {tourSteps.map((_, i) => (
                                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === tourStep ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-200'}`} />
                                ))}
                            </div>

                            <button
                                onClick={() => {
                                    if (tourStep < tourSteps.length - 1) {
                                        setTourStep(tourStep + 1);
                                    } else {
                                        onSetupComplete(name.trim() || 'User', false, email, currentBookmarks);
                                    }
                                }}
                                className="w-full py-5 text-xl font-bold bg-gray-800 text-white rounded-[2rem] hover:bg-black transition shadow-xl"
                            >
                                {tourStep < tourSteps.length - 1 ? 'Next' : 'Enter the Currency'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserSetup;
