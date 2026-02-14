
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import { User } from '../types';

interface Message {
    role: 'user' | 'model';
    text: string;
}

interface ChemistryAIDeepDiveProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    partner: User | null;
    initialQuery?: string;
    onPinInsight: (text: string, source: string) => void;
}

const ChemistryAIDeepDive: React.FC<ChemistryAIDeepDiveProps> = ({ isOpen, onClose, currentUser, partner, initialQuery, onPinInsight }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chat, setChat] = useState<ChatSession | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasInitializedQuery = useRef(false);

    useEffect(() => {
        if (isOpen) {
            initializeGuide();
        } else {
            setMessages([]);
            setChat(null);
            hasInitializedQuery.current = false;
        }
    }, [isOpen]);

    useEffect(() => {
        if (chat && initialQuery && !hasInitializedQuery.current && !isLoading) {
            hasInitializedQuery.current = true;
            handleSendMessage(undefined, initialQuery);
        }
    }, [chat, initialQuery, isLoading]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const initializeGuide = async () => {
        setIsLoading(true);

        try {
            const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY;
            if (!apiKey) {
                throw new Error("Missing VITE_GOOGLE_AI_KEY.");
            }
            const ai = new GoogleGenerativeAI(apiKey);
            const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

            const partnerName = partner?.name || "Partner";
            const userName = currentUser.name;

            // Personalized Context
            const relContext = currentUser.relationshipContext ? `\nRELATIONSHIP CONTEXT: "${currentUser.relationshipContext}"` : "";
            const workingOn = currentUser.workingOn ? `\nCURRENTLY WORKING ON: "${currentUser.workingOn}"` : "";
            const persona = currentUser.agentPersona ? `\nYOUR PERSONA: ${currentUser.agentPersona}` : "\nYOUR PERSONA: Warm, scientific but accessible.";

            const systemPrompt = `You are a specialist in the Neurochemistry of Love and Relationship Dynamics. 
            You are speaking to ${userName} (and possibly their partner ${partnerName}).
            ${relContext}${workingOn}${persona}
            
            Your Knowledge Base:
            1. **The 5 Chemicals**: Dopamine (Wanting), Oxytocin (Bonding), Vasopressin (Protective), Endorphins (Comfort), Prolactin (Satiety).
            2. **Arousal Styles**: 
               - "The Journey" (Typical Female): Arousal builds via emotional context, safety, and anticipation over time.
               - "The Destination" (Typical Male): Arousal is spontaneous, visual, and event-focused.
            3. **Goal**: Help the couple understand these differences and "hack" their chemistry to feel closer.

            Tone: Warm, scientific but accessible, non-judgmental, and practical.
            
            Start by briefly welcoming them to the "Chemistry Lab" and asking a provocative question about their current dynamic, tailored to what they are 'Working On' if provided.`;

            const newChat = model.startChat({
                history: [
                    { role: 'user', parts: [{ text: `INSTRUCTION: ${systemPrompt}` }] },
                    { role: 'model', parts: [{ text: "Welcome to the Chemistry Lab. I am ready to explore the biology of your bond." }] }
                ]
            });
            setChat(newChat);

            if (!initialQuery) {
                const initialPrompt = `Introduce yourself concisely and ask a question to get them thinking about their chemistry loop.`;
                const result = await newChat.sendMessage(initialPrompt);
                const response = await result.response;
                setMessages([{ role: 'model', text: response.text() || "" }]);
            }
        } catch (error: any) {
            console.error("Guide Initialization Error:", error);
            setMessages([{ role: 'model', text: `Connection error: ${error?.message || "Check API key."}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, customMsg?: string) => {
        if (e) e.preventDefault();
        const textToSend = customMsg || input;
        if (!textToSend.trim() || !chat || isLoading) return;

        const userMsg: Message = { role: 'user', text: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await chat.sendMessage(textToSend);
            const response = await result.response;
            const botMsg: Message = { role: 'model', text: response.text() || "I'm thinking..." };
            setMessages(prev => [...prev, botMsg]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'model', text: "Error getting response." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-gray-100 mb-24 sm:mb-28">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl shadow-sm text-2xl">🧪</div>
                        <div>
                            <h2 className="text-xl font-serif font-bold text-gray-800">Chemistry Coach</h2>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Powered by Gemini AI</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Chat Area */}
                <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-6 bg-white scroll-smooth">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-5 rounded-2xl text-sm leading-relaxed shadow-sm relative group text-left ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                {msg.role === 'model' ? (
                                    <div className="markdown-prose">
                                        {msg.text.split('\n').map((line, i) => {
                                            const trimmed = line.trim();
                                            if (!trimmed) return <div key={i} className="h-2" />;
                                            if (trimmed.startsWith('**') && trimmed.endsWith('**')) return <strong key={i} className="block mb-2 text-purple-900">{trimmed.slice(2, -2)}</strong>;
                                            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) return <div key={i} className="flex gap-2 ml-2 mb-1"><span className="text-purple-400">•</span><span>{trimmed.slice(2)}</span></div>;
                                            return <p key={i} className="mb-2">{trimmed}</p>;
                                        })}
                                    </div>
                                ) : (
                                    msg.text
                                )}
                                <button
                                    onClick={() => onPinInsight(msg.text, msg.role === 'model' ? "AI Coach" : "My Question")}
                                    className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-yellow-500 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100"
                                    title="Pin to Insights"
                                >
                                    📌
                                </button>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start animate-pulse">
                            <div className="bg-gray-50 p-4 rounded-2xl rounded-bl-none text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                                Mixing Chemicals...
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                    {messages.length < 3 && (
                        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 no-scrollbar">
                            {[
                                "Explain the 'Journey' vs 'Destination' again.",
                                "How do we boost Oxytocin?",
                                "Why does anticipation matter?",
                                "Give us a chemistry experiment to try."
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSendMessage(undefined, suggestion)}
                                    className="whitespace-nowrap px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition shadow-sm"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                    <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about your chemistry..."
                            className="flex-grow px-5 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 transition disabled:opacity-50 shadow-lg shadow-purple-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChemistryAIDeepDive;
