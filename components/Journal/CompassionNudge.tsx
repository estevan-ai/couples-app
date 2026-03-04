import React from 'react';

export const CompassionNudge: React.FC<{ nudgeText: string }> = ({ nudgeText }) => {
    if (!nudgeText) return null;

    return (
        <div className="mx-auto w-11/12 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-lg shadow-sm my-4">
            <div className="flex items-start space-x-3">
                <div className="text-blue-400 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h4 className="text-blue-800 font-semibold text-sm mb-1">Therapeutic Nudge</h4>
                    <p className="text-blue-900 text-sm leading-snug font-medium italic">
                        "{nudgeText}"
                    </p>
                </div>
            </div>
        </div>
    );
};
