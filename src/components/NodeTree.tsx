import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Archive, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthMock';
import { toast } from 'sonner';

interface Node {
  id: string;
  name: string;
  parent_id: string | null;
  description?: string;
  display_order: number;
  children?: Node[];
}

interface NodeTreeProps {
  onAddAI: (nodeId: string) => void;
  onViewArchives: (nodeId: string, nodeName: string) => void;
  onCreateSubNode: (parentId: string) => void;
  onNodeDeleted: () => void;
}

export const NodeTree: React.FC<NodeTreeProps> = ({
  onAddAI,
  onViewArchives,
  onCreateSubNode,
  onNodeDeleted
}) => {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

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

  const renderNode = (node: Node, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    
    return (
      <div key={node.id} className="mb-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            {/* 확장/축소 버튼 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(node.id)}
              className="p-1 h-6 w-6"
              style={{ marginLeft: `${level * 20}px` }}
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
              ) : (
                <div className="w-4 h-4" />
              )}
            </Button>

            {/* 노드 이름 */}
            <span className="flex-1 font-medium">{node.name}</span>

            {/* 액션 버튼들 */}
            <div className="flex gap-1">
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">프로젝트 트리</h2>
        <Button onClick={() => onCreateSubNode('')}>
          <Plus size={16} className="mr-2" />
          새 프로젝트
        </Button>
      </div>
      
      <div className="space-y-2">
        {nodes.map(node => renderNode(node))}
      </div>
    </div>
  );
};