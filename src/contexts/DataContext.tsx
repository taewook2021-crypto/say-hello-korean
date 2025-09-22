import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DataContextType {
  subjects: string[];
  subjectBooks: { [key: string]: string[] };
  loading: boolean;
  refreshSubjects: () => Promise<void>;
  refreshBooksForSubject: (subjectName: string) => Promise<void>;
  addSubject: (name: string) => Promise<void>;
  deleteSubject: (name: string) => Promise<void>;
  addBook: (subjectName: string, bookName: string) => Promise<void>;
  deleteBook: (subjectName: string, bookName: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectBooks, setSubjectBooks] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // 임시 더미 사용자 ID (인증 제거)
  const dummyUserId = 'dummy-user-id';

  const refreshSubjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subjects')
        .select('name')
        .order('name');
      
      if (error) throw error;
      
      setSubjects(data?.map((subject: any) => subject.name) || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
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

  const addSubject = async (name: string) => {
    try {
      const { error } = await supabase
        .from('subjects')
        .insert({ 
          name: name.trim(),
          user_id: dummyUserId
        });

      if (error) throw error;

      setSubjects(prev => [...prev, name.trim()]);
      
      toast({
        title: "과목 추가됨",
        description: `${name} 과목이 추가되었습니다.`,
      });
    } catch (error) {
      console.error('Error adding subject:', error);
      toast({
        title: "오류",
        description: "과목 추가에 실패했습니다.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteSubject = async (name: string) => {
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('name', name);

      if (error) throw error;

      setSubjects(prev => prev.filter(s => s !== name));
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
      throw error;
    }
  };

  const addBook = async (subjectName: string, bookName: string) => {
    try {
      const { error } = await supabase
        .from('books')
        .insert({ 
          name: bookName.trim(),
          subject_name: subjectName,
          user_id: dummyUserId
        });

      if (error) throw error;

      setSubjectBooks(prev => ({
        ...prev,
        [subjectName]: [...(prev[subjectName] || []), bookName.trim()]
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
      throw error;
    }
  };

  const deleteBook = async (subjectName: string, bookName: string) => {
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('name', bookName)
        .eq('subject_name', subjectName);

      if (error) throw error;

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
      throw error;
    }
  };

  useEffect(() => {
    refreshSubjects();
  }, []);

  const value: DataContextType = {
    subjects,
    subjectBooks,
    loading,
    refreshSubjects,
    refreshBooksForSubject,
    addSubject,
    deleteSubject,
    addBook,
    deleteBook,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}