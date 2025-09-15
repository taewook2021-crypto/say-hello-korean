-- 기존 플랜을 pro로 변경하고 새로운 pro 플랜 추가
UPDATE subscription_limits 
SET tier_name = 'pro', price_monthly = 9900 
WHERE tier_name = 'premium';

-- basic 플랜 가격 수정 (4900원)
UPDATE subscription_limits 
SET price_monthly = 4900 
WHERE tier_name = 'basic';