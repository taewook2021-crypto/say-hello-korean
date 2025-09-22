import { useState, useEffect } from "react";
import { BookOpen, Home, NotebookPen, ChevronRight, FileText, FolderOpen, User, Crown, CreditCard, Settings, BarChart3, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useData } from "@/contexts/DataContext";
import { SearchBar } from "@/components/SearchBar";
import { useSearch } from "@/contexts/SearchContext";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [currentPlan, setCurrentPlan] = useState<string>("무료");
  
  const { subjects, subjectBooks, loading, refreshBooksForSubject } = useData();
  const { setSearchState } = useSearch();
  
  // 더미 사용자 정보 (인증 제거)
  const dummyUser = { email: 'user@example.com' };

  useEffect(() => {
    // 로컬 스토리지에서 저장된 플랜 정보 로드
    const savedPlan = localStorage.getItem('currentPlan');
    if (savedPlan) {
      setCurrentPlan(savedPlan);
    }
  }, []);

  const handleUpgrade = (planName: string) => {
    setCurrentPlan(planName);
    toast.success(`${planName} 플랜으로 업그레이드되었습니다!`);
    
    // 로컬 스토리지에 플랜 정보 저장 (임시)
    localStorage.setItem('currentPlan', planName);
    
    // 페이지 새로고침하여 모든 상태 업데이트
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const toggleSubject = async (subject: string) => {
    const newExpanded = new Set(expandedSubjects);
    
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
      // Load books for this subject if not already loaded
      if (!subjectBooks[subject]) {
        await refreshBooksForSubject(subject);
      }
    }
    
    setExpandedSubjects(newExpanded);
  };

  const handleSearch = async (query: string, type: 'subject' | 'book' | 'chapter') => {
    try {
      // Search for wrong notes based on the search type and query
      let searchResults = [];
      
      if (type === 'subject') {
        // Search by subject name
        const { data, error } = await supabase
          .from('wrong_notes')
          .select('*')
          .ilike('subject_name', `%${query}%`);
        
        if (error) throw error;
        searchResults = data || [];
      } else if (type === 'book') {
        // Search by book name
        const { data, error } = await supabase
          .from('wrong_notes')
          .select('*')
          .ilike('book_name', `%${query}%`);
        
        if (error) throw error;
        searchResults = data || [];
      } else if (type === 'chapter') {
        // Search by chapter name
        const { data, error } = await supabase
          .from('wrong_notes')
          .select('*')
          .ilike('chapter_name', `%${query}%`);
        
        if (error) throw error;
        searchResults = data || [];
      }

      // Update search context
      setSearchState({
        isSearchActive: true,
        searchQuery: query,
        searchType: type,
        searchResults,
      });
      
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const mainItems = [
    { title: "홈", url: "/", icon: Home },
    { title: "ARO 회독표", url: "/study-tracker", icon: BookOpen },
  ];

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
      isActive 
        ? "bg-primary text-primary-foreground" 
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent className="p-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2">
            {!collapsed && "탐색"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url} className={getNavCls({ isActive: isActive(item.url) })}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Search Section */}
        {!collapsed && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2">
              검색
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SearchBar onSearch={handleSearch} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Subjects */}
        {!collapsed && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2">
              과목
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {subjects.map((subject) => (
                  <SidebarMenuItem key={subject}>
                    <Collapsible open={expandedSubjects.has(subject)} onOpenChange={() => toggleSubject(subject)}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <BookOpen className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{subject}</span>
                          <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${expandedSubjects.has(subject) ? 'rotate-90' : ''}`} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {/* 교재 목록 섹션 */}
                          {subjectBooks[subject]?.length > 0 && (
                            <>
                              <SidebarMenuSubItem>
                                <div className="text-xs text-muted-foreground px-3 py-1 flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  교재 목록
                                </div>
                              </SidebarMenuSubItem>
                              {subjectBooks[subject].slice(0, 3).map((book) => (
                                <SidebarMenuSubItem key={book}>
                                  <SidebarMenuSubButton asChild>
                                    <Link
                                      to={`/subject/${encodeURIComponent(subject)}/book/${encodeURIComponent(book)}`}
                                      className="text-xs text-muted-foreground hover:text-foreground truncate"
                                    >
                                      {book}
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                              {subjectBooks[subject].length > 3 && (
                                <SidebarMenuSubItem>
                                  <div className="text-xs text-muted-foreground px-3 py-1">
                                    +{subjectBooks[subject].length - 3}개 더
                                  </div>
                                </SidebarMenuSubItem>
                              )}
                            </>
                          )}
                          
                          {/* 오답노트 폴더 */}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <Link
                                to={`/subject/${encodeURIComponent(subject)}/wrong-notes`}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                              >
                                <FolderOpen className="h-3 w-3" />
                                오답노트
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with User Info and Subscription */}
      {!collapsed && (
        <SidebarFooter className="p-4 border-t border-border">
          {/* User Info - 클릭 가능한 버튼으로 변경 */}
          <div className="mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" className="w-full p-0 h-auto">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors w-full">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{dummyUser.email}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={currentPlan === "무료" ? "secondary" : "default"} className="text-xs">
                          {currentPlan}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    계정 정보
                  </DialogTitle>
                  <DialogDescription>
                    계정 설정 및 구독 관리
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* 사용자 정보 */}
                  <div className="space-y-3">
                    <h3 className="font-medium">사용자 정보</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">이메일</span>
                        <span>{dummyUser.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">가입일</span>
                        <span>2024년 1월 15일</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">현재 플랜</span>
                        <Badge variant={currentPlan === "무료" ? "secondary" : "default"}>
                          {currentPlan}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* 사용량 정보 */}
                  <div className="space-y-3">
                    <h3 className="font-medium">이번 달 사용량</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">AI 질문</span>
                        <span>24 / 50</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">오답노트</span>
                        <span>127개</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">학습 시간</span>
                        <span>18시간 32분</span>
                      </div>
                    </div>
                  </div>

                  {/* 구독 업그레이드 섹션 */}
                  <div className="space-y-3">
                    <h3 className="font-medium">구독 업그레이드</h3>
                    <div className="grid gap-3">
                      {/* 베이직 플랜 */}
                      <Card className={currentPlan === "베이직" ? "border-primary" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium">베이직</h4>
                              <p className="text-xs text-muted-foreground">개인 학습자용</p>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">₩4,900</div>
                              <p className="text-xs text-muted-foreground">월</p>
                            </div>
                          </div>
                          <ul className="text-xs space-y-1 mb-3">
                            <li>• 일일 50회 AI 질문</li>
                            <li>• 고급 AI 모델 사용</li>
                            <li>• 무제한 오답노트</li>
                          </ul>
                          <Button 
                            className="w-full" 
                            size="sm" 
                            disabled={currentPlan === "베이직"}
                            onClick={() => handleUpgrade("베이직")}
                          >
                            {currentPlan === "베이직" ? "현재 플랜" : "업그레이드"}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* 프로 플랜 */}
                      <Card className={currentPlan === "프로" ? "border-primary" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium">프로</h4>
                              <p className="text-xs text-muted-foreground">고급 사용자용</p>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">₩9,900</div>
                              <p className="text-xs text-muted-foreground">월</p>
                            </div>
                          </div>
                          <ul className="text-xs space-y-1 mb-3">
                            <li>• 무제한 AI 질문</li>
                            <li>• 모든 AI 모델</li>
                            <li>• 고급 학습 분석</li>
                          </ul>
                          <Button 
                            className="w-full" 
                            size="sm" 
                            disabled={currentPlan === "프로"}
                            onClick={() => handleUpgrade("프로")}
                          >
                            {currentPlan === "프로" ? "현재 플랜" : "업그레이드"}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* 계정 관리 */}
                  <div className="space-y-3 pt-3 border-t">
                    <h3 className="font-medium">계정 관리</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        계정 설정
                      </Button>
                      <Button variant="outline" className="w-full justify-start" size="sm">
                        <CreditCard className="h-4 w-4 mr-2" />
                        결제 내역
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

        </SidebarFooter>
      )}
    </Sidebar>
  );
}