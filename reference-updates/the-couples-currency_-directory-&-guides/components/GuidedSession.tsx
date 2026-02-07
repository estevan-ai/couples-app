
import React, { useState } from 'react';

const steps = [
    {
        icon: "🤝",
        title: "Welcome to Your Guided Session",
        content: "This is a quiet space for you and your partner to connect. The goal isn't to solve anything, but to listen and understand each other's desires more deeply. We'll guide you step-by-step."
    },
    {
        icon: "🛋️",
        title: "Create Your Safe Space",
        content: "Find a comfortable, private spot. Put your phones on silent and out of reach. Grab two notecards and pens. When you're both ready and have your materials, continue to the next step."
    },
    {
        icon: "📜",
        title: "The Ground Rules",
        content: "Before we begin, agree to these three simple rules for the session:",
        list: [
            "Curiosity Over Judgment: Your goal is to learn, not to critique.",
            "No Interrupting: Allow each other the space to speak fully.",
            "You Can Always 'Pass': Either of you can pass on sharing anything that feels uncomfortable."
        ]
    },
    {
        icon: "✍️",
        title: "Reflect & Write",
        content: "Take 5-10 minutes of silence. Each of you, on your own notecard, write down 1-3 answers for each of these two core questions. Be as simple or detailed as you like. This is just for you right now.",
        prompts: [
            "What do I want to do TO you?",
            "What do I want YOU to do to me?"
        ]
    },
    {
        icon: "🗣️",
        title: "The Art of Sharing",
        content: "Decide who will go first. That person will share just ONE item from their list. The other partner's only job is to listen fully and then say:",
        quote: "Thank you for trusting me with that."
    },
    {
        icon: "❤️‍🩹",
        title: "Connect Desire to Feeling",
        content: "Now, let's go deeper. Take turns sharing again, but this time, add the 'why' behind the 'what'. After stating your desire, add the phrase:",
        quote: "...and when that happens, I feel ______.",
        example: "Example: \"I want you to stroke my hair while we're on the couch, and when that happens, I feel cared for and safe.\""
    },
    {
        icon: "🗺️",
        title: "A Map for Your Desires",
        content: "As you listen to each other, notice the dynamic. Is the desire about giving pleasure (Serving), receiving a gift (Accepting), boldly exploring (Taking), or granting freedom (Allowing)? You don't need to label everything perfectly; just notice the different flavors of connection you're creating together.",
    },
    {
        icon: "✨",
        title: "Closing the Session",
        content: "You've done beautiful work. To close, take a moment to look at each other and share your answers to these two questions:",
        list: [
            "What was one thing that surprised you about what you heard today?",
            "What is one thing you appreciate about your partner after this conversation?"
        ]
    },
     {
        icon: "🎉",
        title: "Session Complete",
        content: "Connection is a practice, not a destination. You can return to this guide anytime you want to reopen the conversation. Use the Terms Directory to find new language for your desires and the other guides to explore the chemistry you're building.",
    }
];

const GuidedSession: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const step = steps[currentStep];

    return (
        <div>
            <header className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl mb-3 text-gray-800">Guided Session</h1>
                <p className="text-lg sm:text-xl text-gray-500 max-w-3xl mx-auto">A step-by-step experience to deepen your connection.</p>
            </header>

            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-10 border border-gray-200">
                <div className="flex flex-col items-center text-center">
                     <div className="text-6xl mb-4">{step.icon}</div>
                     <h2 className="font-serif text-3xl text-gray-800 mb-6">{step.title}</h2>
                     <p className="text-gray-600 leading-relaxed text-lg">{step.content}</p>

                     {step.list && (
                        <ul className="list-disc list-inside text-left mt-6 space-y-2 text-lg text-gray-700 bg-gray-50 p-6 rounded-lg w-full">
                            {step.list.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                     )}

                     {step.prompts && (
                        <div className="mt-6 space-y-4 w-full text-left bg-gray-50 p-6 rounded-lg">
                            {step.prompts.map((prompt, index) => (
                                <p key={index} className="font-serif text-xl text-gray-800 border-l-4 border-blue-300 pl-4">{prompt}</p>
                            ))}
                        </div>
                     )}

                     {step.quote && (
                        <blockquote className="font-serif text-xl text-center border-l-4 border-blue-300 text-blue-800 bg-blue-50 p-4 my-6 mx-auto w-full">
                           {step.quote}
                        </blockquote>
                     )}

                     {step.example && (
                        <p className="mt-4 text-gray-500 italic w-full text-left bg-gray-50 p-4 rounded-lg">{step.example}</p>
                     )}
                </div>
            </div>

            <div className="max-w-3xl mx-auto mt-8 flex justify-between items-center">
                <button 
                    onClick={prevStep} 
                    disabled={currentStep === 0}
                    className="px-6 py-3 text-lg font-bold bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    Back
                </button>

                <div className="text-sm text-gray-500">
                    Step {currentStep + 1} of {steps.length}
                </div>
                
                <button 
                    onClick={nextStep} 
                    disabled={currentStep === steps.length - 1}
                    className="px-6 py-3 text-lg font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                   {currentStep === steps.length - 2 ? 'Finish' : 'Next'}
                </button>
            </div>
        </div>
    );
};

export default GuidedSession;
