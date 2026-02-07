
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Term, SortOption, Filters, Bookmark, Bounty, ChatterNote } from '../types';
import { termsData } from '../constants';
import TermCard from './TermCard';
import FilterPanel from './FilterPanel';
import FilterIcon from './icons/FilterIcon';
import BountyModal from './BountyModal';
import TermAIDeepDive from './TermAIDeepDive';

const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

interface TermsDirectoryProps {
    onAddBounty: (bounty: Omit<Bounty, 'id' | 'status' | 'postedBy' | 'claimedBy'>) => void;
    chatter: Record<string, ChatterNote[]>;
    onAddNote: (contextId: string, text: string) => void;
    bookmarks: Record<number, Bookmark>;
    onBookmarkToggle: (termId: number, type: Bookmark) => void;
    // Fix: Added missing isDemo property to TermsDirectoryProps to match usage in App.tsx
    isDemo?: boolean;
}

const TermsDirectory: React.FC<TermsDirectoryProps> = ({ 
    onAddBounty, 
    chatter, 
    onAddNote, 
    bookmarks, 
    onBookmarkToggle,
    // Fix: Destructure isDemo from props
    isDemo = false
}) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [filters, setFilters] = useState<Filters>({
        searchTerm: '',
        category: 'all',
        sortBy: 'default',
        tags: new Set<string>(),
    });
    const [isBountyModalOpen, setIsBountyModalOpen] = useState(false);
    const [isAIDiveOpen, setIsAIDiveOpen] = useState(false);
    const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);

    const handleOpenBountyModal = (term: Term) => {
        setSelectedTerm(term);
        setIsBountyModalOpen(true);
    };

    const handleOpenAIDive = (term: Term) => {
        setSelectedTerm(term);
        setIsAIDiveOpen(true);
    };

    const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

    const baseFilteredTerms = useMemo(() => {
        let filtered = [...termsData];

        if (debouncedSearchTerm) {
            const lowercasedTerm = debouncedSearchTerm.toLowerCase();
            filtered = filtered.filter(term =>
                term.name.toLowerCase().includes(lowercasedTerm) ||
                term.definition.toLowerCase().includes(lowercasedTerm)
            );
        }

        if (filters.category !== 'all') {
            filtered = filtered.filter(term => term.category === filters.category);
        }

        if (filters.tags.size > 0) {
            filtered = filtered.filter(term =>
                [...filters.tags].every(tag => term.tags.includes(tag))
            );
        }
        
        return filtered;
    }, [debouncedSearchTerm, filters.category, filters.tags]);

    const displayData = useMemo(() => {
        const terms = [...baseFilteredTerms];
        
        let loved = terms.filter(t => bookmarks[t.id] === 'love');
        let liked = terms.filter(t => bookmarks[t.id] === 'like');
        let others = terms.filter(t => !bookmarks[t.id]);

        if (filters.sortBy === 'az') {
            const sorter = (a: Term, b: Term) => a.name.localeCompare(b.name);
            loved.sort(sorter);
            liked.sort(sorter);
            others.sort(sorter);
        } else if (filters.sortBy === 'za') {
            const sorter = (a: Term, b: Term) => b.name.localeCompare(a.name);
            loved.sort(sorter);
            liked.sort(sorter);
            others.sort(sorter);
        }
        
        return { loved, liked, others };
    }, [baseFilteredTerms, filters.sortBy, bookmarks]);

    const totalFilteredCount = baseFilteredTerms.length;

    const handleFilterChange = useCallback((newFilters: Partial<Filters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);
    
    const handleTagToggle = useCallback((tag: string) => {
        setFilters(prev => {
            const newTags = new Set(prev.tags);
            if (newTags.has(tag)) {
                newTags.delete(tag);
            } else {
                newTags.add(tag);
            }
            return { ...prev, tags: newTags };
        });
    }, []);

    const onLocalBookmarkToggle = useCallback((term: Term, type: Bookmark) => {
        onBookmarkToggle(term.id, type);
    }, [onBookmarkToggle]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header className="text-center mb-8">
                <h1 className="text-4xl sm:text-5xl mb-2 text-gray-800 font-serif">Intimacy Directory</h1>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto">Explore and communicate your desires with clarity.</p>
            </header>

            <div className="flex gap-4 items-end mb-8 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex-grow">
                    <input
                        type="text"
                        placeholder="Search for a term, tag, or feeling..."
                        value={filters.searchTerm}
                        onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl border-none bg-gray-50 focus:bg-gray-100 outline-none transition font-medium"
                    />
                </div>
                <button
                    onClick={() => setIsPanelOpen(true)}
                    className="flex-shrink-0 px-6 py-4 bg-blue-600 text-white rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-100"
                >
                    <FilterIcon />
                    Filters
                </button>
            </div>

            <div className="space-y-12">
                {displayData.loved.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-serif font-bold text-red-600 mb-6 flex items-center gap-2">
                            <span className="text-3xl">❤️</span> I Might Love This
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Fix: Pass isDemo down to TermCard */}
                            {displayData.loved.map(term => <TermCard key={term.id} term={term} bookmarks={bookmarks} onBookmarkToggle={onLocalBookmarkToggle} onMakeFavor={handleOpenBountyModal} chatter={chatter} onAddNote={onAddNote} onAIDeepDive={handleOpenAIDive} isDemo={isDemo} />)}
                        </div>
                    </section>
                )}

                {displayData.liked.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-serif font-bold text-yellow-600 mb-6 flex items-center gap-2">
                            <span className="text-3xl">🤔</span> I Think I Might Like This
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Fix: Pass isDemo down to TermCard */}
                            {displayData.liked.map(term => <TermCard key={term.id} term={term} bookmarks={bookmarks} onBookmarkToggle={onLocalBookmarkToggle} onMakeFavor={handleOpenBountyModal} chatter={chatter} onAddNote={onAddNote} onAIDeepDive={handleOpenAIDive} isDemo={isDemo} />)}
                        </div>
                    </section>
                )}
                
                <section>
                    {(displayData.loved.length > 0 || displayData.liked.length > 0) && (
                         <h2 className="text-2xl font-serif font-bold text-gray-400 mb-6 pt-8 border-t border-gray-100">More to Explore</h2>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Fix: Pass isDemo down to TermCard */}
                        {displayData.others.map(term => <TermCard key={term.id} term={term} bookmarks={bookmarks} onBookmarkToggle={onLocalBookmarkToggle} onMakeFavor={handleOpenBountyModal} chatter={chatter} onAddNote={onAddNote} onAIDeepDive={handleOpenAIDive} isDemo={isDemo} />)}
                    </div>
                </section>

                {totalFilteredCount === 0 && (
                    <div className="py-20 text-center text-gray-400">
                        <p className="text-4xl mb-4">🔍</p>
                        <p className="text-xl">No terms match your current filters.</p>
                        <button onClick={() => setFilters({ searchTerm: '', category: 'all', sortBy: 'default', tags: new Set() })} className="mt-4 text-blue-600 font-bold hover:underline">Clear all filters</button>
                    </div>
                )}
            </div>

            <FilterPanel
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                filters={filters}
                onFilterChange={handleFilterChange}
                onTagToggle={handleTagToggle}
            />
            <BountyModal
                isOpen={isBountyModalOpen}
                onClose={() => setIsBountyModalOpen(false)}
                term={selectedTerm}
                onAddBounty={onAddBounty}
            />
            <TermAIDeepDive 
                isOpen={isAIDiveOpen}
                onClose={() => setIsAIDiveOpen(false)}
                term={selectedTerm}
            />
        </div>
    );
};

export default TermsDirectory;
