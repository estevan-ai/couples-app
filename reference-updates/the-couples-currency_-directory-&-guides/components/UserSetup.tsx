
import React, { useState } from 'react';
import { termsData } from '../constants';
import { Bookmark } from '../types';

interface UserSetupProps {
    onSetupComplete: (name: string, isDemo?: boolean, email?: string, initialBookmarks?: Record<number, Bookmark>) => void;
}

const UserSetup: React.FC<UserSetupProps> = ({ onSetupComplete }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<'age' | 'auth' | 'name' | 'onboarding'>('age');
    const [quizIndex, setQuizIndex] = useState(0);
    const [quizSelections, setQuizSelections] = useState<Record<number, Bookmark>>({});

    // Diverse set of terms for initial discovery
    const quizTerms = [1, 5, 25, 30, 158, 287]; 

    const handleDemo = (who: 'Jane' | 'John') => {
        onSetupComplete(`${who} Doe 1234`, true, `${who.toLowerCase()}doe@testemail.com`);
    };

    const handleQuizInteraction = (type: Bookmark) => {
        const termId = quizTerms[quizIndex];
        const newSelections = { ...quizSelections, [termId]: type };
        setQuizSelections(newSelections);

        if (quizIndex < quizTerms.length - 1) {
            setQuizIndex(quizIndex + 1);
        } else {
            onSetupComplete(name.trim() || 'User', false, email, newSelections);
        }
    };

    const currentQuizTerm = termsData.find(t => t.id === quizTerms[quizIndex]) || termsData[0];

    return (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4 z-[100]">
            <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-8 sm:p-12 text-center relative border border-white/20 overflow-hidden min-h-[600px] flex flex-col justify-center animate-in zoom-in-95 duration-500">
                
                {/* 1. Age Verification */}
                {step === 'age' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="text-7xl">🥂</div>
                        <h1 className="text-4xl font-serif font-bold text-gray-800">The Couples Currency</h1>
                        <p className="text-gray-500 leading-relaxed">
                            A private environment for couples to explore intimacy and connection. You must be 18 or older to enter.
                        </p>
                        <div className="flex flex-col gap-4">
                            <button onClick={() => setStep('auth')} className="w-full py-6 text-xl font-bold bg-blue-600 text-white rounded-[2rem] hover:bg-blue-700 transition shadow-xl shadow-blue-200">I am 18+</button>
                            <div className="pt-4 flex flex-col gap-2">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Guest Experience</p>
                                <div className="flex gap-2">
                                    <button onClick={() => handleDemo('Jane')} className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100 border border-gray-100 transition">Jane Doe (Demo)</button>
                                    <button onClick={() => handleDemo('John')} className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100 border border-gray-100 transition">John Doe (Demo)</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Authentication Choice */}
                {step === 'auth' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="text-5xl">🔐</div>
                        <h1 className="text-3xl font-serif font-bold text-gray-800">Choose Access</h1>
                        <p className="text-gray-500">Sign in to sync discovery lists with your partner across devices.</p>
                        <div className="space-y-4">
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                placeholder="email@example.com"
                                className="w-full px-6 py-4 bg-gray-50 rounded-[1.5rem] border-none outline-none focus:ring-4 focus:ring-blue-100 text-center text-lg font-medium"
                            />
                            <button 
                                onClick={() => setStep('name')} 
                                disabled={!email.includes('@')} 
                                className="w-full py-5 text-xl font-bold bg-gray-800 text-white rounded-[1.5rem] hover:bg-gray-900 transition disabled:opacity-50"
                            >
                                Continue with Email
                            </button>
                            <button onClick={() => handleDemo('Jane')} className="w-full py-2 text-blue-500 font-bold text-sm hover:underline transition">Skip for now (Guest Mode)</button>
                        </div>
                    </div>
                )}

                {/* 3. Name Input */}
                {step === 'name' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="text-5xl">👤</div>
                        <h1 className="text-3xl font-serif font-bold text-gray-800">What's your name?</h1>
                        <p className="text-gray-500 italic">This is how your partner will see you in the app.</p>
                        <form onSubmit={(e) => { e.preventDefault(); if(name.trim()) setStep('onboarding'); }} className="space-y-6">
                            <input 
                                autoFocus
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder="e.g. Alex"
                                className="w-full px-6 py-6 text-center text-3xl font-serif bg-gray-50 rounded-[2rem] border-none outline-none focus:ring-4 focus:ring-blue-100 transition"
                                required
                            />
                            <button type="submit" className="w-full py-6 text-xl font-bold bg-blue-600 text-white rounded-[2rem] hover:bg-blue-700 transition shadow-xl">Start Discovery Quiz</button>
                        </form>
                    </div>
                )}

                {/* 4. Onboarding Discovery Quiz */}
                {step === 'onboarding' && (
                    <div className="animate-in zoom-in-95 duration-500 flex flex-col h-full">
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 h-2 rounded-full mb-8 relative">
                            <div 
                                className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out" 
                                style={{ width: `${((quizIndex + 1) / quizTerms.length) * 100}%` }} 
                            />
                            <span className="absolute -top-6 right-0 text-[10px] font-black text-gray-300 uppercase tracking-widest">Step {quizIndex + 1} of {quizTerms.length}</span>
                        </div>

                        <h2 className="text-2xl font-serif font-bold text-gray-800 mb-2">Discovery Quiz</h2>
                        <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] mb-8">Personalizing your profile</p>
                        
                        {/* Term Card */}
                        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-blue-50/50 rounded-[3rem] border border-blue-100 shadow-inner mb-8 transition-all duration-300 transform">
                            <div className="text-6xl mb-6 animate-bounce">✨</div>
                            <h3 className="text-3xl font-serif font-bold text-gray-800 mb-4">{currentQuizTerm.name}</h3>
                            <div className="bg-white/80 backdrop-blur px-4 py-3 rounded-2xl border border-blue-100 max-w-[280px]">
                                <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                    <span className="font-black uppercase text-[9px] block mb-1 opacity-50">TL;DR</span>
                                    {currentQuizTerm.definition.split('.')[0]}.
                                </p>
                            </div>
                        </div>

                        {/* Interaction Buttons */}
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button 
                                onClick={() => handleQuizInteraction('like')} 
                                className="group relative py-6 bg-yellow-400 text-white rounded-[2rem] font-bold text-lg shadow-lg shadow-yellow-100 hover:bg-yellow-500 transition-all active:scale-95"
                            >
                                <span className="mr-2">🤔</span> Like
                                <span className="absolute inset-0 bg-white/20 rounded-[2rem] scale-0 group-active:scale-100 transition-transform duration-300"></span>
                            </button>
                            <button 
                                onClick={() => handleQuizInteraction('love')} 
                                className="group relative py-6 bg-red-500 text-white rounded-[2rem] font-bold text-lg shadow-lg shadow-red-100 hover:bg-red-600 transition-all active:scale-95"
                            >
                                <span className="mr-2">❤️</span> Love
                                <span className="absolute inset-0 bg-white/20 rounded-[2rem] scale-0 group-active:scale-100 transition-transform duration-300"></span>
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => onSetupComplete(name.trim(), false, email, quizSelections)} 
                            className="mt-6 text-gray-400 font-bold hover:text-gray-600 text-xs tracking-widest uppercase transition"
                        >
                            Skip Quiz & Go to Home
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserSetup;
