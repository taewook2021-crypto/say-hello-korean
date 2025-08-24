-- 프로젝트별 색깔 선택을 위해 nodes 테이블에 color 컬럼 추가
ALTER TABLE public.nodes 
ADD COLUMN color TEXT DEFAULT '#3b82f6';

-- 기본 색깔 값들을 위한 체크 제약 추가 (7가지 색깔)
ALTER TABLE public.nodes 
ADD CONSTRAINT valid_color_check 
CHECK (color IN (
  '#3b82f6', -- blue
  '#ef4444', -- red  
  '#10b981', -- green
  '#f59e0b', -- amber
  '#8b5cf6', -- violet
  '#f97316', -- orange
  '#06b6d4'  -- cyan
));