import { useState, useEffect } from "react";
import { BookOpen, Home, NotebookPen, ChevronRight, FileText, FolderOpen } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useData } from "@/contexts/DataContext";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  
  const { subjects, subjectBooks, loading, refreshBooksForSubject } = useData();

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
                          {/* PDF 목록 섹션 */}
                          {subjectBooks[subject]?.length > 0 && (
                            <>
                              <SidebarMenuSubItem>
                                <div className="text-xs text-muted-foreground px-3 py-1 flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  PDF 목록
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
    </Sidebar>
  );
}