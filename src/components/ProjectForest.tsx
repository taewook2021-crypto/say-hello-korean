import React, { useState, useEffect } from 'react';
import { Plus, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthMock';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  archive_count?: number | null;
  project_status?: string | null;
  cover_image?: string | null;
  is_completed?: boolean | null;
  milestone_achieved?: boolean | null;
  children?: any[];
}

interface ProjectForestProps {
  onCreateProject: () => void;
  onProjectClick: (projectId: string, projectName: string) => void;
}

const projectColors = [
  '#8B5CF6', // purple
  '#06B6D4', // teal  
  '#EF4444', // red
  '#6B7280', // gray
  '#F97316', // orange
  '#22C55E', // green
];

const getProjectIcon = (status: string | null, archiveCount: number | null, isCompleted: boolean | null) => {
  if (isCompleted) return '🌸';
  if (status === 'mature') return '🌳';
  if (status === 'growing') return (archiveCount || 0) > 0 ? '🌿' : '🍃';
  return '🌱';
};

export const ProjectForest: React.FC<ProjectForestProps> = ({
  onCreateProject,
  onProjectClick
}) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .is('parent_id', null) // Only top-level projects
        .order('display_order');

      if (error) throw error;

      const projectsWithChildren = await Promise.all(
        (data || []).map(async (project) => {
          // Get children for each project
          const { data: children } = await supabase
            .from('nodes')
            .select('*')
            .eq('parent_id', project.id)
            .eq('is_active', true);

          return {
            ...project,
            children: children || []
          };
        })
      );

      setProjects(projectsWithChildren);
    } catch (error) {
      console.error('프로젝트 로딩 실패:', error);
      toast.error('프로젝트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const ProjectCard: React.FC<{ project: Project; index: number }> = ({ project, index }) => {
    const colorIndex = index % projectColors.length;
    const borderColor = project.color || projectColors[colorIndex];
    const icon = getProjectIcon(
      project.project_status || 'new',
      project.archive_count || 0,
      project.is_completed || false
    );

    return (
      <Card
        className="group relative h-48 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 animate-fade-in"
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: borderColor,
          animationDelay: `${index * 0.1}s`
        }}
        onClick={() => setSelectedProject(project)}
      >
        <div className="p-6 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform duration-300">
              {icon}
            </div>
            {project.cover_image && (
              <div className="w-12 h-12 rounded-lg overflow-hidden border-2" style={{ borderColor }}>
                <img 
                  src={project.cover_image} 
                  alt={`${project.name} cover`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 text-foreground group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                목표: {project.description}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>아카이브 {project.archive_count || 0}개</span>
            {project.children && project.children.length > 0 && (
              <span>하위 {project.children.length}개</span>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const RadialHub: React.FC<{ project: Project }> = ({ project }) => {
    const archives = Array.from({ length: project.archive_count || 0 }, (_, i) => ({
      id: `archive-${i}`,
      title: `아카이브 ${i + 1}`,
      type: 'archive' as const,
      count: Math.floor(Math.random() * 10) + 1
    }));

    const folders = project.children || [];
    const allItems = [
      ...archives.map(item => ({ ...item, type: 'archive' as const })),
      ...folders.map(folder => ({ 
        id: folder.id, 
        title: folder.name, 
        type: 'folder' as const, 
        count: folder.archive_count || 0 
      }))
    ];

    const radius = 150;
    const centerX = 200;
    const centerY = 200;

    return (
      <div className="min-h-screen bg-background p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProject(null)}
              className="hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로
            </Button>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          </div>
          <Button variant="ghost" size="sm">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Radial Hub */}
        <div className="flex justify-center">
          <div className="relative w-96 h-96">
            {/* Center Hub */}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                         w-16 h-16 bg-primary rounded-full flex items-center justify-center 
                         text-3xl shadow-lg animate-pulse z-10"
            >
              🌳
            </div>

            {/* Radial Items */}
            {allItems.map((item, index) => {
              const angle = (index * 360) / allItems.length;
              const radian = (angle * Math.PI) / 180;
              const x = centerX + Math.cos(radian) * radius;
              const y = centerY + Math.sin(radian) * radius;
              
              const isArchive = item.type === 'archive';
              const delay = isArchive ? 0.3 : 0.5;

              return (
                <div key={item.id} className="absolute">
                  {/* Connection Line */}
                  <svg 
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ animationDelay: `${delay}s` }}
                  >
                    <line
                      x1={centerX}
                      y1={centerY}
                      x2={x}
                      y2={y}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={isArchive ? 1 : 2}
                      strokeDasharray={isArchive ? "5,5" : "none"}
                      className="opacity-60 hover:opacity-100 transition-opacity animate-fade-in"
                      style={{ animationDelay: `${delay}s` }}
                    />
                  </svg>

                  {/* Item */}
                  <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer
                               hover:scale-110 transition-all duration-300 animate-scale-in"
                    style={{ 
                      left: x, 
                      top: y,
                      animationDelay: `${delay + index * 0.1}s`
                    }}
                    onClick={() => onProjectClick(item.id, item.title)}
                  >
                    <Card className="p-3 bg-background border shadow-md hover:shadow-lg">
                      <div className="flex flex-col items-center gap-2 min-w-20">
                        <div className="text-2xl">
                          {isArchive ? '💬' : '📁'}
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-xs text-foreground">
                            {item.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.count}개
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center">프로젝트를 불러오는 중...</div>;
  }

  if (selectedProject) {
    return <RadialHub project={selectedProject} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">🌳 프로젝트 숲</h1>
            <Button onClick={onCreateProject} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              새 프로젝트
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌱</div>
            <h3 className="text-xl font-medium mb-2 text-foreground">아직 프로젝트가 없습니다</h3>
            <p className="text-muted-foreground mb-6">첫 번째 프로젝트를 심어보세요!</p>
            <Button onClick={onCreateProject} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              첫 프로젝트 생성하기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};