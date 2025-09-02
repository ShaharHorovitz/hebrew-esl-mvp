import type { Topic } from './types';

export const BASIC_TOPICS: Topic[] = ['numbers', 'colors', 'weekdays', 'seasons'];
export const ADVANCED_TOPICS: Topic[] = ['verbs', 'phrases'];

export const isBasicTopic = (topic: Topic): boolean => {
  return BASIC_TOPICS.includes(topic);
};

export const isAdvancedTopic = (topic: Topic): boolean => {
  return ADVANCED_TOPICS.includes(topic);
};

export const getTopicLevel = (topic: Topic): 'A1' | 'A2' => {
  return isBasicTopic(topic) ? 'A1' : 'A2';
};
