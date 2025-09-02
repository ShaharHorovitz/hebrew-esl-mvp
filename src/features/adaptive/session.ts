import type { VocabItem, ItemStats } from '../vocab/types';
import { isDue } from './srs';

export interface SessionItem {
  item: VocabItem;
  stats: ItemStats;
}

export interface SessionQueue {
  items: SessionItem[];
  currentIndex: number;
  size: number;
}

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
