-- 대단원 테이블 생성
CREATE TABLE public.major_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  book_name TEXT NOT NULL,
  subject_name TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.major_chapters ENABLE ROW LEVEL SECURITY;

-- Create policies for major_chapters
CREATE POLICY "Allow all access to major_chapters" 
ON public.major_chapters 
FOR ALL 
USING (true);

-- 기존 chapters 테이블에 major_chapter_id 컬럼 추가
ALTER TABLE public.chapters 
ADD COLUMN major_chapter_id UUID REFERENCES public.major_chapters(id) ON DELETE CASCADE;

-- 기존 chapters 테이블의 인덱스 추가
CREATE INDEX idx_major_chapters_book ON public.major_chapters(subject_name, book_name);
CREATE INDEX idx_chapters_major_chapter ON public.chapters(major_chapter_id);

-- 업데이트 트리거 추가
CREATE TRIGGER update_major_chapters_updated_at
BEFORE UPDATE ON public.major_chapters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();