import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface StudyRound {
  id: string;
  user_id: string;
  subject_name: string;
  book_name: string;
  chapter_name: string;
  problem_number: number;
  round_number: number;
  status: '⭕' | '🔺' | '❌' | '';
}

export const useStudyRounds = (subjectName: string, bookName: string) => {
  const { user } = useAuth();
  const [studyRounds, setStudyRounds] = useState<Map<string, StudyRound>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);

  // localStorage key 생성 함수
  const getLocalStorageKey = () => `${subjectName}-${bookName}`;

  // DB에서 회독표 데이터 로드
  const loadStudyRounds = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('study_rounds')
        .select('*')
        .eq('user_id', user.id)
        .eq('subject_name', subjectName)
        .eq('book_name', bookName);

      if (error) throw error;

      const roundsMap = new Map<string, StudyRound>();
      data?.forEach((round: any) => {
        const key = `${round.chapter_name}-${round.problem_number}-${round.round_number}`;
        roundsMap.set(key, round);
      });

      setStudyRounds(roundsMap);
      console.log(`✅ Loaded ${data?.length || 0} study rounds from database`);
    } catch (error) {
      console.error('❌ Error loading study rounds:', error);
      toast({
        title: "로딩 오류",
        description: "회독표 데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // localStorage에서 DB로 데이터 마이그레이션
  const migrateFromLocalStorage = async () => {
    if (!user) return;

    try {
      setIsMigrating(true);
      console.log('🔄 Starting migration from localStorage to database...');

      // localStorage에서 전체 데이터 가져오기
      const localDataString = localStorage.getItem('aro-study-data');
      if (!localDataString) {
        console.log('✅ No localStorage data to migrate');
        return;
      }

      const localData = JSON.parse(localDataString);
      const subject = localData.find((s: any) => s.name === subjectName);
      if (!subject) {
        console.log('✅ No data for this subject');
        return;
      }

      const book = subject.books?.find((b: any) => b.name === bookName);
      if (!book || !book.studyData) {
        console.log('✅ No data for this book');
        return;
      }

      const studyData = book.studyData;
      const chapters = studyData.chapters || [];

      // DB에 이미 데이터가 있는지 확인
      const { data: existingData } = await supabase
        .from('study_rounds')
        .select('id')
        .eq('user_id', user.id)
        .eq('subject_name', subjectName)
        .eq('book_name', bookName)
        .limit(1);

      if (existingData && existingData.length > 0) {
        console.log('✅ Database already has data, skipping migration');
        return;
      }

      // 회독표 데이터를 DB에 저장할 형식으로 변환
      const roundsToInsert: Omit<StudyRound, 'id'>[] = [];
      
      chapters.forEach((chapter: any) => {
        chapter.problems?.forEach((problem: any) => {
          const rounds = problem.rounds || {};
          Object.entries(rounds).forEach(([roundNumber, status]) => {
            if (status) {
              roundsToInsert.push({
                user_id: user.id,
                subject_name: subjectName,
                book_name: bookName,
                chapter_name: chapter.name,
                problem_number: problem.number,
                round_number: parseInt(roundNumber),
                status: status as '⭕' | '🔺' | '❌' | '',
              });
            }
          });
        });
      });

      if (roundsToInsert.length > 0) {
        console.log(`🔄 Migrating ${roundsToInsert.length} study rounds to database...`);
        const { error } = await supabase
          .from('study_rounds')
          .insert(roundsToInsert);

        if (error) throw error;

        console.log('✅ Migration completed successfully!');
        toast({
          title: "데이터 마이그레이션 완료",
          description: `${roundsToInsert.length}개의 회독 기록이 안전하게 저장되었습니다.`,
        });

        // 마이그레이션 후 DB에서 데이터 다시 로드
        await loadStudyRounds();
      } else {
        console.log('✅ No data to migrate');
      }
    } catch (error) {
      console.error('❌ Migration error:', error);
      toast({
        title: "마이그레이션 오류",
        description: "데이터 마이그레이션 중 오류가 발생했습니다. 기존 데이터는 안전합니다.",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  // 회독표 상태 업데이트 (DB에 저장)
  const updateStudyRound = async (
    chapterName: string,
    problemNumber: number,
    roundNumber: number,
    status: '⭕' | '🔺' | '❌' | null
  ) => {
    if (!user) return;

    try {
      const key = `${chapterName}-${problemNumber}-${roundNumber}`;

      if (status === null) {
        // 상태 삭제
        const existingRound = studyRounds.get(key);
        if (existingRound) {
          const { error } = await supabase
            .from('study_rounds')
            .delete()
            .eq('id', existingRound.id);

          if (error) throw error;

          const newMap = new Map(studyRounds);
          newMap.delete(key);
          setStudyRounds(newMap);
        }
      } else {
        // 상태 추가/업데이트
        const roundData = {
          user_id: user.id,
          subject_name: subjectName,
          book_name: bookName,
          chapter_name: chapterName,
          problem_number: problemNumber,
          round_number: roundNumber,
          status,
        };

        const { data, error } = await supabase
          .from('study_rounds')
          .upsert(roundData, {
            onConflict: 'user_id,subject_name,book_name,chapter_name,problem_number,round_number',
          })
          .select()
          .single();

        if (error) throw error;

        const newMap = new Map(studyRounds);
        newMap.set(key, data as StudyRound);
        setStudyRounds(newMap);
      }
    } catch (error) {
      console.error('❌ Error updating study round:', error);
      toast({
        title: "저장 오류",
        description: "회독 기록을 저장하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 특정 문제의 회독 기록 가져오기
  const getStudyRound = (chapterName: string, problemNumber: number, roundNumber: number): '⭕' | '🔺' | '❌' | '' => {
    const key = `${chapterName}-${problemNumber}-${roundNumber}`;
    return studyRounds.get(key)?.status || '';
  };

  // 단원 삭제 시 관련 회독 기록 삭제
  const deleteChapterRounds = async (chapterName: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('study_rounds')
        .delete()
        .eq('user_id', user.id)
        .eq('subject_name', subjectName)
        .eq('book_name', bookName)
        .eq('chapter_name', chapterName);

      if (error) throw error;

      // 로컬 상태 업데이트
      const newMap = new Map(studyRounds);
      Array.from(newMap.keys()).forEach(key => {
        if (key.startsWith(`${chapterName}-`)) {
          newMap.delete(key);
        }
      });
      setStudyRounds(newMap);
    } catch (error) {
      console.error('❌ Error deleting chapter rounds:', error);
      throw error;
    }
  };

  // 초기 로드 및 마이그레이션
  useEffect(() => {
    if (user && subjectName && bookName) {
      const initialize = async () => {
        await loadStudyRounds();
        await migrateFromLocalStorage();
      };
      initialize();
    }
  }, [user, subjectName, bookName]);

  // 실시간 구독
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('study_rounds_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_rounds',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Study rounds change detected:', payload);
          loadStudyRounds();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    studyRounds,
    isLoading,
    isMigrating,
    updateStudyRound,
    getStudyRound,
    deleteChapterRounds,
    reloadStudyRounds: loadStudyRounds,
  };
};
