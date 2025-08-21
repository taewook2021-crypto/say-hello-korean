import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, FileText, HelpCircle } from 'lucide-react';
import type { ParsedQA, ParsedSummary } from '@/utils/aroParser';

interface SummaryAndQAPreviewProps {
  summary?: ParsedSummary;
  qaPairs: ParsedQA[];
  detectedFormat: string;
  onSave: () => void;
  onCancel: () => void;
}

export const SummaryAndQAPreview: React.FC<SummaryAndQAPreviewProps> = ({
  summary,
  qaPairs,
  detectedFormat,
  onSave,
  onCancel
}) => {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set([0, 1, 2]));

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCards(newExpanded);
  };

  const getFormatBadge = (format: string) => {
    const formatLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'summary_and_qa': { label: '정리글 + Q&A', variant: 'default' },
      'summary_only': { label: '정리글만', variant: 'secondary' },
      'qa_only': { label: 'Q&A만', variant: 'outline' },
      'unknown': { label: '형식 불명', variant: 'destructive' }
    };
    
    const info = formatLabels[format] || formatLabels['unknown'];
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              미리보기 및 확인
              {getFormatBadge(detectedFormat)}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {summary && '📝 정리글 '}
              {qaPairs.length > 0 && `💭 Q&A ${qaPairs.length}개`}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 좌우 분할 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[60vh]">
        {/* 왼쪽: 정리글 */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              학습 정리글
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 h-[50vh]">
            {summary ? (
              <ScrollArea className="h-full w-full">
                <div className="prose prose-sm max-w-none pr-4">
                  <h3 className="text-lg font-semibold mb-3 sticky top-0 bg-background">{summary.title}</h3>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {summary.content}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">정리글이 없습니다</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 오른쪽: Q&A 카드들 */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Q&A 카드 ({qaPairs.length}개)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 h-[50vh]">
            {qaPairs.length > 0 ? (
              <ScrollArea className="h-full w-full">
                <div className="space-y-3 pr-4">
                  {qaPairs.map((qa, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm mb-1">
                            Q{index + 1}. {qa.question}
                          </div>
                          
                          {expandedCards.has(index) && (
                            <div className="text-sm text-muted-foreground mt-2 pl-2 border-l-2 border-primary/20">
                              {qa.answer}
                            </div>
                          )}
                          
                          {qa.tags && qa.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {qa.tags.map((tag, tagIndex) => (
                                <Badge key={tagIndex} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(index)}
                          className="h-6 w-6 p-0 shrink-0"
                        >
                          {expandedCards.has(index) ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Q&A 카드가 없습니다</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 하단 버튼 */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button 
          onClick={onSave} 
          disabled={!summary && qaPairs.length === 0}
        >
          노드에 저장
        </Button>
      </div>
    </div>
  );
};