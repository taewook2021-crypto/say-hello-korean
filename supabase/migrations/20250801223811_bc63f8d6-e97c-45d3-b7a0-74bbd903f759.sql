
-- 과목 테이블 생성
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 교재 테이블 생성  
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject_name TEXT NOT NULL REFERENCES public.subjects(name) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, subject_name)
);

-- 단원 테이블 생성
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  book_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, subject_name, book_name),
  FOREIGN KEY (book_name, subject_name) REFERENCES public.books(name, subject_name) ON DELETE CASCADE
);

-- 오답노트 테이블 생성
CREATE TABLE public.wrong_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  wrong_answer TEXT,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  subject_name TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter_name TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX idx_wrong_notes_subject_book_chapter ON public.wrong_notes(subject_name, book_name, chapter_name);
CREATE INDEX idx_wrong_notes_created_at ON public.wrong_notes(created_at DESC);

-- Row Level Security 활성화 (현재는 공개 접근 허용)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wrong_notes ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 모든 데이터에 접근할 수 있도록 허용하는 정책
CREATE POLICY "Allow all access to subjects" ON public.subjects FOR ALL USING (true);
CREATE POLICY "Allow all access to books" ON public.books FOR ALL USING (true);
CREATE POLICY "Allow all access to chapters" ON public.chapters FOR ALL USING (true);
CREATE POLICY "Allow all access to wrong_notes" ON public.wrong_notes FOR ALL USING (true);
