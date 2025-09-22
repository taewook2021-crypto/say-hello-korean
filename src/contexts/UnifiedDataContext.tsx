import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubjectData {
  name: string;
  books: string[];
  createdAt?: string;
}

interface UnifiedDataContextType {
  subjects: SubjectData[];
  subjectBooks: { [key: string]: string[] };
  loading: boolean;
  refreshSubjects: () => Promise<void>;
  refreshBooksForSubject: (subjectName: string) => Promise<void>;
  addSubject: (name: string) => Promise<void>;
  deleteSubject: (name: string) => Promise<void>;
  addBook: (subjectName: string, bookName: string) => Promise<void>;
  deleteBook: (subjectName: string, bookName: string) => Promise<void>;
  getSubjectNames: () => string[];
  getBooksBySubject: (subjectName: string) => string[];
}

const UnifiedDataContext = createContext<UnifiedDataContextType | undefined>(undefined);

export function UnifiedDataProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [subjectBooks, setSubjectBooks] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadSubjects = async () => {
    setLoading(true);
    try {
      // First try to load from Supabase
      const { data: supabaseSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('name')
        .order('name');

      if (!subjectsError && supabaseSubjects && supabaseSubjects.length > 0) {
        // Load subjects from Supabase
        const subjectsWithBooks: SubjectData[] = [];
        
        for (const subject of supabaseSubjects) {
          const { data: books, error: booksError } = await supabase
            .from('books')
            .select('name')
            .eq('subject_name', subject.name)
            .order('name');

          subjectsWithBooks.push({
            name: subject.name,
            books: booksError ? [] : books.map(book => book.name),
            createdAt: new Date().toISOString()
          });

          // Also update subjectBooks state
          if (!booksError && books) {
            setSubjectBooks(prev => ({
              ...prev,
              [subject.name]: books.map(book => book.name)
            }));
          }
        }
        
        setSubjects(subjectsWithBooks);
        return;
      }

      // Fallback to localStorage if Supabase is empty
      const legacyData = localStorage.getItem('legacy-subjects');
      const aroData = localStorage.getItem('aro-study-data');
      
      let mergedSubjects: SubjectData[] = [];
      
      // Process legacy subjects
      if (legacyData) {
        const parsed = JSON.parse(legacyData);
        mergedSubjects = Array.isArray(parsed) ? parsed : [];
      }
      
      // Process aro-study-data and merge with legacy
      if (aroData) {
        const aroStudyData = JSON.parse(aroData);
        
        if (Array.isArray(aroStudyData)) {
          aroStudyData.forEach((subjectData: any) => {
            const existingIndex = mergedSubjects.findIndex(
              subject => subject.name === subjectData.name
            );
            
            if (existingIndex !== -1) {
              // Merge books from both sources
              const existingBooks = mergedSubjects[existingIndex].books || [];
              const aroBooks = subjectData.books ? subjectData.books.map((book: any) => book.name) : [];
              mergedSubjects[existingIndex].books = [...new Set([...existingBooks, ...aroBooks])];
            } else {
              // Add new subject from aro-study-data
              mergedSubjects.push({
                name: subjectData.name,
                books: subjectData.books ? subjectData.books.map((book: any) => book.name) : [],
                createdAt: subjectData.createdAt || new Date().toISOString()
              });
            }
          });
        }
      }
      
      setSubjects(mergedSubjects);
      
      // Try to migrate local data to Supabase
      if (mergedSubjects.length > 0) {
        await migrateLocalDataToSupabase(mergedSubjects);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const migrateLocalDataToSupabase = async (localSubjects: SubjectData[]) => {
    try {
      for (const subject of localSubjects) {
        // Save subject to Supabase
        await supabase
          .from('subjects')
          .upsert({ 
            name: subject.name,
            user_id: null
          }, { 
            ignoreDuplicates: true 
          });

        // Save books for this subject
        for (const bookName of subject.books) {
          await supabase
            .from('books')
            .upsert({ 
              name: bookName,
              subject_name: subject.name,
              user_id: null
            }, { 
              ignoreDuplicates: true 
            });
        }
      }
    } catch (error) {
      console.error('Error migrating to Supabase:', error);
    }
  };

  const addSubject = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      // Save to Supabase first
      const { error } = await supabase
        .from('subjects')
        .upsert({ 
          name: trimmedName,
          user_id: null
        }, { 
          ignoreDuplicates: true 
        });

      if (error) throw error;

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
    try {
      // Delete from Supabase first
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('name', name);

      if (error) throw error;

      // Update local state
      const updatedSubjects = subjects.filter(s => s.name !== name);
      setSubjects(updatedSubjects);
      setSubjectBooks(prev => {
        const newState = { ...prev };
        delete newState[name];
        return newState;
      });

      toast({
        title: "과목 삭제됨",
        description: `${name} 과목이 삭제되었습니다.`,
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

  const addBook = async (subjectName: string, bookName: string) => {
    const trimmedBookName = bookName.trim();
    if (!trimmedBookName) return;

    try {
      // Save to Supabase first
      const { error } = await supabase
        .from('books')
        .upsert({ 
          name: trimmedBookName,
          subject_name: subjectName,
          user_id: null
        }, { 
          ignoreDuplicates: true 
        });

      if (error) throw error;

      // Update local state
      const updatedSubjects = subjects.map(subject => {
        if (subject.name === subjectName) {
          const existingBooks = subject.books || [];
          if (!existingBooks.includes(trimmedBookName)) {
            return {
              ...subject,
              books: [...existingBooks, trimmedBookName]
            };
          }
        }
        return subject;
      });

      setSubjects(updatedSubjects);
      setSubjectBooks(prev => ({
        ...prev,
        [subjectName]: [...(prev[subjectName] || []), trimmedBookName]
      }));

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
    try {
      // Delete from Supabase first
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('name', bookName)
        .eq('subject_name', subjectName);

      if (error) throw error;

      // Update local state
      const updatedSubjects = subjects.map(subject => {
        if (subject.name === subjectName) {
          return {
            ...subject,
            books: (subject.books || []).filter(book => book !== bookName)
          };
        }
        return subject;
      });

      setSubjects(updatedSubjects);
      setSubjectBooks(prev => ({
        ...prev,
        [subjectName]: prev[subjectName]?.filter(book => book !== bookName) || []
      }));

      toast({
        title: "책 삭제됨",
        description: `${bookName}이(가) 삭제되었습니다.`,
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
    try {
      const { data, error } = await supabase
        .from('books')
        .select('name')
        .eq('subject_name', subjectName)
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

  const getSubjectNames = (): string[] => {
    return subjects.map(s => s.name);
  };

  const getBooksBySubject = (subjectName: string): string[] => {
    const subject = subjects.find(s => s.name === subjectName);
    return subject?.books || [];
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
    getSubjectNames,
    getBooksBySubject,
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