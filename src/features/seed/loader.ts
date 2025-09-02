import type { TopicId, VocabItem } from '../../types';

// Static import is fine in Expo; Metro bundles JSON
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SEED: VocabItem[] = require('../../../assets/seed/vocab.json');

export const getAllSeed = (): VocabItem[] => SEED;

export const getSeedByTopic = (topicId?: TopicId): VocabItem[] => {
  if (!topicId) return SEED;
  return SEED.filter((v) => v.topicId === topicId);
};


