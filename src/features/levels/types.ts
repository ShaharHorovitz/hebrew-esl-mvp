export type LevelKind = 'flashcards' | 'reverse' | 'fill-blank' | 'math';

export interface QuestionItem {
  id: string;
  promptHe?: string;     // Hebrew prompt if relevant
  promptEn?: string;     // English prompt if relevant
  answer: string;        // canonical correct answer (string)
  options?: string[];    // multiple choice options when applicable
  meta?: Record<string, any>;
}

export interface TopicLevelDef {
  id: string;            // e.g., 'numbers-1-flashcards'
  topic: 'numbers' | 'colors' | 'weekdays' | 'seasons' | 'verbs' | 'phrases';
  kind: LevelKind;
  titleHe: string;       // e.g., 'זיהוי בסיסי'
  descriptionHe?: string;
  size?: number;         // default 12
}

export interface LevelProgress {
  completed: boolean;
  accuracy: number;
  attempts: number;
}
