import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SearchState {
  isSearchActive: boolean;
  searchQuery: string;
  searchType: 'subject' | 'book' | 'chapter';
  searchResults: any[];
}

interface SearchContextType extends SearchState {
  setSearchState: (state: Partial<SearchState>) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const initialState: SearchState = {
  isSearchActive: false,
  searchQuery: '',
  searchType: 'subject',
  searchResults: [],
};

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchState, setSearchStateInternal] = useState<SearchState>(initialState);

  const setSearchState = (newState: Partial<SearchState>) => {
    setSearchStateInternal(prev => ({ ...prev, ...newState }));
  };

  const clearSearch = () => {
    setSearchStateInternal(initialState);
  };

  return (
    <SearchContext.Provider value={{
      ...searchState,
      setSearchState,
      clearSearch,
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}