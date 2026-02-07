
import React, { useState, useEffect } from 'react';

const InstallPrompt: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);

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
        if (!deferredPrompt && !isIOS) return; // Should not happen if logic is sound

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 p-2 text-xl font-bold">✕</button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 shadow-lg flex items-center justify-center text-3xl text-white">
                        📱
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-gray-800 mb-2">Install App</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Add to your home screen for the best experience, including fullscreen mode and notifications.
                    </p>
                </div>

                {(isIOS || !deferredPrompt) ? (
                    <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3 border border-gray-100">
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                            <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-lg">1</span>
                            <span>
                                {isIOS ? (
                                    <>Tap the <strong className="text-blue-600">Share</strong> button <span className="text-xl align-middle">⎋</span></>
                                ) : (
                                    <>Tap the <strong className="text-gray-800">Menu</strong> (three dots) <span className="text-xl align-middle">⋮</span></>
                                )}
                            </span>
                        </div>
                        <div className="w-px h-4 bg-gray-200 ml-4 my-1"></div>
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                            <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-lg">2</span>
                            <span>
                                {isIOS ? (
                                    <>Scroll down & tap <strong className="text-gray-800">Add to Home Screen</strong> <span className="text-xl align-middle">➕</span></>
                                ) : (
                                    <>Select <strong className="text-gray-800">Add to Home Screen</strong> or <strong className="text-gray-800">Install App</strong></>
                                )}
                            </span>
                        </div>
                        {!isIOS && !deferredPrompt && (
                            <p className="text-xs text-center text-gray-400 mt-2">(Browser didn't trigger auto-install, so you'll need to do it manually)</p>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={handleInstallClick}
                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                    >
                        Install Now
                    </button>
                )}
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
