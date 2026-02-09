
import React, { useState, useMemo } from 'react';
import ChemistryAIDeepDive from './ChemistryAIDeepDive';
import { User } from '../types';
import { Bookmark, Highlight } from '../types';
import { termsData } from '../constants';

const Section: React.FC<{ children: React.ReactNode; onAskAI?: () => void }> = ({ children, onAskAI }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-9 mb-10 relative group">
        {children}
        {onAskAI && (
            <button
                onClick={onAskAI}
                className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100"
            >
                <span>🧪</span> Explain with AI
            </button>
        )}
    </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="font-serif text-3xl text-center mb-6 text-gray-800">{children}</h2>
);

interface ChemistryGuideProps {
    currentUser: User;
    partner: User | null;
    bookmarks: Record<number, Bookmark>;
    partnerBookmarks: Record<number, Bookmark>;
    highlights: Highlight[];
    onPinInsight: (text: string, source: string, context?: string) => Promise<void>;
}

const ChemistryGuide: React.FC<ChemistryGuideProps> = ({ currentUser, partner, bookmarks, partnerBookmarks, highlights, onPinInsight }) => {
    const [isAIActive, setIsAIActive] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');

    const handleAskAI = (prompt: string) => {
        setAiPrompt(prompt);
        setIsAIActive(true);
    };

    const alignment = useMemo(() => {
        const sharedLoves: string[] = [];
        const complementary: string[] = []; // One loves, one likes/will work for
        const growth: string[] = []; // One loves, one unsure/skipped

        if (!partner) return { sharedLoves, complementary, growth };

        Object.keys(bookmarks).forEach(key => {
            const id = parseInt(key);
            const myMark = bookmarks[id];
            const pMark = partnerBookmarks[id];
            const termName = termsData.find(t => t.id === id)?.name || "Unknown";

            if (!pMark) return;

            if (myMark === 'love' && pMark === 'love') {
                sharedLoves.push(termName);
            } else if ((myMark === 'love' && (pMark === 'like' || pMark === 'work')) || (pMark === 'love' && (myMark === 'like' || myMark === 'work'))) {
                complementary.push(termName);
            } else if ((myMark === 'love' && pMark === 'unsure') || (pMark === 'love' && myMark === 'unsure')) {
                growth.push(termName);
            }
        });

        return { sharedLoves, complementary, growth };
    }, [bookmarks, partnerBookmarks, partner]);

    return (
        <div>
            <header className="text-center mb-10 relative">
                <h1 className="text-4xl sm:text-5xl mb-3 text-gray-800">The Chemistry of Connection</h1>
                <p className="text-lg sm:text-xl text-gray-500 max-w-3xl mx-auto mb-6">Your alignment, insights, and emotional biology.</p>

                <button
                    onClick={() => handleAskAI("Analyze our relationship chemistry based on our alignment.")}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-8 rounded-full shadow-xl hover:scale-105 transition transform animate-in zoom-in slide-in-from-bottom-2"
                >
                    <span className="text-xl">🧬</span>
                    <span>Ask the Chemistry AI</span>
                </button>
                <ChemistryAIDeepDive
                    isOpen={isAIActive}
                    onClose={() => setIsAIActive(false)}
                    currentUser={currentUser}
                    partner={partner}
                    initialQuery={aiPrompt}
                    onPinInsight={onPinInsight}
                />

                <div className="absolute top-0 right-0 p-4">
                    <div className="relative group">
                        <button className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 font-bold hover:bg-gray-200 hover:text-gray-600 transition flex items-center justify-center">
                            ?
                        </button>
                        <div className="absolute right-0 top-10 w-72 bg-white p-5 rounded-2xl shadow-xl border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-10 text-left">
                            <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">How to Read This</h4>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-bold text-pink-600">🔥 Shared Loves</span>
                                    <p className="text-gray-500 text-xs mt-0.5">Things you <strong>BOTH</strong> marked as "Love". The sweet spot.</p>
                                </div>
                                <div>
                                    <span className="font-bold text-blue-600">🧩 Complementary</span>
                                    <p className="text-gray-500 text-xs mt-0.5">"Love" + "Like/Work". One person is super passionate, the other is willing. Great for taking turns leading.</p>
                                </div>
                                <div>
                                    <span className="font-bold text-purple-600">🌱 Growth Areas</span>
                                    <p className="text-gray-500 text-xs mt-0.5">"Love" + "Unsure". One loves it, the other is unsure. Invitation to explore gently.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Alignment Section */}
            {partner && (
                <Section onAskAI={() => handleAskAI("Explain why our 'shared loves' and 'complementary' traits make us a good match.")}>
                    <SectionTitle>💞 Your Dynamic Alignment</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-pink-50 rounded-2xl p-6 border border-pink-100">
                            <h3 className="font-bold text-pink-700 mb-2 flex items-center gap-2">🔥 Shared Loves ({alignment.sharedLoves.length})</h3>
                            <p className="text-xs text-pink-600 mb-4 opacity-80">High-octane connection points.</p>
                            <div className="flex flex-wrap gap-2">
                                {alignment.sharedLoves.length > 0 ? (
                                    alignment.sharedLoves.map((t, i) => <span key={i} className="bg-white text-pink-600 px-2 py-1 rounded-md text-xs font-bold border border-pink-100">{t}</span>)
                                ) : <span className="text-xs text-gray-400 italic">No exact matches yet. Keep exploring!</span>}
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                            <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">🧩 Complementary ({alignment.complementary.length})</h3>
                            <p className="text-xs text-blue-600 mb-4 opacity-80">Where one leads and the other follows.</p>
                            <div className="flex flex-wrap gap-2">
                                {alignment.complementary.length > 0 ? (
                                    alignment.complementary.map((t, i) => <span key={i} className="bg-white text-blue-600 px-2 py-1 rounded-md text-xs font-bold border border-blue-100">{t}</span>)
                                ) : <span className="text-xs text-gray-400 italic">No complementary matches found.</span>}
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
                            <h3 className="font-bold text-purple-700 mb-2 flex items-center gap-2">🌱 Growth Areas ({alignment.growth.length})</h3>
                            <p className="text-xs text-purple-600 mb-4 opacity-80">Opportunities for new discovery.</p>
                            <div className="flex flex-wrap gap-2">
                                {alignment.growth.length > 0 ? (
                                    alignment.growth.map((t, i) => <span key={i} className="bg-white text-purple-600 px-2 py-1 rounded-md text-xs font-bold border border-purple-100">{t}</span>)
                                ) : <span className="text-xs text-gray-400 italic">No mismatch growth areas currently.</span>}
                            </div>
                        </div>
                    </div>
                </Section>
            )}

            {/* Pinned Insights */}
            {highlights.length > 0 && (
                <Section>
                    <SectionTitle>📌 My Insights Board</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {highlights.map((h) => (
                            <div key={h.id} className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 shadow-sm relative group">
                                <p className="font-serif text-gray-800 italic mb-2">"{h.text}"</p>
                                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-yellow-600 tracking-wider">
                                    <span>{h.source}</span>
                                    <span>{new Date(h.timestamp).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            <Section onAskAI={() => handleAskAI("Explain the difference between 'Journey' and 'Destination' arousal styles.")}>
                <SectionTitle>🔁 Emotional Build-Up vs. Event Focus</SectionTitle>
                <p className="mb-6 text-gray-600 leading-relaxed">At the heart of sexual connection are two different approaches to arousal. For many women, arousal is a slow burn, built on emotional context and anticipation throughout the day (the "journey"). For many men, it's more spontaneous and triggered by in-the-moment cues (the "destination"). Understanding this is key to syncing up.</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm sm:text-base">
                        <thead>
                            <tr>
                                <th className="text-left p-4 font-bold bg-gray-50">Trait</th>
                                <th className="text-left p-4 font-bold text-white bg-[#4a90e2]">Typical Male Pattern (Destination)</th>
                                <th className="text-left p-4 font-bold text-white bg-[#e5398d]">Typical Female Pattern (Journey)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b"><td className="p-4 align-top"><strong>Sexual Motivation</strong></td><td className="p-4 align-top text-[#4a90e2]"><strong>Event-based:</strong> Desire is often triggered in the moment by a visual cue or touch, focusing on a clear physical outcome.</td><td className="p-4 align-top text-[#e5398d]"><strong>Narrative-based:</strong> Desire builds in layers throughout the day, fueled by emotional connection, safety, and anticipation.</td></tr>
                            <tr className="border-b"><td className="p-4 align-top"><strong>Anticipation Impact</strong></td><td className="p-4 align-top text-[#4a90e2]">Exciting, but not always sustaining. Anticipation can sometimes build pressure rather than pleasure if it's too long.</td><td className="p-4 align-top text-[#e5398d]">The lifeblood of arousal. Can cause a steady dopamine rise over hours, making the final event far more intense.</td></tr>
                            <tr className="border-b"><td className="p-4 align-top"><strong>Turn-On Triggers</strong></td><td className="p-4 align-top text-[#4a90e2]">Visual cues, direct touch, erotic novelty, the promise of an orgasm.</td><td className="p-4 align-top text-[#e5398d]">Emotional cues, compliments, inside jokes, acts of service, feeling safe and prioritized.</td></tr>
                            <tr><td className="p-4 align-top"><strong>Mental Foreplay</strong></td><td className="p-4 align-top text-[#4a90e2]">Less impactful unless connected to a physical outcome. A sexy text is a promise for later.</td><td className="p-4 align-top text-[#e5398d]">Highly impactful; a sexy morning message may set the tone for the entire day, priming the brain for intimacy.</td></tr>
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section onAskAI={() => handleAskAI("How can we optimize our brain chemicals for better connection?")}>
                <SectionTitle>🧪 The 5 Key Chemicals of Connection</SectionTitle>
                <p className="mb-8 text-gray-600 leading-relaxed">Our feelings of desire, love, bonding, and satisfaction are the result of a complex chemical cocktail in the brain. Mastering emotional foreplay is about learning to trigger the right chemicals at the right time.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <h4 className="font-serif text-xl font-bold">Dopamine</h4>
                        <div className="italic text-gray-500 mb-3 text-sm">The "Wanting" Chemical</div>
                        <p className="text-gray-700"><strong>Function:</strong> Drives desire, craving, motivation, and the pursuit of rewards. It’s the thrill of the chase, triggered by anticipation and novelty.</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <h4 className="font-serif text-xl font-bold">Oxytocin</h4>
                        <div className="italic text-gray-500 mb-3 text-sm">The "Bonding" Chemical</div>
                        <p className="text-gray-700"><strong>Function:</strong> Strengthens pair bonding, trust, and empathy. Released during touch, cuddling, and orgasm, it creates the feeling of being "in sync."</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <h4 className="font-serif text-xl font-bold">Vasopressin</h4>
                        <div className="italic text-gray-500 mb-3 text-sm">The "Protective" Chemical</div>
                        <p className="text-gray-700"><strong>Function:</strong> Linked to monogamy, protectiveness, and territorial instincts, particularly in males. Reinforces the desire to stay with and care for a partner.</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <h4 className="font-serif text-xl font-bold">Endorphins</h4>
                        <div className="italic text-gray-500 mb-3 text-sm">The "Comfort" Chemical</div>
                        <p className="text-gray-700"><strong>Function:</strong> The body’s natural pain reliever. Creates the soothing "afterglow" effect and feelings of contentment and calm after intimacy.</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <h4 className="font-serif text-xl font-bold">Prolactin</h4>
                        <div className="italic text-gray-500 mb-3 text-sm">The "Satiety" Chemical</div>
                        <p className="text-gray-700"><strong>Function:</strong> Signals satisfaction and induces the post-orgasm refractory period. It’s why men often feel sleepy and content after sex (levels are stronger in men).</p>
                    </div>
                </div>
            </Section>

            <Section onAskAI={() => handleAskAI("Explain the 5-Phase Model quote.")}>
                <SectionTitle>💞 The Science of Setting the Stage: A 5-Phase Model</SectionTitle>
                <blockquote className="font-serif text-xl text-center border-l-4 border-[#e5398d] text-[#e5398d] p-4 my-8 mx-auto max-w-2xl">"If I feel safe, seen, and teased just enough—I’ll stay aroused all day. The sex becomes the final, amazing chapter of a story we wrote together."</blockquote>
                <blockquote className="font-serif text-xl text-center border-l-4 border-[#4a90e2] text-[#4a90e2] p-4 my-8 mx-auto max-w-2xl">"If I know it’s building to something, I’ll crave it more—and feel more connected when it arrives. It turns sex from a 'want' into a 'need'."</blockquote>
            </Section>

            <Section>
                <SectionTitle>🎯 Final Insight: It’s a Chemical Storyline</SectionTitle>
                <div className="text-center p-5">
                    <p className="text-gray-600 leading-relaxed">The female experience is less about a singular spike and more about the area under the curve—a sustained rise of positive chemicals over time. The male experience often seeks the spike—the peak of the mountain. By building the story together, you both get a better view.</p>
                    <span className="block font-serif text-2xl mt-4 text-[#e5398d]">Her chemistry favors the journey.</span>
                    <span className="block font-serif text-2xl mt-2 text-[#4a90e2]">His chemistry favors the destination.</span>
                    <p className="mt-6 text-lg font-semibold text-gray-700">The goal is to enjoy the entire trip together.</p>
                </div>
            </Section>

            <Section>
                <SectionTitle>A Starting Point for Conversation</SectionTitle>
                <p className="mb-6 text-gray-600 leading-relaxed">Use these prompts to explore how these ideas apply to your unique connection. There are no right or wrong answers.</p>
                <ul className="list-['💬'] pl-6 space-y-4">
                    <li className="pl-3 text-lg text-gray-700">Which "Turn-On Triggers" from the first table resonate most with you personally? Were any surprising?</li>
                    <li className="pl-3 text-lg text-gray-700">How does "Anticipation" feel for each of us? Does it feel like excitement or tension?</li>
                    <li className="pl-3 text-lg text-gray-700">Of the "How to Use" actions, which one feels the most exciting to try this week?</li>
                    <li className="pl-3 text-lg text-gray-700">How can we give each other clearer signals that emotional foreplay is happening and is intentional?</li>
                </ul>
            </Section>
        </div>
    );
};

export default ChemistryGuide;
