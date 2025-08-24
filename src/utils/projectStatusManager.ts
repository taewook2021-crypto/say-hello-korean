import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const updateProjectStatus = async (nodeId: string, archiveCount: number) => {
  try {
    let newStatus = 'new';
    let milestoneAchieved = false;

    // 마일스톤 체크 (5개마다)
    if (archiveCount > 0 && archiveCount % 5 === 0) {
      milestoneAchieved = true;
      // 일시적으로 마일스톤 상태를 설정하고 3초 후에 해제
      setTimeout(async () => {
        await supabase
          .from('nodes')
          .update({ milestone_achieved: false })
          .eq('id', nodeId);
      }, 3000);
    }

    // 프로젝트 상태 결정
    if (archiveCount === 0) {
      newStatus = 'new';
    } else if (archiveCount >= 1 && archiveCount < 5) {
      newStatus = 'growing';
    } else if (archiveCount >= 5) {
      newStatus = 'mature';
    }

    const { error } = await supabase
      .from('nodes')
      .update({ 
        project_status: newStatus,
        milestone_achieved: milestoneAchieved
      })
      .eq('id', nodeId);

    if (error) throw error;

    if (milestoneAchieved) {
      toast.success(`🎯 마일스톤 달성! ${archiveCount}개 아카이브 완성! ✨`);
    }

    return { success: true };
  } catch (error) {
    console.error('프로젝트 상태 업데이트 오류:', error);
    return { success: false, error };
  }
};

export const completeProject = async (nodeId: string) => {
  try {
    const { error } = await supabase
      .from('nodes')
      .update({ 
        is_completed: true, 
        project_status: 'completed' 
      })
      .eq('id', nodeId);

    if (error) throw error;

    toast.success('🌸 프로젝트가 완료되었습니다! 아름다운 꽃이 피었어요!');
    return { success: true };
  } catch (error) {
    console.error('프로젝트 완료 오류:', error);
    toast.error('프로젝트 완료 처리에 실패했습니다.');
    return { success: false, error };
  }
};