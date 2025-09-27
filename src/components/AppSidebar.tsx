import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Home,
  BookOpen,
  Plus,
  Folder,
  User,
  Search,
  LogOut,
  Settings,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUnifiedData } from "@/contexts/UnifiedDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { UserAccount } from "@/components/UserAccount";
import { EditableText } from "@/components/EditableText";

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { getSubjectNames, addSubject, updateSubject } = useUnifiedData();
  const { user, profile, signOut } = useAuth();
  const [isAddSubjectDialogOpen, setIsAddSubjectDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const { open, setOpen } = useSidebar();

  const subjects = getSubjectNames();

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      return;
    }

    if (!user) {
      return;
    }

    try {
      await addSubject(newSubjectName.trim());
      setNewSubjectName("");
      setIsAddSubjectDialogOpen(false);
      // UnifiedDataContext에서 성공 토스트 처리
    } catch (error) {
      // UnifiedDataContext에서 오류 토스트 처리
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect even on error
      window.location.href = '/auth';
    }
  };

  const mainItems = [
    { title: "홈", url: "/", icon: Home },
    { title: "회독표", url: "/study-tracker", icon: BookOpen },
    { title: "오답노트 검색", url: "/search", icon: Search },
    { title: "백업 관리", url: "/backup", icon: Shield },
  ];

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className={`border-r border-border ${isMobile ? 'w-80' : 'w-64'}`} collapsible="offcanvas">
      {/* 헤더 */}
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h2 className="font-bold text-lg text-foreground">Re:Mind</h2>
          </div>
          {isMobile && (
            <SidebarTrigger className="p-2" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">학습 관리 시스템</p>
      </SidebarHeader>

      <SidebarContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
        {/* 메인 메뉴 */}
        <SidebarGroup>
          <SidebarGroupLabel>메인 메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className={`flex items-center gap-2 ${isMobile ? 'py-3 text-base' : ''}`}>
                      <item.icon className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 과목 관리 */}
        <SidebarGroup>
          <div className="flex items-center justify-between">
            <SidebarGroupLabel>과목 관리</SidebarGroupLabel>
            <Dialog open={isAddSubjectDialogOpen} onOpenChange={setIsAddSubjectDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Plus className="w-3 h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 과목 추가</DialogTitle>
                  <DialogDescription>
                    새로운 과목을 추가하면 회독표 생성시 선택할 수 있습니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="subjectName">과목명</Label>
                    <Input
                      id="subjectName"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="예: 수학"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          handleAddSubject();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddSubjectDialogOpen(false)}>
                      취소
                    </Button>
                    <Button onClick={handleAddSubject}>
                      추가하기
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {subjects.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2">
                  추가된 과목이 없습니다
                </div>
              ) : (
                 subjects.map((subject) => (
                   <SidebarMenuItem key={subject}>
                     <div className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
                       <Folder className="w-4 h-4 text-muted-foreground" />
                       <EditableText
                         text={subject}
                         onSave={(newName) => updateSubject(subject, newName)}
                         className="flex-1 text-sm"
                         placeholder="과목명을 입력하세요"
                       />
                       <NavLink 
                         to={`/subject/${subject}`} 
                         className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity ${
                           isActive(`/subject/${subject}`) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                         }`}
                       >
                         이동
                       </NavLink>
                     </div>
                   </SidebarMenuItem>
                 ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* 푸터 */}
      <SidebarFooter className={`${isMobile ? 'p-3' : 'p-4'} border-t border-border`}>
        {user && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30">
              <User className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    계정 관리
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <UserAccount />
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </Button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}