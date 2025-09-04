import type { VocabItem, ItemStats } from '../vocab/types';
import type { TopicLevelDef, QuestionItem } from '../levels/types';
import { isDue } from './srs';
import { buildNumbersItems } from '../levels/numbers';
import { buildMathItems } from '../levels/math';
import { buildChoices } from './choices';

export const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export interface SessionItem {
  item: VocabItem;
  stats: ItemStats;
}

export interface SessionQueue {
  items: SessionItem[];
  currentIndex: number;
  size: number;
}

export interface LevelSessionQueue {
  items: QuestionItem[];
  currentIndex: number;
  size: number;
}

export interface QuizItem {
  id: string;
  promptHe: string;
  promptEn?: string;
  answer: string;
  options: string[];
  ttsPrompt?: string;
  ttsOnCorrect?: string;
  topic: string;
  level: string;
}

export const buildQuizItem = (item: VocabItem, allItems: VocabItem[]): QuizItem => {
  // Build options pool from all items in the same topic
  const topicItems = allItems.filter(i => i.topic === item.topic);
  const pool = topicItems.map(i => i.english).filter(Boolean);
  
  // Create options with choice builder
  const options = buildChoices(item.english, pool, 4);
  
  return {
    id: item.id,
    promptHe: item.hebrew || '',
    promptEn: item.example || item.english,
    answer: item.english,
    options,
    ttsPrompt: item.example || item.english, // For flashcards, speak the English word
    ttsOnCorrect: item.english,
    topic: item.topic,
    level: item.level,
  };
};

export const buildSessionQueue = (
  items: VocabItem[],
  statsMap: Record<string, ItemStats>,
  size: number = 12
): SessionQueue => {
  const now = new Date();
  
  // Create session items with stats
  const sessionItems: SessionItem[] = items.map(item => ({
    item,
    stats: statsMap[item.id] || {
      itemId: item.id,
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
    }
  }));

  // Prioritize due items
  const dueItems = sessionItems.filter(si => isDue(si.stats));
  const nonDueItems = sessionItems.filter(si => !isDue(si.stats));

  // Balance topics - group by topic and take proportional amounts
  const topicGroups = new Map<string, SessionItem[]>();
  sessionItems.forEach(si => {
    const topic = si.item.topic;
    if (!topicGroups.has(topic)) {
      topicGroups.set(topic, []);
    }
    topicGroups.get(topic)!.push(si);
  });

  const balancedItems: SessionItem[] = [];
  const targetPerTopic = Math.ceil(size / topicGroups.size);

  // First add due items from each topic
  topicGroups.forEach((topicItems, topic) => {
    const dueFromTopic = dueItems.filter(si => si.item.topic === topic);
    const nonDueFromTopic = nonDueItems.filter(si => si.item.topic === topic);
    
    // Add due items first
    balancedItems.push(...dueFromTopic.slice(0, targetPerTopic));
    
    // Fill remaining slots with non-due items
    const remainingSlots = targetPerTopic - dueFromTopic.length;
    if (remainingSlots > 0) {
      balancedItems.push(...nonDueFromTopic.slice(0, remainingSlots));
    }
  });

  // Shuffle the balanced items
  const shuffled = [...balancedItems].sort(() => Math.random() - 0.5);
  
  return {
    items: shuffled.slice(0, size),
    currentIndex: 0,
    size
  };
};

export const chooseDistractors = (
  correctItem: VocabItem,
  allItems: VocabItem[],
  count: number = 3
): string[] => {
  // Prefer items from the same topic
  const sameTopicItems = allItems.filter(item => 
    item.id !== correctItem.id && 
    item.topic === correctItem.topic
  );
  
  // If not enough same-topic items, add from other topics
  const otherTopicItems = allItems.filter(item => 
    item.id !== correctItem.id && 
    item.topic !== correctItem.topic
  );

  const distractors: string[] = [];
  
  // Add same-topic distractors first
  const shuffledSameTopic = [...sameTopicItems].sort(() => Math.random() - 0.5);
  distractors.push(...shuffledSameTopic.slice(0, Math.ceil(count / 2)).map(item => item.english));
  
  // Fill remaining slots with other topics
  if (distractors.length < count) {
    const shuffledOtherTopic = [...otherTopicItems].sort(() => Math.random() - 0.5);
    const remaining = count - distractors.length;
    distractors.push(...shuffledOtherTopic.slice(0, remaining).map(item => item.english));
  }

  return distractors.slice(0, count);
};

export const getNextItem = (queue: SessionQueue): SessionItem | null => {
  if (queue.currentIndex >= queue.items.length) {
    return null;
  }
  return queue.items[queue.currentIndex];
};

export const advanceQueue = (queue: SessionQueue): SessionQueue => {
  return {
    ...queue,
    currentIndex: Math.min(queue.currentIndex + 1, queue.items.length)
  };
};

export const isSessionComplete = (queue: SessionQueue): boolean => {
  return queue.currentIndex >= queue.items.length;
};

export const buildLevelSession = (
  level: TopicLevelDef,
  _allItems: VocabItem[],
  _statsMap: Record<string, ItemStats>
): LevelSessionQueue => {
  const size = level.size || 12;
  
  if (level.kind === 'flashcards') {
    // Use existing vocab items for flashcards
    const questionItems = buildNumbersItems('flashcards');
    if (questionItems.length === 0) {
      throw new Error('No flashcards available for this level');
    }
    
    // Shuffle questions and options for this session
    const shuffledItems = shuffle(questionItems).slice(0, size).map(item => ({
      ...item,
      options: item.options ? shuffle(item.options) : undefined,
    }));
    
    return {
      items: shuffledItems,
      currentIndex: 0,
      size,
    };
  }
  
  if (level.kind === 'math') {
    // Use math problems
    const questionItems = buildMathItems(size);
    if (questionItems.length === 0) {
      throw new Error('No math problems available for this level');
    }
    
    // Shuffle questions and options for this session
    const shuffledItems = shuffle(questionItems).slice(0, size).map(item => ({
      ...item,
      options: item.options ? shuffle(item.options) : undefined,
    }));
    
    return {
      items: shuffledItems,
      currentIndex: 0,
      size,
    };
  }
  
  // For other kinds (reverse, fill-blank), return empty for now
  throw new Error(`Level kind '${level.kind}' not implemented yet`);
};

export const getNextLevelItem = (queue?: LevelSessionQueue | null): QuestionItem | null => {
  if (!queue || !queue.items || queue.items.length === 0) return null;
  if (queue.currentIndex >= queue.items.length) return null;
  return queue.items[queue.currentIndex];
};

export const advanceLevelQueue = (queue: LevelSessionQueue): LevelSessionQueue => {
  return {
    ...queue,
    currentIndex: Math.min(queue.currentIndex + 1, queue.items.length)
  };
};

export const isLevelSessionComplete = (queue?: LevelSessionQueue | null): boolean => {
  if (!queue || !queue.items) return true;
  return queue.currentIndex >= queue.items.length;
};
