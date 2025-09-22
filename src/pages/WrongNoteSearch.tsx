import React, { useState } from 'react';
import { WrongNoteSearchFilters } from "@/components/search/WrongNoteSearchFilters";
import { WrongNoteSearchResults } from "@/components/search/WrongNoteSearchResults";
import { useWrongNoteSearch } from "@/hooks/useWrongNoteSearch";

interface SearchFilters {
  dateRange: string;
  subject: string;
  book: string;
  chapter: string;
}

export default function WrongNoteSearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: 'all',
    subject: '',
    book: '',
    chapter: ''
  });

  const {
    searchResults,
    isLoading,
    totalCount,
    hasMore,
    searchWrongNotes,
    loadMore,
    reset
  } = useWrongNoteSearch();

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = () => {
    searchWrongNotes(filters, true);
  };

  const handleLoadMore = () => {
    loadMore();
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">오답노트 검색</h1>
        <p className="text-muted-foreground">
          다양한 필터를 사용하여 원하는 오답노트를 찾아보세요.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 검색 필터 (왼쪽) */}
        <div className="lg:col-span-1">
          <WrongNoteSearchFilters
            onFiltersChange={handleFiltersChange}
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </div>

        {/* 검색 결과 (오른쪽) */}
        <div className="lg:col-span-2">
          <WrongNoteSearchResults
            results={searchResults}
            isLoading={isLoading}
            totalCount={totalCount}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </div>
      </div>
    </div>
  );
}