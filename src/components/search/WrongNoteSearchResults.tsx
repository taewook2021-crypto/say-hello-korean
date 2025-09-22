import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { TemplateDocumentGenerator } from "@/components/study/TemplateDocumentGenerator";

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

interface WrongNoteSearchResultsProps {
  results: WrongNote[];
  isLoading: boolean;
  totalCount: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const WrongNoteSearchResults: React.FC<WrongNoteSearchResultsProps> = ({
  results,
  isLoading,
  totalCount,
  onLoadMore,
  hasMore = false
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return '오늘';
    if (diffInDays === 1) return '어제';
    if (diffInDays < 7) return `${diffInDays}일 전`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}주 전`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}개월 전`;
    return `${Math.floor(diffInDays / 365)}년 전`;
  };

  const getStatusBadge = (isResolved: boolean) => {
    return isResolved ? (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        해결됨
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1">
        <XCircle className="h-3 w-3" />
        미해결
      </Badge>
    );
  };

  if (isLoading && results.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">검색 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
          <p className="text-muted-foreground">
            다른 검색 조건을 시도해보세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 검색 결과 헤더 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                검색 결과
              </CardTitle>
              <CardDescription>
                총 {totalCount}개의 오답노트를 찾았습니다
              </CardDescription>
            </div>
            
            {results.length > 0 && (
              <TemplateDocumentGenerator
                notes={results.map(note => ({
                  id: note.id,
                  question: note.question,
                  sourceText: note.source_text,
                  explanation: note.explanation,
                  createdAt: new Date(note.created_at),
                  isResolved: note.is_resolved
                }))}
              />
            )}
          </div>
        </CardHeader>
      </Card>

      {/* 검색 결과 목록 */}
      <div className="space-y-3">
        {results.map((note, index) => (
          <Card key={note.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* 헤더 정보 */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{note.subject_name}</span>
                    <span>•</span>
                    <span>{note.book_name}</span>
                    <span>•</span>
                    <span>{note.chapter_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(note.is_resolved)}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(note.created_at)}
                    </div>
                  </div>
                </div>

                {/* 문제 내용 */}
                <div>
                  <h4 className="font-medium text-sm mb-2 line-clamp-3">
                    {note.question}
                  </h4>
                  
                  {note.source_text && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <span className="font-medium">근거: </span>
                      <span className="line-clamp-2">{note.source_text}</span>
                    </div>
                  )}
                </div>

                {/* 해설 */}
                {note.explanation && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">해설</span>
                      <p className="text-sm mt-1 line-clamp-3">
                        {note.explanation}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 더 보기 버튼 */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? '로딩 중...' : '더 보기'}
          </Button>
        </div>
      )}
    </div>
  );
};