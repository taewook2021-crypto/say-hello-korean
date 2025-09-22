import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SearchFilters {
  dateRange: string;
  subject: string;
  book: string;
  chapter: string;
}

interface WrongNoteSearchFiltersProps {
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  isLoading: boolean;
}

export const WrongNoteSearchFilters: React.FC<WrongNoteSearchFiltersProps> = ({
  onFiltersChange,
  onSearch,
  isLoading
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: 'all',
    subject: 'all',
    book: 'all',
    chapter: 'all'
  });

  const [subjects, setSubjects] = useState<string[]>([]);
  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);

  // 과목 목록 가져오기
  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase
        .from('subjects')
        .select('name')
        .order('name');
      
      if (data) {
        setSubjects(data.map(item => item.name));
      }
    };
    fetchSubjects();
  }, []);

  // 선택된 과목에 따른 교재 목록 가져오기
  useEffect(() => {
    if (filters.subject && filters.subject !== 'all') {
      const fetchBooks = async () => {
        const { data } = await supabase
          .from('books')
          .select('name')
          .eq('subject_name', filters.subject)
          .order('name');
        
        if (data) {
          setBooks(data.map(item => item.name));
        }
      };
      fetchBooks();
    } else {
      setBooks([]);
    }
    
    // 과목이 변경되면 교재와 단원 초기화
    setFilters(prev => ({ ...prev, book: 'all', chapter: 'all' }));
  }, [filters.subject]);

  // 선택된 교재에 따른 단원 목록 가져오기
  useEffect(() => {
    if (filters.subject && filters.subject !== 'all' && filters.book && filters.book !== 'all') {
      const fetchChapters = async () => {
        const { data } = await supabase
          .from('chapters')
          .select('name')
          .eq('subject_name', filters.subject)
          .eq('book_name', filters.book)
          .order('name');
        
        if (data) {
          setChapters(data.map(item => item.name));
        }
      };
      fetchChapters();
    } else {
      setChapters([]);
    }
    
    // 교재가 변경되면 단원 초기화
    setFilters(prev => ({ ...prev, chapter: 'all' }));
  }, [filters.subject, filters.book]);

  // 필터 변경 시 상위 컴포넌트에 알림
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      dateRange: 'all',
      subject: 'all',
      book: 'all',
      chapter: 'all'
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value && value !== 'all').length;
  };

  const getDateRangeLabel = (value: string) => {
    const labels: Record<string, string> = {
      'today': '오늘',
      'week': '일주일',
      'month': '한달',
      'quarter': '3개월',
      'all': '전체'
    };
    return labels[value] || '전체';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          오답노트 검색 필터
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary" className="ml-2">
              {getActiveFiltersCount()}개 필터 적용
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 기간 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            기간
          </label>
          <Select value={filters.dateRange} onValueChange={(value) => updateFilter('dateRange', value)}>
            <SelectTrigger>
              <SelectValue placeholder="기간을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">오늘</SelectItem>
              <SelectItem value="week">일주일</SelectItem>
              <SelectItem value="month">한달</SelectItem>
              <SelectItem value="quarter">3개월</SelectItem>
              <SelectItem value="all">전체</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 과목 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">과목</label>
          <Select value={filters.subject} onValueChange={(value) => updateFilter('subject', value)}>
            <SelectTrigger>
              <SelectValue placeholder="과목을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 과목</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 교재 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">교재</label>
          <Select 
            value={filters.book} 
            onValueChange={(value) => updateFilter('book', value)}
            disabled={!filters.subject || filters.subject === 'all'}
          >
            <SelectTrigger>
              <SelectValue placeholder={filters.subject && filters.subject !== 'all' ? "교재를 선택하세요" : "먼저 과목을 선택하세요"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 교재</SelectItem>
              {books.map(book => (
                <SelectItem key={book} value={book}>
                  {book}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 단원 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">단원</label>
          <Select 
            value={filters.chapter} 
            onValueChange={(value) => updateFilter('chapter', value)}
            disabled={!filters.book || filters.book === 'all'}
          >
            <SelectTrigger>
              <SelectValue placeholder={filters.book && filters.book !== 'all' ? "단원을 선택하세요" : "먼저 교재를 선택하세요"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 단원</SelectItem>
              {chapters.map(chapter => (
                <SelectItem key={chapter} value={chapter}>
                  {chapter}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 적용된 필터 표시 */}
        {getActiveFiltersCount() > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">적용된 필터</label>
            <div className="flex flex-wrap gap-2">
              {filters.dateRange !== 'all' && (
                <Badge variant="outline" className="gap-1">
                  기간: {getDateRangeLabel(filters.dateRange)}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('dateRange', 'all')}
                  />
                </Badge>
              )}
              {filters.subject && filters.subject !== 'all' && (
                <Badge variant="outline" className="gap-1">
                  과목: {filters.subject}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('subject', 'all')}
                  />
                </Badge>
              )}
              {filters.book && filters.book !== 'all' && (
                <Badge variant="outline" className="gap-1">
                  교재: {filters.book}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('book', 'all')}
                  />
                </Badge>
              )}
              {filters.chapter && filters.chapter !== 'all' && (
                <Badge variant="outline" className="gap-1">
                  단원: {filters.chapter}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('chapter', 'all')}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* 버튼 그룹 */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            onClick={onSearch} 
            disabled={isLoading}
            className="flex-1 gap-2"
          >
            <Search className="h-4 w-4" />
            {isLoading ? '검색 중...' : '검색'}
          </Button>
          
          {getActiveFiltersCount() > 0 && (
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              초기화
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};