import { useState, useEffect } from "react";
import { BookOpen, Home, NotebookPen, ChevronRight, FileText, FolderOpen, User, Crown, CreditCard } from "lucide-react";
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

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("무료");
  
  const { subjects, subjectBooks, loading, refreshBooksForSubject } = useData();
  const { setSearchState } = useSearch();

  useEffect(() => {
    // 임시로 하드코딩된 사용자 정보 (실제로는 auth에서 가져와야 함)
    setUserEmail("user@example.com");
  }, []);

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
          {/* User Info */}
          <div className="mb-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userEmail}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={currentPlan === "무료" ? "secondary" : "default"} className="text-xs">
                    {currentPlan}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Section */}
          <div className="space-y-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Crown className="h-4 w-4 mr-2" />
                  구독 업그레이드
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>구독 플랜</DialogTitle>
                  <DialogDescription>
                    더 많은 기능을 이용하세요
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Free Plan */}
                  <Card className={currentPlan === "무료" ? "border-primary" : ""}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        무료
                        {currentPlan === "무료" && <Badge>현재 플랜</Badge>}
                      </CardTitle>
                      <CardDescription>기본 기능</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₩0</div>
                      <p className="text-xs text-muted-foreground">월</p>
                      <ul className="mt-3 space-y-1 text-sm">
                        <li>• 일일 5회 AI 질문</li>
                        <li>• 기본 오답노트</li>
                        <li>• 플래시카드</li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Basic Plan */}
                  <Card className={currentPlan === "베이직" ? "border-primary" : ""}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        베이직
                        {currentPlan === "베이직" && <Badge>현재 플랜</Badge>}
                      </CardTitle>
                      <CardDescription>개인 학습자용</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₩4,900</div>
                      <p className="text-xs text-muted-foreground">월</p>
                      <ul className="mt-3 space-y-1 text-sm">
                        <li>• 일일 50회 AI 질문</li>
                        <li>• 고급 AI 모델 사용</li>
                        <li>• 무제한 오답노트</li>
                        <li>• 학습 분석</li>
                      </ul>
                      <Button className="w-full mt-4" disabled>
                        <CreditCard className="h-4 w-4 mr-2" />
                        선택하기 (준비중)
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Pro Plan */}
                  <Card className={currentPlan === "프로" ? "border-primary" : ""}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        프로
                        {currentPlan === "프로" && <Badge>현재 플랜</Badge>}
                      </CardTitle>
                      <CardDescription>고급 사용자용</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₩9,900</div>
                      <p className="text-xs text-muted-foreground">월</p>
                      <ul className="mt-3 space-y-1 text-sm">
                        <li>• 무제한 AI 질문</li>
                        <li>• 모든 AI 모델 사용</li>
                        <li>• 고급 학습 분석</li>
                        <li>• 우선 지원</li>
                        <li>• PDF 파일 업로드</li>
                      </ul>
                      <Button className="w-full mt-4" disabled>
                        <CreditCard className="h-4 w-4 mr-2" />
                        선택하기 (준비중)
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}