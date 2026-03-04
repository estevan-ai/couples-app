import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CLIFF_NOTE_SUMMARIZER_PROMPT } from './prompts';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const db = admin.firestore();

// Helper to fetch the raw text from a session
async function getRawThreadContent(threadId: string, partnerId: string): Promise<string> {
    const threadEntries = await db
        .collection('components') // Assume root level user stuff, depending on the DB schema
        .doc(partnerId)
        .collection('journalEntries')
        .where('thread_id', '==', threadId)
        .orderBy('timestamp', 'asc')
        .get();

    let fullText = '';
    threadEntries.forEach((doc) => {
        fullText += `[${new Date(doc.data().timestamp).toISOString()}] ${doc.data().rawInput}\n`;
    });
    return fullText;
}

export const processJournalCoolDown = functions.pubsub.schedule('every 30 minutes').onRun(async (context) => {
    // 180 minutes = 3 hours = 10800000 ms
    const cooldownMs = 180 * 60 * 1000;
    const now = Date.now();
    const threshold = now - cooldownMs;

    // Find all active sessions where the last_activity is older than the threshold
    const activeSessions = await db.collectionGroup('sessionSummaries') // Using collection group if stored deeply
        .where('status', '==', 'active')
        .where('last_activity', '<', threshold)
        .get();

    if (activeSessions.empty) {
        console.log('No active sessions cooled down yet.');
        return null;
    }

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const batch = db.batch();

    for (const sessionDoc of activeSessions.docs) {
        const sessionData = sessionDoc.data();
        const threadId = sessionData.thread_id;
        const partnerId = sessionData.partner_id;

        try {
            const rawThreadText = await getRawThreadContent(threadId, partnerId);
            if (!rawThreadText) {
                // Empty session? Just close it.
                batch.update(sessionDoc.ref, { status: 'summarized' });
                continue;
            }

            // Ask Gemini for a summary
            const prompt = `${CLIFF_NOTE_SUMMARIZER_PROMPT}\n\nThe raw venting session is below:\n${rawThreadText}`;
            const result = await model.generateContent(prompt);
            const textResponse = result.response.text();
            const parsedSummary = JSON.parse(textResponse);

            // Update the summary document
            batch.update(sessionDoc.ref, {
                status: 'summarized',
                cliff_note_body: parsedSummary.cliff_note_body,
                emotional_markers: parsedSummary.emotional_markers || [],
            });

            console.log(`Summarized thread ${threadId} for partner ${partnerId}`);
        } catch (error) {
            console.error(`Failed to summarize thread ${threadId}`, error);
        }
    }

    await batch.commit();
    return null;
});
