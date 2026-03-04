import React from 'react';

export const CliffNoteHeader: React.FC<{
    summary: string;
    markers: string[];
    amendments?: { timestamp: number, text: string }[];
}> = ({ summary, markers, amendments }) => {
    return (
        <div className="bg-yellow-200 p-4 border-2 border-yellow-400 rounded-md shadow-sm mb-4">
            <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-yellow-800 text-sm">Session Summary</span>
                <div className="flex space-x-2">
                    {markers.map(m => (
                        <span key={m} className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full border border-yellow-300">
                            {m}
                        </span>
                    ))}
                </div>
            </div>

            <p className="text-gray-900 text-sm mb-2">{summary}</p>

            {amendments && amendments.length > 0 && (
                <div className="mt-4 border-t border-yellow-300 pt-2 space-y-2">
                    {amendments.map((amend, idx) => (
                        <div key={idx} className="text-xs text-gray-700">
                            <span className="font-semibold text-yellow-800">Update [{new Date(amend.timestamp).toLocaleTimeString()}]:</span> {amend.text}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
