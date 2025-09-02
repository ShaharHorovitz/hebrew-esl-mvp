export type Level = 'A1' | 'A2';

export type Topic = 'numbers' | 'colors' | 'weekdays' | 'seasons' | 'verbs' | 'phrases';

export interface VocabItem {
  id: string;
  topic: Topic;
  level: Level;
  hebrew: string;
  english: string;
  example: string;
  transliteration?: string;
}

export interface ItemStats {
  itemId: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  lastReviewedAt: string | null;
  dueAt: string;
  totalAttempts: number;
  totalCorrect: number;
  currentStreak: number;
  longestStreak: number;
  averageLatencyMs: number;
  lastLatencyMs: number;
  rollingAccuracy: number; // 0-100, last 20 answers
  answersCount: number; // total answers for rolling accuracy
}

export interface PlayerProgress {
  xp: number;
  level: number;
  streak: number;
  topicMastery: Record<Topic, number>; // 0-100 mastery per topic
}
