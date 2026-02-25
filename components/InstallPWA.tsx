import React, { useEffect, useState } from 'react';

const THROTTLE_KEY = 'pwa_install_throttle';
const DISMISS_COOLDOWN = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_DISMISSALS = 3;

interface ThrottleData {
    lastDismissedAt: number;
    dismissCount: number;
    windowStart: number;
}

export const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isDismissedLocally, setIsDismissedLocally] = useState(false);

    const checkThrottling = (): boolean => {
        const raw = localStorage.getItem(THROTTLE_KEY);
        if (!raw) return true;

        try {
            const data: ThrottleData = JSON.parse(raw);
            const now = Date.now();

            // 1. Check cooldown (15 mins)
            if (now - data.lastDismissedAt < DISMISS_COOLDOWN) return false;

            // 2. Check daily limit (3 in 24h)
            if (now - data.windowStart < BLOCK_DURATION) {
                if (data.dismissCount >= MAX_DISMISSALS) return false;
            }

            return true;
        } catch (e) {
            return true;
        }
    };

    useEffect(() => {
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        const shouldShow = checkThrottling();

        if (ios && !isStandalone && shouldShow) {
            setIsIOS(true);
        }

        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (shouldShow) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleDismiss = () => {
        const now = Date.now();
        const raw = localStorage.getItem(THROTTLE_KEY);
        let data: ThrottleData;

        try {
            data = raw ? JSON.parse(raw) : { lastDismissedAt: 0, dismissCount: 0, windowStart: now };

            // Reset window if it's over 24h old
            if (now - data.windowStart > BLOCK_DURATION) {
                data.windowStart = now;
                data.dismissCount = 1;
            } else {
                data.dismissCount += 1;
            }

            data.lastDismissedAt = now;
            localStorage.setItem(THROTTLE_KEY, JSON.stringify(data));
        } catch (e) {
            localStorage.setItem(THROTTLE_KEY, JSON.stringify({ lastDismissedAt: now, dismissCount: 1, windowStart: now }));
        }

        setIsVisible(false);
        setIsIOS(false);
        setIsDismissedLocally(true);
    };

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    if (isDismissedLocally) return null;
    if (!isVisible && !isIOS) return null;

    if (isIOS) {
        return (
            <div className="relative p-5 bg-indigo-50/50 rounded-[2rem] mb-6 border border-indigo-100 animate-in slide-in-from-top duration-300">
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-indigo-300 hover:text-indigo-500 p-1"
                    aria-label="Dismiss"
                >
                    <span className="text-xs">✕</span>
                </button>
                <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-xl">📱</div>
                    <div>
                        <h3 className="font-bold text-indigo-900 text-sm">Install App on iOS</h3>
                        <p className="text-[10px] text-indigo-700 leading-tight">
                            Tap the <span className="font-bold">Share</span> button and select <span className="font-bold">Add to Home Screen</span>.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative p-5 bg-blue-50/50 rounded-[2rem] mb-6 border border-blue-100 animate-in slide-in-from-top duration-300 flex items-center justify-between">
            <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-blue-300 hover:text-blue-500 p-1"
                aria-label="Dismiss"
            >
                <span className="text-xs">✕</span>
            </button>
            <div className="flex gap-4 items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">✨</div>
                <div>
                    <h3 className="font-bold text-blue-900 text-sm">Install App</h3>
                    <p className="text-[10px] text-blue-700 leading-tight">Add to your home screen for quick access.</p>
                </div>
            </div>
            <button
                onClick={handleInstall}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition active:scale-95"
            >
                Install
            </button>
        </div>
    );
};
