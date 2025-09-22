import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const deleteAllWrongNotes = async () => {
  try {
    console.log('모든 오답노트 삭제 시작...');
    
    // 먼저 현재 오답노트 수 확인
    const { count } = await supabase
      .from('wrong_notes')
      .select('*', { count: 'exact', head: true });
    
    console.log(`총 ${count}개의 오답노트가 발견되었습니다.`);
    
    if (count === 0) {
      toast.info('삭제할 오답노트가 없습니다.');
      return;
    }
    
    // 관련된 review_schedule 먼저 삭제
    const { error: reviewError } = await supabase
      .from('review_schedule')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 행 삭제
    
    if (reviewError) {
      console.error('Review schedule 삭제 오류:', reviewError);
    }
    
    // study_sessions 삭제
    const { error: sessionError } = await supabase
      .from('study_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 행 삭제
    
    if (sessionError) {
      console.error('Study sessions 삭제 오류:', sessionError);
    }
    
    // memorization_checklist 삭제
    const { error: memorizationError } = await supabase
      .from('memorization_checklist')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 행 삭제
    
    if (memorizationError) {
      console.error('Memorization checklist 삭제 오류:', memorizationError);
    }
    
    // 마지막으로 wrong_notes 삭제
    const { error: wrongNotesError } = await supabase
      .from('wrong_notes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 행 삭제
    
    if (wrongNotesError) {
      console.error('Wrong notes 삭제 오류:', wrongNotesError);
      toast.error('오답노트 삭제 중 오류가 발생했습니다.');
      return;
    }
    
    console.log('모든 오답노트가 성공적으로 삭제되었습니다.');
    toast.success(`총 ${count}개의 오답노트가 삭제되었습니다.`);
    
  } catch (error) {
    console.error('오답노트 삭제 중 오류:', error);
    toast.error('오답노트 삭제 중 오류가 발생했습니다.');
  }
};