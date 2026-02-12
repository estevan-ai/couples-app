import React from 'react';
import { Filters, SortOption } from '../types';
import { allCategories, primaryTags, secondaryTags } from '../constants';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Filters;
  onFilterChange: (newFilters: Partial<Filters>) => void;
  onTagToggle: (tag: string) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, onClose, filters, onFilterChange, onTagToggle }) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={onClose}
      ></div>
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-2xl font-serif font-bold text-gray-800">Filter & Sort</h3>
          <button onClick={onClose} className="text-4xl font-light text-gray-500 hover:text-gray-800 transition">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          <div className="space-y-6 pb-6 border-b border-gray-200">
            <div>
              <label htmlFor="category-filter" className="font-bold text-sm mb-2 block text-gray-700">Filter by Category</label>
              <select
                id="category-filter"
                value={filters.category}
                onChange={(e) => onFilterChange({ category: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="all">All Categories</option>
                {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sort-by" className="font-bold text-sm mb-2 block text-gray-700">Sort By</label>
              <select
                id="sort-by"
                value={filters.sortBy}
                onChange={(e) => onFilterChange({ sortBy: e.target.value as SortOption })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="default">Default Order</option>
                <option value="az">Name (A-Z)</option>
                <option value="za">Name (Z-A)</option>
              </select>
            </div>
          </div>
          
          <div className="mt-6">
             <div className="mb-6">
                <h4 className="text-lg font-serif font-bold text-blue-600 mb-4">Core Concepts</h4>
                <div className="space-y-2">
                    {primaryTags.map(tag => (
                        <label key={tag} className="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" checked={filters.tags.has(tag)} onChange={() => onTagToggle(tag)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-gray-700">{tag}</span>
                        </label>
                    ))}
                </div>
             </div>
             <div>
                <h4 className="text-lg font-serif font-bold text-blue-600 mb-4">Detailed Filters</h4>
                <div className="sm:columns-2 gap-x-6">
                    {secondaryTags.map(tag => (
                         <label key={tag} className="flex items-center space-x-3 cursor-pointer mb-2 break-inside-avoid">
                            <input type="checkbox" checked={filters.tags.has(tag)} onChange={() => onTagToggle(tag)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-gray-700">{tag}</span>
                        </label>
                    ))}
                </div>
             </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="w-full py-4 text-lg font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Show Results
          </button>
        </div>
      </div>
    </>
  );
};

export default FilterPanel;
