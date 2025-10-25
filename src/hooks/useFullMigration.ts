import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MigrationProgress {
  total: number;
  completed: number;
  failed: number;
  currentSubject: string;
  currentBook: string;
}

interface StudyRound {
  user_id: string;
  subject_name: string;
  book_name: string;
  chapter_name: string;
  problem_number: number;
  round_number: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export const useFullMigration = () => {
  const { user } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    currentSubject: '',
    currentBook: ''
  });

  // LocalStorage에서 모든 study_rounds 키 찾기
  const getAllLocalStorageKeys = useCallback((): string[] => {
    if (!user?.id) return [];
    
    const prefix = `study_rounds_${user.id}_`;
    const keys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    
    console.log(`📦 Found ${keys.length} localStorage keys to migrate`);
    return keys;
  }, [user?.id]);

  // 특정 키에서 데이터 읽기
  const loadDataFromKey = (key: string): StudyRound[] => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return [];

      const data = JSON.parse(stored);
      const entries = Object.entries(data);
      
      return entries.map(([_, round]: [string, any]) => round as StudyRound);
    } catch (error) {
      console.error(`❌ Error loading data from key ${key}:`, error);
      return [];
    }
  };

  // 배치 upsert (100개씩)
  const batchUpsert = async (rounds: StudyRound[]): Promise<{ success: number; failed: number }> => {
    const BATCH_SIZE = 100;
    let success = 0;
    let failed = 0;

    for (let i = 0; i < rounds.length; i += BATCH_SIZE) {
      const batch = rounds.slice(i, i + BATCH_SIZE);
      
      try {
        const { error } = await supabase
          .from('study_rounds')
          .upsert(batch, {
            onConflict: 'user_id,subject_name,book_name,chapter_name,problem_number,round_number'
          });

        if (error) {
          console.error('❌ Batch upsert error:', error);
          failed += batch.length;
        } else {
          success += batch.length;
        }
      } catch (error) {
        console.error('❌ Batch upsert exception:', error);
        failed += batch.length;
      }
    }

    return { success, failed };
  };

  // 전체 마이그레이션 실행
  const startMigration = useCallback(async () => {
    if (!user?.id) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    // 이미 마이그레이션 완료된 경우 확인
    const migrationFlag = localStorage.getItem('migration_completed');
    if (migrationFlag === 'true') {
      const confirmReMigrate = window.confirm(
        '이미 마이그레이션이 완료되었습니다. 다시 실행하시겠습니까?'
      );
      if (!confirmReMigrate) return;
    }

    setIsMigrating(true);
    console.log('🚀 Starting full migration from LocalStorage to DB...');

    try {
      const keys = getAllLocalStorageKeys();
      
      if (keys.length === 0) {
        toast.info('마이그레이션할 LocalStorage 데이터가 없습니다.');
        setIsMigrating(false);
        return;
      }

      // 모든 데이터 수집
      const allRounds: StudyRound[] = [];
      
      keys.forEach((key) => {
        const rounds = loadDataFromKey(key);
        
        // 키에서 과목명/책명 추출
        const parts = key.replace(`study_rounds_${user.id}_`, '').split('_');
        const subjectName = parts[0];
        const bookName = parts.slice(1).join('_');
        
        console.log(`📚 Loading ${rounds.length} rounds from ${subjectName} / ${bookName}`);
        allRounds.push(...rounds);
      });

      console.log(`📊 Total rounds to migrate: ${allRounds.length}`);
      
      setProgress({
        total: allRounds.length,
        completed: 0,
        failed: 0,
        currentSubject: '',
        currentBook: ''
      });

      // 배치 upsert 실행
      const result = await batchUpsert(allRounds);
      
      setProgress(prev => ({
        ...prev,
        completed: result.success,
        failed: result.failed
      }));

      // 완료 플래그 설정
      localStorage.setItem('migration_completed', 'true');
      localStorage.setItem('migration_completed_at', new Date().toISOString());

      console.log(`✅ Migration completed: ${result.success} success, ${result.failed} failed`);
      
      toast.success(
        `마이그레이션 완료!\n성공: ${result.success}개, 실패: ${result.failed}개`,
        { duration: 5000 }
      );
      
    } catch (error) {
      console.error('❌ Migration error:', error);
      toast.error('마이그레이션 중 오류가 발생했습니다.');
    } finally {
      setIsMigrating(false);
    }
  }, [user?.id, getAllLocalStorageKeys]);

  // 마이그레이션 상태 초기화
  const resetMigration = useCallback(() => {
    localStorage.removeItem('migration_completed');
    localStorage.removeItem('migration_completed_at');
    toast.success('마이그레이션 상태가 초기화되었습니다.');
  }, []);

  return {
    isMigrating,
    progress,
    startMigration,
    resetMigration,
    migrationCompleted: localStorage.getItem('migration_completed') === 'true',
    migrationCompletedAt: localStorage.getItem('migration_completed_at')
  };
};
