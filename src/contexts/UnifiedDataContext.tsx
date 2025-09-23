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
  refreshSubjects: () => Promise<void>;
  refreshBooksForSubject: (subjectName: string) => Promise<void>;
  addSubject: (name: string) => Promise<void>;
  deleteSubject: (name: string) => Promise<void>;
  addBook: (subjectName: string, bookName: string, maxRounds?: number) => Promise<void>;
  deleteBook: (subjectName: string, bookName: string) => Promise<void>;
  addChapter: (subjectName: string, bookName: string, chapterName: string) => Promise<void>;
  deleteChapter: (subjectName: string, bookName: string, chapterName: string) => Promise<void>;
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

    return () => {
      supabase.removeChannel(channel);
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
              const studyData: StudyData = {
                id: `${subject.name}-${book.name}`,
                subject: subject.name,
                textbook: book.name,
                maxRounds: 3,
                chapters: [],
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

      // Load local study data (aro-study-data) to merge chapter and progress info
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
              
              // Merge book study data
              for (const localBook of localSubject.books || []) {
                const dbBook = dbSubject.books.find(b => b.name === localBook.name);
                if (dbBook && localBook.studyData) {
                  // Merge the complete study data including chapters and progress
                  dbBook.studyData = {
                    ...localBook.studyData,
                    createdAt: new Date(localBook.studyData.createdAt)
                  };
                  dbBook.isExpanded = localBook.isExpanded;
                }
              }
            }
          }
        }
      }

      setSubjects(allSubjects);
      
      // Save unified data back to localStorage
      localStorage.setItem('aro-study-data', JSON.stringify(allSubjects));
      
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

  const addSubject = async (name: string) => {
    console.log('🟡 addSubject called with:', name);
    console.log('🟡 Current user:', user ? { id: user.id, email: user.email } : 'Not authenticated');
    
    if (!user) {
      console.error('❌ User not authenticated');
      toast({
        title: "로그인 필요",
        description: "과목을 추가하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      console.error('❌ Subject name is empty');
      return;
    }

    try {
      console.log('➕ Inserting subject to Supabase...');
      // Save to Supabase with user_id
      const { error } = await supabase
        .from('subjects')
        .upsert({ 
          name: trimmedName,
          user_id: user.id
        }, { 
          ignoreDuplicates: true 
        });

      if (error) {
        console.error('❌ Error inserting subject - Details:', {
          error: error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      console.log('✅ Subject inserted successfully');

      // Update local state
      const newSubject: SubjectData = {
        name: trimmedName,
        books: [],
        createdAt: new Date().toISOString()
      };

      const existingSubjects = [...subjects];
      const existingIndex = existingSubjects.findIndex(s => s.name === trimmedName);
      
      if (existingIndex === -1) {
        existingSubjects.push(newSubject);
        setSubjects(existingSubjects);
        setSubjectBooks(prev => ({ ...prev, [trimmedName]: [] }));
      }

      toast({
        title: "과목 추가됨",
        description: `${trimmedName} 과목이 추가되었습니다.`,
      });
    } catch (error) {
      console.error('Error adding subject:', error);
      toast({
        title: "오류",
        description: "과목 추가에 실패했습니다.",
        variant: "destructive",
      });
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
    console.log('🟡 addBook called with:', { subjectName, bookName, maxRounds });
    console.log('🟡 Current user:', user ? { id: user.id, email: user.email } : 'Not authenticated');
    
    if (!user) {
      console.error('❌ User not authenticated');
      toast({
        title: "로그인 필요",
        description: "교재를 추가하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    const trimmedBookName = bookName.trim();
    if (!trimmedBookName) {
      console.error('❌ Book name is empty');
      return;
    }

    try {
      console.log('🔍 Checking if book already exists...');
      // Check if book already exists for this user
      const { data: existingBook, error: checkError } = await supabase
        .from('books')
        .select('id')
        .eq('name', trimmedBookName)
        .eq('subject_name', subjectName)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking existing book:', checkError);
        throw checkError;
      }

      console.log('🔍 Existing book check result:', existingBook);

      if (!existingBook) {
        console.log('➕ Inserting new book to Supabase...');
        // Save to Supabase with user_id
        const { error } = await supabase
          .from('books')
          .insert({ 
            name: trimmedBookName,
            subject_name: subjectName,
            user_id: user.id
          });

        if (error) {
          console.error('❌ Error inserting book:', error);
          throw error;
        }
        console.log('✅ Book inserted successfully');
      } else {
        console.log('ℹ️ Book already exists');
      }

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

      toast({
        title: "성공",
        description: "새 교재가 추가되었습니다.",
      });
    } catch (error) {
      console.error('Error adding book:', error);
      toast({
        title: "오류",
        description: "교재 추가에 실패했습니다.",
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

  const addChapter = async (subjectName: string, bookName: string, chapterName: string) => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "단원을 추가하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save to Supabase with user_id
      const { error } = await supabase
        .from('chapters')
        .insert({
          name: chapterName,
          subject_name: subjectName,
          book_name: bookName,
          user_id: user.id
        });

      if (error) throw error;

      // Update local state
      const updatedSubjects = subjects.map(subject => {
        if (subject.name === subjectName) {
          return {
            ...subject,
            books: subject.books.map(book => {
              if (book.name === bookName) {
                const newChapter: Chapter = {
                  order: book.studyData.chapters.length + 1,
                  name: chapterName,
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
        title: "단원 추가됨",
        description: `${chapterName} 단원이 추가되었습니다.`,
      });
    } catch (error) {
      console.error('Error adding chapter:', error);
      toast({
        title: "오류",
        description: "단원 추가에 실패했습니다.",
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

  const value: UnifiedDataContextType = {
    subjects,
    subjectBooks,
    loading,
    refreshSubjects,
    refreshBooksForSubject,
    addSubject,
    deleteSubject,
    addBook,
    deleteBook,
    addChapter,
    deleteChapter,
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