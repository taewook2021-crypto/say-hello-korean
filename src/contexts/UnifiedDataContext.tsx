import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';

interface StudyData {
  id: string;
  subject: string;
  textbook: string;
  maxRounds: number;
  chapters: Chapter[];
  createdAt: Date;
}

interface Chapter {
  order: number;
  name: string;
  problems: Problem[];
}

interface Problem {
  number: number;
  rounds: { [roundNumber: number]: '⭕' | '🔺' | '❌' | null };
  hasNote: boolean;
}

interface SubjectData {
  name: string;
  books: BookData[];
  createdAt?: string;
  isExpanded?: boolean;
}

interface BookData {
  name: string;
  studyData: StudyData;
  isExpanded?: boolean;
}

interface UnifiedDataContextType {
  subjects: SubjectData[];
  subjectBooks: { [key: string]: string[] };
  loading: boolean;
  preloadedRounds: any[]; // Phase 1.1: 프리로드된 회독 정보
  isLoadingPreloadedRounds: boolean; // Phase 2.3: 프리로드 완료 여부
  refreshSubjects: () => Promise<void>;
  refreshBooksForSubject: (subjectName: string) => Promise<void>;
  addSubject: (name: string) => Promise<void>;
  deleteSubject: (name: string) => Promise<void>;
  updateSubject: (oldName: string, newName: string) => Promise<void>;
  addBook: (subjectName: string, bookName: string, maxRounds?: number) => Promise<void>;
  deleteBook: (subjectName: string, bookName: string) => Promise<void>;
  updateBook: (subjectName: string, oldBookName: string, newBookName: string) => Promise<void>;
  addChapter: (subjectName: string, bookName: string, chapterName: string) => Promise<void>;
  deleteChapter: (subjectName: string, bookName: string, chapterName: string) => Promise<void>;
  updateChapter: (subjectName: string, bookName: string, oldChapterName: string, newChapterName: string) => Promise<void>;
  updateStudyProgress: (subjectName: string, bookName: string, updatedData: StudyData) => void;
  toggleSubjectExpansion: (subjectName: string) => void;
  toggleBookExpansion: (subjectName: string, bookName: string) => void;
  getSubjectNames: () => string[];
  getBooksBySubject: (subjectName: string) => string[];
  getStudyData: (subjectName: string, bookName: string) => StudyData | null;
}

const UnifiedDataContext = createContext<UnifiedDataContextType | undefined>(undefined);

export function UnifiedDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [subjectBooks, setSubjectBooks] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const [preloadedRounds, setPreloadedRounds] = useState<any[]>([]); // Phase 1.1
  const [isLoadingPreloadedRounds, setIsLoadingPreloadedRounds] = useState(true); // Phase 2.3
  const { toast } = useToast();

  // Load data when user is authenticated
  useEffect(() => {
    if (!authLoading && user) {
      loadSubjects();
    } else if (!authLoading && !user) {
      // Clear data when user is not authenticated
      setSubjects([]);
      setSubjectBooks({});
      setLoading(false);
    }
  }, [user, authLoading]);
  // Supabase real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unified-data-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, () => {
        loadSubjects();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => {
        loadSubjects();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chapters' }, () => {
        loadSubjects();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wrong_notes' }, () => {
        loadSubjects();
      })
      .subscribe();

    // Phase 1.3: study_rounds 테이블 Realtime 구독 (데이터 일관성 보장)
    const roundsChannel = supabase
      .channel('study_rounds_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'study_rounds',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('✅ Realtime INSERT:', payload.new);
        setPreloadedRounds(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'study_rounds',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('✅ Realtime UPDATE:', payload.new);
        setPreloadedRounds(prev => 
          prev.map(round => round.id === payload.new.id ? payload.new : round)
        );
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'study_rounds',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('✅ Realtime DELETE:', payload.old);
        setPreloadedRounds(prev => 
          prev.filter(round => round.id !== payload.old.id)
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(roundsChannel);
    };
  }, [user]);

  const loadSubjects = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load user's subjects from Supabase
      const { data: supabaseSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('name')
        .eq('user_id', user.id)
        .order('name');

      if (subjectsError) {
        console.error('Error loading subjects:', subjectsError);
      }

      let allSubjects: SubjectData[] = [];

      if (supabaseSubjects && supabaseSubjects.length > 0) {
        for (const subject of supabaseSubjects) {
          const { data: books, error: booksError } = await supabase
            .from('books')
            .select('name')
            .eq('subject_name', subject.name)
            .eq('user_id', user.id)
            .order('name');

          if (booksError) {
            console.error('Error loading books for subject:', subject.name, booksError);
          }

          const subjectData: SubjectData = {
            name: subject.name,
            books: [],
            createdAt: new Date().toISOString(),
            isExpanded: false
          };

          if (books && books.length > 0) {
            for (const book of books) {
              // CRITICAL FIX: Load chapters directly from DB
              const { data: chapters, error: chaptersError } = await supabase
                .from('chapters')
                .select('name')
                .eq('subject_name', subject.name)
                .eq('book_name', book.name)
                .eq('user_id', user.id)
                .order('name');

              if (chaptersError) {
                console.error('Error loading chapters:', chaptersError);
              }

              const studyData: StudyData = {
                id: `${subject.name}-${book.name}`,
                subject: subject.name,
                textbook: book.name,
                maxRounds: 3,
                chapters: chapters?.map((ch, idx) => ({
                  order: idx + 1,
                  name: ch.name,
                  problems: []
                })) || [],
                createdAt: new Date()
              };

              subjectData.books.push({
                name: book.name,
                studyData,
                isExpanded: false
              });
            }
          }

          allSubjects.push(subjectData);

          // Update subjectBooks state
          if (!booksError && books) {
            setSubjectBooks(prev => ({
              ...prev,
              [subject.name]: books.map(book => book.name)
            }));
          }
        }
      }

      // Load local study data (aro-study-data) to merge problem/progress info only
      const aroData = localStorage.getItem('aro-study-data');
      if (aroData) {
        const aroStudyData = JSON.parse(aroData);
        
        if (Array.isArray(aroStudyData)) {
          // Merge study data from localStorage with DB subjects
          for (const localSubject of aroStudyData) {
            const dbSubject = allSubjects.find(s => s.name === localSubject.name);
            if (dbSubject) {
              // Update expansion state
              dbSubject.isExpanded = localSubject.isExpanded;
              
              // Merge book study data (problems only, NOT chapters)
              for (const localBook of localSubject.books || []) {
                const dbBook = dbSubject.books.find(b => b.name === localBook.name);
                if (dbBook && localBook.studyData) {
                  dbBook.isExpanded = localBook.isExpanded;
                  
                  // Merge problems from localStorage into DB chapters
                  if (localBook.studyData.chapters) {
                    for (const localChapter of localBook.studyData.chapters) {
                      const dbChapter = dbBook.studyData.chapters.find(
                        ch => ch.name === localChapter.name
                      );
                      if (dbChapter && localChapter.problems) {
                        dbChapter.problems = localChapter.problems;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      setSubjects(allSubjects);
      
      // Save unified data back to localStorage
      localStorage.setItem('aro-study-data', JSON.stringify(allSubjects));
      
      // Phase 1.1 & 2.3: 모든 회독 정보 프리로드
      setIsLoadingPreloadedRounds(true);
      try {
        const { data: allRounds, error: roundsError } = await supabase
          .from('study_rounds')
          .select('*')
          .eq('user_id', user.id);
        
        if (roundsError) {
          console.error('❌ Error loading study rounds:', roundsError);
        } else {
          console.log(`✅ Preloaded ${allRounds?.length || 0} study rounds`);
          setPreloadedRounds(allRounds || []);
        }
      } catch (error) {
        console.error('❌ Error preloading study rounds:', error);
      } finally {
        setIsLoadingPreloadedRounds(false);
      }
      
      // Try to migrate any remaining local data to Supabase
      if (allSubjects.length > 0) {
        await migrateLocalDataToSupabase(allSubjects);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const migrateLocalDataToSupabase = async (localSubjects: SubjectData[]) => {
    if (!user) return;
    
    try {
      for (const subject of localSubjects) {
        // Save subject to Supabase with user_id
        await supabase
          .from('subjects')
          .upsert({ 
            name: subject.name,
            user_id: user.id
          }, { 
            ignoreDuplicates: true 
          });

        // Save books and chapters for this subject
        for (const book of subject.books) {
          await supabase
            .from('books')
            .upsert({ 
              name: book.name,
              subject_name: subject.name,
              user_id: user.id
            }, { 
              ignoreDuplicates: true 
            });

          // Save chapters for this book
          for (const chapter of book.studyData.chapters) {
            await supabase
              .from('chapters')
              .upsert({
                name: chapter.name,
                subject_name: subject.name,
                book_name: book.name,
                user_id: user.id
              }, { 
                ignoreDuplicates: true 
              });
          }
        }
      }
    } catch (error) {
      console.error('Error migrating to Supabase:', error);
    }
  };

  // 에러를 보기 좋게 찍는 함수
  const logSbError = (tag: string, error: any) => {
    const safe = {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code
    };
    console.error(tag, safe);
    console.error('Full error object:', error);
  };

  const addSubject = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: "입력 오류", description: "과목명을 입력해주세요.", variant: "destructive" });
      return;
    }

    // 한글 완성 문자 체크
    const koreanCompleteCheck = /^[가-힣\s]+$|^[a-zA-Z0-9\s]+$/;
    if (!koreanCompleteCheck.test(trimmedName)) {
      toast({ title: "입력 오류", description: "완성된 한글 또는 영문/숫자로 입력해주세요.", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({ title: "로그인 필요", description: "로그인이 필요합니다.", variant: "destructive" });
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { 
            redirectTo: `${window.location.origin}/` 
          }
        });
        return;
      }

      // 중복 체크
      const existingSubject = subjects.find(s => s.name === trimmedName);
      if (existingSubject) {
        toast({ title: "중복 오류", description: "이미 존재하는 과목명입니다.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase
        .from("subjects")
        .insert({ 
          name: trimmedName, 
          user_id: user.id 
        })
        .select()
        .single();

      if (error) {
        console.error('Subject insert error:', error);
        toast({ title: "오류", description: "과목 추가에 실패했습니다. 다시 시도해주세요.", variant: "destructive" });
        return;
      }

      // 성공 시에만 상태 업데이트와 토스트 표시
      try {
        // Update local state
        const newSubject: SubjectData = {
          name: trimmedName,
          books: [],
          createdAt: new Date().toISOString()
        };

        setSubjects(prev => [...prev, newSubject]);
        setSubjectBooks(prev => ({ ...prev, [trimmedName]: [] }));

        toast({ title: "성공", description: `${trimmedName} 과목이 추가되었습니다.` });
      } catch (stateError) {
        // 상태 업데이트 오류는 로그만 남기고 토스트는 표시하지 않음
        console.error('State update error (non-critical):', stateError);
      }
    } catch (error) {
      console.error('Database error adding subject:', error);
      toast({ title: "오류", description: "과목 추가 중 오류가 발생했습니다.", variant: "destructive" });
    }
  };

  const deleteSubject = async (name: string) => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "과목을 삭제하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete all related data hierarchically (only user's data)
      // 1. Delete wrong notes
      await supabase
        .from('wrong_notes')
        .delete()
        .eq('subject_name', name)
        .eq('user_id', user.id);

      // 2. Delete chapters
      await supabase
        .from('chapters')
        .delete()
        .eq('subject_name', name)
        .eq('user_id', user.id);

      // 3. Delete books
      await supabase
        .from('books')
        .delete()
        .eq('subject_name', name)
        .eq('user_id', user.id);

      // 4. Delete subject
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('name', name)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      const updatedSubjects = subjects.filter(s => s.name !== name);
      setSubjects(updatedSubjects);
      setSubjectBooks(prev => {
        const newState = { ...prev };
        delete newState[name];
        return newState;
      });

      // Update localStorage
      localStorage.setItem('aro-study-data', JSON.stringify(updatedSubjects));

      toast({
        title: "과목 삭제됨",
        description: `${name} 과목과 관련된 모든 데이터가 삭제되었습니다.`,
      });
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({
        title: "오류",
        description: "과목 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const addBook = async (subjectName: string, bookName: string, maxRounds: number = 3) => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "교재를 추가하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    const trimmedBookName = bookName.trim();
    if (!trimmedBookName) {
      return;
    }

    try {
      // Check if book already exists for this user
      console.log('🔍 Checking for duplicate book:', {
        name: trimmedBookName,
        subject: subjectName,
        userId: user.id
      });

      const { data: existingBook, error: checkError } = await supabase
        .from('books')
        .select('id, name, subject_name')
        .eq('name', trimmedBookName)
        .eq('subject_name', subjectName)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Database error checking existing book:', checkError);
        toast({
          title: "데이터베이스 오류",
          description: "교재 확인 중 데이터베이스 오류가 발생했습니다.",
          variant: "destructive",
        });
        return;
      }

      console.log('🔍 Duplicate check result:', existingBook);

      if (existingBook) {
        console.warn('⚠️ Book already exists, skipping insert:', existingBook);
        // 중복인 경우 조용히 성공 처리
        toast({
          title: "성공", 
          description: `"${trimmedBookName}" 교재가 추가되었습니다.`,
        });
        return;
      }

      console.log('✅ No duplicate found, proceeding with insert');

      // Save to Supabase with user_id
      const { error } = await supabase
        .from('books')
        .insert({ 
          name: trimmedBookName,
          subject_name: subjectName,
          user_id: user.id
        });

      if (error) {
        console.error('❌ Database error inserting book:', error);
        
        // 중복 키 오류인 경우도 성공으로 처리
        if (error.code === '23505') {
          console.log('Duplicate key detected, treating as success');
          toast({
            title: "성공", 
            description: `"${trimmedBookName}" 교재가 추가되었습니다.`,
          });
        } else {
          toast({
            title: "데이터베이스 오류",
            description: "교재 추가 중 데이터베이스 오류가 발생했습니다. 다시 시도해주세요.",
            variant: "destructive",
          });
        }
        return;
      }

      console.log('✅ Book inserted successfully');

      // 성공 시에만 상태 업데이트와 토스트 표시
      // Create new study data
      const newStudyData: StudyData = {
        id: `${subjectName}-${trimmedBookName}`,
        subject: subjectName,
        textbook: trimmedBookName,
        maxRounds,
        chapters: [],
        createdAt: new Date()
      };

      // Update local state
      const updatedSubjects = subjects.map(subject => {
        if (subject.name === subjectName) {
          const existingBooks = subject.books || [];
          const bookExists = existingBooks.some(book => book.name === trimmedBookName);
          
          if (!bookExists) {
            return {
              ...subject,
              books: [...existingBooks, { name: trimmedBookName, studyData: newStudyData, isExpanded: false }]
            };
          }
        }
        return subject;
      });

      setSubjects(updatedSubjects);
      setSubjectBooks(prev => ({
        ...prev,
        [subjectName]: [...new Set([...(prev[subjectName] || []), trimmedBookName])]
      }));

      // Update localStorage
      localStorage.setItem('aro-study-data', JSON.stringify(updatedSubjects));

      console.log('✅ Book added successfully:', trimmedBookName);
      toast({
        title: "성공", 
        description: `"${trimmedBookName}" 교재가 성공적으로 추가되었습니다.`,
      });
    } catch (error) {
      console.error('❌ Unexpected error adding book:', error);
      // 예상치 못한 오류만 토스트로 표시
      toast({
        title: "예상치 못한 오류",
        description: "교재 추가 중 예상치 못한 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const deleteBook = async (subjectName: string, bookName: string) => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "교재를 삭제하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete all related data hierarchically (only user's data)
      // 1. Delete wrong notes
      await supabase
        .from('wrong_notes')
        .delete()
        .eq('subject_name', subjectName)
        .eq('book_name', bookName)
        .eq('user_id', user.id);

      // 2. Delete chapters
      await supabase
        .from('chapters')
        .delete()
        .eq('subject_name', subjectName)
        .eq('book_name', bookName)
        .eq('user_id', user.id);

      // 3. Delete book
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('name', bookName)
        .eq('subject_name', subjectName)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      const updatedSubjects = subjects.map(subject => {
        if (subject.name === subjectName) {
          return {
            ...subject,
            books: (subject.books || []).filter(book => book.name !== bookName)
          };
        }
        return subject;
      });

      setSubjects(updatedSubjects);
      setSubjectBooks(prev => ({
        ...prev,
        [subjectName]: prev[subjectName]?.filter(book => book !== bookName) || []
      }));

      // Update localStorage
      localStorage.setItem('aro-study-data', JSON.stringify(updatedSubjects));

      toast({
        title: "책 삭제됨",
        description: `${bookName}과(와) 관련된 모든 데이터가 삭제되었습니다.`,
      });
    } catch (error) {
      console.error('Error deleting book:', error);
      toast({
        title: "오류",
        description: "책 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const refreshSubjects = async () => {
    await loadSubjects();
  };

  const refreshBooksForSubject = async (subjectName: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('name')
        .eq('subject_name', subjectName)
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      setSubjectBooks(prev => ({
        ...prev,
        [subjectName]: data?.map((book: any) => book.name) || []
      }));
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  const updateSubject = async (oldName: string, newName: string) => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "과목명을 수정하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    const trimmedNewName = newName.trim();
    if (!trimmedNewName) {
      toast({ title: "입력 오류", description: "과목명을 입력해주세요.", variant: "destructive" });
      return;
    }

    if (oldName === trimmedNewName) return;

    try {
      // Check if new name already exists
      const { data: existingSubject, error: checkError } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', trimmedNewName)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing subject:', checkError);
        toast({
          title: "오류",
          description: "과목명 확인 중 오류가 발생했습니다.",
          variant: "destructive",
        });
        return;
      }

      if (existingSubject) {
        toast({
          title: "중복 오류",
          description: "이미 존재하는 과목명입니다.",
          variant: "destructive",
        });
        return;
      }

      // Update subjects table
      const { error: subjectError } = await supabase
        .from('subjects')
        .update({ name: trimmedNewName })
        .eq('name', oldName)
        .eq('user_id', user.id);

      if (subjectError) throw subjectError;

      // Update books table
      const { error: booksError } = await supabase
        .from('books')
        .update({ subject_name: trimmedNewName })
        .eq('subject_name', oldName)
        .eq('user_id', user.id);

      if (booksError) throw booksError;

      // Update chapters table
      const { error: chaptersError } = await supabase
        .from('chapters')
        .update({ subject_name: trimmedNewName })
        .eq('subject_name', oldName)
        .eq('user_id', user.id);

      if (chaptersError) throw chaptersError;

      // Update wrong_notes table
      const { error: wrongNotesError } = await supabase
        .from('wrong_notes')
        .update({ subject_name: trimmedNewName })
        .eq('subject_name', oldName)
        .eq('user_id', user.id);

      if (wrongNotesError) throw wrongNotesError;

      // Update study_progress table
      const { error: studyProgressError } = await supabase
        .from('study_progress')
        .update({ subject_name: trimmedNewName })
        .eq('subject_name', oldName)
        .eq('user_id', user.id);

      if (studyProgressError) throw studyProgressError;

      // Update local state
      const updatedSubjects = subjects.map(subject => 
        subject.name === oldName ? { ...subject, name: trimmedNewName } : subject
      );
      setSubjects(updatedSubjects);

      // Update subjectBooks state
      const updatedSubjectBooks = { ...subjectBooks };
      if (updatedSubjectBooks[oldName]) {
        updatedSubjectBooks[trimmedNewName] = updatedSubjectBooks[oldName];
        delete updatedSubjectBooks[oldName];
      }
      setSubjectBooks(updatedSubjectBooks);

      // Update localStorage
      localStorage.setItem('aro-study-data', JSON.stringify(updatedSubjects));

      toast({
        title: "성공",
        description: `과목명이 "${oldName}"에서 "${trimmedNewName}"로 변경되었습니다.`,
      });
    } catch (error) {
      console.error('Error updating subject name:', error);
      toast({
        title: "오류",
        description: "과목명 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const updateBook = async (subjectName: string, oldBookName: string, newBookName: string) => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "교재명을 수정하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    const trimmedNewName = newBookName.trim();
    if (!trimmedNewName) {
      toast({ title: "입력 오류", description: "교재명을 입력해주세요.", variant: "destructive" });
      return;
    }

    if (oldBookName === trimmedNewName) return;

    try {
      // Check if new name already exists in the subject
      const { data: existingBook, error: checkError } = await supabase
        .from('books')
        .select('id')
        .eq('name', trimmedNewName)
        .eq('subject_name', subjectName)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing book:', checkError);
        toast({
          title: "오류",
          description: "교재명 확인 중 오류가 발생했습니다.",
          variant: "destructive",
        });
        return;
      }

      if (existingBook) {
        toast({
          title: "중복 오류",
          description: "이미 존재하는 교재명입니다.",
          variant: "destructive",
        });
        return;
      }

      // Update books table
      const { error: booksError } = await supabase
        .from('books')
        .update({ name: trimmedNewName })
        .eq('name', oldBookName)
        .eq('subject_name', subjectName)
        .eq('user_id', user.id);

      if (booksError) throw booksError;

      // Update chapters table
      const { error: chaptersError } = await supabase
        .from('chapters')
        .update({ book_name: trimmedNewName })
        .eq('book_name', oldBookName)
        .eq('subject_name', subjectName)
        .eq('user_id', user.id);

      if (chaptersError) throw chaptersError;

      // Update wrong_notes table
      const { error: wrongNotesError } = await supabase
        .from('wrong_notes')
        .update({ book_name: trimmedNewName })
        .eq('book_name', oldBookName)
        .eq('subject_name', subjectName)
        .eq('user_id', user.id);

      if (wrongNotesError) throw wrongNotesError;

      // Update study_progress table
      const { error: studyProgressError } = await supabase
        .from('study_progress')
        .update({ book_name: trimmedNewName })
        .eq('book_name', oldBookName)
        .eq('subject_name', subjectName)
        .eq('user_id', user.id);

      if (studyProgressError) throw studyProgressError;

      // Update local state
      const updatedSubjects = subjects.map(subject => {
        if (subject.name === subjectName) {
          return {
            ...subject,
            books: subject.books.map(book => 
              book.name === oldBookName 
                ? { ...book, name: trimmedNewName, studyData: { ...book.studyData, textbook: trimmedNewName } }
                : book
            )
          };
        }
        return subject;
      });
      setSubjects(updatedSubjects);

      // Update subjectBooks state
      setSubjectBooks(prev => ({
        ...prev,
        [subjectName]: prev[subjectName]?.map(book => 
          book === oldBookName ? trimmedNewName : book
        ) || []
      }));

      // Update localStorage
      localStorage.setItem('aro-study-data', JSON.stringify(updatedSubjects));

      toast({
        title: "성공",
        description: `교재명이 "${oldBookName}"에서 "${trimmedNewName}"로 변경되었습니다.`,
      });
    } catch (error) {
      console.error('Error updating book name:', error);
      toast({
        title: "오류",
        description: "교재명 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const addChapter = async (subjectName: string, bookName: string, chapterName: string) => {
    console.log('🟡 addChapter called with:', { subjectName, bookName, chapterName });
    
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "단원을 추가하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    const trimmedChapterName = chapterName.trim();
    if (!trimmedChapterName) {
      toast({
        title: "입력 오류",
        description: "단원명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 중복 체크 (사용자별, 같은 교재 내에서만)
      console.log('🔍 Checking for duplicate chapter:', {
        name: trimmedChapterName,
        subject: subjectName,
        book: bookName,
        userId: user.id
      });

      const { data: existingChapter, error: checkError } = await supabase
        .from('chapters')
        .select('id, name, subject_name, book_name')
        .eq('name', trimmedChapterName)
        .eq('subject_name', subjectName)
        .eq('book_name', bookName)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking existing chapter:', checkError);
        throw checkError;
      }

      console.log('🔍 Duplicate check result:', existingChapter);

      if (existingChapter) {
        console.warn('⚠️ Duplicate chapter found:', existingChapter);
        toast({
          title: "중복 오류",
          description: `"${trimmedChapterName}" 단원이 이미 "${bookName}" 교재에 존재합니다.`,
          variant: "destructive",
        });
        return;
      }

      // Save to Supabase with user_id
      const { error } = await supabase
        .from('chapters')
        .insert({
          name: trimmedChapterName,
          subject_name: subjectName,
          book_name: bookName,
          user_id: user.id
        });

      if (error) {
        console.error('❌ Error inserting chapter:', error);
        throw error;
      }

      console.log('✅ Chapter inserted successfully');

      // Update local state
      const updatedSubjects = subjects.map(subject => {
        if (subject.name === subjectName) {
          return {
            ...subject,
            books: subject.books.map(book => {
              if (book.name === bookName) {
                const newChapter: Chapter = {
                  order: book.studyData.chapters.length + 1,
                  name: trimmedChapterName,
                  problems: []
                };
                return {
                  ...book,
                  studyData: {
                    ...book.studyData,
                    chapters: [...book.studyData.chapters, newChapter]
                  }
                };
              }
              return book;
            })
          };
        }
        return subject;
      });

      setSubjects(updatedSubjects);
      localStorage.setItem('aro-study-data', JSON.stringify(updatedSubjects));

      toast({
        title: "성공",
        description: `${trimmedChapterName} 단원이 추가되었습니다.`,
      });
    } catch (error) {
      console.error('Error adding chapter:', error);
      toast({
        title: "오류",
        description: "단원 추가에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  const deleteChapter = async (subjectName: string, bookName: string, chapterName: string) => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "단원을 삭제하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete related wrong notes first (only user's data)
      await supabase
        .from('wrong_notes')
        .delete()
        .eq('subject_name', subjectName)
        .eq('book_name', bookName)
        .eq('chapter_name', chapterName)
        .eq('user_id', user.id);

      // Delete chapter (only user's data)
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('name', chapterName)
        .eq('subject_name', subjectName)
        .eq('book_name', bookName)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      const updatedSubjects = subjects.map(subject => {
        if (subject.name === subjectName) {
          return {
            ...subject,
            books: subject.books.map(book => {
              if (book.name === bookName) {
                return {
                  ...book,
                  studyData: {
                    ...book.studyData,
                    chapters: book.studyData.chapters.filter(chapter => chapter.name !== chapterName)
                  }
                };
              }
              return book;
            })
          };
        }
        return subject;
      });

      setSubjects(updatedSubjects);
      localStorage.setItem('aro-study-data', JSON.stringify(updatedSubjects));

      toast({
        title: "단원 삭제됨",
        description: `${chapterName} 단원과 관련된 모든 데이터가 삭제되었습니다.`,
      });
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast({
        title: "오류",
        description: "단원 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const updateStudyProgress = (subjectName: string, bookName: string, updatedData: StudyData) => {
    const updatedSubjects = subjects.map(subject => {
      if (subject.name === subjectName) {
        return {
          ...subject,
          books: subject.books.map(book => {
            if (book.name === bookName) {
              return {
                ...book,
                studyData: updatedData
              };
            }
            return book;
          })
        };
      }
      return subject;
    });

    setSubjects(updatedSubjects);
    localStorage.setItem('aro-study-data', JSON.stringify(updatedSubjects));
  };

  const toggleSubjectExpansion = (subjectName: string) => {
    const updatedSubjects = subjects.map(subject => 
      subject.name === subjectName 
        ? { ...subject, isExpanded: !subject.isExpanded }
        : subject
    );
    setSubjects(updatedSubjects);
    localStorage.setItem('aro-study-data', JSON.stringify(updatedSubjects));
  };

  const toggleBookExpansion = (subjectName: string, bookName: string) => {
    const updatedSubjects = subjects.map(subject => 
      subject.name === subjectName 
        ? {
            ...subject,
            books: subject.books.map(book =>
              book.name === bookName
                ? { ...book, isExpanded: !book.isExpanded }
                : book
            )
          }
        : subject
    );
    setSubjects(updatedSubjects);
    localStorage.setItem('aro-study-data', JSON.stringify(updatedSubjects));
  };

  const getSubjectNames = (): string[] => {
    return subjects.map(s => s.name);
  };

  const getBooksBySubject = (subjectName: string): string[] => {
    const subject = subjects.find(s => s.name === subjectName);
    return subject?.books.map(book => book.name) || [];
  };

  const getStudyData = (subjectName: string, bookName: string): StudyData | null => {
    const subject = subjects.find(s => s.name === subjectName);
    const book = subject?.books.find(b => b.name === bookName);
    return book?.studyData || null;
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const updateChapter = async (subjectName: string, bookName: string, oldChapterName: string, newChapterName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update chapter name in database
      const { error: chapterError } = await supabase
        .from('chapters')
        .update({ name: newChapterName })
        .eq('user_id', user.id)
        .eq('subject_name', subjectName)
        .eq('book_name', bookName)
        .eq('name', oldChapterName);

      if (chapterError) throw chapterError;

      // Update related wrong_notes
      const { error: wrongNotesError } = await supabase
        .from('wrong_notes')
        .update({ chapter_name: newChapterName })
        .eq('user_id', user.id)
        .eq('subject_name', subjectName)
        .eq('book_name', bookName)
        .eq('chapter_name', oldChapterName);

      if (wrongNotesError) throw wrongNotesError;

      // Update related study_progress
      const { error: progressError } = await supabase
        .from('study_progress')
        .update({ chapter_name: newChapterName })
        .eq('user_id', user.id)
        .eq('subject_name', subjectName)
        .eq('book_name', bookName)
        .eq('chapter_name', oldChapterName);

      if (progressError) throw progressError;

      // Update local state
      const updatedSubjects = subjects.map(subject => 
        subject.name === subjectName 
          ? {
              ...subject,
              books: subject.books.map(book =>
                book.name === bookName && book.studyData
                  ? {
                      ...book,
                      studyData: {
                        ...book.studyData,
                        chapters: book.studyData.chapters.map(chapter =>
                          chapter.name === oldChapterName
                            ? { ...chapter, name: newChapterName }
                            : chapter
                        )
                      }
                    }
                  : book
              )
            }
          : subject
      );

      setSubjects(updatedSubjects);
      localStorage.setItem('aro-study-data', JSON.stringify(updatedSubjects));

      toast({
        title: "성공",
        description: `단원명이 "${newChapterName}"로 변경되었습니다.`,
      });
    } catch (error) {
      console.error('Error updating chapter:', error);
      toast({
        title: "오류",
        description: "단원명 변경 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const value: UnifiedDataContextType = {
    subjects,
    subjectBooks,
    loading,
    preloadedRounds,
    isLoadingPreloadedRounds,
    refreshSubjects: loadSubjects,
    refreshBooksForSubject: (subjectName: string) => {
      loadSubjects();
      return Promise.resolve();
    },
    addSubject,
    deleteSubject,
    updateSubject,
    addBook,
    deleteBook,
    updateBook,
    addChapter,
    deleteChapter,
    updateChapter,
    updateStudyProgress,
    toggleSubjectExpansion,
    toggleBookExpansion,
    getSubjectNames,
    getBooksBySubject,
    getStudyData,
  };

  return (
    <UnifiedDataContext.Provider value={value}>
      {children}
    </UnifiedDataContext.Provider>
  );
}

export function useUnifiedData() {
  const context = useContext(UnifiedDataContext);
  if (context === undefined) {
    throw new Error('useUnifiedData must be used within a UnifiedDataProvider');
  }
  return context;
}