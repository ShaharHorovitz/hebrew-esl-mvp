import type { TopicLevelDef, QuestionItem, LevelKind } from './types';
import { getVocabByTopic } from '../vocab/repo';
import { chooseDistractors, shuffle } from '../adaptive/session';

const NUM_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
const unique = <T,>(a: T[]): T[] => Array.from(new Set(a));

function mcqOptions(answer: string, count = 4): string[] {
  const pool = NUM_WORDS.filter(w => w !== answer);
  const picks = shuffle(pool).slice(0, count - 1);
  const merged = unique([answer, ...picks]);
  while (merged.length < count) {
    const extra = pool.find(w => !merged.includes(w));
    if (!extra) break;
    merged.push(extra);
  }
  return shuffle(merged);
}

function make(op: '+'|'-', a: number, b: number): QuestionItem {
  const expr = `${NUM_WORDS[a]} ${op === '+' ? '+' : '-'} ${NUM_WORDS[b]} =`;
  const val = op === '+' ? a + b : a - b;
  const ans = NUM_WORDS[val];
  return {
    id: `math-${a}${op}${b}`,
    promptEn: expr,
    answer: ans,
    options: mcqOptions(ans, 4),
    meta: { type: 'math' },
  };
}

export const buildNumbersMathItems = (): QuestionItem[] => {
  const items = [
    make('-', 7, 1),
    make('+', 2, 3),
    make('-', 10, 4),
    make('+', 1, 1),
    make('-', 5, 2),
    make('+', 3, 4),
    make('-', 8, 3),
    make('+', 4, 5),
    make('-', 6, 1),
    make('+', 0, 7),
    make('-', 9, 2),
    make('+', 2, 6),
  ];
  return shuffle(items);
};

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
    return buildNumbersMathItems();
  }
  
  // For other kinds (reverse, fill-blank), return empty for now
  console.warn(`Level kind '${kind}' not implemented for numbers topic`);
  return [];
};
