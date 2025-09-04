import type { VocabItem } from './types';

// Static import for Expo/Metro bundling
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SEED_DATA: VocabItem[] = require('./data.seed.json');

export const loadVocab = (): VocabItem[] => {
  // Minimal validation
  if (!Array.isArray(SEED_DATA)) {
    throw new Error('Invalid vocab data: expected array');
  }

  const validated = SEED_DATA.filter((item): item is VocabItem => {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      typeof item.topic === 'string' &&
      typeof item.level === 'string' &&
      typeof item.hebrew === 'string' &&
      typeof item.english === 'string' &&
      typeof item.example === 'string'
    );
  });

  if (validated.length === 0) {
    throw new Error('No valid vocab items found');
  }

  return validated;
};

export const getVocabByTopic = (topic?: string): VocabItem[] => {
  const allItems = loadVocab();
  if (!topic) return allItems;
  return allItems.filter(item => item.topic === topic);
};

export const getItemsByTopic = (topicId: string): VocabItem[] => {
  return getVocabByTopic(topicId);
};

export const getVocabByLevel = (level?: string): VocabItem[] => {
  const allItems = loadVocab();
  if (!level) return allItems;
  return allItems.filter(item => item.level === level);
};

