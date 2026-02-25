"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEngagementPrompts = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
/**
 * Scheduled function that runs daily at 12:00 PM (noon) in the America/Los_Angeles timezone.
 * It queries users who have not been active in the last 48 hours and sends an engagement push notification.
 */
exports.sendEngagementPrompts = functions.pubsub.schedule('every day 12:00').timeZone('America/Los_Angeles').onRun(async (context) => {
    const db = admin.firestore();
    const messaging = admin.messaging();
    const now = Date.now();
    const INACTIVITY_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours
    const targetTimestamp = now - INACTIVITY_THRESHOLD_MS;
    try {
        console.log(`Querying users inactive since before ${new Date(targetTimestamp).toISOString()}`);
        // Query users whose lastActive timestamp is older than threshold
        const usersSnapshot = await db.collection('users')
            .where('lastActive', '<', targetTimestamp)
            .get();
        if (usersSnapshot.empty) {
            console.log('No inactive users found. Skipping.');
            return null;
        }
        const notificationPromises = [];
        const engagementMessages = [
            "We miss you! Send a quick flirt to your partner. 💌",
            "Has it been a while? Post a favor and spice things up! 🔥",
            "Your partner might be waiting for a message. Say hi! 👋",
            "How about exploring a new intimacy term today? 📖"
        ];
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            // Check if user has an FCM token and hasn't explicitly disabled notifications
            if (userData.fcmToken && userData.notificationSettings !== false) {
                // Pick a random engagement message
                const randomMessage = engagementMessages[Math.floor(Math.random() * engagementMessages.length)];
                const message = {
                    notification: {
                        title: "The Couple's Currency",
                        body: randomMessage
                    },
                    token: userData.fcmToken
                };
                console.log(`Sending engagement prompt to ${userData.name} (${doc.id})`);
                notificationPromises.push(messaging.send(message).catch((error) => {
                    console.error(`Error sending message to user ${doc.id}:`, error);
                }));
            }
        });
        await Promise.allSettled(notificationPromises);
        console.log(`Processed ${usersSnapshot.size} inactive users.`);
    }
    catch (error) {
        console.error('Error running sendEngagementPrompts:', error);
    }
    return null;
});
//# sourceMappingURL=index.js.map