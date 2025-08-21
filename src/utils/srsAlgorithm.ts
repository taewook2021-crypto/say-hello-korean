// SRS (Spaced Repetition System) 알고리즘 유틸리티

export interface SRSResult {
  newEaseFactor: number;
  newInterval: number;
  nextReviewDate: string;
}

/**
 * SRS 알고리즘을 사용해 다음 복습 일정을 계산
 * @param currentEaseFactor 현재 ease factor (기본 2.5)
 * @param currentInterval 현재 간격 (일)
 * @param quality 퀄리티 점수 (0-5): 5=완벽, 4=약간 어려움, 3=어려움, 2=틀림, 1=완전히 틀림, 0=완전히 기억 안남
 * @returns 새로운 ease factor, 간격, 다음 복습 날짜
 */
export function calculateSRS(
  currentEaseFactor: number,
  currentInterval: number,
  quality: number
): SRSResult {
  let newEaseFactor = currentEaseFactor;
  let newInterval = currentInterval;

  // Quality가 3 미만이면 처음부터 다시 시작
  if (quality < 3) {
    newInterval = 1;
  } else {
    // Ease factor 조정
    newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    // Ease factor 최소값 제한
    if (newEaseFactor < 1.3) {
      newEaseFactor = 1.3;
    }

    // 새로운 간격 계산
    if (currentInterval === 1) {
      newInterval = 6; // 첫 번째 성공 후 6일
    } else {
      newInterval = Math.round(currentInterval * newEaseFactor);
    }
  }

  // 다음 복습 날짜 계산
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);
  nextDate.setHours(9, 0, 0, 0); // 오전 9시로 설정

  return {
    newEaseFactor: Math.round(newEaseFactor * 100) / 100, // 소수점 2자리
    newInterval,
    nextReviewDate: nextDate.toISOString()
  };
}

/**
 * 신뢰도/자신감 레벨을 SRS 퀄리티 점수로 변환
 * @param confidence 신뢰도 레벨 (1-5)
 * @returns SRS 퀄리티 점수 (0-5)
 */
export function confidenceToQuality(confidence: number): number {
  // 신뢰도 1-5를 SRS 퀄리티 1-5로 매핑 (0은 사용하지 않음)
  return Math.max(1, Math.min(5, confidence));
}

/**
 * 복습 세션 결과를 바탕으로 카드 업데이트
 * @param cardId 카드 ID
 * @param confidence 신뢰도 레벨 (1-5)
 * @param currentCard 현재 카드 데이터
 * @returns 업데이트할 데이터
 */
export function updateCardAfterReview(
  cardId: string,
  confidence: number,
  currentCard: {
    ease_factor: number;
    interval_days: number;
    reviewed_count: number;
  }
) {
  const quality = confidenceToQuality(confidence);
  const srsResult = calculateSRS(
    currentCard.ease_factor,
    currentCard.interval_days,
    quality
  );

  return {
    ease_factor: srsResult.newEaseFactor,
    interval_days: srsResult.newInterval,
    next_review_date: srsResult.nextReviewDate,
    reviewed_count: currentCard.reviewed_count + 1,
    updated_at: new Date().toISOString()
  };
}