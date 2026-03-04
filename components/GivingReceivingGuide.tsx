import React, { useState } from 'react';
import ScienceGuide from './ScienceGuide';

const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-9 mb-10 transition-all duration-300 hover:shadow-2xl ${className}`}>
        {children}
    </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; author?: string; credentials?: string }> = ({ children, author, credentials }) => (
    <div className="mb-8 border-b border-gray-200 pb-4">
        <h2 className="font-serif text-3xl text-gray-800">{children}</h2>
        {author && (
            <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-bold text-indigo-600 tracking-wide uppercase">{author}</span>
                {credentials && <span className="text-xs text-gray-500 italic">| {credentials}</span>}
            </div>
        )}
    </div>
);

const GivingReceivingGuide: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto pb-20">
            <header className="text-center mb-12 relative animate-in slide-in-from-bottom-4 duration-700">
                <div className="inline-block p-4 bg-indigo-50 rounded-full mb-4">
                    <span className="text-4xl">🏛️</span>
                </div>
                <h1 className="text-4xl sm:text-5xl mb-4 font-serif font-bold text-gray-800 tracking-tight">The Architecture of Intimacy</h1>
                <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto font-serif italic">
                    Building connection through clarity, safety, and understanding.
                </p>
            </header>

            {/* Embedded Carousel Content */}
            <div className="mb-16 -mx-4 sm:mx-0">
                <ScienceGuide />
            </div>

            <Section className="animate-in slide-in-from-bottom-8 duration-700 delay-100">
                <SectionTitle
                    author="Dr. Betty Martin"
                    credentials="The Art of Receiving and Giving"
                >
                    1. The Four Quadrants of Connection
                </SectionTitle>
                <p className="text-gray-600 leading-relaxed mb-8 text-lg">
                    In her groundbreaking book, <em>The Art of Receiving and Giving: The Wheel of Consent</em>, Dr. Betty Martin outlines a framework where desire lives between safety and permission. Often, we confuse <strong>who is doing the action</strong> with <strong>who the action is for</strong>. Breaking this down creates profound clarity and safety in intimacy.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border-t-4 border-blue-500 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 opacity-10 text-6xl">💎</div>
                        <h4 className="font-serif text-2xl font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <span>Serving</span>
                        </h4>
                        <div className="inline-block bg-blue-200/50 text-blue-800 text-xs font-bold px-2 py-1 rounded mb-4">I DO • FOR YOU</div>
                        <p className="text-blue-900/80 mb-5 leading-relaxed">Giving for their pleasure. The joy is in their delight and your ability to provide it.</p>
                        <ul className="space-y-3 text-sm text-gray-700">
                            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span><span>"I'd love to massage your shoulders tonight."</span></li>
                            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span><span>"Tell me how you want this."</span></li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-br from-pink-50 to-pink-100/50 rounded-2xl p-6 border-t-4 border-pink-500 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 opacity-10 text-6xl">❤️</div>
                        <h4 className="font-serif text-2xl font-bold text-pink-800 mb-2 flex items-center gap-2">
                            <span>Accepting</span>
                        </h4>
                        <div className="inline-block bg-pink-200/50 text-pink-800 text-xs font-bold px-2 py-1 rounded mb-4">YOU DO • FOR ME</div>
                        <p className="text-pink-900/80 mb-5 leading-relaxed">Receiving their gift. The joy is in being cherished and allowing yourself to be cared for.</p>
                        <ul className="space-y-3 text-sm text-gray-700">
                            <li className="flex items-start gap-2"><span className="text-pink-500 mt-0.5">✓</span><span>"I love when you play with my hair."</span></li>
                            <li className="flex items-start gap-2"><span className="text-pink-500 mt-0.5">✓</span><span>"That feels amazing, don't stop."</span></li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl p-6 border-t-4 border-orange-500 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 opacity-10 text-6xl">🔥</div>
                        <h4 className="font-serif text-2xl font-bold text-orange-800 mb-2 flex items-center gap-2">
                            <span>Taking</span>
                        </h4>
                        <div className="inline-block bg-orange-200/50 text-orange-800 text-xs font-bold px-2 py-1 rounded mb-4">I DO • FOR ME</div>
                        <p className="text-orange-900/80 mb-5 leading-relaxed">Pursuing your pleasure with their consent. The joy is in your own desire and agency.</p>
                        <ul className="space-y-3 text-sm text-gray-700">
                            <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">✓</span><span>"I'd really like to explore this with you."</span></li>
                            <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">✓</span><span>"I want to feel bold by trying __."</span></li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 border-t-4 border-purple-500 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 opacity-10 text-6xl">🌙</div>
                        <h4 className="font-serif text-2xl font-bold text-purple-800 mb-2 flex items-center gap-2">
                            <span>Allowing</span>
                        </h4>
                        <div className="inline-block bg-purple-200/50 text-purple-800 text-xs font-bold px-2 py-1 rounded mb-4">YOU DO • FOR YOU</div>
                        <p className="text-purple-900/80 mb-5 leading-relaxed">Granting them freedom. The joy is in witnessing their exploration and pleasure.</p>
                        <ul className="space-y-3 text-sm text-gray-700">
                            <li className="flex items-start gap-2"><span className="text-purple-500 mt-0.5">✓</span><span>"You have permission to explore, I will let you know if I need to stop."</span></li>
                            <li className="flex items-start gap-2"><span className="text-purple-500 mt-0.5">✓</span><span>"I enjoy watching you enjoy this."</span></li>
                        </ul>
                    </div>
                </div>
            </Section>

            <Section className="animate-in slide-in-from-bottom-8 duration-700 delay-200">
                <SectionTitle
                    author="Emily Nagoski, Ph.D."
                    credentials="Come As You Are"
                >
                    2. The Dual Control Model
                </SectionTitle>
                <p className="text-gray-600 leading-relaxed mb-8 text-lg">
                    Human sexual response involves two separate mechanisms: the <strong>accelerator</strong> (noticing sex-related stimuli) and the <strong>brakes</strong> (noticing reasons not to be aroused). For many people, low desire isn't a broken accelerator—it's brakes that are pushed down too hard by stress, mental load, or exhaustion.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                    <div className="flex flex-col items-center text-center p-6 bg-green-50 rounded-2xl border border-green-100">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mb-4 shadow-sm">
                            🟢
                        </div>
                        <h4 className="font-bold text-gray-800 mb-2 text-xl">The Accelerator</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Responds to sexually relevant information. Focus on adding "turn-ons" (intimacy, compliments, touch, visual cues).
                        </p>
                    </div>
                    <div className="flex flex-col items-center text-center p-6 bg-red-50 rounded-2xl border border-red-100">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mb-4 shadow-sm">
                            🛑
                        </div>
                        <h4 className="font-bold text-gray-800 mb-2 text-xl">The Brakes</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Responds to threats or stress. To increase desire, focus first on removing "turn-offs" (stress, chores, unaddressed conflict).
                        </p>
                    </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-3 text-lg">Spontaneous vs. Responsive Desire</h4>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        <strong>Spontaneous desire</strong> emerges out of the blue. You just feel it. <strong>Responsive desire</strong> emerges in response to pleasure. You start neutral, experience something pleasurable (touch, emotional connection), and <em>then</em> desire arises. Neither is better; responsive desire is highly common, especially in long-term relationships.
                    </p>
                </div>
            </Section>

            <Section className="animate-in slide-in-from-bottom-8 duration-700 delay-300">
                <SectionTitle
                    author="Dr. John Gottman"
                    credentials="The Gottman Institute"
                >
                    3. Bids for Connection
                </SectionTitle>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1">
                        <p className="text-gray-600 leading-relaxed mb-6 text-lg">
                            Intimacy is rarely built in the bedroom—it's built in the kitchen, the car, and passing in the hallway. A "bid" is any attempt from one partner to another for attention, affirmation, affection, or any other positive connection.
                        </p>
                        <blockquote className="border-l-4 border-indigo-400 pl-4 py-2 my-6 bg-indigo-50/50 rounded-r-lg">
                            <p className="text-gray-700 font-serif italic text-lg leading-relaxed">
                                "The defining difference between couples who stay together and those who don't is how they respond to these bids."
                            </p>
                        </blockquote>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            When your partner sighs, points out a bird, or sends a meme, they are making a bid. You can <strong>turn toward</strong> (engage), <strong>turn away</strong> (ignore), or <strong>turn against</strong> (snap). Turning toward builds the "emotional bank account" that makes vulnerability and physical intimacy possible later.
                        </p>
                    </div>
                    <div className="w-full md:w-1/3 bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-inner">
                        <h4 className="font-bold text-gray-800 mb-4 text-center">Micro-Interactions</h4>
                        <ul className="space-y-4">
                            <li className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">The Bid</span>
                                <span className="text-sm bg-white p-2 border border-gray-200 rounded-lg">"Look at this cute dog."</span>
                            </li>
                            <li className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-green-500 uppercase tracking-wide">Turning Toward</span>
                                <span className="text-sm bg-green-50 p-2 border border-green-200 rounded-lg text-green-800">"Oh wow, so fluffy!"</span>
                            </li>
                            <li className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Turning Away</span>
                                <span className="text-sm bg-red-50 p-2 border border-red-200 rounded-lg text-red-800">(Silence / keeps scrolling)</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </Section>

            <Section className="animate-in slide-in-from-bottom-8 duration-700 delay-400">
                <SectionTitle
                    author="Esther Perel"
                    credentials="Mating in Captivity"
                >
                    4. Erotic Intelligence
                </SectionTitle>
                <p className="text-gray-600 leading-relaxed mb-8 text-lg">
                    Long-term relationships require reconciling two fundamental, yet conflicting human needs: our need for <strong>security and safety</strong>, and our need for <strong>mystery and adventure</strong>.
                </p>
                <div className="relative p-8 rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-900 text-white shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                        <div>
                            <h4 className="font-serif text-2xl font-bold mb-3 text-indigo-300">The Comfort Zone</h4>
                            <p className="text-slate-300 leading-relaxed text-sm mb-4">
                                Love seeks familiarity, knowing everything about the other, shrinking the distance, and establishing domestic safety. This builds a rock-solid team.
                            </p>
                            <span className="inline-block border border-indigo-500/50 text-indigo-300 text-xs px-3 py-1 rounded-full bg-indigo-500/10">Predictability</span>
                        </div>
                        <div>
                            <h4 className="font-serif text-2xl font-bold mb-3 text-pink-300">The Erotic Zone</h4>
                            <p className="text-slate-300 leading-relaxed text-sm mb-4">
                                Desire needs space. It seeks the unknown, novelty, risk, and playfulness. It requires stepping out of the roles of "co-managers of a household" into something separate.
                            </p>
                            <span className="inline-block border border-pink-500/50 text-pink-300 text-xs px-3 py-1 rounded-full bg-pink-500/10">Distance & Mystery</span>
                        </div>
                    </div>

                    <div className="mt-10 p-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                        <p className="text-center font-serif italic text-lg opacity-90">
                            "Fire needs air. Desire needs space."
                        </p>
                        <p className="text-center text-sm mt-3 opacity-70">
                            To cultivate desire, couples must intentionally step away from domestic routines to see each other in their full, radiant autonomy again.
                        </p>
                    </div>
                </div>
            </Section>

            <Section className="animate-in slide-in-from-bottom-8 duration-700 delay-500 border-indigo-200 bg-indigo-50/30">
                <SectionTitle>Discussion Prompts</SectionTitle>
                <p className="text-gray-600 leading-relaxed mb-6">Take these frameworks and discuss them together. Pick one prompt for tonight:</p>
                <div className="space-y-4">
                    <div className="flex gap-4 items-start bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">1</div>
                        <div>
                            <h4 className="font-bold text-gray-800 mb-1">On the Wheel of Consent</h4>
                            <p className="text-sm text-gray-600">Which of the four quadrants (Serving, Accepting, Taking, Allowing) do you feel most comfortable in? Which one feels most vulnerable to ask for or participate in?</p>
                        </div>
                    </div>
                    <div className="flex gap-4 items-start bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                        <div>
                            <h4 className="font-bold text-gray-800 mb-1">On the Brakes & Accelerator</h4>
                            <p className="text-sm text-gray-600">What are the most common "brakes" (stressors, distractions) that prevent you from feeling present or aroused? How can we help take those brakes off for each other?</p>
                        </div>
                    </div>
                    <div className="flex gap-4 items-start bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">3</div>
                        <div>
                            <h4 className="font-bold text-gray-800 mb-1">On Safety vs. Mystery</h4>
                            <p className="text-sm text-gray-600">When was the last time you saw me "in my element" (confident, separate, doing something I'm good at) and felt a spark of attraction? How can we create more of that space?</p>
                        </div>
                    </div>
                </div>
            </Section>
        </div>
    );
};

export default GivingReceivingGuide;
