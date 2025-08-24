import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, X, Plus, File, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { parseAROFormat as parseAROTeacher } from '@/utils/aroFormatParser';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { AddArchiveModal } from '@/components/AddArchiveModal';
import { AddFolderModal } from '@/components/AddFolderModal';

interface Project {
  id: string;
  name: string;
  icon: string;
  goal: string;
  archiveCount: number;
  borderColor: string;
}

interface Item {
  id: string;
  project_id: string;
  item_type: 'archive' | 'folder';
  title?: string | null;
  name?: string | null;
  source_type?: 'text' | 'pdf' | 'link' | null;
  raw_content?: string | null;
  file_url?: string | null;
  link_url?: string | null;
  description?: string | null;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  is_deleted: boolean;
}

const initialProjects: Project[] = [
  {
    id: crypto.randomUUID(),
    name: '영어 학습',
    icon: '🌱',
    goal: '목표: 입이 트이기 활용',
    archiveCount: 3,
    borderColor: '#8B5CF6' // purple
  },
  {
    id: crypto.randomUUID(),
    name: '재테크',
    icon: '🌿',
    goal: '목표: 순자산 1000만원',
    archiveCount: 5,
    borderColor: '#22C55E' // green
  },
  {
    id: crypto.randomUUID(),
    name: '서울대학교 25\'2',
    icon: '🌳',
    goal: '목표: 합격하기',
    archiveCount: 8,
    borderColor: '#EF4444' // red
  },
  {
    id: crypto.randomUUID(),
    name: '면접 대비',
    icon: '🌱',
    goal: '목표: 자신감 향상',
    archiveCount: 2,
    borderColor: '#6B7280' // gray
  },
  {
    id: crypto.randomUUID(),
    name: '회계사 시험',
    icon: '🌿',
    goal: '목표: 1차 합격',
    archiveCount: 6,
    borderColor: '#F97316' // orange
  }
];

export const SimpleProjectDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Add project modal state
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectGoal, setNewProjectGoal] = useState('');
  const [newProjectIcon, setNewProjectIcon] = useState('🌱');
  const [newProjectColor, setNewProjectColor] = useState('#8B5CF6');

  const createProject = () => {
    if (!newProjectName.trim()) return;
    
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: newProjectName.trim(),
      icon: newProjectIcon,
      goal: newProjectGoal.trim() || '목표 설정 안함',
      archiveCount: 0,
      borderColor: newProjectColor
    };

    setProjects([newProject, ...projects]);
    setAddProjectModalOpen(false);
    setNewProjectName('');
    setNewProjectGoal('');
    setNewProjectIcon('🌱');
    setNewProjectColor('#8B5CF6');
    
    toast({
      title: "프로젝트 생성됨",
      description: "새 프로젝트가 성공적으로 추가되었습니다"
    });
  };

  const deleteProject = async (projectId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // 프로젝트 카드 클릭 이벤트 방지
    }
    
    const projectToDelete = projects.find(p => p.id === projectId);
    if (projectToDelete && confirm(`"${projectToDelete.name}" 프로젝트를 삭제하시겠습니까?`)) {
      try {
        // 데이터베이스에서 프로젝트 삭제
        const { error } = await supabase
          .from('nodes')
          .delete()
          .eq('id', projectId);

        if (error) throw error;

        // UI에서 프로젝트 제거
        setProjects(projects.filter(p => p.id !== projectId));
        
        // 만약 현재 선택된 프로젝트가 삭제되는 경우 메인 화면으로 돌아가기
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
        }

        toast({
          title: "프로젝트 삭제됨",
          description: "프로젝트가 성공적으로 삭제되었습니다"
        });
      } catch (error) {
        console.error('Error deleting project:', error);
        toast({
          title: "삭제 실패",
          description: "프로젝트 삭제에 실패했습니다",
          variant: "destructive"
        });
      }
    }
  };

  const ProjectCard: React.FC<{ project: Project }> = ({ project }) => (
    <Card
      className="group relative p-6 cursor-pointer border-l-4 h-48"
      style={{ borderLeftColor: project.borderColor }}
      onClick={() => setSelectedProject(project)}
    >
      {/* 삭제 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 p-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
        onClick={(e) => deleteProject(project.id, e)}
      >
        <X className="w-4 h-4" />
      </Button>

      <div className="h-full flex flex-col justify-between">
        <div>
          <div className="text-3xl mb-3">{project.icon}</div>
          <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
          <p className="text-sm text-muted-foreground mb-3">{project.goal}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          아카이브 {project.archiveCount}개
        </div>
      </div>
    </Card>
  );

  const ProjectDetail: React.FC<{ project: Project }> = ({ project }) => {
    const [items, setItems] = useState<Item[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Modal states
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [folderModalOpen, setFolderModalOpen] = useState(false);

    const fetchItems = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('items')
          .select('*')
          .eq('project_id', project.id)
          .eq('is_deleted', false);
        
        if (currentFolderId) {
          query = query.eq('parent_id', currentFolderId);
        } else {
          query = query.is('parent_id', null);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        setItems((data || []) as Item[]);
      } catch (error) {
        console.error('Error fetching items:', error);
        toast({
          title: "Error",
          description: "Failed to load items",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchItems();
    }, [project.id, currentFolderId]);

    const handleCreateArchive = async (data: {
      title: string;
      description: string;
      sourceType: 'text' | 'pdf' | 'link';
      content: string;
      url: string;
    }) => {
      try {
        console.log('💾 아카이브 저장 시작:', { title: data.title, content: data.content });

        let explanation = '';
        let qaCount = 0;

        // ARO 포맷 파싱 시도 (text 타입인 경우만)
        if (data.sourceType === 'text' && data.content.trim()) {
          const parsedARO = parseAROTeacher(data.content.trim());
          
          if (!parsedARO.isValid) {
            // ARO 형식이 아니면 일반 텍스트로 처리하거나 에러 표시
            if (parsedARO.error?.includes('ARO START')) {
              // 명시적으로 ARO 형식을 기대했지만 잘못된 경우
              toast({
                title: "ARO 형식 오류",
                description: parsedARO.error,
                variant: "destructive"
              });
              // 그래도 아카이브는 저장 (save-first, parse-later)
            }
            explanation = data.content.trim();
          } else {
            explanation = parsedARO.explanation;
            
            // Q&A를 wrong_notes 테이블에 저장
            if (parsedARO.qaEntries.length > 0) {
              const wrongNotesData = parsedARO.qaEntries.map(qa => ({
                question: qa.question.substring(0, 15000), // Truncate at 15k chars
                correct_answer: qa.answer.substring(0, 15000),
                wrong_answer: null,
                explanation: `ARO 아카이브: ${data.title.trim()}`,
                subject_name: data.title.trim().substring(0, 255),
                book_name: "ARO 아카이브",
                chapter_name: data.title.trim().substring(0, 50),
                is_resolved: false
              }));

              const { error: qaError } = await supabase
                .from('wrong_notes')
                .insert(wrongNotesData);

              if (qaError) {
                console.error('❌ Q&A 저장 오류:', qaError);
                toast({
                  title: "Q&A 저장 실패",
                  description: "Q&A 파싱은 성공했지만 저장에 실패했습니다",
                  variant: "destructive"
                });
              } else {
                qaCount = parsedARO.qaEntries.length;
                console.log(`✅ ${qaCount}개 Q&A 저장 성공`);
              }
            }
          }
        }

        // 1. conversations 테이블에 대화 저장
        const { data: conversation, error: conversationError } = await supabase
          .from('conversations')
          .insert({
            title: data.title.trim(),
            content: data.content.trim() || `[${data.sourceType.toUpperCase()}] ${data.url || '외부 소스'}`,
            node_id: null // 임시로 null 설정 (프로젝트가 DB에 없으므로)
          })
          .select()
          .single();

        if (conversationError) {
          console.error('❌ 대화 저장 오류:', conversationError);
          throw conversationError;
        }

        console.log('✅ 대화 저장 성공:', conversation);

        // 2. items 테이블에 아카이브 아이템으로 저장 (UI 표시용)
        const newItem = {
          project_id: project.id,
          item_type: 'archive' as const,
          title: data.title.trim(),
          description: qaCount > 0 
            ? `${data.description.trim() || ''} (Q&A ${qaCount}개 파싱됨)`.trim()
            : data.description.trim() || null,
          source_type: data.sourceType,
          raw_content: data.content.trim().substring(0, 15000) || null, // Truncate
          link_url: data.sourceType === 'link' ? data.url.trim() || null : null,
          parent_id: currentFolderId
        };

        const { data: item, error: itemError } = await supabase
          .from('items')
          .insert([newItem])
          .select()
          .single();

        if (itemError) {
          console.error('❌ 아이템 저장 오류:', itemError);
          throw itemError;
        }

        console.log('✅ 아이템 저장 성공:', item);
        // UI에 새 아이템 추가
        setItems([item as Item, ...items]);

        // 3. 프로젝트 상태 업데이트
        try {
          const { data: nodeData } = await supabase
            .from('nodes')
            .select('archive_count')
            .eq('id', project.id)
            .single();
          
          if (nodeData) {
            const { updateProjectStatus } = await import('@/utils/projectStatusManager');
            await updateProjectStatus(project.id, (nodeData.archive_count || 0) + 1);
          }
        } catch (statusError) {
          console.error('❌ 프로젝트 상태 업데이트 오류:', statusError);
        }

        setArchiveModalOpen(false);
        
        toast({
          title: "Archive created",
          description: qaCount > 0 
            ? `Q&A added: ${qaCount}`
            : "Archive created successfully"
        });

      } catch (error) {
        console.error('💥 아카이브 생성 실패:', error);
        toast({
          title: "Creation failed",
          description: "Failed to create archive",
          variant: "destructive"
        });
      }
    };

    const handleCreateFolder = async (name: string) => {
      try {
        const newItem = {
          project_id: project.id,
          item_type: 'folder' as const,
          name: name,
          parent_id: currentFolderId
        };

        const { data, error } = await supabase
          .from('items')
          .insert([newItem])
          .select()
          .single();

        if (error) throw error;

        setItems([data as Item, ...items]);
        setFolderModalOpen(false);
        
        toast({
          title: "Folder created",
          description: "Your folder has been added successfully"
        });
      } catch (error) {
        console.error('Error creating folder:', error);
        toast({
          title: "Error",
          description: "Failed to create folder",
          variant: "destructive"
        });
      }
    };

    return (
      <div className="min-h-screen bg-background p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProject(null)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로
            </Button>
            <h1 className="text-2xl font-bold">{project.name}</h1>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => deleteProject(project.id)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            프로젝트 삭제
          </Button>
        </div>

        {/* Content Area */}
        <div className="relative w-full min-h-96">
          {/* Center Hub */}
          <div className="flex justify-center mb-8">
            <div className="bg-background border-2 border-primary rounded-lg p-6">
              <h2 className="text-2xl font-bold text-center text-primary">{project.name}</h2>
            </div>
          </div>

          {/* Items Grid */}
          {loading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No items yet. Use the + button to add archives or folders.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="p-4 cursor-pointer hover:bg-accent">
                  <div className="flex items-center gap-3">
                    {item.item_type === 'folder' ? (
                      <Folder className="w-8 h-8 text-blue-500" />
                    ) : (
                      <File className="w-8 h-8 text-green-500" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium">
                        {item.item_type === 'folder' ? item.name : item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      {item.source_type && (
                        <span className="text-xs text-muted-foreground">
                          {item.source_type.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <FloatingActionButton
          onAddArchive={() => setArchiveModalOpen(true)}
          onAddFolder={() => setFolderModalOpen(true)}
        />

        {/* Modals */}
        <AddArchiveModal
          isOpen={archiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onSubmit={handleCreateArchive}
        />

        <AddFolderModal
          isOpen={folderModalOpen}
          onClose={() => setFolderModalOpen(false)}
          onSubmit={handleCreateFolder}
        />
      </div>
    );
  };

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">프로젝트 트리</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
        
        {/* Add Project FAB */}
        <Button 
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          onClick={() => setAddProjectModalOpen(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
        
        {/* Add Project Modal */}
        <Dialog open={addProjectModalOpen} onOpenChange={setAddProjectModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>새 프로젝트 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-name">프로젝트 이름 *</Label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="프로젝트 이름을 입력하세요"
                />
              </div>
              
              <div>
                <Label htmlFor="project-goal">목표</Label>
                <Input
                  id="project-goal"
                  value={newProjectGoal}
                  onChange={(e) => setNewProjectGoal(e.target.value)}
                  placeholder="목표를 입력하세요 (선택사항)"
                />
              </div>

              <div>
                <Label htmlFor="project-icon">아이콘</Label>
                <Select value={newProjectIcon} onValueChange={setNewProjectIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="🌱">🌱 새싹</SelectItem>
                    <SelectItem value="🌿">🌿 잎</SelectItem>
                    <SelectItem value="🌳">🌳 나무</SelectItem>
                    <SelectItem value="📚">📚 책</SelectItem>
                    <SelectItem value="💼">💼 비즈니스</SelectItem>
                    <SelectItem value="🎯">🎯 목표</SelectItem>
                    <SelectItem value="⚡">⚡ 에너지</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="project-color">테마 색상</Label>
                <Select value={newProjectColor} onValueChange={setNewProjectColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="#8B5CF6">보라색</SelectItem>
                    <SelectItem value="#22C55E">초록색</SelectItem>
                    <SelectItem value="#EF4444">빨간색</SelectItem>
                    <SelectItem value="#3B82F6">파란색</SelectItem>
                    <SelectItem value="#F97316">주황색</SelectItem>
                    <SelectItem value="#6B7280">회색</SelectItem>
                    <SelectItem value="#EC4899">분홍색</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddProjectModalOpen(false)}>
                  취소
                </Button>
                <Button onClick={createProject} disabled={!newProjectName.trim()}>
                  프로젝트 생성
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};