import React, { useState, useMemo, useEffect } from 'react';
import { termsData } from '../constants';
import { Bookmark } from '../types';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously, signInWithRedirect, getRedirectResult, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '../firebase';
import { generateRSAKeyPair, exportPublicKey, exportPrivateKey } from '../utils/encryption';

interface UserSetupProps {
    onSetupComplete: (name: string, isDemo: boolean, email: string, initialBookmarks?: Record<number, Bookmark>, publicKey?: string, privateKey?: string, connectId?: string, spiceLimit?: string) => void;
    initialStep?: 'age' | 'auth' | 'name' | 'spice_intro' | 'onboarding' | 'tour' | 'invite_partner';
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
    const [password, setPassword] = useState('');
    const [step, setStep] = useState<'loading' | 'age' | 'auth' | 'name' | 'spice_intro' | 'onboarding' | 'tour' | 'invite_partner'>(initialStep === 'age' ? 'loading' : initialStep);
    const [generatedKeys, setGeneratedKeys] = useState<{ public?: string; private?: string }>({});
    const [generatedConnectId, setGeneratedConnectId] = useState<string>("");

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

    const [authError, setAuthError] = useState<string | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isVerifyingRedirect, setIsVerifyingRedirect] = useState(true);
    // Initial Auth Check (Standard Firebase Pattern)
    useEffect(() => {
        let mounted = true;

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!mounted) return;

            if (user) {
                console.log("Auth State: Active User", user.uid);
                if (user.displayName) setName(user.displayName.split(' ')[0]);
                if (user.email) setEmail(user.email);

                // Found user? Auto-advance to name setup (skipping Age/Auth screens)
                setStep('name');
            }
        });

        // Explicitly check for redirect result (Redundancy for mobile)
        getRedirectResult(auth).then((result) => {
            if (mounted && result && result.user) {
                console.log("Redirect Result: Success", result.user.uid);
                if (result.user.displayName) setName(result.user.displayName.split(' ')[0]);
                if (result.user.email) setEmail(result.user.email);
                setStep('name');
            }
        }).catch(e => {
            if (mounted) {
                console.error("Redirect Result Error:", e);
                setAuthError(e.message || "Failed to complete Google Sign-In redirect. If using localtunnel, ensure the URL is authorized in Firebase Console.");
            }
        }).finally(() => {
            if (mounted) {
                setIsVerifyingRedirect(false);
                setStep((currentStep) => currentStep === 'loading' ? 'age' : currentStep);
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    const handleGoogleLogin = async () => {
        setAuthError(null);
        setIsLoggingIn(true);

        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        // Try popup first (works inside iOS PWAs via in-app browser).
        try {
            const result = await signInWithPopup(auth, provider);
            if (result.user.displayName) setName(result.user.displayName.split(' ')[0]);
            if (result.user.email) setEmail(result.user.email);
            setStep('name');
        } catch (error: any) {
            console.error("Popup Login Failed:", error.code, error.message);
            // Fallback to redirect if popup is blocked
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
                console.log("Popup blocked. Falling back to redirect...");
                try {
                    await signInWithRedirect(auth, provider);
                    return;
                } catch (redirectError: any) {
                    console.error("Redirect Fallback Failed:", redirectError);
                    setAuthError(redirectError.message || "Login failed. Please try again.");
                    setIsLoggingIn(false);
                }
            } else {
                setAuthError(error.message || "Could not sign in with Google.");
                setIsLoggingIn(false);
            }
        }
    };

    const handleGoogleRedirect = () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        signInWithRedirect(auth, provider);
    };

    const handleDemo = async (who: 'Jane' | 'John') => {
        onSetupComplete(`${who} Doe 1234`, true, `${who.toLowerCase()}doe @testemail.com`);
    };

    const completedCategoriesCount = categories.filter(cat => isCategoryComplete(cat.name)).length;

    return (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4 z-[100]">
            <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-6 sm:p-10 text-center relative border border-white/20 overflow-hidden min-h-[720px] flex flex-col justify-center animate-in zoom-in-95 duration-500">
                {name.trim() !== '' && ['spice_intro', 'onboarding', 'tour'].includes(step) && (
                    <button
                        onClick={() => onSetupComplete(name, false, email, currentBookmarks, undefined, undefined, undefined, selectedSpice || undefined)}
                        className="absolute top-6 right-6 z-50 px-4 py-2 bg-gray-100/80 backdrop-blur-sm rounded-full text-xs font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-all shadow-sm border border-gray-200"
                        aria-label="Skip to Dashboard"
                    >
                        Skip to Dashboard ⏭️
                    </button>
                )}

                {step === 'loading' && (
                    <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
                        <img src="/Logo-V2.svg" alt="Loading" className="w-20 opacity-50" />
                        <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">Checking Access...</p>
                    </div>
                )}

                {step === 'age' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="text-center mb-10">
                            <img src="/Logo-V2.svg" alt="Couples Currency" className="w-[280px] mx-auto mb-8 drop-shadow-2xl" />
                            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-gray-800 mb-2">The Couple's Currency</h1>
                            <p className="text-lg font-serif italic text-gray-500">Investing in Us.</p>
                        </div>
                        <button onClick={() => setStep('auth')} className="w-full py-6 text-xl font-bold bg-blue-600 text-white rounded-[2rem] hover:bg-blue-700 transition shadow-xl">I am 18+</button>
                    </div>
                )}

                {step === 'auth' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="text-5xl">🔐</div>
                        <h1 className="text-3xl font-serif font-bold text-gray-800">Choose Access</h1>

                        {authError && (
                            <div className="space-y-2">
                                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">
                                    {authError}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoggingIn || isVerifyingRedirect}
                            className={`w-full py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-[1.5rem] flex items-center justify-center gap-3 hover:bg-gray-50 transition shadow-sm ${(isLoggingIn || isVerifyingRedirect) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoggingIn ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-gray-500">Connecting...</span>
                                </>
                            ) : isVerifyingRedirect ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-gray-500">Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                                    Sign in with Google
                                </>
                            )}
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="h-px bg-gray-200 flex-grow"></div>
                            <span className="text-xs text-gray-400 font-bold uppercase">Or use email</span>
                            <div className="h-px bg-gray-200 flex-grow"></div>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (!email.includes('@') || password.length < 6) {
                                setAuthError("Valid email and password (min 6 chars) required.");
                                return;
                            }
                            setIsLoggingIn(true);
                            setAuthError(null);

                            // Try to login first, if user not found, try to create account. 
                            // This is a simple combined login/register button for easy testing.
                            import('firebase/auth').then(({ signInWithEmailAndPassword, createUserWithEmailAndPassword }) => {
                                signInWithEmailAndPassword(auth, email, password)
                                    .then((result) => {
                                        if (result.user.displayName) setName(result.user.displayName.split(' ')[0]);
                                        setStep('name');
                                    })
                                    .catch((error) => {
                                        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                                            createUserWithEmailAndPassword(auth, email, password)
                                                .then(() => {
                                                    setStep('name');
                                                })
                                                .catch(err => {
                                                    setAuthError(err.message);
                                                    setIsLoggingIn(false);
                                                });
                                        } else {
                                            setAuthError(error.message);
                                            setIsLoggingIn(false);
                                        }
                                    });
                            });
                        }} className="space-y-3">
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Email address"
                                className="w-full px-6 py-4 bg-gray-50 rounded-[1.5rem] text-center text-lg font-medium outline-none border border-transparent focus:border-blue-200"
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Password (6+ chars)"
                                className="w-full px-6 py-4 bg-gray-50 rounded-[1.5rem] text-center text-lg font-medium outline-none border border-transparent focus:border-blue-200"
                            />
                            <button
                                type="submit"
                                disabled={isLoggingIn || !email.includes('@') || password.length < 6}
                                className="w-full py-5 text-xl font-bold bg-gray-800 text-white rounded-[1.5rem] disabled:opacity-50"
                            >
                                {isLoggingIn ? "Authenticating..." : "Log In or Sign Up"}
                            </button>
                        </form>
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
                            <h2 className="text-xl font-serif font-bold text-gray-800 mb-1">Set Your Comfort Zone</h2>
                            <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                                💡 <span className="text-blue-600 font-bold uppercase">How it works:</span> Choose the maximum level of "spice" you want visible in the Intimacy Directory by default. You can change this later in settings to explore further.
                            </p>
                        </div>

                        <div className="flex-grow grid grid-cols-1 gap-3 overflow-y-auto pr-1 scrollbar-hide py-2">
                            {categories.map((cat, idx) => {
                                const isSelected = selectedSpice === cat.name;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => { setSelectedSpice(cat.name); setStep('tour'); }}
                                        className={`group relative flex items-center gap-4 p-4 rounded-3xl border text-left transition-all active:scale-95 ${isSelected ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500 shadow-none' : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'} `}
                                    >
                                        <div className={`w-14 h-14 ${cat.color} rounded-2xl shadow-inner flex items-center justify-center text-3xl flex-shrink-0 relative`}>
                                            {cat.icon}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-black text-xs uppercase tracking-tight text-gray-800">{cat.name}</p>
                                            <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{cat.desc}</p>
                                        </div>
                                        <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold pr-2">Select →</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* REMOVED ONBOARDING BATCH STEP */}

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
                                    <div key={i} className={`h - 1.5 rounded - full transition-all duration - 300 ${i === tourStep ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-200'} `} />
                                ))}
                            </div>

                            <button
                                onClick={async () => {
                                    if (tourStep < tourSteps.length - 1) {
                                        setTourStep(tourStep + 1);
                                    } else {
                                        // Generate Keys and Connect ID
                                        let pubKey: string | undefined;
                                        let privKey: string | undefined;
                                        const connId = Math.random().toString(36).substring(2, 8).toUpperCase();

                                        try {
                                            const keys = await generateRSAKeyPair();
                                            pubKey = await exportPublicKey(keys.publicKey);
                                            privKey = await exportPrivateKey(keys.privateKey);

                                            // Save Private Key LOCALLY immediately
                                            if (auth.currentUser) {
                                                localStorage.setItem(`couple_currency_private_key_${auth.currentUser.uid}`, privKey);
                                                console.log("Private key persisted to local storage.");
                                            }

                                            setGeneratedKeys({ public: pubKey, private: privKey });
                                            setGeneratedConnectId(connId);
                                            setStep('invite_partner');
                                        } catch (e) {
                                            console.error("Key gen failed in setup:", e);
                                            // Fallback: Proceed even if keys fail? Usually better to fail safely.
                                            onSetupComplete(name.trim() || 'User', false, email, currentBookmarks, undefined, undefined, connId, selectedSpice || undefined);
                                        }
                                    }
                                }}
                                className="w-full py-5 text-xl font-bold bg-gray-800 text-white rounded-[2rem] hover:bg-black transition shadow-xl"
                            >
                                {tourStep < tourSteps.length - 1 ? 'Next' : 'Enter the Currency'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'invite_partner' && (
                    <div className="animate-in slide-in-from-right-4 duration-500 flex flex-col h-full">
                        <div className="flex-grow flex flex-col items-center justify-center space-y-8">
                            <div className="relative">
                                <div className="w-32 h-32 bg-indigo-50 text-indigo-600 rounded-[2.5rem] shadow-2xl flex items-center justify-center text-6xl animate-pulse">
                                    🤝
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-indigo-100">
                                    <span className="text-xl">✨</span>
                                </div>
                            </div>

                            <div className="space-y-4 px-4 text-center">
                                <p className="text-[10px] font-black text-indigo-400 tracking-[0.3em] uppercase">Connect Now</p>
                                <h2 className="text-4xl font-serif font-bold text-gray-800 leading-tight">Invite Your Partner</h2>
                                <p className="text-gray-500 text-sm max-w-[280px] mx-auto leading-relaxed">
                                    Share this unique code to start your shared journey in the Currency.
                                </p>
                            </div>

                            <div className="w-full px-4">
                                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-8 group relative overflow-hidden transition-all hover:bg-gray-100 cursor-pointer active:scale-[0.98]">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">Your Connect ID</p>
                                    <div className="text-5xl font-mono font-black text-indigo-600 tracking-[0.2em] text-center select-all">
                                        {generatedConnectId}
                                    </div>
                                    <div className="absolute top-2 right-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs font-bold text-indigo-600">📋 TAP TO COPY</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mt-8">
                            <button
                                onClick={async () => {
                                    const shareText = `Hey! I just set up The Couples' Currency for us. Use my Connect ID to link our accounts: ${generatedConnectId}\n\nDownload: ${window.location.origin}`;
                                    if (navigator.share) {
                                        try {
                                            await navigator.share({
                                                title: "Join me in The Couples' Currency",
                                                text: shareText,
                                                url: window.location.origin
                                            });
                                        } catch (e) {
                                            console.log("Share failed or cancelled");
                                        }
                                    } else {
                                        await navigator.clipboard.writeText(shareText);
                                        alert("Invite link copied to clipboard! 💌");
                                    }
                                }}
                                className="w-full py-5 text-xl font-bold bg-indigo-600 text-white rounded-[2rem] hover:bg-indigo-700 transition shadow-xl flex items-center justify-center gap-3 active:scale-95"
                            >
                                <span>💌</span> Invite My Partner
                            </button>

                            <button
                                onClick={() => {
                                    onSetupComplete(
                                        name.trim() || 'User',
                                        false,
                                        email,
                                        currentBookmarks,
                                        generatedKeys.public,
                                        generatedKeys.private,
                                        generatedConnectId,
                                        selectedSpice || undefined
                                    );
                                }}
                                className="w-full py-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition tracking-widest uppercase hover:underline"
                            >
                                Continue to Dashboard
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default UserSetup;
