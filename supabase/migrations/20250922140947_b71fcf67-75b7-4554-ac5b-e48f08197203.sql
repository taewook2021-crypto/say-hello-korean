-- Fix unique constraints for proper upsert operations
-- For subjects table
DROP INDEX IF EXISTS subjects_name_user_id_key;
CREATE UNIQUE INDEX subjects_name_user_id_unique ON subjects (name, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- For books table  
DROP INDEX IF EXISTS books_name_subject_name_user_id_key;
CREATE UNIQUE INDEX books_name_subject_name_user_id_unique ON books (name, subject_name, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- For chapters table
DROP INDEX IF EXISTS chapters_name_subject_name_book_name_user_id_key;
CREATE UNIQUE INDEX chapters_name_subject_name_book_name_user_id_unique ON chapters (name, subject_name, book_name, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));