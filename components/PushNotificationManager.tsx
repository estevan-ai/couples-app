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

    const handleEnable = async () => {
        setLoading(true);
        setStatus('');
        try {
            const permission = await Notification.requestPermission();
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
                        setStatus("Notifications Enabled!");
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
        <div className="p-4 bg-purple-50 rounded-2xl mb-6 border border-purple-100 flex items-center justify-between">
            <div>
                <h3 className="font-bold text-purple-900">Push Notifications</h3>
                <p className="text-xs text-purple-700">Get updates about new flirts and bounties.</p>
                {status && <p className="text-xs font-bold mt-1">{status}</p>}
            </div>
            <button
                onClick={handleEnable}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-sm hover:scale-105 transition disabled:opacity-50"
            >
                {loading ? '...' : 'Enable'}
            </button>
        </div>
    );
};
