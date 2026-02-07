import React from 'react';

const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white rounded-xl shadow-lg p-6 sm:p-9 mb-10 ${className}`}>
    {children}
  </div>
);

const SubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="font-serif text-2xl mt-8 mb-4 border-b border-gray-200 pb-2 text-gray-700">{children}</h3>
);

const GivingReceivingGuide: React.FC = () => {
  return (
    <div>
        <header className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl mb-3 text-gray-800">The Art of Giving & Receiving</h1>
            <p className="text-lg sm:text-xl text-gray-500 max-w-3xl mx-auto">A Conversation Guide for Couples</p>
        </header>

        <Section>
            <SubTitle>1. Why This Matters</SubTitle>
            <p className="text-gray-600 leading-relaxed mb-4">Most couples talk about what they don’t want more easily than what they do want. Desire lives between safety and permission—and the moment partners can say,</p>
            <blockquote className="font-serif text-lg text-center border-l-4 border-gray-300 text-gray-700 p-4 my-4 mx-auto max-w-2xl">
                <p>“Here’s what I want to do to you,”</p>
                <p>“Here’s what I want you to do to me,”</p>
            </blockquote>
            <p className="text-gray-600 leading-relaxed">they move from guessing to co-creating. This guide turns those statements into a structured practice—so intimacy becomes an intentional, playful, and emotionally fluent dialogue.</p>
        </Section>
        
        <Section>
            <SubTitle>2. The Framework: The Four Modes of Consent</SubTitle>
            <p className="text-gray-600 leading-relaxed mb-6">Adapted from Betty Martin’s Wheel of Consent (and refined here for HoneyDo Favors language):</p>
            <div className="overflow-x-auto">
                <table className="w-full text-sm sm:text-base">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="text-left p-3 font-bold text-gray-800">Mode</th>
                            <th className="text-left p-3 font-bold text-gray-800">Who’s Doing</th>
                            <th className="text-left p-3 font-bold text-gray-800">Who It’s For</th>
                            <th className="text-left p-3 font-bold text-gray-800">Essence</th>
                            <th className="text-left p-3 font-bold text-gray-800">Example</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        <tr className="border-b"><td className="p-3"><strong>Serving</strong></td><td className="p-3">Me</td><td className="p-3">You</td><td className="p-3">Giving</td><td className="p-3">“I’m doing this because you enjoy it.”</td></tr>
                        <tr className="border-b"><td className="p-3"><strong>Accepting</strong></td><td className="p-3">You</td><td className="p-3">Me</td><td className="p-3">Receiving</td><td className="p-3">“You’re doing this because I enjoy it.”</td></tr>
                        <tr className="border-b"><td className="p-3"><strong>Taking</strong></td><td className="p-3">Me</td><td className="p-3">Me</td><td className="p-3">Bold Receiving</td><td className="p-3">“I want to explore what feels good to me, with your consent.”</td></tr>
                        <tr><td className="p-3"><strong>Allowing</strong></td><td className="p-3">You</td><td className="p-3">You</td><td className="p-3">Permission</td><td className="p-3">“I’m letting you explore, as long as I feel safe.”</td></tr>
                    </tbody>
                </table>
            </div>
            <p className="text-gray-600 leading-relaxed mt-6">Every act of affection—sexual or otherwise—lives somewhere on this map. Naming the mode keeps both people clear on who’s giving, who’s receiving, and why.</p>
        </Section>
        
        <Section>
            <SubTitle>3. Preparation Ritual</SubTitle>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Environment:</strong> calm, private, distraction-free.</li>
                <li><strong>Timing:</strong> outside intimate moments—date night, coffee, or before bed.</li>
                <li><strong>Tools:</strong> two notecards or a shared HoneyDo sheet.</li>
            </ul>
            <h4 className="font-bold text-lg mt-6 mb-2 text-gray-800">Ground rules</h4>
            <ol className="list-decimal pl-6 space-y-2 text-gray-600">
                <li>No interrupting or debating.</li>
                <li>You may say “pass” on any question.</li>
                <li>Curiosity &gt; performance.</li>
            </ol>
            <p className="text-gray-600 leading-relaxed mt-4">Each partner writes answers to:</p>
            <ol className="list-decimal pl-6 space-y-2 text-gray-600 mt-2">
                <li>“What do I want you to do to me?”</li>
                <li>“What do I want to do to you?”</li>
            </ol>
            <p className="text-gray-600 leading-relaxed mt-4">Then trade one answer at a time and talk about what feeling or state it represents (safety, play, closeness, curiosity, release, etc.).</p>
        </Section>

        <Section>
            <SubTitle>4. Translating Desire Into Feeling</SubTitle>
            <p className="text-gray-600 leading-relaxed">After each statement, add:</p>
            <blockquote className="font-serif text-lg text-center border-l-4 border-gray-300 text-gray-700 p-4 my-4 mx-auto max-w-2xl">“When that happens, I feel ____.”</blockquote>
            <p className="text-gray-600 leading-relaxed"><strong>Example:</strong></p>
            <p className="italic text-gray-700 mt-2">“I want you to guide my hands when we kiss; when that happens, I feel safe and desired.”</p>
            <p className="text-gray-600 leading-relaxed mt-4">This step turns physical requests into emotional language—making it easier for partners who shut down or flood to stay connected.</p>
        </Section>

        <Section>
            <SubTitle>5. The Four Quadrants of Connection</SubTitle>
            <p className="text-gray-600 leading-relaxed mb-8">
                Explore your desires using these four modes. Think of them as different lenses to look through. Try discussing one or two prompts from each quadrant in a conversation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-xl p-6 border-t-4 border-blue-400 shadow-sm">
                    <h4 className="font-serif text-2xl font-bold text-blue-700 mb-4 flex items-center gap-3">
                        <span className="text-3xl">💎</span>
                        <span>Serving</span>
                    </h4>
                    <p className="italic text-blue-900/70 mb-5">Giving for their pleasure. The joy is in their delight.</p>
                    <ul className="space-y-3 text-gray-700">
                        <li className="flex items-start gap-3"><span className="text-blue-500 font-bold mt-1">✓</span><span>I feel fulfilled when I can ___ for you.</span></li>
                        <li className="flex items-start gap-3"><span className="text-blue-500 font-bold mt-1">✓</span><span>I love watching you enjoy ___.</span></li>
                        <li className="flex items-start gap-3"><span className="text-blue-500 font-bold mt-1">✓</span><span>What act of care would make you exhale tonight?</span></li>
                        <li className="flex items-start gap-3"><span className="text-blue-500 font-bold mt-1">✓</span><span>I’d like to learn how you prefer ___.</span></li>
                        <li className="flex items-start gap-3"><span className="text-blue-500 font-bold mt-1">✓</span><span>When you let me give freely, I feel ___.</span></li>
                    </ul>
                </div>

                <div className="bg-pink-50 rounded-xl p-6 border-t-4 border-pink-400 shadow-sm">
                    <h4 className="font-serif text-2xl font-bold text-pink-700 mb-4 flex items-center gap-3">
                        <span className="text-3xl">❤️</span>
                        <span>Accepting</span>
                    </h4>
                    <p className="italic text-pink-900/70 mb-5">Receiving their gift. The joy is in being cherished.</p>
                     <ul className="space-y-3 text-gray-700">
                        <li className="flex items-start gap-3"><span className="text-pink-500 font-bold mt-1">✓</span><span>I love when you ___; it helps me feel ___.</span></li>
                        <li className="flex items-start gap-3"><span className="text-pink-500 font-bold mt-1">✓</span><span>I’d feel cherished if you took time to ___.</span></li>
                        <li className="flex items-start gap-3"><span className="text-pink-500 font-bold mt-1">✓</span><span>I want to relax while you ___.</span></li>
                        <li className="flex items-start gap-3"><span className="text-pink-500 font-bold mt-1">✓</span><span>When I let you take the lead, I feel ___.</span></li>
                        <li className="flex items-start gap-3"><span className="text-pink-500 font-bold mt-1">✓</span><span>Afterward, I appreciate when you ___.</span></li>
                    </ul>
                </div>
                
                <div className="bg-orange-50 rounded-xl p-6 border-t-4 border-orange-400 shadow-sm">
                    <h4 className="font-serif text-2xl font-bold text-orange-700 mb-4 flex items-center gap-3">
                        <span className="text-3xl">🔥</span>
                        <span>Taking</span>
                    </h4>
                    <p className="italic text-orange-900/70 mb-5">Pursuing your pleasure. The joy is in your own desire.</p>
                     <ul className="space-y-3 text-gray-700">
                        <li className="flex items-start gap-3"><span className="text-orange-500 font-bold mt-1">✓</span><span>With your consent, I’d love to explore ___.</span></li>
                        <li className="flex items-start gap-3"><span className="text-orange-500 font-bold mt-1">✓</span><span>I get turned on by noticing ___ about you.</span></li>
                        <li className="flex items-start gap-3"><span className="text-orange-500 font-bold mt-1">✓</span><span>I’d feel alive if I could ___ while you watched.</span></li>
                        <li className="flex items-start gap-3"><span className="text-orange-500 font-bold mt-1">✓</span><span>I want to feel bold by ___.</span></li>
                        <li className="flex items-start gap-3"><span className="text-orange-500 font-bold mt-1">✓</span><span>When I take initiative, I hope you feel ___.</span></li>
                    </ul>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-6 border-t-4 border-purple-400 shadow-sm">
                    <h4 className="font-serif text-2xl font-bold text-purple-700 mb-4 flex items-center gap-3">
                        <span className="text-3xl">🌙</span>
                        <span>Allowing</span>
                    </h4>
                    <p className="italic text-purple-900/70 mb-5">Granting them freedom. The joy is in witnessing their exploration.</p>
                     <ul className="space-y-3 text-gray-700">
                        <li className="flex items-start gap-3"><span className="text-purple-500 font-bold mt-1">✓</span><span>I enjoy watching you explore ___.</span></li>
                        <li className="flex items-start gap-3"><span className="text-purple-500 font-bold mt-1">✓</span><span>You have permission to ___ as long as I say yes.</span></li>
                        <li className="flex items-start gap-3"><span className="text-purple-500 font-bold mt-1">✓</span><span>I like witnessing your pleasure when ___.</span></li>
                        <li className="flex items-start gap-3"><span className="text-purple-500 font-bold mt-1">✓</span><span>What does freedom look like for you in this space?</span></li>
                        <li className="flex items-start gap-3"><span className="text-purple-500 font-bold mt-1">✓</span><span>When I allow you, I feel ___.</span></li>
                    </ul>
                </div>
            </div>
        </Section>
        
        <Section>
            <SubTitle>6. Reflection & Aftercare</SubTitle>
            <p className="text-gray-600 leading-relaxed mb-4">After each session:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Share one thing that surprised you.</li>
                <li>One thing that felt especially safe.</li>
                <li>One thing you’d try differently next time.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed my-4">Close by trading this sentence:</p>
            <blockquote className="font-serif text-lg text-center border-l-4 border-gray-300 text-gray-700 p-4 my-4 mx-auto max-w-2xl">“Thank you for trusting me with that.”</blockquote>
            <p className="text-gray-600 leading-relaxed">That phrase alone trains nervous systems to pair honesty with gratitude, not fear.</p>
        </Section>

        <Section>
            <SubTitle>7. Troubleshooting Common Barriers</SubTitle>
            <div className="overflow-x-auto">
                <table className="w-full text-sm sm:text-base">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="text-left p-3 font-bold text-gray-800">Challenge</th>
                            <th className="text-left p-3 font-bold text-gray-800">Root Cause</th>
                            <th className="text-left p-3 font-bold text-gray-800">Reframe</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        <tr className="border-b"><td className="p-3">“I freeze when asked what I want.”</td><td className="p-3">Fear of rejection / conditioning</td><td className="p-3">Start with feelings, not acts. “I want to feel cared for.”</td></tr>
                        <tr className="border-b"><td className="p-3">“It sounds selfish.”</td><td className="p-3">Guilt around receiving</td><td className="p-3">Receiving gives your partner a chance to succeed.</td></tr>
                        <tr className="border-b"><td className="p-3">“We lose the mood when we talk.”</td><td className="p-3">Unpracticed verbalizing</td><td className="p-3">Treat talking as foreplay for the nervous system.</td></tr>
                        <tr><td className="p-3">“I’m afraid they’ll think I’m weird.”</td><td className="p-3">Shame or secrecy</td><td className="p-3">Curiosity ≠ judgment. Curiosity builds trust.</td></tr>
                    </tbody>
                </table>
            </div>
        </Section>

        <Section>
            <SubTitle>8. Bringing It All Together</SubTitle>
            <p className="text-gray-600 leading-relaxed mb-4">Intimacy isn’t a single act—it’s a language. Every time you ask, “Who is this for?” you bring your relationship closer to fluency in that language. The more fluent you become, the safer and more adventurous the space gets.</p>
            <blockquote className="font-serif text-lg text-center border-l-4 border-gray-300 text-gray-700 p-4 my-4 mx-auto max-w-2xl">The gift of giving and receiving is not symmetry; it’s transparency. When each partner can say, “I know what we’re doing and why,” pleasure becomes mutual creation—not negotiation.</blockquote>
        </Section>
    </div>
  );
};

export default GivingReceivingGuide;
