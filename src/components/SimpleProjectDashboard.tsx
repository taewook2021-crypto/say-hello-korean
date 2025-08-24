import React, { useState } from 'react';
import { ArrowLeft, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Project {
  id: string;
  name: string;
  icon: string;
  goal: string;
  archiveCount: number;
  borderColor: string;
}

const initialProjects: Project[] = [
  {
    id: '1',
    name: '영어 학습',
    icon: '🌱',
    goal: '목표: 입이 트이기 활용',
    archiveCount: 3,
    borderColor: '#8B5CF6' // purple
  },
  {
    id: '2',
    name: '재테크',
    icon: '🌿',
    goal: '목표: 순자산 1000만원',
    archiveCount: 5,
    borderColor: '#22C55E' // green
  },
  {
    id: '3',
    name: '서울대학교 25\'2',
    icon: '🌳',
    goal: '목표: 합격하기',
    archiveCount: 8,
    borderColor: '#EF4444' // red
  },
  {
    id: '4',
    name: '면접 대비',
    icon: '🌱',
    goal: '목표: 자신감 향상',
    archiveCount: 2,
    borderColor: '#6B7280' // gray
  },
  {
    id: '5',
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

  const deleteProject = (projectId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // 프로젝트 카드 클릭 이벤트 방지
    }
    
    const projectToDelete = projects.find(p => p.id === projectId);
    if (projectToDelete && confirm(`"${projectToDelete.name}" 프로젝트를 삭제하시겠습니까?`)) {
      setProjects(projects.filter(p => p.id !== projectId));
      
      // 만약 현재 선택된 프로젝트가 삭제되는 경우 메인 화면으로 돌아가기
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
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

  const ProjectDetail: React.FC<{ project: Project }> = ({ project }) => (
    <div className="min-h-screen bg-background p-6">
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
        
        {/* 프로젝트 삭제 버튼 */}
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

      {/* Radial Layout */}
      <div className="relative w-full h-96">
        {/* Center Hub */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background border-2 border-primary rounded-lg p-6 z-10">
          <h2 className="text-2xl font-bold text-center text-primary">{project.name}</h2>
        </div>

        {/* Empty State Helpers */}
        <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
          <div className="text-center text-muted-foreground">
            <div className="text-lg mb-1">💬</div>
            <div className="text-xs">Add Archive</div>
          </div>
        </div>

        <div className="absolute top-1/4 right-1/4 transform translate-x-1/2 -translate-y-1/2">
          <div className="text-center text-muted-foreground">
            <div className="text-lg mb-1">📁</div>
            <div className="text-xs">Add Folder</div>
          </div>
        </div>

        <div className="absolute bottom-1/4 left-1/3 transform -translate-x-1/2 translate-y-1/2">
          <div className="text-center text-muted-foreground">
            <div className="text-lg mb-1">💬</div>
            <div className="text-xs">Add Archive</div>
          </div>
        </div>

        <div className="absolute bottom-1/4 right-1/3 transform translate-x-1/2 translate-y-1/2">
          <div className="text-center text-muted-foreground">
            <div className="text-lg mb-1">📁</div>
            <div className="text-xs">Add Folder</div>
          </div>
        </div>
      </div>
    </div>
  );

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
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
};