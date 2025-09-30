import { useContext } from 'react';
import SearchContext from '../contexts/SearchContext';
import type { SearchFilters, SortOptions, UploadedImage } from '../types';

interface SearchContextType {
  // Search state
  searchQuery: string;
  filters: SearchFilters;
  sortBy: SortOptions;

  // Search actions
  setSearchQuery: (query: string) => void;
  updateFilters: (filters: Partial<SearchFilters>) => void;
  setSortBy: (sort: SortOptions) => void;
  resetFilters: () => void;

  // Filtered results
  filteredImages: UploadedImage[];
  searchStats: SearchStats;

  // Filter functions
  applyFiltersToImages: (images: UploadedImage[]) => UploadedImage[];
}

interface SearchStats {
  totalImages: number;
  filteredCount: number;
  aiGeneratedCount: number;
  humanCreatedCount: number;
  analyzingCount: number;
  failedCount: number;
}

export const useSearch = (): SearchContextType => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export type { SearchContextType, SearchStats };