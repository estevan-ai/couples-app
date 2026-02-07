
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { JournalEntry } from '../types';
import { User } from '../types';

interface ReflectionJournalProps {
    entries: JournalEntry[];
    onAddEntry: (entry: JournalEntry) => void;
    currentUser: User;
}

const ReflectionJournal: React.FC<ReflectionJournalProps> = ({ entries, onAddEntry, currentUser }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeView, setActiveView] = useState<'chat' | 'history'>('chat');
    const [chat, setChat] = useState<any>(null);
    const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);

    const recognitionRef = useRef<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isProcessing]);

    useEffect(() => {
        const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY;
        if (!apiKey) return;

        const ai = new GoogleGenAI({ apiKey: apiKey as string, apiVersion: 'v1beta' });
        const systemPrompt = `You are the Reflection Coach for "The Couples Currency".
    Your goal: Help ${currentUser.name} explore their feelings about intimacy, their partner, and their own needs.
    
    Style:
    - Warm, insightful, and gently challenging.
    - Not a licensed therapist, but a structured mirror.
    - Use "Mirroring": If they share a dislike, say "It sounds like [X] feels complicated for you because of [Y]."
    - Use "Gentle Prompts": Ask "How might your partner perceive this same situation?" or "What would it look like if you felt 10% more safe in this moment?"
    - If they mention a "Love" or "Like" from the directory, help them articulate why it resonates.
    
    Critical Task: After significant input (3+ user messages or a long monologue), you MUST provide a JSON-like summary block that looks like:
    [ENTRY_SUMMARY: A 1-sentence headline]
    [ENTRY_PERSPECTIVE: A paragraph of your coaching insight]
    [ENTRY_CATEGORY: reflection|gratitude|complication|discovery]
    `;

        const newChat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            history: [
                { role: 'user', parts: [{ text: `INSTRUCTION: ${systemPrompt}` }] },
                { role: 'model', parts: [{ text: `Understood. Hi ${currentUser.name}. I am your Reflection Coach. I'm ready to listen and help you explore your connection journey.` }] }
            ]
        });
        setChat(newChat);
        setMessages([{ role: 'model', text: `Hi ${currentUser.name}. This is your private space. Talk to me about what's on your mind—your desires, your frustrations, or just how your connection is feeling today.` }]);
    }, [currentUser.name]);

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
        } else {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            if (!SpeechRecognition) {
                alert("Speech recognition is not supported in this browser.");
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result: any) => result.transcript)
                    .join('');
                setInputText(transcript);
            };

            recognition.onend = () => setIsRecording(false);
            recognition.start();
            recognitionRef.current = recognition;
            setIsRecording(true);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || isProcessing || !chat) return;

        const userText = inputText;
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setInputText('');
        setIsProcessing(true);

        try {
            const response = await chat.sendMessage({ message: userText });
            const modelText = response.text || "";
            setMessages(prev => [...prev, { role: 'model', text: modelText }]);

            // Check for summary blocks to create journal entries
            if (modelText.includes('[ENTRY_SUMMARY:')) {
                const summary = modelText.match(/\[ENTRY_SUMMARY: (.*?)\]/)?.[1] || "Reflection Note";
                const perspective = modelText.match(/\[ENTRY_PERSPECTIVE: (.*?)\]/)?.[1] || "Keep exploring.";
                const category = (modelText.match(/\[ENTRY_CATEGORY: (.*?)\]/)?.[1] || "reflection") as any;

                onAddEntry({
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    summary,
                    rawInput: userText,
                    category,
                    aiPerspective: perspective
                });
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble reflecting right now. Try again?" }]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto h-[75vh] flex flex-col gap-6 animate-in fade-in duration-500 pb-24 sm:pb-0">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-gray-800">Your Reflection Space</h2>
                    <p className="text-sm text-gray-500">Private thoughts & AI-curated insights.</p>
                </div>
                <div className="flex bg-gray-200 p-1 rounded-2xl">
                    <button
                        onClick={() => setActiveView('chat')}
                        className={`px-6 py-2 rounded-xl text-xs font-bold transition ${activeView === 'chat' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Talk
                    </button>
                    <button
                        onClick={() => setActiveView('history')}
                        className={`px-6 py-2 rounded-xl text-xs font-bold transition ${activeView === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Insights ({entries.length})
                    </button>
                </div>
            </div>

            {activeView === 'chat' ? (
                <div className="flex-grow flex flex-col bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div ref={scrollRef} className="flex-grow p-6 overflow-y-auto space-y-6">
                        {messages.map((m, idx) => (
                            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-5 rounded-3xl ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-lg' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                    {m.role === 'user' ? m.text : (
                                        <div className="markdown-prose">
                                            {m.text.split('[')[0].split('\n').map((line, i) => {
                                                const trimmed = line.trim();
                                                if (!trimmed) return <div key={i} className="h-3" />;

                                                // Simple Bold Parsing
                                                const parts = trimmed.split(/(\*\*.*?\*\*)/g).map((part, pIdx) =>
                                                    part.startsWith('**') ? <strong key={pIdx}>{part.slice(2, -2)}</strong> : part
                                                );

                                                if (trimmed.startsWith('#'))
                                                    return <h4 key={i} className="font-serif font-bold text-lg mt-3 mb-1 text-gray-800">{parts}</h4>;

                                                if (trimmed.match(/^(\*|-)\s/))
                                                    return <div key={i} className="flex gap-2 ml-2 mb-1"><span className="text-blue-400">•</span><span>{parts}</span></div>;

                                                return <p key={i} className="mb-2 text-sm leading-relaxed text-gray-700">{parts}</p>;
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 p-4 rounded-2xl flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleRecording}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-md ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                            >
                                {isRecording ? <span className="text-xl">⏹️</span> : <span className="text-xl">🎤</span>}
                            </button>
                            <div className="flex-grow relative">
                                <input
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                    placeholder={isRecording ? "Listening..." : "Tell me your thoughts..."}
                                    className="w-full bg-white border border-gray-200 px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner pr-24"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputText.trim() || isProcessing}
                                    className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-6 rounded-xl font-bold text-xs disabled:opacity-50 hover:bg-blue-700 transition"
                                >
                                    Reflect
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <span className="text-xl">🏠</span>
                            <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
                                YOUR REFLECTION BOT IS A COACH, <span className="text-red-400">NOT A DOCTOR.</span>
                            </p>
                            <span className="text-xl">👤</span>
                        </div>
                    </div>
                </div >
            ) : (
                <div className="flex-grow overflow-y-auto pr-2 space-y-4 scrollbar-hide">
                    {entries.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="text-6xl mb-4">✍️</div>
                            <p className="text-gray-400 font-bold">Your journal is empty.</p>
                            <p className="text-xs text-gray-400 mt-2">Speak your mind in the Talk tab to generate insights.</p>
                        </div>
                    ) : (
                        entries.map(entry => (
                            <div key={entry.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${entry.category === 'reflection' ? 'bg-blue-100 text-blue-700' :
                                        entry.category === 'gratitude' ? 'bg-green-100 text-green-700' :
                                            entry.category === 'complication' ? 'bg-orange-100 text-orange-700' :
                                                'bg-purple-100 text-purple-700'
                                        }`}>
                                        {entry.category}
                                    </span>
                                    <span className="text-[10px] text-gray-300 font-bold">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-xl font-serif font-bold text-gray-800 mb-3">{entry.summary}</h3>
                                <div className="bg-gray-50 p-4 rounded-2xl mb-4 border border-gray-100">
                                    <p className="text-[9px] font-black text-blue-500 uppercase mb-2 tracking-widest">Mirror Perspective</p>
                                    <p className="text-sm text-gray-600 italic">"{entry.aiPerspective}"</p>
                                </div>
                                <details className="cursor-pointer">
                                    <summary className="text-[10px] font-black text-gray-400 uppercase hover:text-gray-600 transition">View Raw Input</summary>
                                    <p className="mt-3 text-xs text-gray-500 leading-relaxed bg-gray-50 p-4 rounded-xl">{entry.rawInput}</p>
                                </details>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div >
    );
};

export default ReflectionJournal;
