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
} from "@/components/ui/sidebar";
import {
  Home,
  BookOpen,
  Plus,
  Folder,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isAddSubjectDialogOpen, setIsAddSubjectDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = () => {
    // ARO 회독표에서 사용하는 과목들 로드
    const savedData = localStorage.getItem('aro-study-data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      const subjectNames = parsed.map((subject: any) => subject.name);
      setSubjects(subjectNames);
    }
  };

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) {
      toast.error("과목명을 입력해주세요.");
      return;
    }

    if (subjects.includes(newSubjectName.trim())) {
      toast.error("이미 존재하는 과목입니다.");
      return;
    }

    const updatedSubjects = [...subjects, newSubjectName.trim()];
    setSubjects(updatedSubjects);
    
    // 실제로는 localStorage에 빈 과목 데이터를 추가하지 않고, 
    // 회독표 생성시에만 실제 데이터가 저장되도록 함
    toast.success(`${newSubjectName.trim()} 과목이 추가되었습니다.`);
    setNewSubjectName("");
    setIsAddSubjectDialogOpen(false);
  };

  const mainItems = [
    { title: "홈", url: "/", icon: Home },
    { title: "ARO 회독표", url: "/study-tracker", icon: BookOpen },
  ];

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className="w-64 border-r border-border">
      {/* 헤더 */}
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <h2 className="font-bold text-lg text-foreground">ARO</h2>
        </div>
        <p className="text-sm text-muted-foreground">학습 관리 시스템</p>
      </SidebarHeader>

      <SidebarContent className="p-4">
        {/* 메인 메뉴 */}
        <SidebarGroup>
          <SidebarGroupLabel>메인 메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
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
                        if (e.key === 'Enter') {
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
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50">
                      <Folder className="w-4 h-4 text-primary" />
                      <span className="flex-1 text-sm">{subject}</span>
                    </div>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* 푸터 */}
      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">사용자</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}