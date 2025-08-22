import React, { useState } from 'react';
import { useAuth } from "@/hooks/useAuthMock";
import { useNavigate } from "react-router-dom";
import { NodeTree } from "@/components/NodeTree";
import { CreateNodeModal } from "@/components/CreateNodeModal";
import { AddAIToNodeModal } from "@/components/AddAIToNodeModal";
import { AIConversationList } from "@/components/AIConversationList";
import { ConversationDetailModal } from "@/components/ConversationDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 모달 상태
  const [showCreateNodeModal, setShowCreateNodeModal] = useState(false);
  const [showAddAIModal, setShowAddAIModal] = useState(false);
  const [showConversationModal, setShowConversationModal] = useState(false);
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

  // 임시로 인증 체크 비활성화
  // if (!user) {
  //   navigate('/auth');
  //   return null;
  // }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">ARO</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 좌측: 프로젝트 트리 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">프로젝트 트리</h2>
            <NodeTree
              onAddAI={handleAddAI}
              onCreateSubNode={handleCreateSubNode}
              onNodeDeleted={handleNodeDeleted}
            />
          </div>

          {/* 우측: 저장된 대화 목록 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">저장된 대화</h2>
            <AIConversationList 
              refreshTrigger={refreshTrigger} 
              onConversationClick={(conversationId) => {
                setSelectedConversationId(conversationId);
                setShowConversationModal(true);
              }}
            />
          </div>
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

        <ConversationDetailModal
          isOpen={showConversationModal}
          onClose={() => setShowConversationModal(false)}
          conversationId={selectedConversationId}
        />
      </div>
    </div>
  );
};

export default Home;