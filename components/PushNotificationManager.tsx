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

            {status && (
                <div className="bg-white/50 p-3 rounded-lg text-xs border border-purple-100 mb-2 break-all">
                    <strong>Status:</strong> {status}
                </div>
            )}

        </div>
    );
};
