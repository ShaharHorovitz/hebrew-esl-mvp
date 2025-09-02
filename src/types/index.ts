export type TopicId = 'basics' | 'food' | 'travel';

export interface VocabItem {
  id: string;
  topicId: TopicId;
  hebrew: string; // Prompt shown (RTL)
  english: string; // Correct answer
  example?: string; // English example for TTS
}

export type DifficultyBand = 'easy' | 'medium' | 'hard';

export interface SrsStats {
  itemId: string;
  repetitions: number; // SM-2 reps count
  intervalDays: number; // next interval
  easeFactor: number; // SM-2 EF
  lastReviewedAt: string | null; // ISO
  dueAt: string; // ISO
  totalAttempts: number;
  totalCorrect: number;
  currentStreak: number;
  longestStreak: number;
}

export interface AnswerResult {
  correct: boolean;
  latencyMs: number;
  difficulty: DifficultyBand;
}


