import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBOf3F6jeMwkHqzcNSXANhbxLVrhRsf1pw",
    authDomain: "thecouplescurrency.firebaseapp.com",
    projectId: "thecouplescurrency",
    storageBucket: "thecouplescurrency.firebasestorage.app",
    messagingSenderId: "292918506746",
    appId: "1:292918506746:web:536bbe91c20a57ebbc8543",
    measurementId: "G-15M868RCFZ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// Modern Firestore Initialization with Cache
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

export const storage = getStorage(app);

// Messaging (FCM)
import { getMessaging, isSupported } from "firebase/messaging";
export const messaging = async () => (await isSupported()) ? getMessaging(app) : null;

