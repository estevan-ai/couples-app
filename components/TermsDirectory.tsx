import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Term, SortOption, Filters, Bookmark, Bounty, ChatterNote } from '../types';
import TermCard from './TermCard';
import FilterPanel from './FilterPanel';
import FilterIcon from './icons/FilterIcon';
import BountyModal from './BountyModal';
import TermAIDeepDive from './TermAIDeepDive';
import CreateTermModal from './CreateTermModal';

// ... imports ...

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
    terms: Term[];
    onAddBounty: (bounty: Omit<Bounty, 'id' | 'status' | 'postedBy' | 'claimedBy'>) => void;
    chatter: Record<string, ChatterNote[]>;
    onAddNote: (contextId: string, text: string) => void;
    bookmarks: Record<number, Bookmark>;
    onBookmarkToggle: (termId: number, type: Bookmark) => void;
    isDemo?: boolean;
    partnerBookmarks?: Record<number, Bookmark>;
    partnerName?: string;
    onDeleteNote?: (id: string) => void;
    onDeleteBounty: (id: number | string) => void;
    onAddTerm?: (term: any) => void;
    customTermCount?: number;
    highlightedTermId?: number | null;
    initialTagFilter?: string | null;
    onClearInitialTag?: () => void;
    initialSearchTerm?: string | null;
    onClearInitialSearch?: () => void;
}

const TermsDirectory: React.FC<TermsDirectoryProps> = ({
    terms,
    onAddBounty,
    chatter,
    onAddNote,
    bookmarks,
    onBookmarkToggle,
    isDemo = false,
    partnerBookmarks,
    partnerName,
    onDeleteNote,
    onDeleteBounty,
    onAddTerm,
    customTermCount = 0,
    highlightedTermId,
    initialTagFilter,
    onClearInitialTag,
    initialSearchTerm,
    onClearInitialSearch
}) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        if (initialTagFilter) {
            setFilters(prev => ({ ...prev, searchTerm: '', category: 'all', tags: new Set([initialTagFilter]) }));
            onClearInitialTag?.();
        }
    }, [initialTagFilter, onClearInitialTag]);

    useEffect(() => {
        if (initialSearchTerm) {
            setFilters(prev => ({ ...prev, searchTerm: initialSearchTerm, category: 'all', tags: new Set() }));
            onClearInitialSearch?.();
        }
    }, [initialSearchTerm, onClearInitialSearch]);

    // Scroll to highlighted term
    useEffect(() => {
        if (highlightedTermId) {
            // Clear filters to ensure term is visible
            setFilters(prev => ({ ...prev, searchTerm: '', category: 'all', tags: new Set(), showMyLoves: true, showMyLikes: true, showMyWork: true, showMyUnsure: true, showMyBoundaries: true }));

            setTimeout(() => {
                const el = document.getElementById(`term-${highlightedTermId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-4', 'ring-blue-300');
                    setTimeout(() => el.classList.remove('ring-4', 'ring-blue-300'), 2000);
                }
            }, 300);
        }
    }, [highlightedTermId]);

    // State for Bounty Modal
    const [selectedTermForBounty, setSelectedTermForBounty] = useState<Term | null>(null);
    const [filters, setFilters] = useState<Filters>({
        searchTerm: '',
        category: 'all',
        sortBy: 'default',
        tags: new Set<string>(),
        showMyLoves: true,
        showMyLikes: true,
        showMyWork: true,
        showMyUnsure: true,
        showMyBoundaries: false // Default to hidden
    });
    const [isBountyModalOpen, setIsBountyModalOpen] = useState(false);
    const [isAIDiveOpen, setIsAIDiveOpen] = useState(false);
    const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        boundaries: true
    });

    const toggleSection = (section: string) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleOpenBountyModal = (term: Term) => {
        setSelectedTermForBounty(term);
    };

    const handleOpenAIDive = (term: Term) => {
        setSelectedTerm(term);
        setIsAIDiveOpen(true);
    };

    // ...





    const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

    const baseFilteredTerms = useMemo(() => {
        let filtered = [...terms]; // Changed from termsData to terms

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

        // Partner Filters
        if (partnerBookmarks) {
            const activePartnerFilters: Bookmark[] = [];
            if (filters.showPartnerLoves) activePartnerFilters.push('love');
            if (filters.showPartnerLikes) activePartnerFilters.push('like');
            if (filters.showPartnerWork) activePartnerFilters.push('work');
            if (filters.showPartnerUnsure) activePartnerFilters.push('unsure');
            if (filters.showPartnerBoundaries) activePartnerFilters.push('skip');

            if (activePartnerFilters.length > 0) {
                filtered = filtered.filter(term => {
                    const pMark = partnerBookmarks[term.id];
                    return pMark && activePartnerFilters.includes(pMark);
                });
            }
        }

        return filtered;
    }, [debouncedSearchTerm, filters, partnerBookmarks]);

    const displayData = useMemo(() => {
        const terms = [...baseFilteredTerms];

        let loved = filters.showMyLoves !== false ? terms.filter(t => bookmarks[t.id] === 'love') : [];
        let liked = filters.showMyLikes !== false ? terms.filter(t => bookmarks[t.id] === 'like') : [];
        let work = filters.showMyWork !== false ? terms.filter(t => bookmarks[t.id] === 'work') : [];
        let unsure = filters.showMyUnsure !== false ? terms.filter(t => bookmarks[t.id] === 'unsure') : [];
        let skipped = filters.showMyBoundaries !== false ? terms.filter(t => bookmarks[t.id] === 'skip') : [];

        // Others are items not bookmarked by me. 
        // If we want to filter them out? Usually "Explore" shows un-bookmarked.
        // Let's leave them unless we add a specific filter for "Show Uncategorized".
        let others = terms.filter(t => !bookmarks[t.id]);

        const sorterAz = (a: Term, b: Term) => a.name.localeCompare(b.name);
        const sorterZa = (a: Term, b: Term) => b.name.localeCompare(a.name);

        if (filters.sortBy === 'az') {
            [loved, liked, work, unsure, skipped, others].forEach(arr => arr.sort(sorterAz));
        } else if (filters.sortBy === 'za') {
            [loved, liked, work, unsure, skipped, others].forEach(arr => arr.sort(sorterZa));
        }

        return { loved, liked, work, unsure, skipped, others };
    }, [baseFilteredTerms, filters.sortBy, bookmarks, filters.showMyLoves, filters.showMyLikes, filters.showMyWork, filters.showMyUnsure, filters.showMyBoundaries]);

    const totalFilteredCount = baseFilteredTerms.length;

    const handleFilterChange = useCallback((newFilters: Partial<Filters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const categories = useMemo(() => {
        return [...new Set(terms.map(t => t.category))].sort();
    }, [terms]);

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
        <>
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24 relative">
                {/* Top Alert */}
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-8 flex items-center gap-3 text-sm text-purple-900 shadow-sm animate-in slide-in-from-top-2 duration-500">
                    <span className="text-lg">💡</span>
                    <span className="font-medium">Tap any card to see details, request a favor, or discuss it with your partner or AI.</span>
                </div>

                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl mb-2 text-gray-800 font-serif">Intimacy Directory</h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">Explore and communicate your desires with clarity.</p>
                </header>

                <div className="sticky top-0 z-30 mb-6 px-2 py-4 bg-gray-50/95 backdrop-blur-sm transition-all">
                    <div className="flex gap-3 max-w-full">
                        <input
                            type="text"
                            placeholder="Search for a term, tag, or feeling..."
                            value={filters.searchTerm}
                            onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                            className="flex-grow px-6 py-4 rounded-full border border-gray-200 bg-white shadow-sm focus:shadow-md outline-none transition font-medium text-lg"
                        />
                        {(filters.searchTerm || filters.category !== 'all' || filters.tags.size > 0) && (
                            <button
                                onClick={() => setFilters({ searchTerm: '', category: 'all', sortBy: 'default', tags: new Set() })}
                                className="flex-none w-14 h-14 bg-red-50 text-red-500 rounded-full border border-red-100 shadow-sm flex items-center justify-center text-xl hover:bg-red-100 transition animate-in zoom-in spin-in-180"
                                title="Clear Filters"
                            >
                                ✕
                            </button>
                        )}
                        <button
                            onClick={() => setIsPanelOpen(true)}
                            className={`flex-none w-14 h-14 rounded-full border shadow-sm flex items-center justify-center transition ${filters.category !== 'all' || filters.tags.size > 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-gray-200 hover:bg-blue-50'}`}
                            title="Filters"
                        >
                            <FilterIcon />
                        </button>
                        <button
                            onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
                            className="flex-none w-14 h-14 bg-white rounded-full border border-gray-200 shadow-sm flex items-center justify-center text-2xl hover:bg-gray-50 transition"
                        >
                            {viewMode === 'grid' ? '📄' : '📱'}
                        </button>
                    </div>
                </div>



                <div className="space-y-12">
                    {displayData.loved.length > 0 && (
                        <section>
                            <button onClick={() => toggleSection('love')} className="w-full flex items-center text-left mb-6 group outline-none">
                                <span className={`text-xl text-red-400 mr-2 transform transition-transform duration-300 ${collapsedSections['love'] ? '-rotate-90' : 'rotate-0'}`}>▼</span>
                                <h2 className="text-2xl font-serif font-bold text-red-600 flex items-center gap-2">
                                    <span className="text-3xl">❤️</span> I Love This
                                </h2>
                                <div className="flex-grow h-px bg-red-100 ml-6 rounded-full"></div>
                            </button>
                            {!collapsedSections['love'] && (
                                <div className={`grid gap-6 animate-in slide-in-from-top-2 duration-300 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                                    {displayData.loved.map(term => <TermCard key={term.id} term={term} bookmarks={bookmarks} partnerBookmarks={partnerBookmarks} onBookmarkToggle={onLocalBookmarkToggle} onMakeFavor={handleOpenBountyModal} chatter={chatter} onAddNote={onAddNote} onAIDeepDive={handleOpenAIDive} isDemo={isDemo} onDeleteNote={onDeleteNote} viewMode={viewMode} onTagClick={handleTagToggle} selectedTags={filters.tags} isHighlighted={term.id === highlightedTermId} />)}
                                </div>
                            )}
                        </section>
                    )}

                    {displayData.liked.length > 0 && (
                        <section>
                            <button onClick={() => toggleSection('like')} className="w-full flex items-center text-left mb-6 group outline-none">
                                <span className={`text-xl text-yellow-400 mr-2 transform transition-transform duration-300 ${collapsedSections['like'] ? '-rotate-90' : 'rotate-0'}`}>▼</span>
                                <h2 className="text-2xl font-serif font-bold text-yellow-600 flex items-center gap-2">
                                    <span className="text-3xl">🤔</span> I Think I Might Like This
                                </h2>
                                <div className="flex-grow h-px bg-yellow-100 ml-6 rounded-full"></div>
                            </button>
                            {!collapsedSections['like'] && (
                                <div className={`grid gap-6 animate-in slide-in-from-top-2 duration-300 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                                    {displayData.liked.map(term => <TermCard key={term.id} term={term} bookmarks={bookmarks} partnerBookmarks={partnerBookmarks} onBookmarkToggle={onLocalBookmarkToggle} onMakeFavor={handleOpenBountyModal} chatter={chatter} onAddNote={onAddNote} onAIDeepDive={handleOpenAIDive} isDemo={isDemo} onDeleteNote={onDeleteNote} viewMode={viewMode} onTagClick={handleTagToggle} selectedTags={filters.tags} isHighlighted={term.id === highlightedTermId} />)}
                                </div>
                            )}
                        </section>
                    )}

                    {displayData.work.length > 0 && (
                        <section>
                            <button onClick={() => toggleSection('work')} className="w-full flex items-center text-left mb-6 group outline-none">
                                <span className={`text-xl text-indigo-400 mr-2 transform transition-transform duration-300 ${collapsedSections['work'] ? '-rotate-90' : 'rotate-0'}`}>▼</span>
                                <h2 className="text-2xl font-serif font-bold text-indigo-600 flex items-center gap-2">
                                    <span className="text-3xl">🎟️</span> Willing to work for
                                </h2>
                                <div className="flex-grow h-px bg-indigo-100 ml-6 rounded-full"></div>
                            </button>
                            {!collapsedSections['work'] && (
                                <div className={`grid gap-6 animate-in slide-in-from-top-2 duration-300 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                                    {displayData.work.map(term => <TermCard key={term.id} term={term} bookmarks={bookmarks} partnerBookmarks={partnerBookmarks} onBookmarkToggle={onLocalBookmarkToggle} onMakeFavor={handleOpenBountyModal} chatter={chatter} onAddNote={onAddNote} onAIDeepDive={handleOpenAIDive} isDemo={isDemo} onDeleteNote={onDeleteNote} viewMode={viewMode} onTagClick={handleTagToggle} selectedTags={filters.tags} isHighlighted={term.id === highlightedTermId} />)}
                                </div>
                            )}
                        </section>
                    )}

                    {displayData.unsure.length > 0 && (
                        <section>
                            <button onClick={() => toggleSection('unsure')} className="w-full flex items-center text-left mb-6 group outline-none">
                                <span className={`text-xl text-gray-400 mr-2 transform transition-transform duration-300 ${collapsedSections['unsure'] ? '-rotate-90' : 'rotate-0'}`}>▼</span>
                                <h2 className="text-2xl font-serif font-bold text-gray-500 flex items-center gap-2">
                                    <span className="text-3xl">❔</span> Unsure / Maybe Later
                                </h2>
                                <div className="flex-grow h-px bg-gray-200 ml-6 rounded-full"></div>
                            </button>
                            {!collapsedSections['unsure'] && (
                                <div className={`grid gap-6 opacity-80 animate-in slide-in-from-top-2 duration-300 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                                    {displayData.unsure.map(term => <TermCard key={term.id} term={term} bookmarks={bookmarks} partnerBookmarks={partnerBookmarks} onBookmarkToggle={onLocalBookmarkToggle} onMakeFavor={handleOpenBountyModal} chatter={chatter} onAddNote={onAddNote} onAIDeepDive={handleOpenAIDive} isDemo={isDemo} onDeleteNote={onDeleteNote} viewMode={viewMode} onTagClick={handleTagToggle} selectedTags={filters.tags} isHighlighted={term.id === highlightedTermId} />)}
                                </div>
                            )}
                        </section>
                    )}

                    <section>
                        {(displayData.loved.length > 0 || displayData.liked.length > 0 || displayData.work.length > 0 || displayData.unsure.length > 0) && (
                            <button onClick={() => toggleSection('explore')} className="w-full flex items-center text-left mb-6 pt-8 border-t border-gray-100 group outline-none">
                                <span className={`text-xl text-gray-300 mr-2 transform transition-transform duration-300 ${collapsedSections['explore'] ? '-rotate-90' : 'rotate-0'}`}>▼</span>
                                <h2 className="text-2xl font-serif font-bold text-gray-400">More to Explore</h2>
                            </button>
                        )}
                        {!collapsedSections['explore'] && (
                            <div className={`grid gap-6 animate-in slide-in-from-top-2 duration-300 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                                {displayData.others.map(term => <TermCard key={term.id} term={term} bookmarks={bookmarks} partnerBookmarks={partnerBookmarks} onBookmarkToggle={onLocalBookmarkToggle} onMakeFavor={handleOpenBountyModal} chatter={chatter} onAddNote={onAddNote} onAIDeepDive={handleOpenAIDive} isDemo={isDemo} onDeleteNote={onDeleteNote} viewMode={viewMode} onTagClick={handleTagToggle} selectedTags={filters.tags} isHighlighted={term.id === highlightedTermId} />)}
                            </div>
                        )}
                    </section>

                    {displayData.skipped.length > 0 && (
                        <section className="bg-gray-100/50 p-8 rounded-[3rem] border border-gray-200 mt-12">
                            <button onClick={() => toggleSection('boundaries')} className="w-full flex items-center text-left mb-2 group outline-none">
                                <span className={`text-xl text-gray-400 mr-2 transform transition-transform duration-300 ${collapsedSections['boundaries'] ? '-rotate-90' : 'rotate-0'}`}>▼</span>
                                <h2 className="text-2xl font-serif font-bold text-gray-500 flex items-center gap-2">
                                    <span className="text-3xl">🚫</span> Boundaries & No Interest
                                </h2>
                            </button>

                            {!collapsedSections['boundaries'] ? (
                                <div className="animate-in slide-in-from-top-2 duration-300 pt-4">
                                    <p className="text-xs text-gray-400 mb-6 font-bold uppercase tracking-widest">These items are off the table for now.</p>
                                    <div className={`grid gap-6 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                                        {displayData.skipped.map(term => <TermCard key={term.id} term={term} bookmarks={bookmarks} onBookmarkToggle={onLocalBookmarkToggle} onMakeFavor={handleOpenBountyModal} chatter={chatter} onAddNote={onAddNote} onAIDeepDive={handleOpenAIDive} isDemo={isDemo} onDeleteNote={onDeleteNote} viewMode={viewMode} onTagClick={handleTagToggle} selectedTags={filters.tags} />)}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-8">{displayData.skipped.length} items hidden</p>
                            )}
                        </section>
                    )}

                    {totalFilteredCount === 0 && (
                        <div className="py-20 text-center text-gray-400">
                            <p className="text-4xl mb-4">🔍</p>
                            <p className="text-xl">No terms match your current filters.</p>
                            <button onClick={() => setFilters({ searchTerm: '', category: 'all', sortBy: 'default', tags: new Set() })} className="mt-4 text-blue-600 font-bold hover:underline">Clear all filters</button>
                        </div>
                    )}
                </div>

                {/* Helper Hints (AI Chat / Deep Dive) Context */}
                {/* The user mentioned AI Chat is gone. If they mean the AI Insight button on cards, it's unrelated to FABs.
                But if they mean a floating AI chat, we don't have one globally. 
                Assuming fixing FABs restores the Filter, which is main part of "floating" UI. */}
            </div>

            {/* Floating Action Buttons - OUTSIDE transformed container */}
            <div className="fixed bottom-24 right-6 mb-[100px] md:mb-0 z-[100] flex flex-col gap-4 items-end pointer-events-none">
                {onAddTerm && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-gray-800 text-white p-4 rounded-full shadow-xl hover:bg-gray-900 transition transform hover:scale-105 flex items-center justify-center w-14 h-14 pointer-events-auto"
                        title="Add Custom Term"
                    >
                        <span className="text-2xl font-bold">+</span>
                    </button>
                )}


            </div>

            <FilterPanel
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                filters={filters}
                onFilterChange={handleFilterChange}
                onTagToggle={handleTagToggle}
            />
            {/* Modals */}
            <BountyModal
                isOpen={!!selectedTermForBounty}
                onClose={() => setSelectedTermForBounty(null)}
                term={selectedTermForBounty}
                onAddBounty={onAddBounty}
            />

            {
                onAddTerm && (
                    <CreateTermModal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        onSubmit={onAddTerm}
                        existingCount={customTermCount}
                        maxCount={10}
                    />
                )
            }
            <TermAIDeepDive
                isOpen={isAIDiveOpen}
                onClose={() => setIsAIDiveOpen(false)}
                term={selectedTerm}
                isDemo={isDemo}
            />
        </>
    );
};

export default TermsDirectory;
