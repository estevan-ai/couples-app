
import React, { useState, useEffect, useCallback } from 'react';
import TermsDirectory from './components/TermsDirectory';
import ChemistryGuide from './components/ChemistryGuide';
import GivingReceivingGuide from './components/GivingReceivingGuide';
import GuidedSession from './components/GuidedSession';
import BountyBoard from './components/BountyBoard';
import Chatbot from './components/Chatbot';
import ReflectionJournal from './components/ReflectionJournal';
import { Bounty, ChatterNote, Invite, SharingSettings, Bookmark, JournalEntry } from './types';
import UserSetup from './components/UserSetup';
import Account from './components/Account';

type Tab = 'directory' | 'favors' | 'journal' | 'account' | 'chemistry' | 'giving' | 'session';

export interface User {
  name: string;
  email?: string;
  connectId: string;
  isVerifiedAdult: boolean;
  isDemo?: boolean;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('directory');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [chatter, setChatter] = useState<Record<string, ChatterNote[]>>({});
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [allBookmarks, setAllBookmarks] = useState<Record<string, Record<number, Bookmark>>>({});
  const [sharingSettings, setSharingSettings] = useState<SharingSettings>({
    shareAll: true,
    shareWillWorkFor: true,
    shareLoves: true,
    shareLikes: true,
    shareFavors: true
  });

  const VERSION = 'v2.5_reflection_hub';

  useEffect(() => {
    try {
      const saved = (key: string) => localStorage.getItem(key + '_' + VERSION);
      const u = saved('currentUser');
      const p = saved('partner');
      const b = saved('bounties');
      const ch = saved('chatter');
      const bm = saved('allBookmarks');
      const je = saved('journalEntries');

      if (u) setCurrentUser(JSON.parse(u));
      if (p) setPartner(JSON.parse(p));
      if (b) setBounties(JSON.parse(b));
      if (ch) setChatter(JSON.parse(ch));
      if (bm) setAllBookmarks(JSON.parse(bm));
      if (je) setJournalEntries(JSON.parse(je));
    } catch (error) { console.error(error); }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    try {
      const save = (key: string, val: any) => localStorage.setItem(key + '_' + VERSION, JSON.stringify(val));
      save('currentUser', currentUser);
      if (partner) save('partner', partner);
      save('bounties', bounties);
      save('chatter', chatter);
      save('allBookmarks', allBookmarks);
      save('journalEntries', journalEntries);
    } catch (error) { console.error(error); }
  }, [currentUser, partner, bounties, chatter, allBookmarks, journalEntries]);

  const handleSetup = (name: string, isDemo = false, email?: string, initialBookmarks?: Record<number, Bookmark>) => {
    const randomID = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newUser: User = {
        name,
        email,
        connectId: `${name.toUpperCase()}-${randomID}`,
        isVerifiedAdult: true,
        isDemo
    };
    setCurrentUser(newUser);
    
    if (initialBookmarks) {
      setAllBookmarks(prev => ({ ...prev, [name]: initialBookmarks }));
    }

    if (isDemo) {
      setPartner({ 
        name: name.includes('Jane') ? 'John' : 'Jane', 
        connectId: 'DEMO-PARTNER-77', 
        isVerifiedAdult: true, 
        isDemo: true 
      });
    }
  };

  const handleBookmarkToggle = useCallback((termId: number, type: Bookmark) => {
    if (!currentUser) return;
    setAllBookmarks(prev => {
      const userBM = { ...(prev[currentUser.name] || {}) };
      if (userBM[termId] === type) {
        delete userBM[termId];
      } else {
        userBM[termId] = type;
      }
      return { ...prev, [currentUser.name]: userBM };
    });
  }, [currentUser]);

  const addNote = (contextId: string, text: string) => {
    if (!currentUser) return;
    const newNote: ChatterNote = {
      id: Date.now().toString(),
      author: currentUser.name,
      text,
      timestamp: Date.now()
    };
    setChatter(prev => ({ ...prev, [contextId]: [...(prev[contextId] || []), newNote] }));
  };

  if (!currentUser) {
    return <UserSetup onSetupComplete={handleSetup} />;
  }

  const currentBookmarks = allBookmarks[currentUser.name] || {};

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 pb-24 relative overflow-x-hidden">
      {/* Sidebar Overlay */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm transition-opacity" />}
      
      {/* Sidebar Drawer */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white z-[80] shadow-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col">
            <h2 className="text-2xl font-serif font-bold text-gray-800 mb-8">Currency Menu</h2>
            <nav className="space-y-2 flex-grow">
                {[
                  { id: 'directory', label: 'Explore Directory', icon: '🏠' },
                  { id: 'chemistry', label: 'Chemistry Guide', icon: '🧪' },
                  { id: 'giving', label: 'Consent Guide', icon: '🤝' },
                  { id: 'session', label: 'Guided Session', icon: '🧘' },
                  { id: 'journal', label: 'Reflection Journal', icon: '📓' }
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
                
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">Support</p>
                <button className="text-sm font-bold text-gray-600 hover:text-blue-600 transition flex items-center gap-2">
                    <span className="text-blue-500">🛡️</span> Safety Guidelines
                </button>
            </div>
        </div>
      </aside>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <header className="flex justify-between items-center mb-6">
            <button onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="text-center">
                <h1 className="text-xl font-serif font-bold text-gray-800 tracking-tight leading-none">The Couples Currency</h1>
                <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] mt-1">V2.5 REFLECTION BETA</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold shadow-inner">
                {currentUser.name[0]}
            </div>
        </header>

        {currentUser.isDemo && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-[2rem] flex items-center gap-4">
            <div className="text-2xl">⚠️</div>
            <div>
                <p className="text-xs font-bold text-yellow-700 uppercase tracking-widest">DEMO ENVIRONMENT</p>
                <p className="text-xs text-yellow-600">AI Coaching is fully active, but cross-partner syncing is simulated.</p>
            </div>
          </div>
        )}

        <main className="animate-in fade-in duration-700">
          {activeTab === 'directory' && (
            <TermsDirectory 
                onAddBounty={(b) => setBounties(p => [...p, { ...b, id: Date.now(), status: 'available', postedBy: currentUser.name, claimedBy: null }])} 
                chatter={chatter} 
                onAddNote={addNote} 
                bookmarks={currentBookmarks} 
                onBookmarkToggle={handleBookmarkToggle} 
                isDemo={currentUser.isDemo}
            />
          )}
          {activeTab === 'favors' && (
            <BountyBoard 
                bounties={bounties} 
                currentUser={currentUser} 
                onToggleStatus={(id) => setBounties(p => p.map(b => b.id === id ? { ...b, status: b.status === 'claimed' ? 'done' : 'claimed' } : b))} 
                onClaimBounty={(id) => setBounties(p => p.map(b => b.id === id ? { ...b, status: 'claimed', claimedBy: currentUser.name } : b))} 
                chatter={chatter} 
                onAddNote={addNote} 
            />
          )}
          {activeTab === 'journal' && (
            <ReflectionJournal 
                entries={journalEntries}
                onAddEntry={(entry) => setJournalEntries(prev => [entry, ...prev])}
                currentUser={currentUser}
            />
          )}
          {activeTab === 'account' && (
            <Account 
                currentUser={currentUser} 
                partner={partner} 
                onReset={() => {localStorage.clear(); window.location.reload();}} 
                onConnect={(n, i) => setPartner({ name: n, connectId: i, isVerifiedAdult: true })} 
                chatter={chatter} 
                bounties={bounties} 
                sharingSettings={sharingSettings} 
                setSharingSettings={setSharingSettings} 
                invites={invites} 
                setInvites={setInvites} 
            />
          )}
          {activeTab === 'chemistry' && <ChemistryGuide />}
          {activeTab === 'giving' && <GivingReceivingGuide />}
          {activeTab === 'session' && <GuidedSession />}
        </main>
      </div>

      {/* Floating Bottom Nav */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-lg bg-white/80 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[60] p-2 flex justify-between items-center px-6 overflow-hidden">
        {[
          { id: 'directory', label: 'EXPLORE', icon: '🏠' },
          { id: 'journal', label: 'JOURNAL', icon: '📓' },
          { id: 'favors', label: 'FAVORS', icon: '🎟️' },
          { id: 'account', label: 'ME', icon: '👤' }
        ].map(item => (
            <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`flex flex-col items-center py-2 px-3 transition-all relative ${activeTab === item.id ? 'text-blue-600 scale-110' : 'text-gray-400 opacity-50 hover:opacity-100'}`}
            >
                <span className="text-xl mb-1">{item.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
                {activeTab === item.id && (
                    <div className="absolute -bottom-2 w-5 h-1 bg-blue-600 rounded-full animate-in slide-in-from-bottom-1" />
                )}
            </button>
        ))}
      </nav>

      {/* Gemini Assistant restored for all users as per screenshot feedback */}
      <Chatbot />
    </div>
  );
};

export default App;
