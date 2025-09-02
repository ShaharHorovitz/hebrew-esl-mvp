import type { TopicLevelDef, QuestionItem, LevelKind } from './types';
import { getVocabByTopic } from '../vocab/repo';
import { chooseDistractors } from '../adaptive/session';

export const numbersLevels: TopicLevelDef[] = [
  {
    id: 'numbers-1-flashcards',
    topic: 'numbers',
    kind: 'flashcards',
    titleHe: 'זיהוי בסיסי',
    descriptionHe: 'זיהוי מספרים בעברית',
    size: 12,
  },
  {
    id: 'numbers-2-math',
    topic: 'numbers',
    kind: 'math',
    titleHe: 'חישוב פשוט',
    descriptionHe: 'חישובים בסיסיים עם מספרים',
    size: 12,
  },
];

// Math problems for numbers level
const mathProblems = [
  { id: 'math-7-1', prompt: 'seven - one =', answer: 'six', options: ['six', 'five', 'eight'] },
  { id: 'math-2+3', prompt: 'two + three =', answer: 'five', options: ['five', 'four', 'six'] },
  { id: 'math-10-4', prompt: 'ten - four =', answer: 'six', options: ['six', 'five', 'seven'] },
  { id: 'math-1+1', prompt: 'one + one =', answer: 'two', options: ['two', 'three', 'one'] },
  { id: 'math-8-2', prompt: 'eight - two =', answer: 'six', options: ['six', 'five', 'seven'] },
  { id: 'math-3+2', prompt: 'three + two =', answer: 'five', options: ['five', 'four', 'six'] },
  { id: 'math-9-3', prompt: 'nine - three =', answer: 'six', options: ['six', 'five', 'seven'] },
  { id: 'math-4+1', prompt: 'four + one =', answer: 'five', options: ['five', 'four', 'six'] },
  { id: 'math-6-1', prompt: 'six - one =', answer: 'five', options: ['five', 'four', 'seven'] },
  { id: 'math-2+2', prompt: 'two + two =', answer: 'four', options: ['four', 'three', 'five'] },
  { id: 'math-7-2', prompt: 'seven - two =', answer: 'five', options: ['five', 'four', 'six'] },
  { id: 'math-3+1', prompt: 'three + one =', answer: 'four', options: ['four', 'three', 'five'] },
  { id: 'math-5-1', prompt: 'five - one =', answer: 'four', options: ['four', 'three', 'six'] },
  { id: 'math-1+3', prompt: 'one + three =', answer: 'four', options: ['four', 'three', 'five'] },
  { id: 'math-8-3', prompt: 'eight - three =', answer: 'five', options: ['five', 'four', 'six'] },
  { id: 'math-2+4', prompt: 'two + four =', answer: 'six', options: ['six', 'five', 'seven'] },
  { id: 'math-6-2', prompt: 'six - two =', answer: 'four', options: ['four', 'three', 'five'] },
  { id: 'math-4+2', prompt: 'four + two =', answer: 'six', options: ['six', 'five', 'seven'] },
  { id: 'math-9-4', prompt: 'nine - four =', answer: 'five', options: ['five', 'four', 'six'] },
  { id: 'math-3+3', prompt: 'three + three =', answer: 'six', options: ['six', 'five', 'seven'] },
];

export const buildNumbersItems = (kind: LevelKind): QuestionItem[] => {
  if (kind === 'flashcards') {
    const vocabItems = getVocabByTopic('numbers');
    if (vocabItems.length === 0) {
      console.warn('No vocabulary items found for numbers topic');
      return [];
    }
    return vocabItems.map(item => ({
      id: item.id,
      promptHe: item.hebrew,
      answer: item.english,
      options: chooseDistractors(item, vocabItems, 3),
      meta: { originalItem: item },
    }));
  }
  
  if (kind === 'math') {
    if (mathProblems.length === 0) {
      console.warn('No math problems available');
      return [];
    }
    return mathProblems.map(problem => ({
      id: problem.id,
      promptEn: problem.prompt,
      answer: problem.answer,
      options: problem.options,
      meta: { type: 'math' },
    }));
  }
  
  // For other kinds (reverse, fill-blank), return empty for now
  console.warn(`Level kind '${kind}' not implemented for numbers topic`);
  return [];
};
