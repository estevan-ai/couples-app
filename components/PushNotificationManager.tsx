import React, { useState } from 'react';
import { messaging, db } from '../firebase';
import { getToken } from 'firebase/messaging';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

interface PushManagerProps {
    currentUser: any;
}

export const PushNotificationManager: React.FC<PushManagerProps> = ({ currentUser }) => {
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [permissionState, setPermissionState] = useState(Notification.permission);

    React.useEffect(() => {
        if (Notification.permission === 'granted') {
            // Optional: silent token refresh if needed, for now just show state
            setStatus("Active");
        }
    }, []);

    const handleEnable = async () => {
        setLoading(true);
        setStatus('');
        try {
            const permission = await Notification.requestPermission();
            setPermissionState(permission);

            if (permission === 'granted') {
                const msg = await messaging();
                if (msg) {
                    // Get registration from service worker to ensure we use the PWA one
                    let token;
                    try {
                        // Try using the provided VAPID key from Firebase Console
                        token = await getToken(msg, { vapidKey: "BItbA2ofxPVFC-53dbO4ar0diwcmY0Z9YIm5jifwOudtVnVwfF0ehdcecJ6lSXsj3qtXi48qZU9RQsYNw90pT5I" });
                    } catch (e: any) {
                        console.error("Token error", e);
                        const errMsg = e instanceof Error ? e.message : String(e);
                        if (errMsg.includes('Missing VAPID key')) {
                            setStatus("Missing VAPID key. Add it in Firebase Console.");
                        } else {
                            setStatus("Error getting token. See console.");
                        }
                        setLoading(false);
                        return;
                    }

                    if (token) {
                        console.log("FCM Token Recieved:", token);
                        console.log("Saving to user:", currentUser?.uid);

                        if (!currentUser?.uid) {
                            throw new Error("Missing currentUser.uid!");
                        }

                        await setDoc(doc(db, 'users', currentUser.uid), {
                            fcmTokens: arrayUnion(token)
                        }, { merge: true });
                        setStatus("Active");
                    } else {
                        setStatus("Failed to get token.");
                    }
                } else {
                    setStatus("Messaging not supported.");
                }
            } else {
                setStatus("Permission denied.");
            }
        } catch (error: any) {
            console.error("Enable Error:", error);
            const msg = error instanceof Error ? error.message : String(error);
            setStatus("Error: " + msg);
        }
        setLoading(false);
    };

    return (
        <div className="p-4 bg-purple-50 rounded-2xl mb-6 border border-purple-100">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-purple-900">Push Notifications</h3>
                    <p className="text-xs text-purple-700">Get updates about new flirts and bounties.</p>
                </div>
                <button
                    onClick={handleEnable}
                    disabled={loading || permissionState === 'granted'}
                    className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition disabled:opacity-50 ${permissionState === 'granted' ? 'bg-green-100 text-green-700' : 'bg-purple-600 text-white hover:scale-105'}`}
                >
                    {loading ? '...' : permissionState === 'granted' ? 'Enabled' : 'Enable'}
                </button>
            </div>

            {permissionState === 'granted' && (
                <div className="mt-4 bg-white/50 p-4 rounded-xl border border-purple-100">
                    <h4 className="text-xs font-black text-purple-900 uppercase tracking-widest mb-3">Diagnostics & Testing</h4>

                    <NotificationTester />

                    <div className="flex gap-2 border-t border-purple-100 pt-3 mt-1">
                        <button
                            onClick={() => {
                                if ('setAppBadge' in navigator) {
                                    // @ts-ignore
                                    navigator.setAppBadge(3).catch(e => alert("Badge error: " + e));
                                    setTimeout(() => {
                                        // @ts-ignore
                                        navigator.setAppBadge(0);
                                    }, 5000);
                                    alert("Badge set to '3' for 5 seconds.");
                                } else {
                                    alert("Badges not supported.");
                                }
                            }}
                            className="flex-1 bg-white border border-red-200 text-red-600 font-bold py-2 rounded-lg text-xs hover:bg-red-50"
                        >
                            🔴 Test Badge (3)
                        </button>
                    </div>
                    <p className="text-[10px] text-purple-400 mt-2 text-center">
                        Note: If nothing appears, check your OS settings. Badge clears after 5s.
                    </p>
                </div>
            )}

            {status && (
                <div className="bg-white/50 p-3 rounded-lg text-xs border border-purple-100 mb-2 break-all">
                    <strong>Status:</strong> {status}
                </div>
            )}

        </div>
    );
};

const NotificationTester = () => {
    const [selected, setSelected] = useState<string[]>([]);
    const [lastSent, setLastSent] = useState<string>('');

    const tests = [
        { id: 'claim', label: '🏆 Favor Claimed', title: "Favor Claimed!", body: "Partner claimed: Breakfast in Bed" },
        { id: 'bank', label: '🏦 Favor Banked', title: "Favor Banked!", body: "Partner completed: Full Body Massage" },
        { id: 'redeem', label: '🎟️ Redemption', title: "Redemption Request!", body: "Partner wants to cash in: Date Night" },
        { id: 'flirt', label: '💌 New Flirt', title: "New Flirt from Partner", body: "Hey beautiful! Thinking of you..." },
        { id: 'thought', label: '💭 New Thought', title: "New Thought on \"Cuddling\"", body: "Partner sent a thought" },
        { id: 'react', label: '🔥 Reaction', title: "Partner reacted", body: "🔥 to your message" },
        { id: 'list', label: '📋 List Update', title: "Profile Update!", body: "Partner now Loves \"Holding Hands\"" },
        { id: 'bundle', label: '📚 Bundled Update', title: "Profile Update!", body: "Partner now Loves \"Holding Hands\" and 4 others" },
    ];

    const toggle = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const sendSelected = () => {
        let count = 0;
        selected.forEach(id => {
            const t = tests.find(test => test.id === id);
            if (t) {
                try {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(t.title, { body: t.body, icon: '/Logo-V2.svg' });
                    });
                    count++;
                } catch (e) {
                    console.error(e);
                    alert("Error sending: " + e);
                }
            }
        });
        setLastSent(`Sent ${count} notification(s)`);
        setTimeout(() => setLastSent(''), 3000);
    };

    return (
        <div>
            <div className="grid grid-cols-2 gap-2 mb-3">
                {tests.map(t => (
                    <button
                        key={t.id}
                        onClick={() => toggle(t.id)}
                        className={`py-2 rounded text-xs font-bold border transition ${selected.includes(t.id)
                            ? 'bg-purple-600 text-white border-purple-700 shadow-md transform scale-[1.02]'
                            : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            }`}
                    >
                        {selected.includes(t.id) ? '✓ ' : ''}{t.label}
                    </button>
                ))}
            </div>

            <button
                onClick={sendSelected}
                disabled={selected.length === 0}
                className="w-full py-3 rounded-lg text-sm font-black shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed bg-green-500 text-white hover:bg-green-600 active:scale-95"
            >
                {selected.length === 0 ? 'Select Notifications to Test' : `SEND ${selected.length} NOTIFICATION${selected.length !== 1 ? 'S' : ''} 🚀`}
            </button>
            {lastSent && <p className="text-center text-xs text-green-600 font-bold mt-2 animate-pulse">{lastSent}</p>}
        </div>
    );
}
