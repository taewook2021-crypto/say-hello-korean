import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/useAuthMock";
import { useNavigate, useSearchParams } from "react-router-dom";
import { NodeTree } from "@/components/NodeTree";
import { CreateNodeModal } from "@/components/CreateNodeModal";
import { AddAIToNodeModal } from "@/components/AddAIToNodeModal";
import { NodeArchivesModal } from "@/components/NodeArchivesModal";
import { ConversationDetailModal } from "@/components/ConversationDetailModal";
import { ProjectDetailModal } from "@/components/ProjectDetailModal";

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // 모달 상태
  const [showCreateNodeModal, setShowCreateNodeModal] = useState(false);
  const [showAddAIModal, setShowAddAIModal] = useState(false);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showArchivesModal, setShowArchivesModal] = useState(false);
  const [showProjectDetailModal, setShowProjectDetailModal] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedNodeName, setSelectedNodeName] = useState<string>('');
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [createNodeParentId, setCreateNodeParentId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 노드 액션 핸들러들
  const handleAddAI = (nodeId: string) => {
    // 선택된 노드 정보 설정
    setSelectedNodeId(nodeId);
    // 노드 이름을 가져오기 위해 추가 쿼리가 필요하지만, 일단 간단히 처리
    setSelectedNodeName('선택된 노드');
    setShowAddAIModal(true);
  };

  const handleViewArchives = (nodeId: string, nodeName: string) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeName(nodeName);
    setShowArchivesModal(true);
  };

  const handleCreateSubNode = (parentId: string) => {
    setCreateNodeParentId(parentId || null);
    setShowCreateNodeModal(true);
  };

  // 저장 완료 후 대화보기 모달 열기
  const handleContentAdded = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowConversationModal(true);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNodeCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNodeDeleted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleViewProjectDetail = (nodeId: string, nodeName: string) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeName(nodeName);
    setShowProjectDetailModal(true);
  };

  // URL 파라미터에서 project ID를 확인하여 자동으로 프로젝트 상세 모달 열기
  useEffect(() => {
    const projectId = searchParams.get('project');
    if (projectId) {
      setSelectedNodeId(projectId);
      setSelectedNodeName('선택된 프로젝트');
      setShowProjectDetailModal(true);
    }
  }, [searchParams]);

  // 임시로 인증 체크 비활성화
  // if (!user) {
  //   navigate('/auth');
  //   return null;
  // }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">프로젝트 트리</h2>
          <NodeTree
            onAddAI={handleAddAI}
            onViewArchives={handleViewArchives}
            onCreateSubNode={handleCreateSubNode}
            onNodeDeleted={handleNodeDeleted}
            onViewProjectDetail={handleViewProjectDetail}
          />
        </div>

        {/* 모달들 */}
        <CreateNodeModal
          isOpen={showCreateNodeModal}
          onClose={() => setShowCreateNodeModal(false)}
          parentId={createNodeParentId}
          onNodeCreated={handleNodeCreated}
        />

        <AddAIToNodeModal
          isOpen={showAddAIModal}
          onClose={() => setShowAddAIModal(false)}
          nodeId={selectedNodeId}
          nodeName={selectedNodeName}
          onContentAdded={handleContentAdded}
        />

        <NodeArchivesModal
          isOpen={showArchivesModal}
          onClose={() => setShowArchivesModal(false)}
          nodeId={selectedNodeId}
          nodeName={selectedNodeName}
          onConversationClick={(conversationId) => {
            setSelectedConversationId(conversationId);
            setShowArchivesModal(false);
            setShowConversationModal(true);
          }}
        />

        <ConversationDetailModal
          isOpen={showConversationModal}
          onClose={() => setShowConversationModal(false)}
          conversationId={selectedConversationId}
        />

        <ProjectDetailModal
          isOpen={showProjectDetailModal}
          onClose={() => setShowProjectDetailModal(false)}
          nodeId={selectedNodeId}
          nodeName={selectedNodeName}
        />
      </div>
    </div>
  );
};

export default Home;