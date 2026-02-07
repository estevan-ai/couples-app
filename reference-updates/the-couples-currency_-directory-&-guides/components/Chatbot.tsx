
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import ChatIcon from './icons/ChatIcon';

interface Message {
    role: 'user' | 'model';
    text: string;
}

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const systemInstruction = `You are a helpful and compassionate AI assistant for "The Couples Currency". Your purpose is to guide users through the app's content and help them have better conversations about intimacy and connection.

The app has four main sections:
1.  **Terms Directory**: A dictionary of intimacy terms, from "Sweet & Safe" to "Wild & Advanced". Users can filter and bookmark terms they like. You can help them find terms or understand categories.
2.  **Chemistry Guide**: Explains the brain chemistry of connection (dopamine, oxytocin, etc.) and the differences between "journey" (emotional build-up) vs. "destination" (event-focused) arousal. You can clarify these concepts.
3.  **Giving & Receiving Guide**: Based on the Wheel of Consent, it introduces four modes: Serving, Accepting, Taking, and Allowing. It's a framework for clear communication about desire. You can explain these modes.
4.  **Guided Session**: A step-by-step interactive guide that walks a couple through a conversation using the Giving & Receiving framework.

Your persona is warm, encouraging, and non-judgmental. You are not a therapist, so do not give medical or psychological advice. Instead, gently guide users back to the app's tools and frameworks. Help them find the right words and feel more confident starting these important conversations. Be concise and clear in your answers.`;

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
        return lines.map((line, i) => {
            const trimmedLine = line.trim();
            if (trimmedLine === '') return <div key={i} className="h-2" />;

            // Headers
            if (trimmedLine.startsWith('#')) {
                const level = (trimmedLine.match(/^#+/) || ['#'])[0].length;
                const content = trimmedLine.replace(/^#+\s*/, '');
                const sizeClass = level === 1 ? 'text-xl' : level === 2 ? 'text-lg' : 'text-base';
                return <h4 key={i} className={`${sizeClass} font-bold mt-3 mb-1`}>{renderInline(content)}</h4>;
            }

            // List items
            const listMatch = trimmedLine.match(/^(\*|-|\d+\.)\s+(.*)/);
            if (listMatch) {
                const content = listMatch[2];
                return (
                    <div key={i} className="flex items-start gap-2 ml-1 mb-1">
                        <span className="text-blue-500 font-bold">•</span>
                        <div className="text-sm">{renderInline(content)}</div>
                    </div>
                );
            }

            // Paragraph
            return <p key={i} className="text-sm mb-2">{renderInline(trimmedLine)}</p>;
        });
    };

    useEffect(() => {
        if (isOpen && !chat) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                const newChat = ai.chats.create({
                    model: 'gemini-3-flash-preview',
                    config: {
                        systemInstruction: systemInstruction,
                    },
                });
                setChat(newChat);
                const initialMessage = `Hello! I'm your AI Assistant for **The Couples Currency**. I can help you:\n\n* Discover new language for intimacy in our **Terms Directory**.\n* Understand the chemistry of connection in our **Chemistry Guide**.\n* Learn a clear framework for communicating desires using the **Giving & Receiving Guide**.\n* Practice these conversations together with our **Guided Session**.\n\nHow can I help you get started?`;
                setMessages([{ role: 'model', text: initialMessage }]);
            } catch (error) {
                console.error("Error initializing AI Chat:", error);
                setMessages([{ role: 'model', text: 'Sorry, I am unable to connect right now.' }]);
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
        if (!input.trim() || isLoading || !chat) return;

        const userMessage: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chat.sendMessage({ message: input });
            const modelMessage: Message = { role: 'model', text: response.text || 'I am sorry, I could not generate a response.' };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = { role: 'model', text: 'I seem to be having trouble responding. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className={`fixed bottom-0 right-0 m-5 transition-transform duration-300 ${isOpen ? 'translate-y-40' : 'translate-y-0'}`}>
                 <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-blue-700 transition"
                    aria-label={isOpen ? "Close Chat" : "Open Chat"}
                >
                    <ChatIcon />
                </button>
            </div>

            <div
                className={`fixed bottom-0 right-0 mb-24 mr-5 w-[calc(100%-40px)] sm:w-96 h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
                    isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
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
