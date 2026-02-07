import React, { useEffect, useState } from 'react';

export const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // Check for iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        // Check if standalone
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        if (ios && !isStandalone) {
            setIsIOS(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    if (!isVisible && !isIOS) return null;

    if (isIOS) {
        return (
            <div className="p-4 bg-gray-50 rounded-2xl mb-6 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-2">Install App on iOS</h3>
                <p className="text-sm text-gray-600 mb-2">Tap the <span className="font-bold">Share</span> button and select <span className="font-bold">Add to Home Screen</span>.</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-blue-50 rounded-2xl mb-6 border border-blue-100 flex items-center justify-between">
            <div>
                <h3 className="font-bold text-blue-900">Install App</h3>
                <p className="text-xs text-blue-700">Add to your home screen for quick access.</p>
            </div>
            <button
                onClick={handleInstall}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:scale-105 transition"
            >
                Install
            </button>
        </div>
    );
};
