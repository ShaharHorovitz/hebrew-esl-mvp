import type { Topic } from '../vocab/types';

export type LevelType = 'flashcards' | 'math';

export type TopicId = Topic;

export const topicLevels: Record<TopicId, Array<{ id: string; type: LevelType; title: string; subtitle?: string }>> = {
  numbers: [
    { id: 'flashcards', type: 'flashcards', title: 'זיהוי בסיסי', subtitle: 'זיהוי מספרים בעברית' },
    { id: 'math',       type: 'math',       title: 'חישוב פשוט', subtitle: 'חישובים בסיסיים עם מספרים' },
  ],
  colors:   [ { id: 'flashcards', type: 'flashcards', title: 'זיהוי בסיסי', subtitle: 'זיהוי צבעים בעברית' } ],
  weekdays: [ { id: 'flashcards', type: 'flashcards', title: 'זיהוי בסיסי', subtitle: 'זיהוי ימי השבוע בעברית' } ],
  seasons:  [ { id: 'flashcards', type: 'flashcards', title: 'זיהוי בסיסי', subtitle: 'זיהוי עונות השנה בעברית' } ],
  verbs:    [ { id: 'flashcards', type: 'flashcards', title: 'זיהוי בסיסי' } ],
  phrases:  [ { id: 'flashcards', type: 'flashcards', title: 'זיהוי בסיסי' } ],
};

export function getLevelDef(topicId: TopicId, levelId?: string) {
  const list = topicLevels[topicId] ?? [];
  return list.find(l => l.id === levelId);
}

export function getDefaultLevel(topicId: TopicId) {
  const list = topicLevels[topicId] ?? [];
  return list[0]; // flashcards for non-numbers; flashcards for numbers
}
