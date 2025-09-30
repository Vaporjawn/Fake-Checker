import React, { createContext, useState, useCallback, useMemo } from 'react';
import type { SearchFilters, SortOptions, UploadedImage } from '../types';
import type { SearchContextType, SearchStats } from '../hooks/useSearch';

interface SearchProviderProps {
  children: React.ReactNode;
  images: UploadedImage[];
}

const SearchContext = createContext<SearchContextType | null>(null);

const defaultFilters: SearchFilters = {
  detectionResult: 'all',
  confidenceRange: { min: 0, max: 1 },
  dateRange: {
    startDate: null,
    endDate: null,
  },
  sizeRange: {
    minSize: null,
    maxSize: null,
  },
  dimensions: {
    minWidth: null,
    maxWidth: null,
    minHeight: null,
    maxHeight: null,
  },
  status: 'all',
  tags: [],
  fileType: 'all',
};

const defaultSort: SortOptions = {
  field: 'uploadedAt',
  direction: 'desc',
};

export const SearchProvider: React.FC<SearchProviderProps> = ({ children, images }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [sortBy, setSortBy] = useState<SortOptions>(defaultSort);

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSortBy(defaultSort);
    setSearchQuery('');
  }, []);

  const applyFiltersToImages = useCallback((imagesToFilter: UploadedImage[]): UploadedImage[] => {
    let filtered = [...imagesToFilter];

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(image =>
        image.name.toLowerCase().includes(query) ||
        image.file.name.toLowerCase().includes(query) ||
        (image.analysis?.analysis?.model?.toLowerCase().includes(query)) ||
        (image.analysis?.analysis?.breakdown?.details?.some(detail =>
          detail.toLowerCase().includes(query)
        ))
      );
    }

    // Detection result filter
    if (filters.detectionResult !== 'all') {
      filtered = filtered.filter(image => {
        if (!image.analysis) return false;

        switch (filters.detectionResult) {
          case 'ai-generated':
            return image.analysis.isAiGenerated;
          case 'human-created':
            return !image.analysis.isAiGenerated;
          case 'uncertain':
            return image.analysis.confidence < 0.7; // Less than 70% confidence
          default:
            return true;
        }
      });
    }

    // Confidence range filter
    if (filters.confidenceRange) {
      filtered = filtered.filter(image => {
        if (!image.analysis) return false;
        const confidence = image.analysis.confidence;
        return confidence >= filters.confidenceRange!.min &&
               confidence <= filters.confidenceRange!.max;
      });
    }

    // Date range filter
    if (filters.dateRange?.startDate || filters.dateRange?.endDate) {
      filtered = filtered.filter(image => {
        const imageDate = image.uploadedAt;

        if (filters.dateRange?.startDate && imageDate < filters.dateRange.startDate) {
          return false;
        }

        if (filters.dateRange?.endDate && imageDate > filters.dateRange.endDate) {
          return false;
        }

        return true;
      });
    }

    // File size filter
    if (filters.sizeRange?.minSize || filters.sizeRange?.maxSize) {
      filtered = filtered.filter(image => {
        const size = image.size;

        if (filters.sizeRange?.minSize && size < filters.sizeRange.minSize) {
          return false;
        }

        if (filters.sizeRange?.maxSize && size > filters.sizeRange.maxSize) {
          return false;
        }

        return true;
      });
    }

    // Dimensions filter
    if (filters.dimensions) {
      const { minWidth, maxWidth, minHeight, maxHeight } = filters.dimensions;

      if (minWidth || maxWidth || minHeight || maxHeight) {
        filtered = filtered.filter(image => {
          if (!image.dimensions) return false;
          const { width, height } = image.dimensions;

          if (minWidth && width < minWidth) return false;
          if (maxWidth && width > maxWidth) return false;
          if (minHeight && height < minHeight) return false;
          if (maxHeight && height > maxHeight) return false;

          return true;
        });
      }
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(image => image.status === filters.status);
    }

    // File type filter
    if (filters.fileType !== 'all') {
      filtered = filtered.filter(image => {
        const fileType = image.file.type;

        switch (filters.fileType) {
          case 'jpeg':
            return fileType === 'image/jpeg' || fileType === 'image/jpg';
          case 'png':
            return fileType === 'image/png';
          case 'webp':
            return fileType === 'image/webp';
          case 'gif':
            return fileType === 'image/gif';
          default:
            return true;
        }
      });
    }

    // Tags filter (if images have tags in the future)
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(image => {
        // Note: Currently images don't have tags, but this is ready for future implementation
        const extendedImage = image as UploadedImage & { tags?: string[] };
        const imageTags = extendedImage.tags || [];
        return filters.tags!.some(tag => imageTags.includes(tag));
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | boolean;
      let bValue: string | number | boolean;

      switch (sortBy.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'uploadedAt':
          aValue = a.uploadedAt.getTime();
          bValue = b.uploadedAt.getTime();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'confidence':
          aValue = a.analysis?.confidence || 0;
          bValue = b.analysis?.confidence || 0;
          break;
        case 'detectionResult':
          aValue = a.analysis?.isAiGenerated ? 1 : 0;
          bValue = b.analysis?.isAiGenerated ? 1 : 0;
          break;
        default:
          aValue = a.uploadedAt.getTime();
          bValue = b.uploadedAt.getTime();
      }

      if (aValue < bValue) {
        return sortBy.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortBy.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [searchQuery, filters, sortBy]);

  const filteredImages = useMemo(() => {
    return applyFiltersToImages(images);
  }, [images, applyFiltersToImages]);

  const searchStats = useMemo((): SearchStats => {
    const totalImages = images.length;
    const filteredCount = filteredImages.length;

    const aiGeneratedCount = images.filter(img =>
      img.analysis?.isAiGenerated === true
    ).length;

    const humanCreatedCount = images.filter(img =>
      img.analysis?.isAiGenerated === false
    ).length;

    const analyzingCount = images.filter(img =>
      img.status === 'analyzing' || img.status === 'uploading'
    ).length;

    const failedCount = images.filter(img =>
      img.status === 'error'
    ).length;

    return {
      totalImages,
      filteredCount,
      aiGeneratedCount,
      humanCreatedCount,
      analyzingCount,
      failedCount,
    };
  }, [images, filteredImages]);

  const value: SearchContextType = {
    searchQuery,
    filters,
    sortBy,
    setSearchQuery,
    updateFilters,
    setSortBy,
    resetFilters,
    filteredImages,
    searchStats,
    applyFiltersToImages,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};



export default SearchContext;