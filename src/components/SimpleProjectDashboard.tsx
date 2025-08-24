import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, X, Plus, File, Folder, MoreVertical, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { parseAROFormat as parseAROTeacher } from '@/utils/aroFormatParser';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { AddArchiveModal } from '@/components/AddArchiveModal';
import { AddFolderModal } from '@/components/AddFolderModal';
import { ConversationDetailModal } from '@/components/ConversationDetailModal';

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


export const SimpleProjectDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Add project modal state
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectGoal, setNewProjectGoal] = useState('');
  const [newProjectIcon, setNewProjectIcon] = useState('🌱');
  const [newProjectColor, setNewProjectColor] = useState('#8B5CF6');

  // 데이터베이스에서 프로젝트 로드
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .is('parent_id', null)
        .eq('is_active', true)  // is_active가 true인 것만 가져오기
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // nodes 데이터를 Project 형식으로 변환
      const formattedProjects: Project[] = (data || []).map(node => ({
        id: node.id,
        name: node.name,
        icon: '🌱', // 기본값, 나중에 추가 가능
        goal: node.description || '목표 설정 안함',
        archiveCount: node.archive_count || 0,
        borderColor: node.color || '#8B5CF6'
      }));
      
      setProjects(formattedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 프로젝트 로드
  useEffect(() => {
    fetchProjects();
  }, []);

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      // 데이터베이스에 프로젝트 생성
      const { data, error } = await supabase
        .from('nodes')
        .insert({
          name: newProjectName.trim(),
          description: newProjectGoal.trim() || '목표 설정 안함',
          color: newProjectColor,
          user_id: 'temp-user-id', // 인증이 구현되면 실제 user ID 사용
          is_active: true,
          archive_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      // UI에 새 프로젝트 추가
      const newProject: Project = {
        id: data.id,
        name: data.name,
        icon: newProjectIcon,
        goal: data.description || '목표 설정 안함',
        archiveCount: 0,
        borderColor: data.color || newProjectColor
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
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "생성 실패",
        description: "프로젝트 생성에 실패했습니다",
        variant: "destructive"
      });
    }
  };

  const deleteProject = async (projectId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // 프로젝트 카드 클릭 이벤트 방지
    }
    
    const projectToDelete = projects.find(p => p.id === projectId);
    if (projectToDelete && confirm(`"${projectToDelete.name}" 프로젝트를 삭제하시겠습니까?`)) {
      try {
        // 데이터베이스에서 프로젝트를 논리적 삭제 (is_active = false)
        const { error } = await supabase
          .from('nodes')
          .update({ is_active: false })
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
    const [conversationModalOpen, setConversationModalOpen] = useState(false);
    const [selectedConversationId, setSelectedConversationId] = useState<string>('');
    
    // Delete dialog states
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
    
    // Edit dialog states
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');

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

    const handleDeleteItem = async () => {
      if (!itemToDelete) return;

      try {
        // 아카이브의 경우 관련된 conversation도 함께 삭제
        if (itemToDelete.item_type === 'archive') {
          // 먼저 해당 아카이브와 연결된 conversation 찾기
          const { data: conversations, error: conversationError } = await supabase
            .from('conversations')
            .select('id')
            .eq('title', itemToDelete.title)
            .is('node_id', null);

          if (conversationError) {
            console.error('❌ conversation 조회 오류:', conversationError);
          } else if (conversations && conversations.length > 0) {
            // conversation 삭제
            const { error: deleteConversationError } = await supabase
              .from('conversations')
              .delete()
              .in('id', conversations.map(c => c.id));

            if (deleteConversationError) {
              console.error('❌ conversation 삭제 오류:', deleteConversationError);
            } else {
              console.log('✅ 연결된 conversation 삭제 완료');
            }
          }
        }

        // items 테이블에서 아이템 삭제 (실제로는 is_deleted 플래그 설정)
        const { error: itemError } = await supabase
          .from('items')
          .update({ is_deleted: true })
          .eq('id', itemToDelete.id);

        if (itemError) {
          console.error('❌ 아이템 삭제 오류:', itemError);
          throw itemError;
        }

        // UI에서 아이템 제거
        setItems(items.filter(item => item.id !== itemToDelete.id));
        
        toast({
          title: "삭제 완료",
          description: `${itemToDelete.item_type === 'folder' ? '폴더' : '아카이브'}가 삭제되었습니다`,
        });

      } catch (error) {
        console.error('💥 삭제 실패:', error);
        toast({
          title: "삭제 실패",
          description: "삭제 중 오류가 발생했습니다",
          variant: "destructive"
        });
      } finally {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      }
    };
    
    const handleEditItem = async () => {
      if (!itemToEdit) return;

      try {
        console.log('🔧 아카이브 편집 시작:', itemToEdit.id, itemToEdit.title);
        console.log('📝 새로운 제목:', editTitle);
        console.log('📄 새로운 내용 길이:', editContent.length);

        // 아카이브의 경우에만 편집 가능
        if (itemToEdit.item_type === 'archive') {
          // conversations 테이블 업데이트
          console.log('🔍 conversation 조회 중...');
          const { data: conversations, error: conversationSelectError } = await supabase
            .from('conversations')
            .select('id, title')
            .eq('title', itemToEdit.title)
            .is('node_id', null);

          console.log('📋 찾은 conversations:', conversations);

          if (conversationSelectError) {
            console.error('❌ conversation 조회 오류:', conversationSelectError);
          } else if (conversations && conversations.length > 0) {
            console.log('📝 conversation 업데이트 중:', conversations[0].id);
            const { error: conversationUpdateError } = await supabase
              .from('conversations')
              .update({
                title: editTitle.trim(),
                content: editContent.trim()
              })
              .eq('id', conversations[0].id);

            if (conversationUpdateError) {
              console.error('❌ conversation 업데이트 오류:', conversationUpdateError);
              throw conversationUpdateError;
            } else {
              console.log('✅ conversation 업데이트 완료');
            }
          } else {
            console.log('⚠️ conversation을 찾을 수 없음');
          }

          // items 테이블 업데이트
          console.log('📦 items 테이블 업데이트 중...');
          const { error: itemUpdateError } = await supabase
            .from('items')
            .update({
              title: editTitle.trim(),
              raw_content: editContent.trim(),
              updated_at: new Date().toISOString()
            })
            .eq('id', itemToEdit.id);

          if (itemUpdateError) {
            console.error('❌ 아이템 업데이트 오류:', itemUpdateError);
            throw itemUpdateError;
          }

          console.log('✅ items 테이블 업데이트 완료');

          // UI에서 아이템 업데이트
          console.log('🔄 UI 상태 업데이트 중...');
          setItems(prevItems => prevItems.map(item => 
            item.id === itemToEdit.id 
              ? { ...item, title: editTitle.trim(), raw_content: editContent.trim() }
              : item
          ));
          
          console.log('🎉 편집 완료!');
          toast({
            title: "편집 완료",
            description: "아카이브가 성공적으로 수정되었습니다",
          });
        }

      } catch (error) {
        console.error('💥 편집 실패:', error);
        toast({
          title: "편집 실패",
          description: "편집 중 오류가 발생했습니다",
          variant: "destructive"
        });
      } finally {
        setEditDialogOpen(false);
        setItemToEdit(null);
        setEditTitle('');
        setEditContent('');
      }
    };

    const openEditDialog = async (item: Item) => {
      if (item.item_type !== 'archive') return;
      
      setItemToEdit(item);
      setEditTitle(item.title || '');
      
      // conversation에서 원본 내용 가져오기
      try {
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select('content')
          .eq('title', item.title)
          .is('node_id', null)
          .limit(1);

        if (error) {
          console.error('❌ conversation 조회 오류:', error);
          setEditContent(item.raw_content || '');
        } else if (conversations && conversations.length > 0) {
          setEditContent(conversations[0].content || '');
        } else {
          setEditContent(item.raw_content || '');
        }
      } catch (error) {
        console.error('💥 편집 데이터 로딩 실패:', error);
        setEditContent(item.raw_content || '');
      }
      
      setEditDialogOpen(true);
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
                <Card 
                  key={item.id} 
                  className="p-4 relative group"
                >
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:bg-accent rounded p-2 -m-2"
                    onClick={async (e) => {
                      // 드롭다운 메뉴가 클릭된 경우 이벤트 전파 중지
                      if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
                        return;
                      }
                      
                      if (item.item_type === 'archive') {
                        // 아카이브 클릭 시 해당하는 conversation을 찾아서 ConversationDetailModal 열기
                        console.log('🎯 아카이브 클릭:', item.id, item.title);
                        try {
                          // item의 title과 content로 matching하는 conversation 찾기
                          const { data: conversations, error } = await supabase
                            .from('conversations')
                            .select('id')
                            .eq('title', item.title)
                            .is('node_id', null)
                            .order('created_at', { ascending: false })
                            .limit(1);

                          if (error) {
                            console.error('❌ conversation 조회 오류:', error);
                            toast({
                              title: "오류",
                              description: "아카이브를 열 수 없습니다",
                              variant: "destructive"
                            });
                            return;
                          }

                          if (conversations && conversations.length > 0) {
                            console.log('✅ conversation 찾음:', conversations[0].id);
                            setSelectedConversationId(conversations[0].id);
                            setConversationModalOpen(true);
                          } else {
                            console.log('❌ conversation을 찾을 수 없음');
                            toast({
                              title: "오류",
                              description: "해당 아카이브의 내용을 찾을 수 없습니다",
                              variant: "destructive"
                            });
                          }
                        } catch (error) {
                          console.error('💥 아카이브 열기 실패:', error);
                          toast({
                            title: "오류",
                            description: "아카이브를 여는 중 오류가 발생했습니다",
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                  >
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
                  
                  {/* 삭제 메뉴 */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          data-dropdown-trigger="true"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {item.item_type === 'archive' && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(item);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            편집
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive hover:text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(item);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

        <ConversationDetailModal
          isOpen={conversationModalOpen}
          onClose={() => setConversationModalOpen(false)}
          conversationId={selectedConversationId}
        />
        
        {/* Edit Archive Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>아카이브 편집</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">제목</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="아카이브 제목"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-content">내용</Label>
                <Textarea
                  id="edit-content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="아카이브 내용"
                  className="min-h-[400px] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                >
                  취소
                </Button>
                <Button 
                  onClick={handleEditItem} 
                  disabled={!editTitle.trim() || !editContent.trim()}
                >
                  저장
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                {itemToDelete && (
                  <>
                    "{itemToDelete.item_type === 'folder' ? itemToDelete.name : itemToDelete.title}"을(를) 삭제하시겠습니까?
                    <br />
                    {itemToDelete.item_type === 'archive' && '연결된 Q&A와 대화 내용도 함께 삭제됩니다.'}
                    이 작업은 되돌릴 수 없습니다.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteItem}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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