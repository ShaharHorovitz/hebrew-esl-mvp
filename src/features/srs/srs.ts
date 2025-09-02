import dayjs from 'dayjs';
import type { AnswerResult, DifficultyBand, SrsStats } from '../../types';

// Lightweight SM-2 variant tuned for MVP
// grade: 5 (perfect) -> easy, 4 (hesitation) -> medium, 3 or less -> hard
// We map difficulty+latency to grade.

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const difficultyFrom = (correct: boolean, latencyMs: number): DifficultyBand => {
  if (!correct) return 'hard';
  if (latencyMs <= 2500) return 'easy';
  if (latencyMs <= 6000) return 'medium';
  return 'hard';
};

export const initialStatsFor = (itemId: string): SrsStats => {
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
  };
};

export const updateSRS = (prev: SrsStats, result: AnswerResult): SrsStats => {
  const now = dayjs();
  const grade = toGrade(result);

  const nextEase = clamp(prev.easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)), 1.3, 3.0);

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
  const totalCorrect = prev.totalCorrect + (result.correct ? 1 : 0);
  const currentStreak = result.correct ? prev.currentStreak + 1 : 0;
  const longestStreak = Math.max(prev.longestStreak, currentStreak);

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
  };
};

export const toGrade = ({ correct, difficulty }: Pick<AnswerResult, 'correct' | 'difficulty'>): 0 | 1 | 2 | 3 | 4 | 5 => {
  if (!correct) return 2; // treat as hard but not zero to keep progression mild
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


