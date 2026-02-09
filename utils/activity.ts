import { ChatterNote, User, Flirt } from '../types';

export interface ActivityItem extends ChatterNote {
    contextName: string;
    authorUid: string;
    type: 'note' | 'reaction';
    firestoreId?: string;
    status?: 'sent' | 'delivered' | 'read';
}

export const generateActivityFeed = (
    chatter: Record<string, ChatterNote[]>,
    currentUser: User,
    partner: User | null,
    flirts?: Flirt[],
    threads?: Record<string, { subject: string }>
): ActivityItem[] => {
    const activity: ActivityItem[] = [];
    const now = Date.now();
    const EXPIRE_MS = 48 * 60 * 60 * 1000; // 48 hours

    Object.keys(chatter).forEach(contextId => {
        const notes = chatter[contextId];
        notes.forEach(note => {
            if (now - note.timestamp > EXPIRE_MS) return;

            // Construct context name for generic items
            let contextName = 'Unknown';
            if (contextId === 'general-flirt') {
                contextName = 'Fast Flirt';
            } else if (contextId.startsWith('flirt-')) {
                const id = contextId.replace('flirt-', '');
                const foundFlirt = flirts?.find(f => f.id === id);
                contextName = foundFlirt ? `Flirt: ${foundFlirt.text.substring(0, 15)}...` : "Flirt";
            } else if (contextId.startsWith('thread-')) {
                const thread = threads?.[contextId];
                contextName = thread ? `Thread: ${thread.subject}` : "Thread";
            } else if (contextId.includes('term-')) {
                contextName = 'Directory Update';
            } else if (contextId.includes('bounty-')) {
                contextName = 'Favor Update';
            }

            activity.push({
                ...note,
                contextId,
                contextName,
                authorUid: note.author === currentUser.name ? (currentUser.uid || '') : (partner?.uid || ''),
                type: 'note'
            });

            // Add Reactions as separate activity items
            if (note.reactions && Array.isArray(note.reactions)) {
                note.reactions.forEach(reaction => {
                    const reactionTime = reaction.timestamp || (note.timestamp + 1000);

                    if (now - reactionTime > EXPIRE_MS) return;

                    activity.push({
                        id: `reaction-${note.id}-${reaction.emoji}-${reaction.author}`,
                        firestoreId: note.firestoreId,
                        timestamp: reactionTime,
                        author: reaction.author,
                        text: `Reacted ${reaction.emoji} to: "${note.text.substring(0, 20)}..."`,
                        contextId,
                        contextName,
                        type: 'reaction',
                        status: 'read', // Reactions default to read
                        authorUid: reaction.author === currentUser.name ? (currentUser.uid || '') : (partner?.uid || '')
                    } as ActivityItem);
                });
            }
        });
    });

    return activity.sort((a, b) => b.timestamp - a.timestamp);
};
