import React, { useState, useRef } from 'react';

const Card: React.FC<{
    title: string;
    subtitle?: string;
    icon: string;
    colorClass: string;
    children: React.ReactNode;
}> = ({ title, subtitle, icon, colorClass, children }) => (
    <div className="w-full snap-center shrink-0 flex items-center justify-center p-4">
        <div className={`w-full max-w-sm aspect-[4/5] rounded-[2.5rem] p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl ${colorClass}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="text-6xl mb-6 bg-white/30 w-24 h-24 rounded-full flex items-center justify-center shadow-inner backdrop-blur-sm relative z-10 border border-white/40">
                {icon}
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-800 text-center mb-2 relative z-10 leading-tight">
                {title}
            </h2>
            {subtitle && (
                <p className="text-sm font-bold uppercase tracking-wider text-gray-800/60 mb-6 text-center relative z-10">
                    {subtitle}
                </p>
            )}
            <div className="text-center text-gray-800/90 leading-relaxed text-sm sm:text-base relative z-10 flex-1 flex flex-col justify-center">
                {children}
            </div>
        </div>
    </div>
);

const ScienceGuide: React.FC = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const cards = [
        {
            title: "A Tool, Not A Therapist",
            subtitle: "The Disclaimer",
            icon: "⚖️",
            colorClass: "bg-gradient-to-br from-slate-100 to-gray-200 border border-white/50",
            content: (
                <>
                    <p className="mb-4 font-serif italic text-lg">"We are not therapists. We are couples who read the research and built a tool to apply it."</p>
                    <p>If your relationship is in crisis, please seek a licensed professional. This app is designed for playful enhancement, connection, and curiosity—not crisis management.</p>
                </>
            )
        },
        {
            title: "The Brakes & The Accelerator",
            subtitle: "Emily Nagoski • The Dual Control Model",
            icon: "🚥",
            colorClass: "bg-gradient-to-br from-green-50 to-teal-100 border border-white/50",
            content: (
                <>
                    <p className="mb-4">Desire isn't just about adding turn-ons (the accelerator). For many, it's about removing turn-offs (the brakes).</p>
                    <p>Invisible labor, mental load, and a messy house are massive brakes. Paying a "bounty" to do the laundry isn't buying affection—it's an act of service that removes a stressor, creating space where <strong>responsive desire</strong> can naturally occur.</p>
                </>
            )
        },
        {
            title: "The Magic Circle",
            subtitle: "Esther Perel • Erotic Intelligence",
            icon: "🎪",
            colorClass: "bg-gradient-to-br from-purple-50 to-fuchsia-100 border border-white/50",
            content: (
                <>
                    <p className="mb-4">Long-term relationships often suffer from too much domestic predictability. Eroticism requires distance, mystery, and play.</p>
                    <p>Gamifying chores and favors creates a "magic circle" where couples step out of their domestic roles (co-managers of a house) and into playful roles. It introduces anticipation and lighthearted negotiation.</p>
                </>
            )
        },
        {
            title: "Avoid Unhealthy Ways to Use the App",
            subtitle: "Guardrails & Safety",
            icon: "🛡️",
            colorClass: "bg-gradient-to-br from-rose-50 to-red-100 border border-white/50",
            content: (
                <div className="space-y-4 text-left">
                    <div>
                        <strong className="text-red-800 block mb-1">❌ The Ledger of Resentment</strong>
                        <p className="text-xs">Don't use the app to keep a strict, bitter score. The currency is an invitation to give, not a debt to be collected.</p>
                    </div>
                    <div>
                        <strong className="text-red-800 block mb-1">❌ Conditional Love</strong>
                        <p className="text-xs">The app should not be the <em>only</em> way you get affection. Baseline respect must be unconditional.</p>
                    </div>
                    <div>
                        <strong className="text-red-800 block mb-1">⚠️ Bodily Autonomy</strong>
                        <p className="text-xs">Buying a favor does not override in-the-moment consent. You must always have the freedom to say "I'm not in the mood right now."</p>
                    </div>
                </div>
            )
        },
        {
            title: "Ready to Play?",
            subtitle: "Start Connecting",
            icon: "✨",
            colorClass: "bg-gradient-to-br from-blue-50 to-indigo-100 border border-white/50",
            content: (
                <>
                    <p className="mb-6 text-lg">When you reframe chores as acts of service and connection as a game, everyone wins.</p>
                    <p className="font-bold text-indigo-700 mt-4 animate-pulse">↓ Scroll down to explore the frameworks ↓</p>
                </>
            )
        }
    ];

    const handleScroll = () => {
        if (!scrollRef.current) return;

        const scrollPosition = scrollRef.current.scrollLeft;
        const cardWidth = scrollRef.current.offsetWidth;

        // Calculate which card is currently taking up the majority of the view
        const index = Math.round(scrollPosition / cardWidth);
        setActiveIndex(index);
    };

    const scrollToCard = (index: number) => {
        if (!scrollRef.current) return;
        const cardWidth = scrollRef.current.offsetWidth;
        scrollRef.current.scrollTo({
            left: index * cardWidth,
            behavior: 'smooth'
        });
    };

    return (
        <div className="relative w-full flex flex-col py-8 -mx-4 sm:mx-0 sm:px-0">
            {/* Header */}
            <div className="px-6 mb-6 text-center shrink-0">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-gray-800">The Science of Connection</h2>
                <p className="text-xs text-gray-500 tracking-wider uppercase mt-1">Swipe to learn</p>
            </div>

            {/* Carousel Container */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 w-full flex overflow-x-auto snap-x snap-mandatory hide-scrollbar overscroll-x-contain items-center"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {cards.map((card, i) => (
                    <Card key={i} {...card}>
                        {card.content}
                    </Card>
                ))}
            </div>

            {/* Dot Indicators */}
            <div className="shrink-0 flex justify-center gap-2 mt-6 px-6">
                {cards.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => scrollToCard(i)}
                        className={`transition-all duration-300 rounded-full ${activeIndex === i
                            ? 'w-6 h-2.5 bg-indigo-600'
                            : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
                            }`}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>

            {/* Navigation Buttons */}
            <div className="max-w-md w-full mx-auto mt-6 px-10 flex justify-between items-center shrink-0">
                <button
                    onClick={() => scrollToCard(activeIndex - 1)}
                    disabled={activeIndex === 0}
                    className="px-6 py-2.5 text-sm font-bold bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                    Back
                </button>
                <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                    {activeIndex + 1} / {cards.length}
                </div>
                <button
                    onClick={() => scrollToCard(activeIndex + 1)}
                    disabled={activeIndex === cards.length - 1}
                    className="px-6 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                    Next
                </button>
            </div>

            {/* Global Hide Scrollbar Style Inject */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}} />
        </div>
    );
};

export default ScienceGuide;
