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
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, updateDoc, collection, addDoc, query, where, getDocs, deleteDoc, orderBy } from 'firebase/firestore';
import FlirtSection from './components/FlirtSection';
import ReflectionJournal from './components/ReflectionJournal';
import { generateKeyOld as generateKey, exportKeyOld as exportKey, importKeyOld as importKey } from './utils/encryption';

type Tab = 'dashboard' | 'directory' | 'chemistry' | 'giving' | 'session' | 'favors' | 'flirts' | 'account' | 'journal';

// Local User interface removed to use the one from types.ts

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingSearchTerm, setPendingSearchTerm] = useState<string | null>(null);

  const handleTagClickFromDashboard = (term: string) => {
    setPendingSearchTerm(term);
    setActiveTab('directory');
  };

  const handleNavigateContext = (contextId: string) => {
    if (contextId === 'general-flirt') {
      setActiveTab('favors');
    } else if (contextId.startsWith('bounty-')) {
      const id = parseInt(contextId.split('-')[1]);
      setHighlightedBountyId(id);
      setActiveTab('favors');
    } else if (contextId.startsWith('term-')) {
      const id = parseInt(contextId.split('-')[1]);
      setHighlightedTermId(id);
      setActiveTab('directory');
    }
  };

  // App State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [customTerms, setCustomTerms] = useState<Term[]>([]);

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
  const [myChatter, setMyChatter] = useState<ChatterNote[]>([]);
  const [partnerChatter, setPartnerChatter] = useState<ChatterNote[]>([]);
  const [chatter, setChatter] = useState<Record<string, ChatterNote[]>>({});
  const [invites, setInvites] = useState<Invite[]>([]);
  const [allBookmarks, setAllBookmarks] = useState<Record<string, Record<number, Bookmark>>>({});
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);


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
    console.log("App Version: 1.2.1 - Gemini 3 Beta Stability");
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, fetch their profile
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userRef, async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as User;
            setCurrentUser({ ...data, uid: user.uid });

            // Load or generate encryption key
            if ((data as any).sharedKeyBase64) {
              const key = await importKey((data as any).sharedKeyBase64);
              setSharedKey(key);
            } else if (data.partnerId) {
              // Check if partner already has a key to sync
              // Find partner doc (assuming we can find them via query if we don't have ID directly, 
              // but data.partnerId usually stores their ConnectID or UID. 
              // Wait, partnerId in User struct is likely ConnectID.
              // We need to query by connectId.
              const q = query(collection(db, 'users'), where('connectId', '==', data.partnerId));
              const querySnapshot = await getDocs(q);

              let keyToUseStr = '';

              if (!querySnapshot.empty) {
                const partnerData = querySnapshot.docs[0].data();
                if (partnerData.sharedKeyBase64) {
                  console.log("Found partner key, syncing...");
                  keyToUseStr = partnerData.sharedKeyBase64;
                }
              }

              if (keyToUseStr) {
                // Use existing partner key
                await updateDoc(userRef, { sharedKeyBase64: keyToUseStr });
                const key = await importKey(keyToUseStr);
                setSharedKey(key);
              } else {
                // Neither has key, generate new one
                console.log("No partner key found, generating new shared key...");
                const newKey = await generateKey();
                const base64 = await exportKey(newKey);
                await updateDoc(userRef, { sharedKeyBase64: base64 });
                setSharedKey(newKey);
              }
            }

            // If they have a partner, fetch partner data
            if (data.partnerId) {
              // Find partner by ID (Connect ID search needed, or store UID)
              // Simplified: We need the partner's UID. 
              // For now, let's assume we store partner's UID in 'partnerUid' field or similar, 
              // OR we query by connectId. Querying is better.
              // But wait, the previous code stored the whole partner object.
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

  // Data Sync (Users + Partner)
  useEffect(() => {
    if (!currentUser || !auth.currentUser) return;

    const myUid = auth.currentUser.uid;
    const myName = currentUser.name;

    // 1. My Data Listeners
    const unsubMyBounties = onSnapshot(collection(db, 'users', myUid, 'bounties'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setBounties(prev => [...prev.filter(b => b.postedBy !== myName), ...data]);
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
    const unsubMyChatter = onSnapshot(collection(db, 'users', myUid, 'chatter'), (snap) => {
      const notes = snap.docs.map(d => d.data() as ChatterNote);
      setMyChatter(notes);
    });

    const unsubMyJournal = onSnapshot(query(collection(db, 'users', myUid, 'journal'), orderBy('timestamp', 'desc')), (snap) => {
      const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
      setJournalEntries(entries);
    });

    // 2. Partner Data Listeners
    let unsubPartnerBounties = () => { };
    let unsubPartnerChatter = () => { };
    let unsubPartnerBookmarks = () => { };

    if (currentUser.partnerId) {
      const q = query(collection(db, 'users'), where('connectId', '==', currentUser.partnerId));
      getDocs(q).then(snap => {
        if (!snap.empty) {
          const pUid = snap.docs[0].id;
          const pData = snap.docs[0].data() as User;
          const pName = pData.name;

          setPartner(pData);

          unsubPartnerBounties = onSnapshot(collection(db, 'users', pUid, 'bounties'), (s) => {
            const data = s.docs.map(d => ({ id: d.id, ...d.data() } as any));
            setBounties(prev => [...prev.filter(b => b.postedBy === myName), ...data]);
          });

          unsubPartnerBookmarks = onSnapshot(collection(db, 'users', pUid, 'bookmarks'), (s) => {
            const bm: Record<number, Bookmark> = {};
            s.docs.forEach(d => {
              const id = parseInt(d.id);
              if (!isNaN(id)) bm[id] = d.data().type as Bookmark;
            });
            setAllBookmarks(prev => ({ ...prev, [pName]: bm }));
          });

          // CHANGE: Set partnerChatter directly
          unsubPartnerChatter = onSnapshot(collection(db, 'users', pUid, 'chatter'), (s) => {
            const notes = s.docs.map(d => d.data() as ChatterNote);
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

  const handleIndividualSetup = async (name: string, isDemo: boolean = false, email: string = '', initialBookmarks?: Record<number, Bookmark>) => {
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

      // 2. Demo Data Injection
      if (isDemo) {
        const { demoBounties, demoChatter } = await import('./utils/demoData');

        // Add Bounties
        const bountyPromises = demoBounties.map(b => addDoc(collection(db, 'users', myUid, 'bounties'), b));

        // Add Chatter
        const chatterPromises = demoChatter.map(c => addDoc(collection(db, 'users', myUid, 'chatter'), c));

        await Promise.all([...bountyPromises, ...chatterPromises]);
      }

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
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      partnerId: id,
      partnerName: partnerName
    });
    setActiveTab('directory');
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
    if (!currentUser || !auth.currentUser) return;
    try {
      const newNote: any = {
        id: Date.now().toString(),
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
        audioIv: extra?.audioIv || null
      };

      // Remove null keys if preferred, or just save as null. Null is valid in Firestore.
      // Cleaning undefineds is critical.
      Object.keys(newNote).forEach(key => newNote[key] === undefined && delete newNote[key]);

      await addDoc(collection(db, 'users', auth.currentUser.uid, 'chatter'), newNote);
    } catch (e: any) {
      console.error("Error adding note:", e);
      throw e;
    }
  };

  const deleteNote = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      // 1. Find the note to get its Firestore ID (if different) or assuming 'id' is the doc ID?
      // Wait, app uses 'id' property in the object (Date.now()), but Firestore has its own auto-ID.
      // We need to query for it if we don't store the doc ID.
      // Let's assume we need to query by 'id' field.
      const q = query(collection(db, 'users', auth.currentUser.uid, 'chatter'), where('id', '==', id));
      const snapshot = await getDocs(q);

      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Local state update (optimistic or driven by onSnapshot? onSnapshot handles it, but optimistic is nice)
      // Actually onSnapshot in useEffect will handle the removal from 'chatter' state if we are listening.
      // We are listening! (useEffect at line 170 in original file likely)
      console.log("Deleted note:", id);
    } catch (e) {
      console.error("Error deleting note:", e);
    }
  };

  const markNoteAsRead = async (noteId: string, authorUid: string) => {
    if (!currentUser || !auth.currentUser) return;
    try {
      // If I am the author, I don't mark my own as read (logic check)
      // Actually, we pass the authorUid of the NOTE. 
      // If note is from Partner, we need to update it in PARTNER's DB (because that's where the source of truth for their message is?)
      // Wait, the architecture seems to be: 
      // - I read my own 'chatter' collection? 
      // - Or do I read from Partner's 'chatter' collection?
      // Line 234: setPartnerChatter(notes) from `users/{pUid}/chatter`.

      // So if I read a note, I need to update the document in the PARTNER's collection so THEY see it's read?
      // OR do I update my copy? 
      // The app seems to sync everything.

      // Let's assume we update the document wherever it lives.
      // If it's in partnerChatter, it's in `users/{partnerUid}/chatter/{noteId}`.

      // But wait, `markNoteAsRead` needs to know where the note is.
      // If the note is in `partnerChatter`, it is in the partner's subcollection.
      // I need to write to `users/{partnerUid}/chatter/{noteId}`.

      const ref = doc(db, 'users', authorUid, 'chatter', noteId);
      await updateDoc(ref, {
        status: 'read',
        readAt: Date.now()
      });
    } catch (e) {
      console.error("Error marking read:", e);
    }
  };

  const handleBookmarkToggle = async (termId: number, type: Bookmark) => {
    if (!currentUser || !auth.currentUser) return;
    const docRef = doc(db, 'users', auth.currentUser.uid, 'bookmarks', termId.toString());
    const currentMark = allBookmarks[currentUser.name]?.[termId];
    try {
      if (currentMark === type) await deleteDoc(docRef);
      else await setDoc(docRef, { type });
    } catch (e: any) {
      console.error("Error toggling bookmark:", e);
    }
  };

  const handleAddBounty = async (bountyData: Omit<Bounty, 'id' | 'status' | 'postedBy' | 'claimedBy'>) => {
    if (!currentUser || !auth.currentUser) return;
    try {
      const newBounty: Omit<Bounty, 'id'> = {
        ...bountyData,
        status: 'available',
        postedBy: currentUser.name,
        claimedBy: null
      };
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'bounties'), newBounty);
    } catch (e: any) {
      console.error("Error adding favor:", e);
    }
  };

  const handleAddJournalEntry = async (entry: JournalEntry) => {
    if (!currentUser || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'journal'), entry);
    } catch (e: any) {
      console.error("Error adding journal entry:", e);
    }
  };

  const handleClaimBounty = async (bountyId: number | string) => {
    const bounty = bounties.find(b => b.id.toString() === bountyId.toString());
    if (!bounty || !currentUser) return;
    let targetUid = auth.currentUser!.uid;
    if (bounty.postedBy !== currentUser.name && currentUser.partnerId) {
      const q = query(collection(db, 'users'), where('connectId', '==', currentUser.partnerId));
      const snap = await getDocs(q);
      if (!snap.empty) targetUid = snap.docs[0].id;
    }
    const docRef = doc(db, 'users', targetUid, 'bounties', bountyId.toString());
    await updateDoc(docRef, { status: 'claimed', claimedBy: currentUser.name });
  };

  const handleToggleStatus = async (bountyId: number | string) => {
    const bounty = bounties.find(b => b.id.toString() === bountyId.toString());
    if (!bounty || !currentUser) return;
    let targetUid = auth.currentUser!.uid;
    if (bounty.postedBy !== currentUser.name && currentUser.partnerId) {
      const q = query(collection(db, 'users'), where('connectId', '==', currentUser.partnerId));
      const snap = await getDocs(q);
      if (!snap.empty) targetUid = snap.docs[0].id;
    }
    if (bounty.status === 'claimed') {
      await updateDoc(doc(db, 'users', targetUid, 'bounties', bountyId.toString()), { status: 'done' });
    }
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

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 font-serif animate-pulse">Loading Currency...</p>
    </div>
  );
  if (!currentUser) return <UserSetup onSetupComplete={handleIndividualSetup} />;

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 pb-24 relative overflow-x-hidden">
      {/* Sidebar Overlay */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm transition-opacity" />}

      {/* Sidebar Drawer */}
      <aside className={`fixed top-0 left-0 h-full w-96 bg-white z-[80] shadow-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col overflow-y-auto">
          <div className="flex flex-col items-center mb-8 text-center animate-in fade-in zoom-in duration-500">
            <img src="/logo.png" alt="Logo" className="w-32 h-32 object-contain drop-shadow-md mb-2" />
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
              <img src="/logo.png" alt="Logo" className="w-24 h-24 object-contain drop-shadow-sm" />
              <div className="flex flex-col items-start leading-none">
                <h1 className="text-xl font-serif font-bold text-gray-800 tracking-tight">The Couples' Currency</h1>
                <p className="text-[10px] font-serif italic text-gray-500 tracking-wide mt-1">Investing in Us.</p>
              </div>
            </div>

            <div onClick={() => setActiveTab('account')} className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-blue-600 font-bold shadow-sm border border-gray-100 cursor-pointer hover:bg-white transition">
              {currentUser.name[0]}
            </div>
          </div>
        </header>

        <main className="animate-in fade-in duration-700 pb-32">
          {activeTab === 'dashboard' && (
            <Dashboard
              currentUser={currentUser}
              partner={partner}
              bounties={bounties}
              chatter={chatter}
              bookmarks={allBookmarks[currentUser.name] || {}}
              // Safe access confirmed
              partnerBookmarks={(partner && allBookmarks[partner.name]) ? allBookmarks[partner.name] : {}}
              onNavigate={(tab) => setActiveTab(tab as Tab)}
              onTagClick={handleTagClickFromDashboard}
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
              onDeleteNote={(id) => console.log("Delete note TODO", id)}
              onDeleteBounty={(id) => console.log("Delete bounty TODO", id)}
              highlightedTermId={highlightedTermId}
              initialSearchTerm={pendingSearchTerm}
              onClearInitialSearch={() => setPendingSearchTerm(null)}
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
              onAddBounty={handleAddBounty}
              onToggleStatus={handleToggleStatus}
              onClaimBounty={handleClaimBounty}
              onDeleteBounty={(id) => console.log("Delete bounty TODO", id)}
              onDeleteNote={deleteNote}
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
            />
          )}



          {activeTab === 'account' && currentUser && (
            <Account
              currentUser={currentUser}
              partner={partner}
              invites={invites}
              setInvites={setInvites}
              onReset={() => console.log("Full Reset TODO")}
              onResetHandlers={handleResetCategory}
              onConnect={handleConnectPartner}
              sharingSettings={sharingSettings}
              setSharingSettings={setSharingSettings}
              notificationSettings={notificationSettings}
              setNotificationSettings={setNotificationSettings}
              chatter={chatter}
              bounties={bounties}
            />
          )}
          {activeTab === 'journal' && currentUser && (
            <ReflectionJournal
              entries={journalEntries}
              onAddEntry={handleAddJournalEntry}
              currentUser={currentUser}
            />
          )}
        </main>
      </div>
      <div className="fixed bottom-0 left-0 w-full sm:w-[600px] sm:left-1/2 sm:-translate-x-1/2 sm:bottom-8 sm:rounded-3xl bg-white border-t sm:border border-gray-100 flex justify-around items-center p-4 pb-6 sm:pb-4 z-[90] shadow-2xl transition-all duration-300">
        {[
          { id: 'dashboard', icon: '🏦', label: 'Bank' },
          { id: 'directory', icon: '📖', label: 'Directory' },
          { id: 'favors', icon: '🎟️', label: 'Favors' },
          { id: 'journal', icon: '📓', label: 'Journal' },
          { id: 'account', icon: '👤', label: 'Me' }
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
      <Chatbot />
      <InstallPrompt isOpen={showInstallPrompt} onClose={() => setShowInstallPrompt(false)} />
    </div>
  );
};

export default App;
