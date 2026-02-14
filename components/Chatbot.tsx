
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import ChatIcon from './icons/ChatIcon';

interface Message {
    role: 'user' | 'model';
    text: string;
}

import { User } from '../types';

interface ChatbotProps {
    isDemo?: boolean;
    currentUser: User | null;
    partner: User | null;
}

const Chatbot: React.FC<ChatbotProps> = ({ isDemo = false, currentUser, partner }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chat, setChat] = useState<ChatSession | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const systemInstruction = `You are "The Couples' Currency" AI Guide. Your purpose is to help ${currentUser?.name || 'the user'} (Partner: ${partner?.name || 'their partner'}) navigate the app to improve their relationship.

    **USER CONTEXT:**
    - Relationship Context: "${currentUser?.relationshipContext || 'Not specified'}"
    - Currently Working On: "${currentUser?.workingOn || 'General improvement'}"
    - Partner Name: ${partner?.name || 'Partner'}
    
    **YOUR ROLE:**
    - Be a proactive guide. Don't just answer questions; suggest *specific app features* that help with their "Working On" goal.
    - Use the Relationship Context to be empathetic (e.g., if "Long Distance", suggest digital dates).
    
    **APP FEATURES (Recommend these):**
    1.  **Bank (Dashboard)**: For tracking positive actions.
    2.  **Directory**: A dictionary of intimacy terms. Good for finding words for desires.
    3.  **Favor Board**: For tangible acts of service.
    4.  **Flirts**: For quick romantic pings.
    5.  **Chemistry Guide**: Explains the science of connection.
    6.  **Giving & Receiving**: A framework for consent and desire (Wheel of Consent).
    7.  **Guided Session**: Step-by-step conflict/connection resolution.
    8.  **Reflection Journal**: Private processing.

    **TONE:** Warm, wise, and encouraging. You are a coach, not just a search engine.`;

    const renderInline = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const renderFormattedText = (text: string) => {
        const lines = text.split('\n');
        let inList = false;

        return lines.map((line, i) => {
            const trimmedLine = line.trim();

            // Empty lines
            if (trimmedLine === '') {
                inList = false;
                return <div key={i} className="h-3" />;
            }

            // Headers (## or ###)
            if (trimmedLine.startsWith('#')) {
                inList = false;
                const level = (trimmedLine.match(/^#+/) || [''])[0].length;
                const content = trimmedLine.replace(/^#+\s*/, '');
                const sizeClass = level === 1 ? 'text-xl border-b pb-1 border-gray-300' : level === 2 ? 'text-lg font-bold' : 'text-base font-bold';
                return <h4 key={i} className={`${sizeClass} mt-4 mb-2 text-gray-800`}>{renderInline(content)}</h4>;
            }

            // List items (* or - or 1.)
            const listMatch = trimmedLine.match(/^(\*|-|\d+\.)\s+(.*)/);
            if (listMatch) {
                inList = true;
                const content = listMatch[2];
                return (
                    <div key={i} className={`flex items-start gap-2 ml-1 mb-1 ${inList ? 'mt-1' : 'mt-2'}`}>
                        <span className="text-blue-500 font-bold mt-1.5 text-[6px]">●</span>
                        <div className="text-sm leading-relaxed">{renderInline(content)}</div>
                    </div>
                );
            }

            inList = false;
            // Standard Paragraph
            return <p key={i} className="text-sm mb-2 leading-relaxed">{renderInline(trimmedLine)}</p>;
        });
    };

    useEffect(() => {
        if (isOpen && !chat) {
            if (isDemo) {
                setMessages([{ role: 'model', text: "Hello! I am in Demo Mode, so I can't connect to the live AI right now, but I'm here to show you how the interface looks!" }]);
                return;
            }
            try {
                const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY;
                const ai = new GoogleGenerativeAI(apiKey as string);
                const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

                const newChat = model.startChat({
                    history: [
                        { role: 'user', parts: [{ text: `INSTRUCTION: ${systemInstruction}` }] },
                        { role: 'model', parts: [{ text: "Hello! I am your AI relationship assistant. I'm ready to help you navigate your connection journey." }] }
                    ]
                });
                setChat(newChat);
                const initialMessage = `How can I help you get started today? I can explain terms, help you plan a date, or guide you through a communication exercise.`;
                setMessages([{ role: 'model', text: initialMessage }]);
            } catch (error: any) {
                console.error("Error initializing AI Chat:", error);
                setMessages([{ role: 'model', text: `Sorry, I am unable to connect: ${error?.message || 'Unknown error'}` }]);
            }
        }
    }, [isOpen, chat]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        if (isDemo) {
            setTimeout(() => {
                const demoReply: Message = { role: 'model', text: "I'm just a demo bot! I can't generate real responses, but imagine I just gave you some great relationship advice. 😊" };
                setMessages(prev => [...prev, demoReply]);
                setIsLoading(false);
            }, 1000);
            return;
        }

        try {
            const result = await chat!.sendMessage(input);
            const response = await result.response;
            const text = response.text();
            const modelMessage: Message = { role: 'model', text: text || 'I am sorry, I could not generate a response.' };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error: any) {
            console.error('Error sending message:', error);
            const errorMessage: Message = { role: 'model', text: `I seem to be having trouble responding: ${error?.message || "Internal error"}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className={`fixed bottom-0 right-0 mb-[100px] mr-5 md:mb-5 z-[110] transition-transform duration-300 ${isOpen ? 'translate-y-40' : 'translate-y-0'}`}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-blue-700 transition"
                    aria-label={isOpen ? "Close Chat" : "Open Chat"}
                >
                    <ChatIcon />
                </button>
            </div>

            <div
                className={`fixed bottom-0 right-0 mb-24 mr-5 w-[calc(100%-40px)] sm:w-96 h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col z-[110] transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
                    }`}
            >
                <header className="bg-blue-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
                    <h3 className="font-bold text-lg">AI Assistant</h3>
                    <button onClick={() => setIsOpen(false)} className="text-2xl font-bold">&times;</button>
                </header>

                <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-xl leading-relaxed ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                {msg.role === 'model' ? renderFormattedText(msg.text) : msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-[80%] p-3 rounded-xl bg-gray-200 text-gray-800 rounded-bl-none">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-150"></div>
                                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-300"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..."
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            disabled={isLoading}
                        />
                        <button type="submit" className="px-4 py-2 font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition" disabled={isLoading || !input.trim()}>
                            Send
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default Chatbot;
