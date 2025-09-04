import type { TopicLevelDef, QuestionItem, LevelKind } from './types';
import { getVocabByTopic } from '../vocab/repo';
import { chooseDistractors } from '../adaptive/session';

const NUM_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten'];

const shuffle = <T,>(a: T[]): T[] => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

const uniq = <T,>(a: T[]): T[] => Array.from(new Set(a));

const countOf = <T,>(a: T[], v: T): number => a.reduce((n, x) => n + (x === v ? 1 : 0), 0);

export function buildMCQOptions(answer: string, count = 4): string[] {
  const pool = NUM_WORDS.filter(w => w !== answer);
  let opts = [answer, ...shuffle(pool).slice(0, count - 1)];
  opts = uniq(opts);
  if (!opts.includes(answer)) opts.unshift(answer);
  while (countOf(opts, answer) > 1) opts.splice(opts.lastIndexOf(answer), 1);
  for (const cand of shuffle(pool)) {
    if (opts.length >= count) break;
    if (!opts.includes(cand)) opts.push(cand);
  }
  return shuffle(opts.slice(0, count));
}

function make(op: '+'|'-', a: number, b: number): QuestionItem {
  const expr = `${NUM_WORDS[a]} ${op === '+' ? '+' : '-'} ${NUM_WORDS[b]} =`;
  const val = op === '+' ? a + b : a - b;
  const ans = NUM_WORDS[val];
  const options = buildMCQOptions(ans, 4);
  
  // Safety logging for MCQ integrity
  if (__DEV__) {
    if (!options.includes(ans) || countOf(options, ans) !== 1) {
      console.warn('MCQ integrity failed', { id: `math-${a}${op}${b}`, answer: ans, options });
    }
  }
  
  return {
    id: `math-${a}${op}${b}`,
    promptEn: expr,
    answer: ans,
    options,
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
