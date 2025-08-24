import { supabase } from '@/integrations/supabase/client';
import { addDays } from 'date-fns';

export const createReviewTask = async (
  userId: string, 
  archiveName: string, 
  dueDate?: Date
) => {
  try {
    const reviewDate = dueDate || addDays(new Date(), 1); // 기본적으로 내일 복습
    
    const { error } = await supabase
      .from('todos')
      .insert({
        title: `${archiveName}_Review`,
        description: `아카이브 "${archiveName}"의 Q&A 카드 복습`,
        due_date: reviewDate.toISOString(),
        user_id: userId,
        is_review_task: true,
        archive_name: archiveName
      });

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('복습 일정 생성 오류:', error);
    return { success: false, error };
  }
};

export const updateReviewTaskStatus = async (
  todoId: string,
  isCompleted: boolean
) => {
  try {
    const { error } = await supabase
      .from('todos')
      .update({ is_completed: isCompleted })
      .eq('id', todoId);

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('복습 상태 업데이트 오류:', error);
    return { success: false, error };
  }
};