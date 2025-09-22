import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WrongNote {
  id: string;
  question: string;
  source_text: string;
  explanation?: string;
  subject_name: string;
  book_name: string;
  chapter_name: string;
  is_resolved: boolean;
  created_at: string;
}

interface SearchFilters {
  dateRange: string;
  subject: string;
  book: string;
  chapter: string;
}

interface SearchResult {
  results: WrongNote[];
  totalCount: number;
  hasMore: boolean;
}

export const useWrongNoteSearch = () => {
  const [searchResults, setSearchResults] = useState<WrongNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters | null>(null);

  const PAGE_SIZE = 20;

  const getDateFilter = (dateRange: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return today.toISOString();
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo.toISOString();
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo.toISOString();
      case 'quarter':
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        return quarterAgo.toISOString();
      case 'all':
      default:
        return null;
    }
  };

  const buildQuery = (filters: SearchFilters, page: number = 0) => {
    let query = supabase
      .from('wrong_notes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    // 날짜 필터
    const dateFilter = getDateFilter(filters.dateRange);
    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    // 과목 필터
    if (filters.subject && filters.subject !== 'all') {
      query = query.eq('subject_name', filters.subject);
    }

    // 교재 필터
    if (filters.book && filters.book !== 'all') {
      query = query.eq('book_name', filters.book);
    }

    // 단원 필터
    if (filters.chapter && filters.chapter !== 'all') {
      query = query.eq('chapter_name', filters.chapter);
    }

    return query;
  };

  const searchWrongNotes = useCallback(async (filters: SearchFilters, reset: boolean = true) => {
    try {
      setIsLoading(true);
      
      if (reset) {
        setCurrentPage(0);
        setSearchResults([]);
      }

      const page = reset ? 0 : currentPage + 1;
      const query = buildQuery(filters, page);
      
      const { data, error, count } = await query;

      if (error) {
        console.error('Search error:', error);
        toast.error('검색 중 오류가 발생했습니다.');
        return;
      }

      const newResults = data || [];
      
      if (reset) {
        setSearchResults(newResults);
        setCurrentPage(0);
      } else {
        setSearchResults(prev => [...prev, ...newResults]);
        setCurrentPage(page);
      }
      
      setTotalCount(count || 0);
      setHasMore((page + 1) * PAGE_SIZE < (count || 0));
      setCurrentFilters(filters);

    } catch (error) {
      console.error('Search error:', error);
      toast.error('검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  const loadMore = useCallback(async () => {
    if (!currentFilters || !hasMore || isLoading) return;
    
    await searchWrongNotes(currentFilters, false);
  }, [currentFilters, hasMore, isLoading, searchWrongNotes]);

  const reset = useCallback(() => {
    setSearchResults([]);
    setTotalCount(0);
    setHasMore(false);
    setCurrentPage(0);
    setCurrentFilters(null);
  }, []);

  return {
    searchResults,
    isLoading,
    totalCount,
    hasMore,
    searchWrongNotes,
    loadMore,
    reset
  };
};