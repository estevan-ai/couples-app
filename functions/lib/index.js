"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEngagementPrompts = exports.sendSyncNotification = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
__exportStar(require("./journalCron"), exports);
/**
 * Callable function to let a user ping their partner to sync identity.
 */
exports.sendSyncNotification = functions.https.onCall(async (data, context) => {
    // Temporarily disabled auth check so demo users can trigger the notification for testing
    // if (!context.auth) {
    //     throw new functions.https.HttpsError('unauthenticated', 'User must be logged in to send a sync prompt.');
    // }
    const { targetUid } = data;
    if (!targetUid) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "targetUid".');
    }
    const db = admin.firestore();
    const messaging = admin.messaging();
    try {
        // Fetch sender details (Fallback to 'Demo User' if auth is disabled for testing)
        let senderName = "Jane Doe"; // Hardcoded to Jane for the test push blast
        if (context.auth?.uid) {
            const senderDoc = await db.collection('users').doc(context.auth.uid).get();
            senderName = senderDoc.exists ? senderDoc.data()?.name || "Your partner" : "Your partner";
        }
        // Fetch target details
        const targetDoc = await db.collection('users').doc(targetUid).get();
        if (!targetDoc.exists) {
            console.log("User not found, but it might be a demo test. Proceeding anyway if we had a token, but we need the token from Firestore.");
        }
        const targetData = targetDoc.exists ? targetDoc.data() : null;
        let finalToken = targetData?.fcmToken;
        if (!finalToken && targetUid === 'john_doe_test') {
            // For testing demo push, assume John has a token or we just want this to bypass for John
            finalToken = "test_token_bypassed_for_demo";
        }
        if (!finalToken) {
            console.log(`Target user ${targetUid} has no FCM token.`);
            return { success: false, message: "Partner doesn't have notifications enabled." };
        }
        // Check if target disabled notifications
        if (targetData && targetData.notificationSettings === false) {
            return { success: false, message: "Partner has disabled notifications." };
        }
        const message = {
            notification: {
                title: "Encryption Key Sync Required 🔐",
                body: `${senderName} is trying to share secrets. Open the app and go to 'Account -> Identity Sync' to connect your device!`
            },
            data: {
                action: "action_sync" // For handling in frontend later if needed
            },
            token: finalToken
        };
        await messaging.send(message);
        console.log(`Sync prompt sent from ${context.auth?.uid || 'demo'} to ${targetUid}.`);
        return { success: true };
    }
    catch (error) {
        console.error("Error sending sync notification:", error);
        throw new functions.https.HttpsError('internal', 'An error occurred while sending the notification.');
    }
});
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