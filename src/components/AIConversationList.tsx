import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Bot, Tag, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QAPair {
  id: string;
  q_text: string;
  a_text: string;
  importance: string;
  difficulty: string;
  tags: string[];
  created_at: string;
}

interface Conversation {
  id: string;
  subject: string;
  created_at: string;
  qa_pairs: QAPair[];
}

interface AIConversationListProps {
  refreshTrigger?: number;
}

export const AIConversationList: React.FC<AIConversationListProps> = ({ refreshTrigger }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleAnswers, setVisibleAnswers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // 답안 토글 함수
  const toggleAnswer = (qaId: string) => {
    const newVisible = new Set(visibleAnswers);
    if (newVisible.has(qaId)) {
      newVisible.delete(qaId);
    } else {
      newVisible.add(qaId);
    }
    setVisibleAnswers(newVisible);
  };

  // 전체 답안 토글
  const toggleAllAnswers = (conversationId: string, show: boolean) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const newVisible = new Set(visibleAnswers);
    conversation.qa_pairs.forEach(qa => {
      if (show) {
        newVisible.add(qa.id);
      } else {
        newVisible.delete(qa.id);
      }
    });
    setVisibleAnswers(newVisible);
  };

  // AI 대화 데이터 로드
  const loadAIConversations = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // conversations와 qa_pairs를 조인해서 가져오기
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          subject,
          created_at,
          qa_pairs!inner(
            id,
            q_text,
            a_text,
            importance,
            difficulty,
            tags,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading AI conversations:', error);
        toast({
          title: "로딩 오류",
          description: "AI 대화를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
        return;
      }

      setConversations(data || []);
    } catch (error) {
      console.error('Error loading AI conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadAIConversations();
  }, [refreshTrigger]);

  // 난이도별 색상
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // 중요도별 색상
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">AI 학습 아카이브</h2>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8">
        <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          아직 추가된 AI 대화가 없습니다
        </h3>
        <p className="text-sm text-muted-foreground">
          '🤖 AI 대화 추가' 버튼을 클릭해서 첫 번째 학습 아카이브를 만들어보세요!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="h-5 w-5 text-blue-500" />
        <h2 className="text-xl font-semibold">AI 학습 아카이브</h2>
        <Badge variant="secondary" className="ml-2">
          {conversations.reduce((total, conv) => total + conv.qa_pairs.length, 0)}개
        </Badge>
      </div>

      {conversations.map((conversation) => (
        <Card key={conversation.id} className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-blue-600">📚</span>
                {conversation.subject}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {conversation.qa_pairs.length}개 Q&A
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllAnswers(conversation.id, true)}
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  전체 보기
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllAnswers(conversation.id, false)}
                  className="text-xs"
                >
                  <EyeOff className="h-3 w-3 mr-1" />
                  전체 숨기기
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(conversation.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {conversation.qa_pairs.map((qa, index) => (
              <Card key={qa.id} className="border-l-4 border-l-blue-500 bg-muted/20">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {/* 질문 */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          Q{index + 1}
                        </Badge>
                        <Badge className={getDifficultyColor(qa.difficulty)} variant="secondary">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          {qa.difficulty}
                        </Badge>
                        <Badge className={getImportanceColor(qa.importance)} variant="secondary">
                          {qa.importance}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">
                        {qa.q_text}
                      </p>
                    </div>

                    {/* 답안 토글 버튼 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAnswer(qa.id)}
                      className="w-full"
                    >
                      {visibleAnswers.has(qa.id) ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          답안 숨기기
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          답안 보기
                        </>
                      )}
                    </Button>

                    {/* 답안 */}
                    {visibleAnswers.has(qa.id) && (
                      <div className="bg-background border rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-1 mb-2">
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            답안
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {qa.a_text}
                        </p>
                      </div>
                    )}

                    {/* 태그들 */}
                    {qa.tags && qa.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        {qa.tags.map((tag, tagIndex) => (
                          <Badge key={tagIndex} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};