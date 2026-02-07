
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Term } from '../types';

interface Message {
    role: 'user' | 'model';
    text: string;
}

interface TermAIDeepDiveProps {
    isOpen: boolean;
    onClose: () => void;
    term: Term | null;
    isDemo?: boolean;
}

const TermAIDeepDive: React.FC<TermAIDeepDiveProps> = ({ isOpen, onClose, term, isDemo = false }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chat, setChat] = useState<Chat | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && term) {
            initializeGuide();
        } else {
            setMessages([]);
            setChat(null);
        }
    }, [isOpen, term]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const initializeGuide = async () => {
        if (!term) return;
        setIsLoading(true);

        if (isDemo) {
            setMessages([{ role: 'model', text: "Welcome to the Deep Dive (Demo Mode). I can't generate live advice right now, but in the full version, I would provide a specific script and safety guide for this term!" }]);
            setIsLoading(false);
            return;
        }

        try {
            const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY;
            console.log("Deep Dive AI Key Status:", apiKey ? "Present" : "MISSING");
            if (!apiKey) {
                throw new Error("Missing VITE_GOOGLE_AI_KEY in environment variables.");
            }
            const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
            const systemPrompt = `You are a specialist in intimacy and relationship communication. 
            Your goal is to help a couple explore the specific term "${term.name}" safely and joyfully. 
            The category is "${term.category}". 
            Keep your tone warm, expert, and deeply non-judgmental. 
            Format your advice like a practical "How-To Manual" for a high-end workshop.`;

            const newChat = ai.chats.create({
                model: 'gemini-3-flash-preview',
                history: [
                    { role: 'user', parts: [{ text: `INSTRUCTION: ${systemPrompt}` }] },
                    { role: 'model', parts: [{ text: "Understood. I have prepared your deep dive manual. I'm ready to explain the importance and practical application of this term." }] }
                ]
            });
            setChat(newChat);

            const initialPrompt = `Provide a 3-paragraph "Deep Dive" guide for "${term.name}".`;
            const response = await newChat.sendMessage({ message: initialPrompt });
            setMessages([{ role: 'model', text: response.text || "" }]);
        } catch (error: any) {
            console.error("Guide Initialization Error:", error);
            setMessages([{ role: 'model', text: `I'm having trouble connecting to the guide: ${error?.message || "Check your API key or connection."}` }]);
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

        let prompt = textToSend;
        if (textToSend === "Show me the Deep Dive Guide") {
            prompt = `
                Generate a "Practical Action Manual" for "${term?.name}".
                
                Structure it as follows:
                1. **The Core Logic**: Why this works and the chemistry involved (e.g., oxytocin/dopamine).
                2. **The Workshop Script**: Provide 2-3 specific sentences for the Giver to say to initiate this safely.
                3. **Step-by-Step Manual**: A 3-step physical guide on how to perform the action, starting from "Level 1" (Safe) to "Level 2" (Deeper).
                4. **Calibration (The Receiver)**: Specific cues the receiver can give to help the giver stay on track.
                5. **Post-Action Ritual**: A 1-minute way to reconnect after the act is finished.
                
                Use bold formatting and clear, directive language.
            `;
        }

        if (isDemo) {
            setTimeout(() => {
                setMessages(prev => [...prev, { role: 'model', text: "(Demo) That's a great question! In the full version, I'd give you a detailed answer." }]);
                setIsLoading(false);
            }, 1000);
            return;
        }

        try {
            const response = await chat.sendMessage({ message: prompt });
            setMessages(prev => [...prev, { role: 'model', text: response.text || "" }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I lost my train of thought. Can you ask that again?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderInline = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-gray-900 font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const renderFormattedText = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            const trimmedLine = line.trim();
            if (trimmedLine === '') return <div key={i} className="h-2" />;

            if (trimmedLine.startsWith('#')) {
                const level = (trimmedLine.match(/^#+/) || ['#'])[0].length;
                const content = trimmedLine.replace(/^#+\s*/, '');
                const sizeClass = level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : 'text-lg';
                return <h3 key={i} className={`font-serif ${sizeClass} text-gray-800 mt-5 mb-2 font-bold`}>{renderInline(content)}</h3>;
            }

            const listMatch = trimmedLine.match(/^(\*|-|\d+\.)\s+(.*)/);
            if (listMatch) {
                const content = listMatch[2];
                return (
                    <div key={i} className="flex items-start gap-2 ml-2 mb-1.5">
                        <span className="text-blue-500 font-bold">•</span>
                        <div className="text-gray-600 text-sm leading-relaxed">{renderInline(content)}</div>
                    </div>
                );
            }

            if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                return <h4 key={i} className="font-serif text-lg text-gray-800 mt-4 mb-2 font-bold">{renderInline(trimmedLine)}</h4>;
            }

            return <p key={i} className="text-gray-600 text-sm leading-relaxed mb-2.5">{renderInline(trimmedLine)}</p>;
        });
    };

    if (!isOpen || !term) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <header className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 text-xl">✨</div>
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-gray-800 leading-none">{term.name}</h2>
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Action Manual</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-3xl text-gray-300 hover:text-gray-800 transition">&times;</button>
                </header>

                <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 sm:p-10 space-y-6 scroll-smooth">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] p-5 rounded-3xl ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                                : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                } ${idx === 0 && msg.role === 'model' ? 'bg-blue-50/50 border border-blue-100' : ''}`}>
                                {msg.role === 'model' ? renderFormattedText(msg.text) : <p className="text-sm font-medium">{msg.text}</p>}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 p-4 rounded-2xl flex gap-1">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/30">
                    {!isLoading && (
                        <div className="flex flex-wrap gap-2 mb-4 justify-center">
                            {messages.length < 3 && !messages.some(m => m.text.includes("Action Manual")) && (
                                <button onClick={() => handleSendMessage(undefined, "Show me the Deep Dive Guide")} className="text-[10px] font-bold bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition shadow-md flex items-center gap-1.5">
                                    <span>📖</span> Get the Practical Manual
                                </button>
                            )}
                            <button onClick={() => handleSendMessage(undefined, "Give me a script for the Giver")} className="text-[10px] font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-full hover:border-blue-400 hover:text-blue-600 transition shadow-sm">"What should the Giver say?"</button>
                            <button onClick={() => handleSendMessage(undefined, "How do we check in during?")} className="text-[10px] font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-full hover:border-blue-400 hover:text-blue-600 transition shadow-sm">"How to check-in during"</button>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={`Ask for practical steps for ${term.name}...`}
                            disabled={isLoading}
                            className="flex-grow bg-white border border-gray-200 px-5 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner text-sm"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="bg-blue-600 text-white font-bold px-6 rounded-2xl hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                        >
                            Ask
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TermAIDeepDive;
