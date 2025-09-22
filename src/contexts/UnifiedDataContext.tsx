import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

interface SubjectData {
  name: string;
  books: string[];
  createdAt: Date;
}

interface UnifiedDataContextType {
  subjects: SubjectData[];
  loading: boolean;
  addSubject: (name: string) => Promise<void>;
  deleteSubject: (name: string) => Promise<void>;
  addBook: (subjectName: string, bookName: string) => Promise<void>;
  deleteBook: (subjectName: string, bookName: string) => Promise<void>;
  refreshSubjects: () => Promise<void>;
  getSubjectNames: () => string[];
  getBooksBySubject: (subjectName: string) => string[];
}

const UnifiedDataContext = createContext<UnifiedDataContextType | undefined>(undefined);

export function UnifiedDataProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);

  // 통합된 데이터 로드 (ARO 회독표 + 기존 Supabase 데이터)
  const loadSubjects = async () => {
    setLoading(true);
    try {
      // 1. ARO 회독표 데이터에서 과목 추출
      const aroData = localStorage.getItem('aro-study-data');
      const aroSubjects: SubjectData[] = [];
      
      if (aroData) {
        const parsed = JSON.parse(aroData);
        parsed.forEach((subjectFolder: any) => {
          const books = subjectFolder.books.map((book: any) => book.name);
          aroSubjects.push({
            name: subjectFolder.name,
            books,
            createdAt: new Date(subjectFolder.books[0]?.studyData?.createdAt || Date.now())
          });
        });
      }

      // 2. 기존 Supabase에서 저장된 과목들 (subjects 테이블에서)
      // DataContext에서 사용하던 데이터도 포함
      const existingSubjects = localStorage.getItem('legacy-subjects');
      if (existingSubjects) {
        const parsed = JSON.parse(existingSubjects);
        parsed.forEach((subject: any) => {
          // ARO에 없는 과목만 추가
          if (!aroSubjects.find(s => s.name === subject.name)) {
            aroSubjects.push({
              name: subject.name,
              books: subject.books || [],
              createdAt: new Date(subject.createdAt || Date.now())
            });
          }
        });
      }

      setSubjects(aroSubjects);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSubjects = (updatedSubjects: SubjectData[]) => {
    setSubjects(updatedSubjects);
    // legacy 데이터도 함께 저장
    localStorage.setItem('legacy-subjects', JSON.stringify(updatedSubjects));
  };

  const addSubject = async (name: string) => {
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('과목명을 입력해주세요.');
      }

      if (subjects.find(s => s.name === trimmedName)) {
        throw new Error('이미 존재하는 과목입니다.');
      }

      const newSubject: SubjectData = {
        name: trimmedName,
        books: [],
        createdAt: new Date()
      };

      const updatedSubjects = [...subjects, newSubject];
      saveSubjects(updatedSubjects);

      toast.success(`${trimmedName} 과목이 추가되었습니다.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '과목 추가에 실패했습니다.';
      toast.error(message);
      throw error;
    }
  };

  const deleteSubject = async (name: string) => {
    try {
      const updatedSubjects = subjects.filter(s => s.name !== name);
      saveSubjects(updatedSubjects);

      // ARO 데이터에서도 삭제
      const aroData = localStorage.getItem('aro-study-data');
      if (aroData) {
        const parsed = JSON.parse(aroData);
        const filteredAroData = parsed.filter((subject: any) => subject.name !== name);
        localStorage.setItem('aro-study-data', JSON.stringify(filteredAroData));
      }

      toast.success(`${name} 과목이 삭제되었습니다.`);
    } catch (error) {
      toast.error('과목 삭제에 실패했습니다.');
      throw error;
    }
  };

  const addBook = async (subjectName: string, bookName: string) => {
    try {
      const trimmedBookName = bookName.trim();
      if (!trimmedBookName) {
        throw new Error('교재명을 입력해주세요.');
      }

      const updatedSubjects = subjects.map(subject => {
        if (subject.name === subjectName) {
          if (subject.books.includes(trimmedBookName)) {
            throw new Error('이미 존재하는 교재입니다.');
          }
          return {
            ...subject,
            books: [...subject.books, trimmedBookName]
          };
        }
        return subject;
      });

      saveSubjects(updatedSubjects);
      toast.success(`${trimmedBookName} 교재가 추가되었습니다.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '교재 추가에 실패했습니다.';
      toast.error(message);
      throw error;
    }
  };

  const deleteBook = async (subjectName: string, bookName: string) => {
    try {
      const updatedSubjects = subjects.map(subject => {
        if (subject.name === subjectName) {
          return {
            ...subject,
            books: subject.books.filter(book => book !== bookName)
          };
        }
        return subject;
      });

      saveSubjects(updatedSubjects);
      toast.success(`${bookName} 교재가 삭제되었습니다.`);
    } catch (error) {
      toast.error('교재 삭제에 실패했습니다.');
      throw error;
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
    loading,
    addSubject,
    deleteSubject,
    addBook,
    deleteBook,
    refreshSubjects: loadSubjects,
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