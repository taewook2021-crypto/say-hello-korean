import React, { useState } from 'react';
import { Upload, Image as ImageIcon, X, Check, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProjectFolderProps {
  project: {
    id: string;
    name: string;
    description?: string; // 프로젝트 목표
    deadline?: string;
    archive_count?: number;
    project_status?: string;
    is_completed?: boolean;
    milestone_achieved?: boolean;
    cover_image?: string;
    color?: string;
  };
  onClick: () => void;
  onImageUpload?: (projectId: string, imageUrl: string) => void;
  onAddArchive?: (projectId: string) => void;
  onAddSubFolder?: (projectId: string) => void;
  onDeleteProject?: (projectId: string) => void;
}

const getProjectEmoji = (status: string, archiveCount: number, isCompleted: boolean, milestoneAchieved: boolean) => {
  if (isCompleted) return '🌸';
  if (milestoneAchieved) return '🌳✨';
  if (status === 'mature' || archiveCount >= 5) return '🌳';
  if (status === 'growing' || archiveCount > 0) return '🌿';
  return '🌱';
};

const getAnimationClass = (status: string, archiveCount: number, isCompleted: boolean, milestoneAchieved: boolean) => {
  if (isCompleted) return 'animate-bloom';
  if (milestoneAchieved) return 'animate-sparkle';
  if (status === 'mature' || archiveCount >= 5) return 'animate-grow-thick';
  if (status === 'growing' || archiveCount > 0) return 'animate-grow-branches';
  return 'animate-sprout';
};

export const ProjectFolder: React.FC<ProjectFolderProps> = ({ 
  project, 
  onClick, 
  onImageUpload,
  onAddArchive,
  onAddSubFolder,
  onDeleteProject
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const emoji = getProjectEmoji(
    project.project_status || 'new', 
    project.archive_count || 0, 
    project.is_completed || false,
    project.milestone_achieved || false
  );

  const animationClass = getAnimationClass(
    project.project_status || 'new', 
    project.archive_count || 0, 
    project.is_completed || false,
    project.milestone_achieved || false
  );

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 이미지를 base64로 변환
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        // 데이터베이스에 base64 이미지 저장
        const { error } = await supabase
          .from('nodes')
          .update({ cover_image: base64Data })
          .eq('id', project.id);

        if (error) throw error;

        toast.success('프로젝트 이미지가 업로드되었습니다!');
        onImageUpload?.(project.id, base64Data);
        setShowUpload(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      toast.error('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCompleteProject = async () => {
    // 기한 체크
    const now = new Date();
    const deadline = project.deadline ? new Date(project.deadline) : null;
    
    if (deadline && now < deadline) {
      // 기한이 남았다면 목표 달성 여부 확인
      const goalText = project.description || '설정된 목표';
      const confirmed = confirm(`"${goalText}"라는 목표를 달성하셨나요?\n\n기한이 아직 남았지만, 목표를 달성한 경우에만 프로젝트를 완성할 수 있습니다.`);
      
      if (!confirmed) {
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('nodes')
        .update({ 
          is_completed: true, 
          project_status: 'completed' 
        })
        .eq('id', project.id);

      if (error) throw error;
      toast.success('프로젝트가 완료되었습니다! 🌸');
    } catch (error) {
      console.error('프로젝트 완료 오류:', error);
      toast.error('프로젝트 완료 처리에 실패했습니다.');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('nodes')
        .update({ is_active: false })
        .eq('id', project.id);

      if (error) throw error;
      toast.success('프로젝트가 삭제되었습니다.');
      onDeleteProject?.(project.id);
    } catch (error) {
      console.error('프로젝트 삭제 오류:', error);
      toast.error('프로젝트 삭제에 실패했습니다.');
    }
  };

  return (
    <Card 
      className={`
        relative p-6 cursor-pointer transition-all duration-300 hover:shadow-lg group
        ${animationClass}
      `}
      style={{
        borderColor: project.color || '#22c55e',
        borderWidth: '2px'
      }}
      onClick={onClick}
    >
      {/* 배경 이미지 */}
      {project.cover_image && (
        <div 
          className="absolute inset-0 rounded-lg bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${project.cover_image})` }}
        />
      )}

      {/* 상단 컨트롤 버튼들 */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="sm"
          className="w-8 h-8 p-0 bg-white/90"
          onClick={(e) => {
            e.stopPropagation();
            setShowUpload(!showUpload);
          }}
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="w-8 h-8 p-0 bg-white/90"
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
        
        {!project.is_completed && (
          <Button
            variant="outline"
            size="sm"
            className="w-8 h-8 p-0 bg-white/90"
            onClick={(e) => {
              e.stopPropagation();
              handleCompleteProject();
            }}
          >
            <Check className="w-4 h-4" />
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-8 h-8 p-0 bg-white/90 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteProject();
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* 파일 업로드 영역 */}
      {showUpload && (
        <div className="absolute top-12 right-2 z-10">
          <Card className="p-2 bg-white shadow-lg">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="w-32 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUpload(false);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 액션 메뉴 */}
      {showActions && (
        <div className="absolute top-12 right-2 z-10">
          <Card className="p-1 bg-white shadow-lg">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs px-2 py-1 h-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddArchive?.(project.id);
                  setShowActions(false);
                }}
              >
                📄 아카이브 추가
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs px-2 py-1 h-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubFolder?.(project.id);
                  setShowActions(false);
                }}
              >
                📁 하위 폴더 추가
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 프로젝트 아이콘과 정보 */}
      <div className="relative z-5 text-center space-y-3">
        <div className={`text-6xl ${animationClass}`}>
          {emoji}
        </div>
        
        <div>
          <h3 className="font-bold text-lg text-foreground">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-xs text-muted-foreground mb-1">
              🎯 목표: {project.description}
            </p>
          )}
          {project.deadline && (
            <p className="text-xs text-muted-foreground mb-1">
              📅 기한: {new Date(project.deadline).toLocaleDateString('ko-KR')}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            아카이브 {project.archive_count || 0}개
          </p>
          {project.milestone_achieved && (
            <p className="text-xs text-primary font-medium">
              🎯 마일스톤 달성!
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};