import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
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

const projects: Project[] = [
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

const archiveItems = [
  { id: '1', title: '삼성전자 분석', count: 5, position: { top: '20%', left: '75%' } },
  { id: '2', title: '부동산 투자', count: 3, position: { top: '40%', left: '15%' } },
  { id: '3', title: '주식 포트폴리오', count: 7, position: { top: '65%', left: '80%' } },
  { id: '4', title: '암호화폐 연구', count: 4, position: { top: '75%', left: '25%' } },
  { id: '5', title: '경제 뉴스', count: 9, position: { top: '30%', left: '85%' } }
];

const folderItems = [
  { id: '1', title: '투자 전략', count: 12, position: { top: '15%', left: '30%' } },
  { id: '2', title: '재무 분석', count: 8, position: { top: '80%', left: '70%' } },
  { id: '3', title: '시장 동향', count: 15, position: { top: '55%', left: '10%' } }
];

export const SimpleProjectDashboard: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const ProjectCard: React.FC<{ project: Project }> = ({ project }) => (
    <Card
      className="p-6 cursor-pointer border-l-4 h-48"
      style={{ borderLeftColor: project.borderColor }}
      onClick={() => setSelectedProject(project)}
    >
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
      <div className="flex items-center gap-4 mb-8">
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

      {/* Radial Layout */}
      <div className="relative w-full h-96">
        {/* Center Hub */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-primary rounded-full flex items-center justify-center text-3xl z-10">
          🌳
        </div>

        {/* Archive Items */}
        {archiveItems.map((item) => (
          <div key={item.id} className="absolute">
            {/* Line to center */}
            <svg className="absolute w-full h-full pointer-events-none">
              <line
                x1="50%"
                y1="50%"
                x2={item.position.left}
                y2={item.position.top}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1"
                strokeDasharray="5,5"
                className="opacity-60"
              />
            </svg>
            
            {/* Item */}
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={item.position}
            >
              <Card className="p-3 bg-background border shadow-md">
                <div className="flex flex-col items-center gap-1 min-w-20">
                  <div className="text-xl">💬</div>
                  <div className="text-center">
                    <div className="font-medium text-xs">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.count}개 대화
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ))}

        {/* Folder Items */}
        {folderItems.map((item) => (
          <div key={item.id} className="absolute">
            {/* Line to center */}
            <svg className="absolute w-full h-full pointer-events-none">
              <line
                x1="50%"
                y1="50%"
                x2={item.position.left}
                y2={item.position.top}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="2"
                className="opacity-80"
              />
            </svg>
            
            {/* Item */}
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={item.position}
            >
              <Card className="p-3 bg-background border shadow-md">
                <div className="flex flex-col items-center gap-1 min-w-20">
                  <div className="text-xl">📁</div>
                  <div className="text-center">
                    <div className="font-medium text-xs">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.count}개 항목
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ))}
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