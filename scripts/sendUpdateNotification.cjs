const admin = require('firebase-admin');

// Use Application Default Credentials instead of a hardcoded key file
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "thecouplescurrency" // Explicitly define project ID
});

const db = admin.firestore();
const messaging = admin.messaging();

async function sendUpdateNotification() {
    try {
        console.log("Fetching users...");
        const usersSnapshot = await db.collection('users').get();

        const tokens = [];

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            // Only target users with FCM tokens who haven't disabled notifications
            if (data.fcmToken && data.notificationSettings !== false) {
                if (data.name === 'Jane' || data.name === 'John') {
                    tokens.push(data.fcmToken);
                }
            }
        });

        console.log(`Found ${tokens.length} users with push notifications enabled.`);

        if (tokens.length === 0) {
            console.log("No tokens found. Exiting.");
            return;
        }

        const message = {
            notification: {
                title: "App Update Available! 🚀",
                body: "We've released critical fixes for encrypted photos and sign-ins! Please open the app or click your PWA install link to get the latest version."
            },
            tokens: tokens // Multicast message
        };

        console.log("Sending multicast message...");
        const response = await messaging.sendEachForMulticast(message);

        console.log(`Successfully sent ${response.successCount} messages.`);
        if (response.failureCount > 0) {
            console.log(`Failed to send ${response.failureCount} messages.`);
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Error for token ${tokens[idx]}:`, resp.error);
                }
            });
        }

    } catch (error) {
        console.error("Error sending update notification:", error);
    } finally {
        process.exit(0);
    }
}

sendUpdateNotification();
