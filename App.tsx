import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import { InstallPWA } from './components/InstallPWA';
import InstallPrompt from './components/InstallPrompt';
import TermsDirectory from './components/TermsDirectory';
import ChemistryGuide from './components/ChemistryGuide';
import GivingReceivingGuide from './components/GivingReceivingGuide';
import GuidedSession from './components/GuidedSession';
import BountyBoard from './components/BountyBoard';
import Chatbot from './components/Chatbot';
import { Bounty, ChatterNote, Invite, SharingSettings, Bookmark, JournalEntry, Term, User } from './types';
import UserSetup from './components/UserSetup';

import { termsData } from './constants';
import Account from './components/Account';
import { auth, db, messaging } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, updateDoc, doc, setDoc, deleteDoc, getDocs, getDoc, arrayUnion } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import FlirtSection from './components/FlirtSection';
import ReflectionJournal from './components/ReflectionJournal';
import { generateKeyOld as generateKey, exportKeyOld as exportKey, importKeyOld as importKey, importPublicKey, wrapAESKey } from './utils/encryption';
import ReloadPrompt from './components/ReloadPrompt';
import { demoUser, demoPartner, demoBounties, demoChatter } from './utils/demoData';
import { useEncryption } from './hooks/useEncryption';

type Tab = 'dashboard' | 'directory' | 'chemistry' | 'giving' | 'session' | 'favors' | 'flirts' | 'account' | 'journal' | 'activity';

// Local User interface removed to use the one from types.ts

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingSearchTerm, setPendingSearchTerm] = useState<string | null>(null);

  const handleTagClickFromDashboard = (term: string) => {
    setPendingSearchTerm(term);
    setActiveTab('directory');
  };

  const handleNavigateContext = (contextId: string) => {
    if (contextId === 'privacy-settings') {
      setActiveTab('account');
      setAccountInitialTab('privacy');
      return;
    }

    if (contextId.startsWith('term-')) {
      const id = parseInt(contextId.split('-')[1]);
      setHighlightedTermId(Number(id));
      setActiveTab('directory');
      return;
    }

    // Handle Bounty IDs (Numeric)
    if (!isNaN(Number(contextId))) {
      setActiveTab('favors');
      setHighlightedBountyId(Number(contextId));
      return;
    }

    if (contextId.includes('bounty-')) {
      const id = contextId.replace('bounty-', '');
      setHighlightedBountyId(Number(id));
      setActiveTab('favors');
      return;
    }

    if (contextId.startsWith('thread-')) {
      setInitialFlirtTab('thoughts');
      setActiveTab('flirts');
      return;
    }

    if (contextId === 'general-flirt' || contextId.startsWith('flirt-')) {
      setInitialFlirtTab('flirts');
      setActiveTab('flirts');
      return;
    }
  };

  // App State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [customTerms, setCustomTerms] = useState<Term[]>([]);

  // Encryption Hook
  const {
    sharedKey,
    status: encryptionStatus,
    generateIdentity,
    createSharedFolder,
    publicKeyBase64,
    privateKey,
    backupIdentity,
    restoreIdentity,
    generateSyncCode,
    consumeSyncCode
  } = useEncryption(currentUser?.uid);

  // --- JOURNAL LOGIC ---
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [pendingReflection, setPendingReflection] = useState<string | null>(null);
  const [initialFlirtTab, setInitialFlirtTab] = useState<'flirts' | 'thoughts' | 'activity'>('flirts');
  const [accountInitialTab, setAccountInitialTab] = useState<'profile' | 'activity' | 'privacy'>('profile');

  // New Features State
  // Load Journal
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'users', currentUser.uid!, 'journal'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setJournalEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)));
    });
    return () => unsub();
  }, [currentUser]);

  const handleAddJournalEntry = async (entry: JournalEntry) => {
    if (!currentUser?.uid) return;
    await setDoc(doc(db, 'users', currentUser.uid, 'journal', entry.id), entry);
  };

  const handleReflect = (text: string) => {
    setPendingReflection(text);
    setActiveTab('journal');
  };

  // Load custom terms on mount
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'users', auth.currentUser.uid, 'custom_terms'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const terms = snapshot.docs.map(d => d.data() as Term);
      setCustomTerms(terms);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Global Data Store
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [myBountiesState, setMyBountiesState] = useState<Bounty[]>([]);
  const [partnerBountiesState, setPartnerBountiesState] = useState<Bounty[]>([]);
  const [myChatter, setMyChatter] = useState<ChatterNote[]>([]);
  const [partnerChatter, setPartnerChatter] = useState<ChatterNote[]>([]);
  const [chatter, setChatter] = useState<Record<string, ChatterNote[]>>({});
  const [invites, setInvites] = useState<Invite[]>([]);
  const [allBookmarks, setAllBookmarks] = useState<Record<string, Record<number, Bookmark>>>({});



  const [highlightedTermId, setHighlightedTermId] = useState<number | null>(null);
  const [highlightedBountyId, setHighlightedBountyId] = useState<number | string | null>(null);



  const [sharingSettings, setSharingSettings] = useState<SharingSettings>({
    shareAll: true,
    shareWillWorkFor: true,
    shareLoves: true,
    shareLikes: true,
    shareFavors: true,
    shareUnsure: true,
    shareBoundaries: false
  });

  const [notificationSettings, setNotificationSettings] = useState<import('./types').NotificationSettings>({
    chatter: true,
    quickFlirts: true,
    allFlirts: true,
    messages: true,
    thoughts: true,
    newFavors: true
  });

  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Show install prompt 5s after load if applicable
    const timer = setTimeout(() => {
      // Check if standalone
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (!isStandalone) {
        setShowInstallPrompt(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("App Version: 1.3.0 - Encryption Migration");
  }, []);

  // Force Re-sync Demo Data on Mount/Update (Fix for HMR/Data Refresh)
  useEffect(() => {
    if (isDemoMode && currentUser) {
      console.log("Refresing Demo Data from source...");
      setMyChatter(demoChatter.filter(c => c.author === currentUser.name));
      setPartnerChatter(demoChatter.filter(c => c.author !== currentUser.name));
    }
  }, [isDemoMode, currentUser]); // Runs when demo mode active or user changes

  // Persist Sharing Settings
  useEffect(() => {
    if (!currentUser || !auth.currentUser || isDemoMode) return;

    // Prevent loop: If local matches server, do nothing
    if (currentUser.sharingSettings && JSON.stringify(currentUser.sharingSettings) === JSON.stringify(sharingSettings)) return;

    const timer = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser!.uid), { sharingSettings });
        console.log("Synced sharing settings");
      } catch (e) {
        console.error("Failed to sync sharing settings:", e);
      }
    }, 1000); // 1s debounce
    return () => clearTimeout(timer);
  }, [sharingSettings, currentUser, isDemoMode]);

  // Auth & Encryption Status Monitor
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, fetch their profile
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userRef, async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as User;
            setCurrentUser({ ...data, uid: user.uid });

            // Sync Sharing Settings from Server to Local State
            if (data.sharingSettings) {
              setSharingSettings(prev => {
                // Only update if different to avoid re-renders? 
                // Actually JSON.stringify check is good practice but let's just set it for now 
                // or check if deep equal.
                if (JSON.stringify(prev) !== JSON.stringify(data.sharingSettings)) {
                  return data.sharingSettings!;
                }
                return prev;
              });
            }

            // ENCRYPTION STATUS CHECK
            // If we are 'unlocked', we have sharedKey.
            // If 'locked', we are waiting for useEncryption to unlock.
            // If 'no-keys', UserSetup should have generated them, or we are in a weird state.

            // Check if we need to CREATE a shared folder (first time setup)
            // Case 1: I have Identity, Partner has Identity, but NO Shared Key exists yet.
            // Case 2: I am single, I create Shared Key for myself.

            // If I don't have an encryptedSharedKey in my profile, I might need to create one.
            if (!data.encryptedSharedKey && !data.sharedKeyBase64) {
              // Create it now
              console.log("No shared folder found. Creating one...");
              try {
                // We need to verify we have our Public Key loaded first? 
                // useEncryption handles loading it from Firestore.
                // But we are inside onSnapshot, so we have fresh data.

                // We can't call createSharedFolder here directly because it depends on `status` being ready in the hook.
                // We should do this in a separate useEffect that watches `currentUser` and `encryptionStatus`.
              } catch (e) {
                console.error("Auto-creation failed", e);
              }
            }
          } else {
            // User authenticated but doc not created yet (UserSetup handling this)
            setCurrentUser(null);
          }
          setLoading(false);
        });
        return () => unsubscribeUser();
      } else {
        setCurrentUser(null);
        setPartner(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-Create Shared Folder if missing
  useEffect(() => {
    if (!currentUser || !encryptionStatus) return;

    // Only proceed if we have Identity keys loaded/generated ('locked' or 'unlocked' but missing shared key)
    // If status is 'locked', it means we have Identity but couldn't unlock shared key (likely because it doesn't exist).
    // If status is 'no-keys', we can't do anything.

    const initFolder = async () => {
      if (encryptionStatus === 'locked' && !currentUser.encryptedSharedKey && !currentUser.sharedKeyBase64) {
        console.log("Initializing Shared Folder...");
        try {
          const wrappedKey = await createSharedFolder();
          // Save TO FIRESTORE
          await updateDoc(doc(db, 'users', currentUser.uid!), {
            encryptedSharedKey: wrappedKey
          });
          console.log("Shared Folder Created & Saved.");
        } catch (e) {
          console.error("Failed to create shared folder:", e);
        }
      }
    };

    initFolder();
  }, [currentUser, encryptionStatus]);


  // Notifications
  useEffect(() => {
    if (isDemoMode || !currentUser) return;

    const setupNotifications = async () => {
      try {
        const msg = await messaging();
        if (!msg) {
          console.log("Messaging not supported or failed to initialize.");
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // NOTE: VAPID Key is required for web push.
          // You can get it from Firebase Console -> Project Settings -> Cloud Messaging -> Web Configuration
          const VAPID_KEY = "YOUR_VAPID_KEY_HERE"; // TODO: Replace with actual key

          if (VAPID_KEY === "YOUR_VAPID_KEY_HERE") {
            console.warn("Push Notifications: VAPID Key missing. Update App.tsx with key from Firebase Console.");
          } else {
            const token = await getToken(msg, { vapidKey: VAPID_KEY });
            if (token) {
              // Save token to user profile
              await updateDoc(doc(db, 'users', currentUser.uid), { fcmToken: token });
            }
          }

          onMessage(msg, (payload) => {
            console.log("Foreground Message:", payload);
            // Create a simple browser notification if allowed and visible? 
            // Or just rely on OS notification if background.
            // In foreground, Firebase doesn't show OS notification by default.
            if (payload.notification) {
              new Notification(payload.notification.title || "New Message", {
                body: payload.notification.body,
                icon: '/logo.png'
              });
            }
          });
        }
      } catch (e) {
        console.error("Notification setup error:", e);
      }
    };

    setupNotifications();
  }, [currentUser, isDemoMode]);

  // Data Sync (Users + Partner)
  useEffect(() => {
    if (!currentUser || !auth.currentUser) return;

    const myUid = auth.currentUser.uid;
    const myName = currentUser.name;

    // 1. My Data Listeners
    const unsubMyBounties = onSnapshot(collection(db, 'users', myUid, 'bounties'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setMyBountiesState(data);
    });

    const unsubMyBookmarks = onSnapshot(collection(db, 'users', myUid, 'bookmarks'), (snap) => {
      const bmData: Record<number, Bookmark> = {};
      snap.docs.forEach(d => {
        const id = parseInt(d.id);
        if (!isNaN(id)) bmData[id] = d.data().type as Bookmark;
      });
      setAllBookmarks(prev => ({ ...prev, [myName]: bmData }));
    });

    // CHANGE: Set myChatter directly from snapshot (handles deletions/updates automatically)
    // Helper to normalize reactions
    const normalizeReactions = (data: any) => {
      if (Array.isArray(data.reactions)) return data.reactions;
      if (data.reactions && typeof data.reactions === 'object') {
        return Object.entries(data.reactions).map(([author, emoji]) => ({ author, emoji }));
      }
      return [];
    };

    const unsubMyChatter = onSnapshot(collection(db, 'users', myUid, 'chatter'), (snap) => {
      const notes = snap.docs.map(d => {
        const data = d.data();
        return { ...data, reactions: normalizeReactions(data), firestoreId: d.id } as ChatterNote;
      });
      setMyChatter(notes);
    });

    const unsubMyJournal = onSnapshot(query(collection(db, 'users', myUid, 'journal'), orderBy('timestamp', 'desc')), (snap) => {
      const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
      setJournalEntries(entries);
    });

    // 2. Partner Data Listeners
    let unsubPartnerBounties = () => { };
    let unsubPartnerBookmarks = () => { };
    let unsubPartnerChatter = () => { };

    if (currentUser.partnerId) {
      const q = query(collection(db, 'users'), where('connectId', '==', currentUser.partnerId));
      getDocs(q).then(snap => {
        if (!snap.empty) {
          const pUid = snap.docs[0].id;
          const pData = snap.docs[0].data() as User;
          const pName = pData.name;

          setPartner({ ...pData, uid: pUid });

          unsubPartnerBounties = onSnapshot(collection(db, 'users', pUid, 'bounties'), (s) => {
            const data = s.docs.map(d => ({ id: d.id, ...d.data() } as any));
            setPartnerBountiesState(data);
          });

          unsubPartnerBookmarks = onSnapshot(collection(db, 'users', pUid, 'bookmarks'), (s) => {
            const bm: Record<number, Bookmark> = {};
            s.docs.forEach(d => {
              const id = parseInt(d.id);
              if (!isNaN(id)) bm[id] = d.data().type as Bookmark;
            });
            setAllBookmarks(prev => ({ ...prev, [pName]: bm }));
          });

          unsubPartnerChatter = onSnapshot(collection(db, 'users', pUid, 'chatter'), (s) => {
            console.log("Partner Chatter Snapshot Size:", s.size);
            const notes = s.docs.map(d => {
              const data = d.data();
              return { ...data, reactions: normalizeReactions(data), firestoreId: d.id } as ChatterNote;
            });
            console.log("Parsed Partner Notes:", notes);
            setPartnerChatter(notes);
          });
        }
      });
    }

    return () => {
      unsubMyBounties();
      unsubMyBookmarks();
      unsubMyChatter();
      unsubMyJournal();
      unsubPartnerBounties();
      unsubPartnerBookmarks();
      unsubPartnerChatter();
    };
  }, [currentUser]);

  // Combine Chatter States
  useEffect(() => {
    const combined: Record<string, ChatterNote[]> = {};

    // Helper to merge notes
    const mergeNotes = (notes: ChatterNote[]) => {
      notes.forEach(note => {
        if (!combined[note.contextId]) combined[note.contextId] = [];
        // Deduplicate by ID just in case, though usually unnecessary if sources are distinct
        if (!combined[note.contextId].find(n => n.id === note.id)) {
          combined[note.contextId].push(note);
        }
      });
    };

    mergeNotes(myChatter);
    mergeNotes(partnerChatter);

    // Sort all
    Object.keys(combined).forEach(key => {
      combined[key].sort((a, b) => a.timestamp - b.timestamp);
    });

    setChatter(combined);
  }, [myChatter, partnerChatter]);

  // Combine Bounties States
  useEffect(() => {
    setBounties([...myBountiesState, ...partnerBountiesState]);
  }, [myBountiesState, partnerBountiesState]);

  const handleIndividualSetup = async (name: string, isDemo: boolean = false, email: string = '', initialBookmarks?: Record<number, Bookmark>) => {
    if (isDemo) {
      setIsDemoMode(true);
      // Determine who is who based on selection
      // If name includes "Jane", user is Jane, partner is John.
      // Default (or John) makes user John, partner Jane.
      const isJane = name.includes("Jane");
      const activeUser = isJane ? demoPartner : demoUser;
      const activePartner = isJane ? demoUser : demoPartner;

      setCurrentUser(activeUser);
      setPartner(activePartner);

      // Initialize Demo Data with mock IDs
      const initializedBounties = demoBounties.map((b, i) => ({ ...b, id: 1000 + i } as Bounty));

      // My Bounties: Posted by ME (activeUser)
      setMyBountiesState(initializedBounties.filter(b => b.postedBy === activeUser.name));
      // Partner Bounties: Posted by PARTNER
      setPartnerBountiesState(initializedBounties.filter(b => b.postedBy === activePartner.name));

      // Chatter
      setMyChatter(demoChatter.filter(c => c.author === activeUser.name));
      setPartnerChatter(demoChatter.filter(c => c.author === activePartner.name));


      // Bookmarks
      // If I am Jane, load Jane's bookmarks. If John, load John's.
      // Demo data usually has hardcoded bookmarks? 
      // Let's implement dynamic bookmarks for demo.
      // For now, let's say Jane loves "Massages" (id 7) and John loves "Kissing" (id 5).

      const janeBookmarks: Record<number, Bookmark> = { 7: 'love', 100: 'like' };
      const johnBookmarks: Record<number, Bookmark> = { 5: 'love', 7: 'like' };

      setAllBookmarks({
        [activeUser.name]: isJane ? janeBookmarks : johnBookmarks,
        [activePartner.name]: isJane ? johnBookmarks : janeBookmarks
      });

      setLoading(false);
      return;
    }

    if (!auth.currentUser) return;
    try {
      const myUid = auth.currentUser.uid;

      // 0. Create User Profile
      await setDoc(doc(db, 'users', myUid), {
        name,
        email,
        isVerifiedAdult: true,
        connectId: Math.random().toString(36).substring(2, 8).toUpperCase(),
        partnerId: null,
        createdAt: Date.now()
      });

      // 1. Bookmarks
      if (initialBookmarks) {
        const promises = Object.entries(initialBookmarks).map(([id, type]) => {
          const docRef = doc(db, 'users', myUid, 'bookmarks', id);
          return setDoc(docRef, { type });
        });
        await Promise.all(promises);
      }

      // No demo data injection for real users
    } catch (e: any) {
      console.error("Error saving initial setup:", e);
    }
  };

  const handleResetCategory = async (type: 'loves' | 'likes' | 'favors' | 'boundaries' | 'all_discovery' | 'history') => {
    if (!auth.currentUser || !currentUser) return;

    const mapping: Record<string, Bookmark> = {
      'loves': 'love',
      'likes': 'like',
      'favors': 'work',
      'boundaries': 'skip' // 'boundaries' in UI maps to 'skip' or 'unsure'? UI says 'boundaries' maps to 'skip' usually.
      // 'all_discovery' map? logic needed.
    };

    try {
      // If 'history', that's different (maybe chat history?)
      // If 'all_discovery', maybe reset all bookmarks?

      let bookmarksToDelete: number[] = [];
      const myBookmarks = allBookmarks[currentUser.name] || {};

      if (type === 'all_discovery') {
        bookmarksToDelete = Object.keys(myBookmarks).map(Number);
      } else if (mapping[type]) {
        const targetType = mapping[type];
        bookmarksToDelete = Object.entries(myBookmarks)
          .filter(([_, bType]) => bType === targetType)
          .map(([id, _]) => Number(id));
      } else if (type === 'boundaries') {
        // Special case if boundaries includes 'skip' AND 'unsure'? Defaults to skip usually.
        // Let's assume just 'skip' for now based on other code.
        bookmarksToDelete = Object.entries(myBookmarks)
          .filter(([_, bType]) => bType === 'skip')
          .map(([id, _]) => Number(id));
      }

      // Delete from Firestore and Local State
      const batchPromises = bookmarksToDelete.map(termId =>
        deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'bookmarks', termId.toString()))
      );
      await Promise.all(batchPromises);

      // Update Local
      const newBookmarks = { ...myBookmarks };
      bookmarksToDelete.forEach(id => delete newBookmarks[id]);
      setAllBookmarks(prev => ({ ...prev, [currentUser.name]: newBookmarks }));

    } catch (e) {
      console.error("Error resetting list:", e);
    }
  };

  const handleConnectPartner = async (partnerName: string, id: string) => {
    if (!auth.currentUser || !currentUser) return;

    try {
      // 1. Get Partner's Public Key
      const q = query(collection(db, 'users'), where('connectId', '==', id));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("Partner ID not found.");
        return;
      }

      const partnerDoc = querySnapshot.docs[0];
      const partnerData = partnerDoc.data() as User;

      // 2. Wrap Shared Key
      if (!sharedKey) {
        alert("Error: shared-key-missing. Reloading...");
        window.location.reload();
        return;
      }

      let encryptedSharedKeyForPartner: string | undefined;

      if (partnerData.publicKey) {
        console.log("Partner has Identity. Wrapping Shared Key...");
        const partnerPubKey = await importPublicKey(partnerData.publicKey);
        encryptedSharedKeyForPartner = await wrapAESKey(sharedKey, partnerPubKey);
      } else {
        console.warn("Partner has no Public Key. Migration/Legacy Mode?");
        // If we enforce Zero Knowledge, we must stop here.
        // But for smoother migration, we might temporarily allow legacy sharedKeyBase64 if user insists?
        // "Blind Drops" requires NO.
        alert("Partner needs to update their app and open it once to generate keys. Please ask them to update.");
        return;
      }

      // 3. Update MY profile with partner link
      // We do NOT save the wrapped key to the partner's profile directly (permission rules might block).
      // Actually, usually users can only write to their specific subcollections or their own doc.
      // We need a way to send this key to the partner.
      // 1. "Drop" it in a 'invites' collection?
      // 2. Update 'users/{partnerUid}' if rules allow? (Usually not allowed).
      // 3. Store it in MY profile as 'outgoing_keys/{partnerUid}'?

      // Simplest for now (if rules allow, which they surely do in this MVP phase): 
      // Update PARTNER'S doc. 
      // IF RULES FAIL: We need a 'invites' collection.
      // Let's assume we can update partner doc for now based on previous code doing similar things.

      // Wait, previous code did NOT update partner doc. It updated MY doc with partnerId.
      // And then partner scan found MY key and copied it.
      // That was "Server-Side Shared Key".

      // "Zero Knowledge" means Server CANNOT read it.
      // If I write `encryptedSharedKey` to Partner's doc, only Partner can read it (with private key). Server sees blob.
      // This is safe.

      await updateDoc(doc(db, 'users', partnerDoc.id), {
        encryptedSharedKey: encryptedSharedKeyForPartner,
        partnerId: currentUser.connectId, // Auto-link them back?
        partnerName: currentUser.name
      });

      // Update MY doc
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        partnerId: id,
        partnerName: partnerName
      });

      setActiveTab('directory');
      alert("Connected! Shared key securely sent to partner.");

    } catch (e) {
      console.error("Connection failed", e);
      alert("Connection failed. Check permissions or ID.");
    }
  };

  const handleCreateTerm = async (term: Term) => {
    if (!auth.currentUser) return;
    try {
      // Add to local state immediately
      setCustomTerms(prev => [...prev, term]);

      // Save to FireStore
      const termRef = doc(collection(db, 'users', auth.currentUser.uid, 'custom_terms'));
      await setDoc(termRef, term);

      // Auto-bookmark it as 'love'
      await handleBookmarkToggle(term.id, 'love');
    } catch (error) {
      console.error("Error creating term:", error);
    }
  };

  const addNote = async (contextId: string, text: string, photoPath?: string, photoIv?: string, subject?: string, extra?: { encryptedKey?: string, storagePath?: string, senderId?: string, expiresAt?: number, audioPath?: string, audioIv?: string }) => {
    if (!currentUser) return;

    if (isDemoMode) {
      const id = Date.now().toString();
      const newNote: any = {
        id,
        contextId,
        subject: subject || null,
        author: currentUser.name,
        text,
        timestamp: Date.now(),
        photoPath: photoPath || null,
        status: 'sent',
        reactions: [],
        expiresAt: extra?.expiresAt,
        audioPath: extra?.audioPath,
        audioIv: extra?.audioIv,
        storagePath: extra?.storagePath,
        senderId: extra?.senderId,
        encryptedKey: extra?.encryptedKey
      };
      setMyChatter(prev => [...prev, newNote]);
      return;
    }

    if (!auth.currentUser) return;
    try {
      const id = Date.now().toString();
      // ... rest of firestore logic
      // ...
      const newNote: any = {
        id,
        contextId,
        subject: subject || null,
        author: currentUser.name,
        text,
        timestamp: Date.now(),
        photoPath: photoPath || null,
        photoIv: photoIv || null,
        encryptedKey: extra?.encryptedKey || null,
        storagePath: extra?.storagePath || null,
        senderId: extra?.senderId || null,
        expiresAt: extra?.expiresAt || null,
        status: 'sent',
        audioPath: extra?.audioPath || null,
        audioIv: extra?.audioIv || null,
        reactions: {}
      };

      Object.keys(newNote).forEach(key => newNote[key] === undefined && delete newNote[key]);
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'chatter', id), newNote);
    } catch (e: any) {
      console.error("Error adding note:", e);
      throw e;
    }
  };

  const deleteNote = async (id: string) => {
    if (isDemoMode) {
      setMyChatter(prev => prev.filter(n => n.id !== id));
      return;
    }

    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, 'users', auth.currentUser.uid, 'chatter'), where('id', '==', id));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log("Deleted note:", id);
    } catch (e) {
      console.error("Error deleting note:", e);
    }
  };

  const editNote = async (id: string, newText: string) => {
    if (isDemoMode) {
      setMyChatter(prev => prev.map(n => n.id === id ? { ...n, text: newText } : n));
      return;
    }

    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, 'users', auth.currentUser.uid, 'chatter'), where('id', '==', id));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, { text: newText });
        console.log("Updated note:", id);
      }
    } catch (e) {
      console.error("Error editing note:", e);
    }
  };


  const handleBookmarkToggle = async (termId: number, type: Bookmark) => {
    if (!currentUser) return;

    if (isDemoMode) {
      setAllBookmarks(prev => {
        const currentBookmarks = prev[currentUser.name] || {};
        let newBookmarks = { ...currentBookmarks };

        if (newBookmarks[termId] === type) {
          // If already bookmarked with this type, remove it
          delete newBookmarks[termId];
        } else {
          // Otherwise, add/update it
          newBookmarks[termId] = type;
        }

        return {
          ...prev,
          [currentUser.name]: newBookmarks
        };
      });
      return;
    }

    if (!auth.currentUser) return;
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'bookmarks', termId.toString());
      const currentMark = allBookmarks[currentUser.name]?.[termId]; // Re-fetch or pass currentMark if needed
      if (currentMark === type) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { type });
      }
    } catch (e: any) {
      console.error("Error toggling bookmark:", e);
    }
  };

  const handleAddBounty = async (bounty: Omit<Bounty, 'id' | 'status' | 'postedBy' | 'claimedBy'>) => {
    if (!currentUser) return;

    if (isDemoMode) {
      const newBounty: Bounty = {
        ...bounty,
        id: Date.now(),
        postedBy: currentUser.name,
        status: 'available',
        claimedBy: null,
        deadline: bounty.deadline || 'Open'
      };
      setMyBountiesState(prev => [...prev, newBounty]);
      return;
    }

    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'bounties'), {
        ...bounty,
        postedBy: currentUser.name,
        status: 'available',
        claimedBy: null
      });
    } catch (e: any) {
      console.error("Error adding bounty:", e);
    }
  };



  const handleClaimBounty = async (id: number | string) => {
    if (!currentUser) return;

    if (isDemoMode) {
      const updater = (list: Bounty[]) => list.map(b => (b.id === id || b.id.toString() === id.toString()) ? { ...b, status: 'claimed' as const, claimedBy: currentUser.name } : b);
      setMyBountiesState(prev => updater(prev));
      setPartnerBountiesState(prev => updater(prev));
      // Optional: Add automated chatter message like "I claimed this!"
      return;
    }

    // Find the bounty owner to update the document.
    // If it's in 'myBountiesState', it's mine (self-claim?). If 'partnerBountiesState', it's partner's.
    // We update whoever posted it.
    const bounty = bounties.find(b => b.id === id || b.id.toString() === id.toString());
    if (!bounty) return;

    // Use partner.uid if postedBy partner, else my uid.
    // Logic: if bounty.postedBy === currentUser.name -> my uid. Else partner uid.
    // Simple check:
    const ownerUid = bounty.postedBy === currentUser.name ? auth.currentUser?.uid : partner?.uid;

    if (!ownerUid) return;

    try {
      // Find the DOC ID. We might need it.
      // If `id` in Bounty object is a number (legacy) or randomly generated, we need to find the Firestore Doc ID.
      // If we saved Firestore ID in the object (we usually don't in `bounties` type unless mapped), we query.
      // The `bounties` state in this app seems to map `data()`... wait, does it include `id` as doc ID?
      // Line 258 (original file, assumed): `const bounties = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))`?
      // If so, `id` IS the doc ID.
      // The interface `Bounty` has `id: number | string`.

      const bountyRef = doc(db, 'users', ownerUid, 'bounties', id.toString());
      await updateDoc(bountyRef, {
        status: 'claimed',
        claimedBy: currentUser.name
      });
    } catch (e) {
      console.error("Error claiming bounty:", e);
    }
  };

  const handleToggleStatus = async (id: number | string) => {
    if (!currentUser) return;

    if (isDemoMode) {
      const update = (list: Bounty[]) => list.map(b => {
        if (b.id !== id && b.id.toString() !== id.toString()) return b;
        const nextStatus: Bounty['status'] = b.status === 'available' ? 'claimed' : b.status === 'claimed' ? 'done' : 'available';
        return { ...b, status: nextStatus, claimedBy: nextStatus === 'available' ? null : (b.claimedBy || currentUser?.name) };
      });
      setMyBountiesState(prev => update(prev));
      setPartnerBountiesState(prev => update(prev));
      return;
    }

    const bounty = bounties.find(b => b.id === id || b.id.toString() === id.toString());
    if (!bounty) return;
    const ownerUid = bounty.postedBy === currentUser?.name ? auth.currentUser?.uid : partner?.uid;
    if (!ownerUid) return;

    const nextStatus = bounty.status === 'claimed' ? 'done' : 'claimed'; // Original logic was only claimed -> done

    try {
      const bountyRef = doc(db, 'users', ownerUid, 'bounties', id.toString());
      await updateDoc(bountyRef, { status: nextStatus });
    } catch (e) {
      console.error("Error toggling status:", e);
    }
  };

  const handleDeleteBounty = async (id: number | string) => {
    if (!currentUser) return;

    if (isDemoMode) {
      const filter = (list: Bounty[]) => list.filter(b => b.id !== id && b.id.toString() !== id.toString());
      setMyBountiesState(prev => filter(prev));
      setPartnerBountiesState(prev => filter(prev));
      return;
    }

    const bounty = bounties.find(b => b.id === id || b.id.toString() === id.toString());
    if (!bounty) return;
    const ownerUid = bounty.postedBy === currentUser?.name ? auth.currentUser?.uid : partner?.uid;
    if (!ownerUid) return;

    try {
      if (window.confirm("Are you sure you want to delete this favor?")) {
        await deleteDoc(doc(db, 'users', ownerUid, 'bounties', id.toString()));
      }
    } catch (e: any) {
      console.error("Error deleting bounty:", e);
    }
  };

  const handleUpdateBounty = async (id: number | string, updates: Partial<Bounty>) => {
    if (!currentUser) return;

    if (isDemoMode) {
      const update = (list: Bounty[]) => list.map(b => (b.id === id || b.id.toString() === id.toString()) ? { ...b, ...updates } : b);
      setMyBountiesState(prev => update(prev));
      setPartnerBountiesState(prev => update(prev));
      return;
    }

    const bounty = bounties.find(b => b.id === id || b.id.toString() === id.toString());
    if (!bounty) return;

    const targetUid = bounty.postedBy === currentUser.name ? auth.currentUser?.uid : partner?.uid;
    if (!targetUid) return;

    try {
      await updateDoc(doc(db, 'users', targetUid, 'bounties', id.toString()), updates);
    } catch (e: any) {
      console.error("Error updating bounty:", e);
    }
  };

  const handleArchiveBounty = async (id: number | string) => {
    // Both demo and real mode can use handleUpdateBounty logic if it handles the abstraction, 
    // but handleUpdateBounty is async.
    await handleUpdateBounty(id, { status: 'archived' as const });
  };

  const handleReset = async () => {
    await signOut(auth);
    window.location.reload();
  };

  const [highlights, setHighlights] = useState<any[]>([]);

  const handlePinInsight = async (text: string, source: string, context?: string) => {
    console.log("Pin insight:", text, source, context);
    setHighlights(prev => [...prev, { id: Date.now().toString(), text, source, context, timestamp: Date.now() }]);
  };

  const handleToggleReaction = async (noteId: string, authorUid: string, emoji: string) => {
    if (!currentUser) return;

    if (isDemoMode) {
      const updateReaction = (notes: ChatterNote[]) => notes.map(n => {
        if (n.id === noteId || n.firestoreId === noteId) {
          let currentReactions: any[] = Array.isArray(n.reactions) ? n.reactions : [];
          // Handle legacy object if present (unlikely in demo but good practice)
          if (!Array.isArray(n.reactions) && typeof n.reactions === 'object' && n.reactions !== null) {
            currentReactions = Object.entries(n.reactions).map(([a, e]) => ({ author: a, emoji: e, timestamp: Date.now() }));
          }

          const existingIdx = currentReactions.findIndex((r: any) => r.author === currentUser.name && r.emoji === emoji);
          if (existingIdx >= 0) {
            currentReactions.splice(existingIdx, 1); // remove
          } else {
            currentReactions.push({ author: currentUser.name, emoji, timestamp: Date.now() }); // add
          }
          return { ...n, reactions: currentReactions };
        }
        return n;
      });

      setMyChatter(prev => updateReaction(prev));
      setPartnerChatter(prev => updateReaction(prev));
      return;
    }

    if (!authorUid) return;

    try {
      const noteRef = doc(db, 'users', authorUid, 'chatter', noteId);
      const noteSnap = await getDoc(noteRef);

      if (noteSnap.exists()) {
        const noteData = noteSnap.data();
        let currentReactions = noteData.reactions || [];

        // Fix for legacy object-based reactions
        if (!Array.isArray(currentReactions) && typeof currentReactions === 'object') {
          currentReactions = Object.entries(currentReactions).map(([author, emoji]) => ({
            author,
            emoji,
            timestamp: Date.now()
          }));
        }

        // Check if I already reacted with this emoji
        const existingIndex = currentReactions.findIndex(
          (r: any) => r.author === currentUser.name && r.emoji === emoji
        );

        let newReactions;
        if (existingIndex >= 0) {
          // Remove it
          newReactions = [...currentReactions];
          newReactions.splice(existingIndex, 1);
        } else {
          // Add it
          newReactions = [...currentReactions, { author: currentUser.name, emoji, timestamp: Date.now() }];
        }

        await updateDoc(noteRef, { reactions: newReactions });
      }
    } catch (e) {
      console.error("Error toggling reaction:", e);
    }
  };

  const markNoteAsRead = async (noteId: string, authorUid: string | undefined) => {
    if (!currentUser) return;

    if (isDemoMode) {
      setPartnerChatter(prev => prev.map(n => {
        if (n.id === noteId || n.firestoreId === noteId) {
          return { ...n, status: 'read', readAt: Date.now() };
        }
        return n;
      }));
      return;
    }

    if (!auth.currentUser) return;

    // Critical fix: Ensure authorUid is present. 
    // If undefined, it might be a partner note where authorUid wasn't passed, so default to partner.uid if available.
    // If it's my own note (rare for this function), it would be current user.
    const targetUid = authorUid || (partner ? partner.uid : null);

    if (!targetUid) {
      console.warn(`Cannot mark note ${noteId} as read: Missing authorUid and no partner loaded.`);
      return;
    }

    try {
      const noteRef = doc(db, 'users', targetUid, 'chatter', noteId);
      await updateDoc(noteRef, { status: 'read', readAt: Date.now() });
    } catch (e) {
      console.error(`Error marking read for ${noteId} (author: ${targetUid}):`, e);
    }
  };

  const handleToggleRead = async (noteId: string, currentStatus: string | undefined, authorUid: string | undefined) => {
    if (isDemoMode) {
      setPartnerChatter(prev => prev.map(n => {
        if (n.id === noteId || n.firestoreId === noteId) {
          const newStatus = currentStatus === 'read' ? 'delivered' : 'read';
          return { ...n, status: newStatus, readAt: newStatus === 'read' ? Date.now() : null };
        }
        return n;
      }));
      return;
    }

    // Toggle logic: If 'read', make 'delivered'. If 'delivered'/'sent', make 'read'.
    const newStatus = currentStatus === 'read' ? 'delivered' : 'read';
    const readAt = newStatus === 'read' ? Date.now() : null;

    const targetUid = authorUid || (partner ? partner.uid : null);

    if (!targetUid) {
      console.warn(`Cannot toggle read for ${noteId}: Missing authorUid.`);
      return;
    }

    try {
      const noteRef = doc(db, 'users', targetUid, 'chatter', noteId);
      await updateDoc(noteRef, { status: newStatus, readAt });
    } catch (e) {
      console.error("Error toggling read status:", e);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser || !partner) return;
    const partnerNotes = partnerChatter.filter(n => n.status !== 'read');
    if (partnerNotes.length === 0) return;

    console.log(`Marking ${partnerNotes.length} notes as read...`);
    const updates = partnerNotes.map(async (n) => {
      // Use firestoreId if available, fallback to id (but id might be timestamp if legacy)
      const docId = n.firestoreId || n.id;
      if (!docId) {
        console.error("Cannot mark note as read: Missing ID", n);
        return Promise.reject("Missing ID");
      }
      const ref = doc(db, 'users', partner.uid!, 'chatter', docId);
      return updateDoc(ref, { status: 'read', readAt: Date.now() });
    });

    try {
      const results = await Promise.allSettled(updates);
      const rejected = results.filter(r => r.status === 'rejected');
      if (rejected.length > 0) {
        console.error(`Failed to mark ${rejected.length} notes as read:`, rejected);
      } else {
        console.log("Marked all read successfully");
      }
    } catch (e) {
      console.error("Critical error in markAllRead:", e);
    }
  };

  const handleMarkAllUnread = async () => {
    if (!currentUser || !partner) return;
    const partnerNotes = partnerChatter.filter(n => n.status === 'read');
    if (partnerNotes.length === 0) return;

    console.log(`Marking ${partnerNotes.length} notes as unread...`);
    const updates = partnerNotes.map(n => {
      const docId = n.firestoreId || n.id;
      const ref = doc(db, 'users', partner.uid!, 'chatter', docId);
      return updateDoc(ref, { status: 'delivered', readAt: null });
    });
    try {
      await Promise.all(updates);
      console.log("Marked all unread");
    } catch (e) { console.error("Error marking unread:", e); }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 font-serif animate-pulse">Loading Currency...</p>
    </div>
  );
  if (!currentUser) return <UserSetup onSetupComplete={handleIndividualSetup} />;

  const handleNavigate = (tab: string) => {
    if (tab === 'thoughts') {
      setInitialFlirtTab('thoughts');
      setActiveTab('flirts');
    } else {
      setActiveTab(tab as Tab);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 pb-24 relative overflow-x-hidden">
      <ReloadPrompt />
      {/* Sidebar Overlay */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm transition-opacity" />}

      {/* Sidebar Drawer */}
      <aside className={`fixed top-0 left-0 h-full w-96 bg-white z-[80] shadow-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col overflow-y-auto">
          <div className="flex flex-col items-center mb-8 text-center animate-in fade-in zoom-in duration-500">
            <img src="/Logo-V2.svg" alt="Logo" className="w-32 h-32 object-contain drop-shadow-md mb-2" />
            <h2 className="text-xl font-serif font-bold text-gray-800 leading-none">The Couples' Currency</h2>
            <p className="text-[10px] font-serif italic text-gray-400 tracking-wide mt-1">Investing in Us.</p>
          </div>
          <nav className="space-y-2 flex-grow">
            {[
              { id: 'dashboard', label: 'The Bank', icon: '🏦' },
              { id: 'directory', label: 'Intimacy Directory', icon: '📖' },
              { id: 'favors', label: 'Favor Board', icon: '🎟️' },
              { id: 'flirts', label: 'Flirts & Inbox', icon: '💌' },
              { id: 'chemistry', label: 'Chemistry Guide', icon: '🧪' },
              { id: 'giving', label: 'Consent Guide', icon: '🤝' },
              { id: 'session', label: 'Guided Session', icon: '🧘' },
              { id: 'journal', label: 'Reflection Journal', icon: '📓' },
              { id: 'account', label: 'Account & Settings', icon: '👤' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as Tab); setIsSidebarOpen(false); }}
                className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition font-bold ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-4 pt-8 border-t border-gray-100">
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 relative group overflow-hidden">
              <div className="absolute top-2 right-2 text-[8px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full font-black uppercase">COMING SOON</div>
              <p className="text-xs font-bold text-purple-800">Joint Therapy Session</p>
              <p className="text-[10px] text-purple-600 mt-1 opacity-80">Synchronize journals for a facilitated AI dialogue.</p>
            </div>

            <a href="https://www.psychologytoday.com/us/therapists" target="_blank" rel="noopener noreferrer" className="block p-4 bg-green-50 rounded-2xl border border-green-100 hover:bg-green-100 transition">
              <p className="text-xs font-bold text-green-800 flex items-center gap-2">
                <span>🌱</span> Find a Specialist
              </p>
              <p className="text-[10px] text-green-600 mt-1">Connect with licensed local professionals.</p>
            </a>
          </div>
        </div>
      </aside>

      <div className="max-w-7xl mx-auto px-4 pb-4 sm:px-6 sm:pb-6 pt-56">
        <header className="fixed top-0 left-0 right-0 z-50 bg-transparent px-4 py-4 mb-6 flex justify-between items-center pointer-events-none">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center pointer-events-auto">
            <button onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center hover:bg-white transition group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md px-6 py-4 rounded-3xl shadow-sm border border-gray-100 transition-all duration-300">
              <img src="/Logo-V2.svg" alt="Logo" className="w-24 h-24 object-contain drop-shadow-sm" />
              <div className="flex flex-col items-start leading-none">
                <h1 className="text-xl font-serif font-bold text-gray-800 tracking-tight">The Couple's Currency</h1>
                <p className="text-[10px] font-serif italic text-gray-500 tracking-wide mt-1">Investing in Us.</p>
              </div>
            </div>

            <div onClick={() => setActiveTab('account')} className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-blue-600 font-bold shadow-sm border border-gray-100 cursor-pointer hover:bg-white transition">
              {currentUser.name[0]}
            </div>
          </div>
        </header>

        <main className="animate-in fade-in duration-700 pb-24">
          {activeTab === 'dashboard' && (
            <Dashboard
              currentUser={currentUser}
              partner={partner}
              bounties={bounties}
              chatter={chatter}
              bookmarks={allBookmarks[currentUser.name] || {}}
              // Safe access confirmed
              partnerBookmarks={(partner && allBookmarks[partner.name]) ? allBookmarks[partner.name] : {}}
              onNavigate={handleNavigate}
              onTagClick={handleTagClickFromDashboard}
              onNavigateContext={handleNavigateContext}
            />
          )}

          {activeTab === 'directory' && (
            <TermsDirectory
              terms={[...termsData, ...(customTerms || [])]}
              onAddBounty={handleAddBounty}
              onAddTerm={handleCreateTerm}
              chatter={chatter}
              onAddNote={addNote}
              bookmarks={allBookmarks[currentUser.name] || {}}
              onBookmarkToggle={handleBookmarkToggle}
              isDemo={false}
              // Safe access confirmed
              partnerBookmarks={(partner && allBookmarks[partner.name]) ? allBookmarks[partner.name] : {}}
              partnerName={partner?.name}
              onDeleteNote={deleteNote}
              onDeleteBounty={(id) => console.log("Delete bounty TODO", id)}
              highlightedTermId={highlightedTermId}
              initialSearchTerm={pendingSearchTerm}
              onClearInitialSearch={() => setPendingSearchTerm(null)}
              currentUser={currentUser || undefined}
              onReflect={handleReflect}
            />
          )}
          {activeTab === 'chemistry' && (
            <ChemistryGuide
              currentUser={currentUser}
              partner={partner}
              bookmarks={allBookmarks[currentUser.name] || {}}
              partnerBookmarks={(partner && allBookmarks[partner.name]) ? allBookmarks[partner.name] : {}}
              highlights={highlights}
              onPinInsight={handlePinInsight}
            />
          )}
          {activeTab === 'giving' && <GivingReceivingGuide />}
          {activeTab === 'session' && <GuidedSession />}
          {activeTab === 'favors' && (
            <BountyBoard
              bounties={bounties}
              currentUser={currentUser}
              bookmarks={allBookmarks[currentUser.name] || {}}
              partnerBookmarks={(partner && allBookmarks[partner.name]) ? allBookmarks[partner.name] : {}}
              onAddBounty={handleAddBounty}
              onToggleStatus={handleToggleStatus}
              onClaimBounty={handleClaimBounty}
              onDeleteBounty={handleDeleteBounty}
              onUpdateBounty={handleUpdateBounty}
              onArchiveBounty={handleArchiveBounty}
              onDeleteNote={deleteNote}
              onEditNote={editNote}
              chatter={chatter}
              onAddNote={addNote}
              highlightedBountyId={highlightedBountyId}
            />
          )}
          {activeTab === 'flirts' && currentUser && (
            <FlirtSection
              currentUser={currentUser}
              partner={partner}
              chatter={chatter}
              onAddNote={addNote}
              onDeleteNote={deleteNote}
              onPinInsight={(text) => console.log("Pin insight TODO", text)}
              sharedKey={sharedKey}
              onNavigateContext={handleNavigateContext}
              onMarkRead={markNoteAsRead}
              onToggleReaction={handleToggleReaction}
              onMarkAllRead={handleMarkAllRead}
              onMarkAllUnread={handleMarkAllUnread}
              onToggleRead={handleToggleRead}
              onEditNote={editNote}
              privateKey={privateKey}
              onReflect={handleReflect}
              initialTab={initialFlirtTab}
              terms={termsData} // Pass terms for lookup
              partnerBookmarks={(partner && allBookmarks[partner.name]) ? allBookmarks[partner.name] : {}}
            />
          )}


          {activeTab === 'account' && currentUser && (
            <Account
              currentUser={currentUser}
              partner={partner}
              invites={invites}
              setInvites={setInvites}
              onReset={handleReset}
              onResetHandlers={handleResetCategory}
              onConnect={handleConnectPartner}
              sharingSettings={sharingSettings}
              setSharingSettings={setSharingSettings}
              notificationSettings={notificationSettings}
              setNotificationSettings={setNotificationSettings}
              chatter={chatter}
              bounties={bounties}
              initialTab={accountInitialTab}
              onBackupIdentity={backupIdentity}
              onRestoreIdentity={restoreIdentity}
              onGenerateSyncCode={generateSyncCode}
              onConsumeSyncCode={consumeSyncCode}
            />
          )}
          {activeTab === 'journal' && currentUser && (
            <ReflectionJournal
              entries={journalEntries}
              onAddEntry={handleAddJournalEntry}
              currentUser={currentUser}
              sharedKey={sharedKey}
              initialText={pendingReflection}
              onClearInitialText={() => setPendingReflection(undefined)}
            />
          )}
        </main>
      </div>
      <div className="fixed bottom-0 left-0 w-full sm:w-[600px] sm:left-1/2 sm:-translate-x-1/2 sm:bottom-8 sm:rounded-3xl bg-white border-t sm:border border-gray-100 flex justify-around items-center p-4 pb-6 sm:pb-4 z-[90] shadow-2xl transition-all duration-300">
        {[
          { id: 'dashboard', icon: '🏦', label: 'Bank' },
          { id: 'directory', icon: '📖', label: 'Directory' },
          { id: 'favors', icon: '🎟️', label: 'Favors' },
          { id: 'journal', icon: '📓', label: 'Journal' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${activeTab === tab.id ? 'text-blue-600 bg-blue-50 font-bold' : 'text-gray-400'}`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[9px] uppercase tracking-wide">{tab.label}</span>
          </button>
        ))}
        {/* Flirts button with badge, rendered separately */}
        <button onClick={() => setActiveTab('flirts')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition relative group ${activeTab === 'flirts' ? 'text-pink-600 bg-pink-50 font-bold' : 'text-gray-400'}`}>
          <div className="relative">
            <span className="text-xl leading-none group-hover:scale-110 transition-transform block">💌</span>
            {currentUser && Object.values(chatter).flat().filter((n: any) => n.timestamp > Date.now() - 86400000 && n.author !== currentUser.name).length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </div>
          <span className="text-[9px] uppercase tracking-wide mt-1 block">Flirts</span>
        </button>
      </div>
      <ReloadPrompt />
      <Chatbot />
      <InstallPrompt isOpen={showInstallPrompt} onClose={() => setShowInstallPrompt(false)} />
    </div>
  );
};

export default App;
