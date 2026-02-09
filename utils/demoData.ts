import { Bounty, ChatterNote } from '../types';

export const demoBounties: Omit<Bounty, 'id'>[] = [
    {
        postedBy: 'Jane Doe 1234',
        rewardTerm: { id: 7, name: "Massages", category: "Sweet & Safe", definition: "Can be practical or intimate.", tags: [] },
        task: "Fold all the laundry",
        status: 'available',
        deadline: 'Tonight',
        claimedBy: null
    },
    {
        postedBy: 'John Doe 1234',
        rewardTerm: { id: 5, name: "Kissing", category: "Sweet & Safe", definition: "Deep passionate kissing.", tags: [] },
        task: "Clean the garage",
        status: 'claimed',
        deadline: 'Weekend',
        claimedBy: 'Jane Doe 1234'
    },
    {
        postedBy: 'Jane Doe 1234',
        rewardTerm: { id: 100, name: "Missionary", category: "Sexy & Physical", definition: "Face to face intimacy.", tags: [] },
        task: "Plan a date night",
        status: 'done',
        deadline: 'Friday',
        claimedBy: 'John Doe 1234'
    }
];

export const demoChatter: ChatterNote[] = [
    {
        id: 'note-1',
        contextId: 'general-flirt',
        text: "Hey handsome, thinking about you 😉",
        author: "Jane Doe 1234",
        timestamp: Date.now() - 10000000
    },
    {
        id: 'note-2',
        contextId: 'general-flirt',
        text: "Can't wait to see you tonight.",
        author: "John Doe 1234",
        timestamp: Date.now() - 9000000
    },
    {
        id: 'note-3',
        contextId: 'term-5', // Kissing
        text: "I really miss this...",
        author: "Jane Doe 1234",
        timestamp: Date.now() - 8000000
    },
    {
        id: 'note-4',
        contextId: 'term-5',
        text: "Me too. Let's fix that.",
        author: "John Doe 1234",
        timestamp: Date.now() - 7500000
    }
];

export const demoUser = {
    uid: 'demo-user-id',
    name: 'John Doe 1234',
    email: 'john@demo.com',
    photoURL: null,
    isVerifiedAdult: true,
    connectId: 'DEMO12',
    partnerId: 'demo-partner-id',
    partnerName: 'Jane Doe 1234',
    createdAt: Date.now()
};

export const demoPartner = {
    uid: 'demo-partner-id',
    name: 'Jane Doe 1234',
    email: 'jane@demo.com',
    photoURL: null,
    isVerifiedAdult: true,
    connectId: 'DEMO34',
    partnerId: 'demo-user-id',
    partnerName: 'John Doe 1234',
    createdAt: Date.now()
};
