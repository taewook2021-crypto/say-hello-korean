import React, { useState } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { NodeTree } from "@/components/NodeTree";
import { CreateNodeModal } from "@/components/CreateNodeModal";
import { NodeArchivesModal } from "@/components/NodeArchivesModal";
import { AddAIToNodeModal } from "@/components/AddAIToNodeModal";
import { TodayReviews } from "@/components/TodayReviews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 모달 상태
  const [showCreateNodeModal, setShowCreateNodeModal] = useState(false);
  const [showArchivesModal, setShowArchivesModal] = useState(false);
  const [showAddAIModal, setShowAddAIModal] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedNodeName, setSelectedNodeName] = useState<string>('');
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

  const handleNodeCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleContentAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNodeDeleted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">ARO</h1>
        </div>

        <Tabs defaultValue="nodes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nodes">프로젝트 트리</TabsTrigger>
            <TabsTrigger value="reviews">오늘의 복습</TabsTrigger>
          </TabsList>

          <TabsContent value="nodes" className="space-y-6">
            <NodeTree
              onAddAI={handleAddAI}
              onViewArchives={handleViewArchives}
              onCreateSubNode={handleCreateSubNode}
              onNodeDeleted={handleNodeDeleted}
            />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <TodayReviews />
          </TabsContent>
        </Tabs>

        {/* 모달들 */}
        <CreateNodeModal
          isOpen={showCreateNodeModal}
          onClose={() => setShowCreateNodeModal(false)}
          parentId={createNodeParentId}
          onNodeCreated={handleNodeCreated}
        />

        <NodeArchivesModal
          isOpen={showArchivesModal}
          onClose={() => setShowArchivesModal(false)}
          nodeId={selectedNodeId}
          nodeName={selectedNodeName}
          onNodeDeleted={handleNodeDeleted}
        />

        <AddAIToNodeModal
          isOpen={showAddAIModal}
          onClose={() => setShowAddAIModal(false)}
          nodeId={selectedNodeId}
          nodeName={selectedNodeName}
          onContentAdded={handleContentAdded}
        />
      </div>
    </div>
  );
};

export default Home;