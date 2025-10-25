import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';
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
  const { preloadedRounds, isLoadingPreloadedRounds } = useUnifiedData(); // Phase 1.2 & 2.3
  const [studyRounds, setStudyRounds] = useState<Map<string, StudyRound>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);

  // localStorage에서 회독표 데이터 읽기
  const loadFromLocalStorage = () => {
    try {
      const localDataString = localStorage.getItem('aro-study-data');
      if (!localDataString) return new Map<string, StudyRound>();
      
      const localData = JSON.parse(localDataString);
      const subject = localData.find((s: any) => s.name === subjectName);
      const book = subject?.books?.find((b: any) => b.name === bookName);
      
      if (!book?.studyData?.chapters) return new Map<string, StudyRound>();
      
      const roundsMap = new Map<string, StudyRound>();
      book.studyData.chapters.forEach((chapter: any) => {
        chapter.problems?.forEach((problem: any) => {
          Object.entries(problem.rounds || {}).forEach(([roundNumber, status]) => {
            if (status) {
              const key = `${chapter.name}-${problem.number}-${roundNumber}`;
              roundsMap.set(key, {
                id: key, // 임시 ID
                user_id: user?.id || '',
                subject_name: subjectName,
                book_name: bookName,
                chapter_name: chapter.name,
                problem_number: problem.number,
                round_number: parseInt(roundNumber),
                status: status as '⭕' | '🔺' | '❌' | ''
              });
            }
          });
        });
      });
      
      return roundsMap;
    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
      return new Map<string, StudyRound>();
    }
  };

  // DB에서 회독표 데이터 로드 (폴백 포함)
  const loadStudyRounds = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Phase 2.1: 디버깅 로그
      console.log('🔍 [loadStudyRounds] START:', {
        subjectName,
        bookName,
        preloadedCount: preloadedRounds.length,
        user: user.email
      });
      
      // Phase 1.2 & 2.2: Context에서 프리로드된 데이터 먼저 확인 (Trim 매칭)
      const preloaded = preloadedRounds.filter(
        r => r.subject_name?.trim() === subjectName?.trim() && 
             r.book_name?.trim() === bookName?.trim()
      );
      
      console.log('🔍 [loadStudyRounds] Filtered:', {
        filteredCount: preloaded.length,
        sample: preloaded.slice(0, 3)
      });
      
      // Phase 3.3: LocalStorage 데이터와 DB 데이터 병합
      const localRounds = loadFromLocalStorage();
      const roundsMap = new Map<string, StudyRound>();
      
      // 1. LocalStorage 데이터 먼저 추가
      localRounds.forEach((round, key) => {
        roundsMap.set(key, round);
      });
      
      // 2. DB 데이터로 덮어쓰기 (DB가 최신 상태)
      if (preloaded.length > 0) {
        console.log(`✅ Merging: ${localRounds.size} local + ${preloaded.length} DB rounds`);
        preloaded.forEach((round: any) => {
          const key = `${round.chapter_name}-${round.problem_number}-${round.round_number}`;
          roundsMap.set(key, round);
        });
      } else {
        console.log(`📦 Using ${localRounds.size} local rounds only (no DB data)`);
      }
      
      setStudyRounds(roundsMap);
      setIsLoading(false);
      
      // Phase 3.4: 백그라운드 마이그레이션 (LocalStorage → DB)
      if (localRounds.size > 0 && preloaded.length === 0) {
        console.log('🔄 Starting background migration from LocalStorage to DB...');
        setTimeout(() => migrateFromLocalStorage(), 100);
      }
    } catch (error) {
      console.error('❌ Error loading study rounds:', error);
      
      // 에러 발생 시 localStorage로 폴백
      console.log('📦 Falling back to localStorage due to error');
      const localRounds = loadFromLocalStorage();
      setStudyRounds(localRounds);
      
      toast({
        title: "로딩 오류",
        description: "데이터베이스 연결에 문제가 있어 로컬 데이터를 표시합니다.",
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

      // 1. Subject 확인 및 생성
      try {
        const { data: existingSubject } = await supabase
          .from('subjects')
          .select('id')
          .eq('name', subjectName)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingSubject) {
          const { error: subjectError } = await supabase
            .from('subjects')
            .insert({ name: subjectName, user_id: user.id });
          
          if (subjectError && subjectError.code !== '23505') {
            console.error('Subject insert error:', subjectError);
          }
        }
      } catch (error) {
        console.warn('Subject check/insert error (continuing):', error);
      }

      // 2. Book 확인 및 생성
      try {
        const { data: existingBook } = await supabase
          .from('books')
          .select('id')
          .eq('name', bookName)
          .eq('subject_name', subjectName)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingBook) {
          const { error: bookError } = await supabase
            .from('books')
            .insert({ 
              name: bookName, 
              subject_name: subjectName, 
              user_id: user.id 
            });
          
          if (bookError && bookError.code !== '23505') {
            console.error('Book insert error:', bookError);
          }
        }
      } catch (error) {
        console.warn('Book check/insert error (continuing):', error);
      }

      // 3. Chapters 확인 및 생성
      const chapterNames = chapters.map((c: any) => String(c.name));
      const uniqueChapters = [...new Set(chapterNames)] as string[];
      
      for (const chapterName of uniqueChapters) {
        try {
          const { data: existingChapter } = await supabase
            .from('chapters')
            .select('id')
            .eq('name', String(chapterName))
            .eq('book_name', bookName)
            .eq('subject_name', subjectName)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!existingChapter) {
            const { error: chapterError } = await supabase
              .from('chapters')
              .insert([{ 
                name: chapterName, 
                book_name: bookName, 
                subject_name: subjectName, 
                user_id: user.id 
              }]);
            
            if (chapterError && chapterError.code !== '23505') {
              console.error('Chapter insert error:', chapterError);
            }
          }
        } catch (error) {
          console.warn(`Chapter check/insert error for ${chapterName} (continuing):`, error);
        }
      }

      // 4. DB에 이미 있는 study_rounds 확인
      const { data: existingData } = await supabase
        .from('study_rounds')
        .select('chapter_name, problem_number, round_number')
        .eq('user_id', user.id)
        .eq('subject_name', subjectName)
        .eq('book_name', bookName);

      // 이미 DB에 있는 항목의 키 집합 생성
      const existingKeys = new Set(
        existingData?.map(item => 
          `${item.chapter_name}-${item.problem_number}-${item.round_number}`
        ) || []
      );

      // 5. 회독표 데이터를 DB에 저장할 형식으로 변환
      const roundsToInsert: Omit<StudyRound, 'id'>[] = [];
      
      chapters.forEach((chapter: any) => {
        chapter.problems?.forEach((problem: any) => {
          const rounds = problem.rounds || {};
          Object.entries(rounds).forEach(([roundNumber, status]) => {
            if (status) {
              const key = `${chapter.name}-${problem.number}-${roundNumber}`;
              // DB에 없는 항목만 추가
              if (!existingKeys.has(key)) {
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
            }
          });
        });
      });

      if (roundsToInsert.length > 0) {
        console.log(`🔄 Migrating ${roundsToInsert.length} study rounds to database...`);
        
        try {
          const { error } = await supabase
            .from('study_rounds')
            .insert(roundsToInsert);

          if (error) {
            // Duplicate key 에러는 무시하고 계속 진행
            if (error.code === '23505') {
              console.warn('Some study rounds already exist (continuing)');
            } else {
              throw error;
            }
          }

          console.log('✅ Migration completed successfully!');
          toast({
            title: "데이터 마이그레이션 완료",
            description: `${roundsToInsert.length}개의 회독 기록이 안전하게 저장되었습니다.`,
          });

          // 마이그레이션 후 DB에서 데이터 다시 로드
          await loadStudyRounds();
        } catch (error) {
          console.error('Study rounds insert error:', error);
          throw error;
        }
      } else {
        console.log('✅ No new data to migrate');
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

    const key = `${chapterName}-${problemNumber}-${roundNumber}`;

    try {
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
          console.log(`✅ Deleted study round: ${key}`);
        }
      } else {
        // 기존 레코드 찾기
        const { data: existing } = await supabase
          .from('study_rounds')
          .select('id')
          .eq('user_id', user.id)
          .eq('subject_name', subjectName)
          .eq('book_name', bookName)
          .eq('chapter_name', chapterName)
          .eq('problem_number', problemNumber)
          .eq('round_number', roundNumber)
          .maybeSingle();

        let savedData;
        
        if (existing) {
          // 업데이트
          const { data, error } = await supabase
            .from('study_rounds')
            .update({ status })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          savedData = data;
          console.log(`✅ Updated study round: ${key} → ${status}`);
        } else {
          // 삽입
          const { data, error } = await supabase
            .from('study_rounds')
            .insert({
              user_id: user.id,
              subject_name: subjectName,
              book_name: bookName,
              chapter_name: chapterName,
              problem_number: problemNumber,
              round_number: roundNumber,
              status,
            })
            .select()
            .single();

          if (error) throw error;
          savedData = data;
          console.log(`✅ Inserted study round: ${key} → ${status}`);
        }

        // 로컬 상태 업데이트
        const newMap = new Map(studyRounds);
        newMap.set(key, savedData as StudyRound);
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

  // 초기 로드 및 마이그레이션 (Phase 3.0: LocalStorage + DB 병합 표시)
  useEffect(() => {
    if (!user || !subjectName || !bookName) return;
    
    // Phase 3.1: LocalStorage 데이터 즉시 표시
    const localRounds = loadFromLocalStorage();
    if (localRounds.size > 0) {
      console.log(`📦 [useStudyRounds] Loaded ${localRounds.size} rounds from LocalStorage`);
      setStudyRounds(localRounds);
      setIsLoading(false);
    }
    
    // Phase 3.2: 프리로드 완료 대기 후 DB 데이터 병합
    if (isLoadingPreloadedRounds) {
      console.log('⏳ [useStudyRounds] Waiting for preloaded rounds...');
      return;
    }
    
    console.log('✅ [useStudyRounds] Preload complete, merging with DB data...');
    loadStudyRounds(); // DB 데이터를 로드하고 LocalStorage와 병합
  }, [user, subjectName, bookName, isLoadingPreloadedRounds]);

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
