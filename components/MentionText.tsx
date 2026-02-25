import React from 'react';
import { termsData } from '../constants';

interface MentionTextProps {
    text: string;
    className?: string;
    onTermClick?: (termId: number) => void;
}

export const MentionText: React.FC<MentionTextProps> = ({ text, className = "", onTermClick }) => {
    if (!text) return null;

    // Regex to find @Mention 
    // We'll support @CamelCase or @Word 
    // For MVP, capturing non-whitespace after @
    const parts = text.split(/(@\w+)/g);

    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (part.startsWith('@')) {
                    const mentionName = part.substring(1);
                    // Case insensitive matching
                    const term = termsData.find(t =>
                        t.name.toLowerCase().replace(/\s/g, '') === mentionName.toLowerCase() ||
                        t.name.toLowerCase() === mentionName.toLowerCase()
                    );

                    if (term) {
                        return (
                            <span
                                key={i}
                                className="text-blue-600 font-bold cursor-pointer hover:underline bg-blue-50 px-1 rounded"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onTermClick) onTermClick(term.id);
                                }}
                            >
                                {part}
                            </span>
                        );
                    }
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};
