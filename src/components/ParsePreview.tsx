import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Save, X, CheckCircle, Tag, Brain } from 'lucide-react';
import { ParsedQA } from '@/utils/aroParser';

interface ParsePreviewProps {
  qaPairs: ParsedQA[];
  detectedFormat: string;
  totalCount: number;
  onSave: () => void;
  onCancel: () => void;
}

export const ParsePreview: React.FC<ParsePreviewProps> = ({
  qaPairs,
  detectedFormat,
  totalCount,
  onSave,
  onCancel
}) => {
  const [expandedItems, setExpandedItems] = React.useState<Set<number>>(new Set([0, 1, 2])); // 첫 3개 기본 확장
  
  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'qa_pattern':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Q&A 패턴</Badge>;
      case 'aro_block':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">ARO 블록</Badge>;
      case 'mixed':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">혼합 포맷</Badge>;
      default:
        return <Badge variant="outline">알 수 없음</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            파싱 결과 미리보기
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            {getFormatBadge(detectedFormat)}
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              총 {totalCount}개 Q&A 추출
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            아래 내용을 확인하고 저장하세요. 처음 3개 항목이 자동으로 펼쳐져 있습니다.
          </p>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {qaPairs.map((qa, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Q{index + 1}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {qa.level}
                      </Badge>
                      {qa.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {qa.tags.slice(0, 2).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {qa.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{qa.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(index)}
                    >
                      {expandedItems.has(index) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">질문:</span>
                      <p className="text-sm mt-1 font-medium">
                        {qa.question.length > 100 && !expandedItems.has(index)
                          ? qa.question.substring(0, 100) + '...'
                          : qa.question
                        }
                      </p>
                    </div>

                    {expandedItems.has(index) && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <span className="text-xs font-medium text-muted-foreground">답변:</span>
                        <p className="text-sm mt-1 whitespace-pre-wrap">
                          {qa.answer}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              취소
            </Button>
            <Button onClick={onSave} className="bg-blue-500 hover:bg-blue-600">
              <Save className="h-4 w-4 mr-2" />
              저장하기 ({totalCount}개)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};