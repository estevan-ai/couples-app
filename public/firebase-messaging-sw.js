importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBOf3F6jeMwkHqzcNSXANhbxLVrhRsf1pw",
    authDomain: "thecouplescurrency.firebaseapp.com",
    projectId: "thecouplescurrency",
    storageBucket: "thecouplescurrency.firebasestorage.app",
    messagingSenderId: "292918506746",
    appId: "1:292918506746:web:536bbe91c20a57ebbc8543",
    measurementId: "G-15M868RCFZ"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
