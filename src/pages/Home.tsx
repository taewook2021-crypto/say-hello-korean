import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Plus, ChevronRight, ChevronDown, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { TodayReviews } from "@/components/TodayReviews";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useProfile } from "@/hooks/useProfile";
import { parseAROFormat, validateParsedData } from "@/utils/aroParser";
import { User } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSubject, setNewSubject] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [subjectBooks, setSubjectBooks] = useState<{[key: string]: string[]}>({});
  const [booksLoading, setBooksLoading] = useState<{[key: string]: boolean}>({});
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [bookMajorChapters, setBookMajorChapters] = useState<{[key: string]: any[]}>({});
  const [majorChaptersLoading, setMajorChaptersLoading] = useState<{[key: string]: boolean}>({});
  const [expandedMajorChapter, setExpandedMajorChapter] = useState<string | null>(null);
  const [majorChapterSubChapters, setMajorChapterSubChapters] = useState<{[key: string]: string[]}>({});
  const [subChaptersLoading, setSubChaptersLoading] = useState<{[key: string]: boolean}>({});
  
  // 다이얼로그 상태
  const [showAddBookDialog, setShowAddBookDialog] = useState(false);
  const [newBook, setNewBook] = useState("");
  const [selectedSubjectForBook, setSelectedSubjectForBook] = useState("");
  const [showAddMajorChapterDialog, setShowAddMajorChapterDialog] = useState(false);
  const [newMajorChapter, setNewMajorChapter] = useState("");
  const [selectedBookForMajorChapter, setSelectedBookForMajorChapter] = useState("");
  const [selectedSubjectForMajorChapter, setSelectedSubjectForMajorChapter] = useState("");
  const [showAddSubChapterDialog, setShowAddSubChapterDialog] = useState(false);
  const [newSubChapter, setNewSubChapter] = useState("");
  const [selectedMajorChapterForSubChapter, setSelectedMajorChapterForSubChapter] = useState("");
  const [showAddChapterTypeDialog, setShowAddChapterTypeDialog] = useState(false);
  const [selectedSubjectForChapterType, setSelectedSubjectForChapterType] = useState("");
  const [selectedBookForChapterType, setSelectedBookForChapterType] = useState("");
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<'subject' | 'book' | 'major' | 'sub'>('major');
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [deleteTargetName, setDeleteTargetName] = useState("");
  
  // AI 대화 추가 다이얼로그 상태
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiSubject, setAiSubject] = useState("");
  const [aiRawText, setAiRawText] = useState("");
  
  const { toast } = useToast();
  const { profile, isPremiumUser } = useProfile();

  // AI 대화 추가 함수
  const addAIConversation = async () => {
    if (!aiSubject.trim() || !aiRawText.trim()) return;

    try {
      // 1. ARO 포맷 파싱
      const parsed = parseAROFormat(aiRawText);
      const errors = validateParsedData(parsed);
      
      if (errors.length > 0) {
        toast({
          title: "파싱 오류",
          description: errors.join('\n'),
          variant: "destructive",
        });
        return;
      }

      // 2. 현재 사용자 ID 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        });
        return;
      }

      // 3. conversations 테이블에 저장
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          subject: aiSubject.trim(),
          raw_text: aiRawText,
          lang: 'ko'
        })
        .select()
        .single();

      if (conversationError) {
        console.error('Conversation insert error:', conversationError);
        toast({
          title: "저장 오류",
          description: "대화 저장에 실패했습니다.",
          variant: "destructive",
        });
        return;
      }

      // 4. qa_pairs 테이블에 저장
      const qaInserts = parsed.qaPairs.map(qa => ({
        conversation_id: conversation.id,
        q_text: qa.question,
        a_text: qa.answer,
        importance: 'medium',
        difficulty: qa.level,
        tags: qa.tags
      }));

      const { data: qaPairs, error: qaError } = await supabase
        .from('qa_pairs')
        .insert(qaInserts)
        .select();

      if (qaError) {
        console.error('QA pairs insert error:', qaError);
        toast({
          title: "저장 오류",
          description: "Q&A 저장에 실패했습니다.",
          variant: "destructive",
        });
        return;
      }

      // 5. cards 테이블에 플래시카드로 저장
      const cardInserts = qaPairs?.map(qa => ({
        qa_id: qa.id,
        front: qa.q_text,
        back: qa.a_text,
        next_review_date: new Date().toISOString(),
        ease_factor: 2.50,
        interval_days: 1,
        reviewed_count: 0
      })) || [];

      const { error: cardError } = await supabase
        .from('cards')
        .insert(cardInserts);

      if (cardError) {
        console.error('Cards insert error:', cardError);
        toast({
          title: "경고",
          description: "플래시카드 생성에 실패했습니다.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "AI 대화 추가 완료! 🎉", 
        description: `${aiSubject} 과목에 ${parsed.totalCount}개의 Q&A가 추가되었습니다.`,
      });
      
      setAiSubject("");
      setAiRawText("");
      setShowAIDialog(false);
      
      // 화면 새로고침
      loadSubjects();
      
    } catch (error) {
      console.error('Error adding AI conversation:', error);
      toast({
        title: "오류",
        description: "AI 대화 추가에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('name')
        .order('name');
      
      if (error) throw error;
      
      setSubjects(data?.map((subject: any) => subject.name) || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBooksForSubject = async (subjectName: string) => {
    if (subjectBooks[subjectName]) return;
    
    setBooksLoading(prev => ({ ...prev, [subjectName]: true }));
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('name')
        .eq('subject_name', subjectName)
        .order('name');
      
      if (error) throw error;
      
      setSubjectBooks(prev => ({
        ...prev,
        [subjectName]: data?.map((book: any) => book.name) || []
      }));
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setBooksLoading(prev => ({ ...prev, [subjectName]: false }));
    }
  };

  async function toggleSubject(subject: string) {
    if (expandedSubject === subject) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subject);
      await loadBooksForSubject(subject);
    }
  }

  async function addSubject() {
    if (!newSubject.trim()) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .insert({ name: newSubject.trim() });

      if (error) throw error;

      setSubjects([...subjects, newSubject.trim()]);
      setNewSubject("");
      setShowAddDialog(false);
      
      toast({
        title: "과목 추가됨",
        description: `${newSubject} 과목이 추가되었습니다.`,
      });
    } catch (error) {
      console.error('Error adding subject:', error);
      toast({
        title: "오류",
        description: "과목 추가에 실패했습니다.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">내 학습 공간</h2>
            <p className="text-muted-foreground">
              과목별로 체계적인 학습을 시작해보세요
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isPremiumUser ? "default" : "ghost"}
              size="icon"
              onClick={() => navigate('/account')}
              className={isPremiumUser ? "bg-blue-500 hover:bg-blue-600" : ""}
            >
              <User className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Today's Reviews Section */}
        <TodayReviews />

        {/* Subjects Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              {subjects.map((subject) => (
                <Card key={subject} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>{subject}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSubject(subject)}
                        >
                          {expandedSubject === subject ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {expandedSubject === subject && (
                      <div className="space-y-2">
                        {booksLoading[subject] ? (
                          <div className="animate-pulse">
                            <div className="h-4 bg-muted rounded mb-2"></div>
                            <div className="h-4 bg-muted rounded"></div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {subjectBooks[subject]?.map((book) => (
                              <div key={book}>
                                <Link
                                  to={`/book/${encodeURIComponent(subject)}/${encodeURIComponent(book)}`}
                                  className="flex items-center justify-between p-2 rounded hover:bg-muted group"
                                >
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{book}</span>
                                  </div>
                                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                              </div>
                            ))}
                            {(!subjectBooks[subject] || subjectBooks[subject].length === 0) && (
                              <p className="text-sm text-muted-foreground italic">
                                등록된 책이 없습니다
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Add Subject Card */}
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 hover:border-primary/50">
                    <CardContent className="flex flex-col items-center justify-center h-32">
                      <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">새 과목 추가</span>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 과목 추가</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="과목명을 입력하세요"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        취소
                      </Button>
                      <Button onClick={addSubject} disabled={!newSubject.trim()}>
                        추가
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* 🤖 AI 대화 추가 Card */}
              <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
                <DialogTrigger asChild>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 hover:border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardContent className="flex flex-col items-center justify-center h-32">
                      <Bot className="h-8 w-8 text-blue-500 mb-2" />
                      <span className="text-sm text-blue-600 dark:text-blue-400">🤖 AI 대화 추가</span>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>🤖 AI 대화 추가</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">과목명</label>
                      <Input
                        placeholder="과목명을 입력하세요 (예: 수학, 영어, 물리학)"
                        value={aiSubject}
                        onChange={(e) => setAiSubject(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">AI 대화 내용</label>
                      <Textarea
                        placeholder={`ARO 포맷으로 정리된 Q&A를 붙여넣어 주세요:

###
Q: 미적분의 기본 정리는 무엇인가요?
A: 미적분의 기본 정리는 미분과 적분이 서로 역연산 관계임을 보여주는 정리입니다...
TAGS: 미적분, 기본정리, 수학
LEVEL: basic

###
Q: 다음 질문...
A: 답변...
TAGS: 태그1, 태그2
LEVEL: intermediate`}
                        value={aiRawText}
                        onChange={(e) => setAiRawText(e.target.value)}
                        className="min-h-[300px] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 ChatGPT나 Claude에게 "ARO 정리용으로 Q&A 형태로 요약해줘"라고 요청한 후 붙여넣어 주세요
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAIDialog(false)}>
                        취소
                      </Button>
                      <Button 
                        onClick={addAIConversation} 
                        disabled={!aiSubject.trim() || !aiRawText.trim()}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Bot className="h-4 w-4 mr-2" />
                        추가하기
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
