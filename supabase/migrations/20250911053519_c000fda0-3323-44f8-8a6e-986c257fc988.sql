-- PDF 파일을 저장할 Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);

-- PDF 첨부 파일 정보를 저장할 테이블 생성
CREATE TABLE public.pdf_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_name TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 정책 설정
ALTER TABLE public.pdf_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pdf_attachments" 
ON public.pdf_attachments 
FOR ALL 
USING (true);

-- Storage 정책 설정
CREATE POLICY "Allow PDF uploads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Allow PDF downloads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pdfs');

CREATE POLICY "Allow PDF updates"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'pdfs');

CREATE POLICY "Allow PDF deletes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'pdfs');

-- updated_at 트리거 추가
CREATE TRIGGER update_pdf_attachments_updated_at
BEFORE UPDATE ON public.pdf_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();