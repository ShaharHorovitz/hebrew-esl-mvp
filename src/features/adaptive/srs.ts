import dayjs from 'dayjs';
import type { ItemStats } from '../vocab/types';

export type DifficultyBand = 'easy' | 'medium' | 'hard';

export interface AnswerResult {
  isCorrect: boolean;
  latencyMs: number;
  difficulty: DifficultyBand;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const difficultyFrom = (isCorrect: boolean, latencyMs: number): DifficultyBand => {
  if (!isCorrect) return 'hard';
  if (latencyMs <= 2500) return 'easy';
  if (latencyMs <= 6000) return 'medium';
  return 'hard';
};

export const initialStatsFor = (itemId: string): ItemStats => {
  const now = dayjs();
  return {
    itemId,
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    lastReviewedAt: null,
    dueAt: now.toISOString(),
    totalAttempts: 0,
    totalCorrect: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageLatencyMs: 0,
    lastLatencyMs: 0,
    rollingAccuracy: 0,
    answersCount: 0,
  };
};

export const updateSRS = (prev: ItemStats, result: AnswerResult): ItemStats => {
  const now = dayjs();
  const grade = toGrade(result);

  // SM-2 algorithm with difficulty band consideration
  const nextEase = clamp(
    prev.easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)),
    1.3,
    3.0
  );

  let intervalDays: number;
  let repetitions = prev.repetitions;
  
  if (grade < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 3;
    else intervalDays = Math.round(prev.intervalDays * nextEase) || 1;
  }

  const totalAttempts = prev.totalAttempts + 1;
  const totalCorrect = prev.totalCorrect + (result.isCorrect ? 1 : 0);
  const currentStreak = result.isCorrect ? prev.currentStreak + 1 : 0;
  const longestStreak = Math.max(prev.longestStreak, currentStreak);

  // Update latency tracking
  const newAverageLatency = prev.totalAttempts === 0 
    ? result.latencyMs 
    : (prev.averageLatencyMs * prev.totalAttempts + result.latencyMs) / totalAttempts;

  // Update rolling accuracy (simple moving window of last 20 answers)
  const newAnswersCount = prev.answersCount + 1;
  const windowSize = 20;
  const correctInWindow = Math.min(prev.totalCorrect, windowSize);
  const newRollingAccuracy = newAnswersCount <= windowSize 
    ? Math.round((totalCorrect / newAnswersCount) * 100)
    : Math.round((correctInWindow / windowSize) * 100);

  return {
    ...prev,
    repetitions,
    intervalDays,
    easeFactor: nextEase,
    lastReviewedAt: now.toISOString(),
    dueAt: now.add(intervalDays, 'day').toISOString(),
    totalAttempts,
    totalCorrect,
    currentStreak,
    longestStreak,
    averageLatencyMs: Math.round(newAverageLatency),
    lastLatencyMs: result.latencyMs,
    rollingAccuracy: newRollingAccuracy,
    answersCount: newAnswersCount,
  };
};

export const toGrade = ({ isCorrect, difficulty }: Pick<AnswerResult, 'isCorrect' | 'difficulty'>): 0 | 1 | 2 | 3 | 4 | 5 => {
  if (!isCorrect) return 2; // treat as hard but not zero to keep progression mild
  switch (difficulty) {
    case 'easy':
      return 5;
    case 'medium':
      return 4;
    case 'hard':
    default:
      return 3;
  }
};

export const isDue = (stats: ItemStats): boolean => {
  return dayjs().isAfter(dayjs(stats.dueAt));
};

export const getDueItems = (items: ItemStats[]): ItemStats[] => {
  return items.filter(isDue);
};

