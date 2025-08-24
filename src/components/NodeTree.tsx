import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Archive, Minus, Calendar, FolderOpen, Folder, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthMock';
import { toast } from 'sonner';
import { ProjectIcon } from '@/components/ProjectIcon';
import { ProjectFolder } from '@/components/ProjectFolder';

interface Node {
  id: string;
  name: string;
  parent_id: string | null;
  description?: string;
  display_order: number;
  color?: string;
  archive_count?: number;
  is_completed?: boolean;
  milestone_achieved?: boolean;
  project_status?: 'new' | 'growing' | 'mature' | 'completed';
  cover_image?: string;
  children?: Node[];
}

interface NodeTreeProps {
  onAddAI: (nodeId: string) => void;
  onViewArchives: (nodeId: string, nodeName: string) => void;
  onCreateSubNode: (parentId: string) => void;
  onNodeDeleted: () => void;
  onViewProjectDetail: (nodeId: string, nodeName: string) => void;
}

export const NodeTree: React.FC<NodeTreeProps> = ({
  onAddAI,
  onViewArchives,
  onCreateSubNode,
  onNodeDeleted,
  onViewProjectDetail
}) => {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    console.log('NodeTree useEffect 실행:', { user: user?.id });
    if (user) {
      loadNodes();
      
      // 실시간 업데이트 구독
      const channel = supabase
        .channel('nodes-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE 모든 이벤트
            schema: 'public',
            table: 'nodes',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('노드 변경 감지:', payload);
            
            // 새 노드가 추가된 경우 부모 노드 자동 확장
            if (payload.eventType === 'INSERT' && payload.new?.parent_id) {
              setExpandedNodes(prev => {
                const newExpanded = new Set([...prev, payload.new.parent_id]);
                console.log('부모 노드 자동 확장:', payload.new.parent_id, newExpanded);
                return newExpanded;
              });
            }
            
            loadNodes(); // 변경 시 다시 로드
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      console.log('사용자가 로그인되지 않음');
      setLoading(false);
    }
  }, [user]);

  const loadNodes = async () => {
    console.log('노드 로딩 시작:', { userId: user?.id });
    try {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      console.log('로드된 노드 데이터:', data);
      const nodeTree = buildTree(data || []);
      console.log('빌드된 노드 트리:', nodeTree);
      setNodes(nodeTree);
    } catch (error) {
      console.error('노드 로딩 실패:', error);
      toast.error('노드를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (flatNodes: any[]): Node[] => {
    const nodeMap = new Map<string, Node>();
    const rootNodes: Node[] = [];

    // 먼저 모든 노드를 맵에 저장
    flatNodes.forEach(node => {
      nodeMap.set(node.id, {
        ...node,
        children: []
      });
    });

    // 트리 구조 구성
    flatNodes.forEach(node => {
      if (node.parent_id) {
        const parent = nodeMap.get(node.parent_id);
        if (parent) {
          parent.children?.push(nodeMap.get(node.id)!);
        }
      } else {
        rootNodes.push(nodeMap.get(node.id)!);
      }
    });

    return rootNodes;
  };

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const deleteNode = async (nodeId: string, nodeName: string) => {
    if (!confirm(`"${nodeName}" 노드를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('nodes')
        .update({ is_active: false })
        .eq('id', nodeId);

      if (error) throw error;
      
      toast.success('노드가 삭제되었습니다.');
      onNodeDeleted();
    } catch (error) {
      console.error('노드 삭제 실패:', error);
      toast.error('노드 삭제에 실패했습니다.');
    }
  };

  const handleImageUpload = async (nodeId: string, file: File) => {
    setUploadingImage(nodeId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // 이미지를 base64로 변환
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        // 데이터베이스에 이미지 URL 저장
        const { error } = await supabase
          .from('nodes')
          .update({ cover_image: base64 })
          .eq('id', nodeId);
          
        if (error) throw error;
        
        toast.success('이미지가 업로드되었습니다.');
        loadNodes();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      toast.error('이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingImage(null);
    }
  };

  const renderNode = (node: Node, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isTopLevel = level === 0;
    
    return (
      <div key={node.id} className="mb-2">
        <Card className={`p-4 hover:shadow-md transition-all duration-200 ${
          isTopLevel ? 'border-l-4' : ''
        }`} style={isTopLevel && node.color ? { borderLeftColor: node.color } : {}}>
          <div className="flex items-center gap-3">
            {/* 폴더 아이콘과 프로젝트 상태 아이콘 */}
            <div className="flex items-center gap-2" style={{ marginLeft: `${level * 20}px` }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(node.id)}
                className="p-1 h-8 w-8"
              >
                {isTopLevel ? (
                  <ProjectIcon 
                    status={node.project_status || 'new'}
                    archiveCount={node.archive_count || 0}
                    milestoneAchieved={node.milestone_achieved}
                    className="text-xl"
                  />
                ) : hasChildren ? (
                  isExpanded ? <FolderOpen size={20} /> : <Folder size={20} />
                ) : (
                  <div className="w-5 h-5" />
                )}
              </Button>
              
              {hasChildren && !isTopLevel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(node.id)}
                  className="p-1 h-6 w-6"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </Button>
              )}
            </div>

            {/* 프로젝트 커버 이미지 */}
            {isTopLevel && node.cover_image && (
              <div className="w-12 h-12 rounded-lg overflow-hidden border">
                <img 
                  src={node.cover_image} 
                  alt={`${node.name} 커버`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* 노드 이름과 정보 */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span 
                  className="font-medium cursor-pointer hover:text-primary transition-colors"
                  onClick={() => onViewProjectDetail(node.id, node.name)}
                >
                  {node.name}
                </span>
                {isTopLevel && node.archive_count && node.archive_count > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {node.archive_count}개 아카이브
                  </span>
                )}
              </div>
              {node.description && (
                <p className="text-sm text-muted-foreground mt-1">{node.description}</p>
              )}
            </div>

            {/* 액션 버튼들 */}
            <div className="flex gap-1">
              {/* 이미지 업로드 버튼 (최상위 프로젝트만) */}
              {isTopLevel && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(node.id, file);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    disabled={uploadingImage === node.id}
                  >
                    <Image size={14} className="mr-1" />
                    {uploadingImage === node.id ? '업로드중...' : '이미지'}
                  </Button>
                </label>
              )}
              
              {/* Archive 보기 버튼 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewArchives(node.id, node.name)}
                className="h-8 px-2"
              >
                <Archive size={14} className="mr-1" />
                Archive
              </Button>
              
              {/* + 버튼 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                  >
                    <Plus size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border shadow-md z-50">
                  <DropdownMenuItem onClick={() => onAddAI(node.id)}>
                    Archive 추가
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateSubNode(node.id)}>
                    Node 추가
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* - 버튼 (노드 삭제) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteNode(node.id, node.name)}
                className="h-8 px-2 text-destructive hover:text-destructive"
              >
                <Minus size={14} />
              </Button>
            </div>
          </div>
        </Card>

        {/* 하위 노드들 */}
        {hasChildren && isExpanded && (
          <div className="ml-4 mt-2">
            {node.children?.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">로그인이 필요합니다.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-4">노드를 불러오는 중...</div>;
  }

  if (nodes.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground mb-4">아직 생성된 프로젝트가 없습니다.</p>
        <Button onClick={() => onCreateSubNode('')}>
          첫 번째 프로젝트 생성하기
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary">🌳 프로젝트 숲</h2>
        <Button onClick={() => onCreateSubNode('')} className="bg-green-600 hover:bg-green-700">
          <Plus size={16} className="mr-2" />
          새 프로젝트 🌱
        </Button>
      </div>
      
      {/* 최상위 프로젝트들을 폴더 형태로 표시 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {nodes.filter(node => !node.parent_id).map(project => (
          <ProjectFolder
            key={project.id}
            project={project}
            onClick={() => {
              setSelectedProjectId(selectedProjectId === project.id ? null : project.id);
            }}
            onImageUpload={(projectId, imageUrl) => {
              loadNodes();
            }}
            onAddArchive={(projectId) => onAddAI(projectId)}
            onAddSubFolder={(projectId) => onCreateSubNode(projectId)}
            onDeleteProject={(projectId) => {
              loadNodes();
              onNodeDeleted();
            }}
            isSelected={selectedProjectId === project.id}
          />
        ))}
      </div>

      {/* 선택된 프로젝트의 세부 구조만 표시 */}
      {selectedProjectId && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground">📁 세부 구조</h3>
          <div className="space-y-2">
            {nodes
              .filter(node => node.id === selectedProjectId && node.children && node.children.length > 0)
              .map(node => renderSubNodes(node))
            }
          </div>
        </div>
      )}
    </div>
  );

  // 하위 노드들만 렌더링하는 함수
  function renderSubNodes(parentNode: Node) {
    const isExpanded = expandedNodes.has(parentNode.id);
    
    return (
      <div key={parentNode.id} className="border rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleExpanded(parentNode.id)}
            className="p-1 h-8 w-8"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </Button>
          
          <span className="font-medium text-lg">{parentNode.name}</span>
          
          <div className="flex gap-1 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewArchives(parentNode.id, parentNode.name)}
              className="h-8 px-2"
            >
              <Archive size={14} className="mr-1" />
              Archive
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <Plus size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onAddAI(parentNode.id)}>
                  Archive 추가
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateSubNode(parentNode.id)}>
                  Node 추가
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {isExpanded && parentNode.children && (
          <div className="ml-6 space-y-2">
            {parentNode.children.map(child => renderNode(child, 1))}
          </div>
        )}
      </div>
    );
  }
};