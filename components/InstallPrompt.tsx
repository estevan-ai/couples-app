
import React, { useState, useEffect } from 'react';

const InstallPrompt: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    useEffect(() => {
        // Platform Check
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt && !isIOS) return;

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                onClose();
            }
        } else if (isIOS) {
            setShowInstructions(true);
        }
    };

    if (!isOpen) return null;

    if (showInstructions) {
        return (
            <div className="fixed inset-0 bg-black/60 z-[2000] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 p-2 text-xl font-bold">✕</button>
                    <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3 border border-gray-100">
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                            <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-lg">1</span>
                            <span>Tap the <strong className="text-blue-600">Share</strong> button <span className="text-xl align-middle">⎋</span></span>
                        </div>
                        <div className="w-px h-4 bg-gray-200 ml-4 my-1"></div>
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                            <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-lg">2</span>
                            <span>Scroll down & tap <strong className="text-gray-800">Add to Home Screen</strong> <span className="text-xl align-middle">➕</span></span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-[2000] p-4 animate-in slide-in-from-top duration-500">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-indigo-100 p-4 flex items-center justify-between gap-4 max-w-lg mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md flex items-center justify-center text-xl text-white">
                        📱
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">Install App</h3>
                        <p className="text-xs text-gray-500">Get the full fullscreen experience.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleInstallClick}
                        className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                    >
                        Install
                    </button>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">✕</button>
                </div>
            </div>
        </div>
    );
};

export const InstallButton: React.FC<{ className?: string }> = ({ className }) => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(isStandaloneMode);
    }, []);

    if (isStandalone) return null;

    return (
        <>
            <button onClick={() => setShowPrompt(true)} className={className}>
                <span className="text-xl">📲</span>
                Install App
            </button>
            <InstallPrompt isOpen={showPrompt} onClose={() => setShowPrompt(false)} />
        </>
    );
};

export default InstallPrompt;
