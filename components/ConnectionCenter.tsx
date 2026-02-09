import FlirtSection from './FlirtSection';
import { ChatterNote, User } from '../types';

interface ConnectionCenterProps {
    currentUser: User;
    partner: User | null;
    chatter: Record<string, ChatterNote[]>;
    onAddNote: (contextId: string, text: string, photoPath?: string, photoIv?: string, subject?: string, extra?: any) => Promise<void>;
    sharedKey: CryptoKey | null;
    onDeleteNote: (id: string) => void;
    onPinInsight: (text: string, source: string) => void;
    onNavigateTerm?: (termId: number) => void;
    flirts?: import('../types').Flirt[]; // Optional for now to avoid break if not passed
    onMarkRead: (noteId: string, authorUid: string) => void;
    onToggleReaction: (noteId: string, authorUid: string, emoji: string) => void;
    onMarkAllRead: () => void;
    onMarkAllUnread: () => void;
    onToggleRead: (noteId: string, currentStatus: string | undefined, authorUid: string) => void;
}

const ConnectionCenter: React.FC<ConnectionCenterProps> = (props) => {
    return (
        <div className="animate-in fade-in zoom-in-95 duration-500">
            {/* Pass flirts down if FlirtSection accepts them, or handle logic here */}
            <FlirtSection {...props} />
        </div>
    );
};

export default ConnectionCenter;
