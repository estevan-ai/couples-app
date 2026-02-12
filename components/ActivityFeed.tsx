import React from 'react';
import { ChatterNote } from '../types';

interface ActivityFeedProps {
    activity: any[];
    onNavigateContext: (contextId: string, targetId?: string) => void;
    onToggleRead: (noteId: string, currentStatus: string | undefined, authorUid: string) => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activity, onNavigateContext, onToggleRead }) => {
    if (activity.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 opacity-50">
                <span className="text-4xl mb-2">🔔</span>
                <p className="text-sm">No recent activity</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 pb-24">
            {activity.map((item, idx) => {
                const isRead = item.status === 'read';
                const isReaction = item.type === 'reaction';

                return (
                    <div
                        key={item.id || idx}
                        onClick={() => onNavigateContext(item.contextId, item.firestoreId || item.id)}
                        className={`group relative p-4 rounded-xl shadow-sm border transition-all duration-300 cursor-pointer sm:cursor-default ${isRead ? 'bg-white border-gray-100 opacity-75' : (isReaction ? 'bg-red-50/50 border-red-100 shadow-md' : 'bg-blue-50/50 border-blue-100 shadow-md')}`}
                    >
                        {/* Read Toggle Overlay/Button */}
                        <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${isReaction ? 'bg-red-100 text-red-600' : (item.contextId.startsWith('term-') ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600')}`}>
                                {isReaction ? '❤️' : (item.contextId.startsWith('term-') ? '📖' : (item.contextId.startsWith('thread-') ? '💭' : '✨'))}
                            </div>
                            <div className="flex-grow">
                                <div className="flex justify-between items-start">
                                    <div className="pr-2">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 flex items-center gap-2">
                                            {item.contextName}
                                            {!isRead && <span className={`w-2 h-2 rounded-full animate-pulse ${isReaction ? 'bg-red-500' : 'bg-blue-500'}`}></span>}
                                        </h4>
                                        <p className={`text-sm leading-snug ${isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                                            <span className="font-bold text-gray-800">{item.author}</span>: {item.text || "Sent an attachment"}
                                        </p>
                                    </div>

                                    {/* Actions Row */}
                                    <div className="flex items-center gap-2 ml-2 shrink-0">
                                        {!isReaction && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleRead(item.firestoreId || item.id, item.status, item.authorUid || '');
                                                }}
                                                className={`p-1.5 rounded-full shadow-sm text-xs border transition-all ${isRead ? 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50' : 'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200'}`}
                                                title={isRead ? "Mark as Unread" : "Mark as Read"}
                                            >
                                                {isRead ? '📫' : '📩'}
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onNavigateContext(item.contextId, item.firestoreId || item.id);
                                            }}
                                            className="hidden sm:block px-3 py-1 bg-white hover:bg-gray-50 text-xs font-bold text-indigo-600 rounded-lg border border-gray-100 transition whitespace-nowrap"
                                        >
                                            View
                                        </button>
                                        {/* Mobile Eye Icon */}
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                    {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {item.status === 'read' && !isReaction && <span className="ml-1 text-green-500" title={`Read at ${new Date(item.readAt || 0).toLocaleTimeString()}`}>✓✓</span>}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ActivityFeed;
