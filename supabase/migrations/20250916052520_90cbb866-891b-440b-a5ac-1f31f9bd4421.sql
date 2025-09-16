-- "재고자산" 단원을 "최재형 연습서"에 추가
INSERT INTO public.chapters (name, book_name, subject_name)
VALUES ('재고자산', '최재형 연습서', '재무회계')
ON CONFLICT (name, book_name, subject_name) DO NOTHING;