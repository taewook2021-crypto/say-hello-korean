import { useState, useEffect } from "react";
import { Home, BookOpen, FileText, Search, Settings, Plus } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface Subject {
  name: string;
  books: string[];
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('name')
        .order('name');
      
      if (subjectsError) throw subjectsError;

      const subjectsWithBooks = await Promise.all(
        (subjectsData || []).map(async (subject) => {
          const { data: booksData, error: booksError } = await supabase
            .from('books')
            .select('name')
            .eq('subject_name', subject.name)
            .order('name');
          
          if (booksError) {
            console.error('Error loading books for subject:', subject.name, booksError);
            return { name: subject.name, books: [] };
          }
          
          return {
            name: subject.name,
            books: booksData?.map((book: any) => book.name) || []
          };
        })
      );
      
      setSubjects(subjectsWithBooks);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const mainItems = [
    { title: "홈", url: "/", icon: Home },
    { title: "PDF 필기", url: "/pdf-annotator", icon: FileText },
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
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
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
                  <SidebarMenuItem key={subject.name}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={`/subject/${encodeURIComponent(subject.name)}`} 
                        className={getNavCls}
                      >
                        <BookOpen className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{subject.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {/* Books under subject */}
                    {subject.books.length > 0 && (
                      <div className="ml-6 mt-1 space-y-1">
                        {subject.books.slice(0, 3).map((book) => (
                          <SidebarMenuButton key={book} asChild>
                            <NavLink
                              to={`/book/${encodeURIComponent(subject.name)}/${encodeURIComponent(book)}`}
                              className="text-xs text-muted-foreground hover:text-foreground pl-3 py-1 block truncate"
                            >
                              {book}
                            </NavLink>
                          </SidebarMenuButton>
                        ))}
                        {subject.books.length > 3 && (
                          <div className="text-xs text-muted-foreground pl-3 py-1">
                            +{subject.books.length - 3}개 더
                          </div>
                        )}
                      </div>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Quick Actions */}
        {collapsed && (
          <SidebarGroup className="mt-6">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate('/')}>
                    <Plus className="h-4 w-4" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}