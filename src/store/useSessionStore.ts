import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';

// Bump data version to clear old cached data
const DATA_VERSION = '2.0.0';
import type { VocabItem, ItemStats, PlayerProgress, Topic, Level } from '../features/vocab/types';
import type { SessionQueue, SessionItem } from '../features/adaptive/session';
import { loadVocab, getVocabByTopic } from '../features/vocab/repo';
import { buildSessionQueue, getNextItem, advanceQueue, isSessionComplete, buildLevelSession, advanceLevelQueue, isLevelSessionComplete, buildQuizItem } from '../features/adaptive/session';
import type { LevelSessionQueue } from '../features/adaptive/session';
import { updateSRS, difficultyFrom, initialStatsFor } from '../features/adaptive/srs';
import { BASIC_TOPICS, ADVANCED_TOPICS } from '../features/vocab/topics';
import type { TopicLevelDef, LevelProgress } from '../features/levels/types';

interface SessionState {
  // Data
  items: VocabItem[];
  statsMap: Record<string, ItemStats>;
  sessionQueue: SessionQueue | null;
  progress: PlayerProgress;
  levels: Record<string, TopicLevelDef>;
  levelProgress: Record<string, LevelProgress>;
  levelQueue: LevelSessionQueue | null;
  levelLoading: boolean;
  levelError: string | null;
  
  // Actions
  loadItems: () => void;
  startSession: (topic?: string, size?: number) => void;
  startLevel: (levelId: string) => void;
  answer: (itemId: string, isCorrect: boolean, latencyMs: number) => void;
  awardXp: (params: { isCorrect: boolean; latencyMs: number; topic: Topic; itemId: string }) => void;
  endSession: () => void;
  registerLevels: (levels: TopicLevelDef[]) => void;
  markLevelResult: (levelId: string, accuracy: number) => void;
  advanceLevel: () => void;
  
  // Computed
  currentItem: () => SessionItem | null;
  sessionProgress: () => { current: number; total: number; percentage: number };
  sessionAccuracy: () => number;
  sessionAverageLatency: () => number;
  isSessionActive: () => boolean;
  getNextLevelXp: () => number;
  getLevelsForTopic: (topic: Topic) => TopicLevelDef[];
  isLevelUnlocked: (levelId: string) => boolean;
}

// Debounced persist function
const debouncedPersist = debounce((storage: any, key: string, value: any) => {
  storage.setItem(key, JSON.stringify(value));
}, 1000);

// Initialize default progress
const createDefaultProgress = (): PlayerProgress => ({
  xp: 0,
  level: 1,
  streak: 0,
  topicMastery: {
    numbers: 0,
    colors: 0,
    weekdays: 0,
    seasons: 0,
    verbs: 0,
    phrases: 0,
  },
});

// Migration function to handle topic locking changes
const migrateProgress = (progress: PlayerProgress): PlayerProgress => {
  // Ensure all topics exist in topicMastery
  const allTopics: Topic[] = [...BASIC_TOPICS, ...ADVANCED_TOPICS];
  const migratedMastery: Record<Topic, number> = { ...progress.topicMastery };
  
  // Add any missing topics with 0 mastery
  allTopics.forEach(topic => {
    if (!(topic in migratedMastery)) {
      migratedMastery[topic] = 0;
    }
  });
  
  return {
    ...progress,
    topicMastery: migratedMastery,
  };
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      items: [],
      statsMap: {},
      sessionQueue: null,
      progress: createDefaultProgress(),
      levels: {},
      levelProgress: {},
      levelQueue: null,
      levelLoading: false,
      levelError: null,

      loadItems: () => {
        try {
          const items = loadVocab();
          set({ items });
        } catch (error) {
          console.error('Failed to load vocab items:', error);
          set({ items: [] });
        }
      },

      startSession: (topic, size = 12) => {
        const { items, statsMap } = get();
        if (items.length === 0) {
          console.warn('No items loaded, loading now...');
          get().loadItems();
          return;
        }

        const topicItems = topic ? getVocabByTopic(topic) : items;
        const queue = buildSessionQueue(topicItems, statsMap, size);
        
        // Convert session items to quiz items with options
        const quizItems = queue.items.map(sessionItem => 
          buildQuizItem(sessionItem.item, items)
        );
        
        const quizQueue = {
          ...queue,
          items: quizItems.map((quizItem, index) => ({
            item: {
              id: quizItem.id,
              topic: quizItem.topic as Topic,
              level: quizItem.level as Level,
              hebrew: quizItem.promptHe,
              english: quizItem.answer,
              example: quizItem.promptEn || '',
              options: quizItem.options,
              ttsPrompt: quizItem.ttsPrompt,
              ttsOnCorrect: quizItem.ttsOnCorrect,
            },
            stats: queue.items[index].stats,
          }))
        };
        
        set({ sessionQueue: quizQueue });
      },

      answer: (itemId, isCorrect, latencyMs) => {
        const { statsMap, sessionQueue } = get();
        if (!sessionQueue) return;

        // Update SRS stats
        const prevStats = statsMap[itemId] || initialStatsFor(itemId);
        const difficulty = difficultyFrom(isCorrect, latencyMs);
        const newStats = updateSRS(prevStats, { isCorrect, latencyMs, difficulty });

        // Update stats map
        const newStatsMap = { ...statsMap, [itemId]: newStats };

        // Advance session queue
        const newQueue = advanceQueue(sessionQueue);

        set({ 
          statsMap: newStatsMap, 
          sessionQueue: newQueue 
        });

        // Debounced persist
        debouncedPersist(AsyncStorage, 'session-stats', newStatsMap);
      },

      awardXp: ({ isCorrect, latencyMs, topic, itemId }) => {
        const { progress, statsMap } = get();
        
        // Calculate base XP
        const baseXp = isCorrect ? (latencyMs < 2500 ? 10 : 7) : 2;
        
        // Update streak
        const newStreak = isCorrect ? progress.streak + 1 : 0;
        
        // Calculate streak bonus (every 5-streak: +2 * Math.floor(streak/5))
        const streakBonus = newStreak > 0 ? 2 * Math.floor(newStreak / 5) : 0;
        
        // Total earned XP
        const earnedXp = baseXp + streakBonus;
        
        // Update XP and level
        let newXp = progress.xp + earnedXp;
        let newLevel = progress.level;
        
        // Level up logic: if xp >= 100 + level*50 → level++ and xp -= threshold
        const levelThreshold = 100 + newLevel * 50;
        if (newXp >= levelThreshold) {
          newLevel += 1;
          newXp -= levelThreshold;
        }
        
        // Update topic mastery using rolling accuracy from item stats
        const itemStats = statsMap[itemId];
        const newTopicMastery = { ...progress.topicMastery };
        if (itemStats) {
          newTopicMastery[topic] = itemStats.rollingAccuracy;
        }
        
        const newProgress: PlayerProgress = {
          xp: newXp,
          level: newLevel,
          streak: newStreak,
          topicMastery: newTopicMastery,
        };
        
        set({ progress: newProgress });
        
        // Debounced persist
        debouncedPersist(AsyncStorage, 'session-progress', newProgress);
      },

      endSession: () => {
        set({ sessionQueue: null, levelQueue: null, levelLoading: false, levelError: null });
      },

      startLevel: (levelId: string) => {
        const { levels, items, statsMap } = get();
        const level = levels[levelId];
        
        if (!level) {
          set({ levelError: 'Level not found', levelLoading: false });
          return;
        }
        
        set({ levelLoading: true, levelQueue: null, levelError: null });
        
        try {
          const levelQueue = buildLevelSession(level, items, statsMap);
          set({ levelQueue, levelLoading: false });
        } catch (error) {
          set({ 
            levelError: error instanceof Error ? error.message : 'Failed to load level', 
            levelLoading: false 
          });
        }
      },

      advanceLevel: () => {
        const { levelQueue } = get();
        if (levelQueue && !isLevelSessionComplete(levelQueue)) {
          const newQueue = advanceLevelQueue(levelQueue);
          set({ levelQueue: newQueue });
        }
      },

      registerLevels: (levels: TopicLevelDef[]) => {
        const { levels: existingLevels } = get();
        const newLevels = { ...existingLevels };
        levels.forEach(level => {
          newLevels[level.id] = level;
        });
        set({ levels: newLevels });
      },

      markLevelResult: (levelId: string, accuracy: number) => {
        const { levelProgress } = get();
        const current = levelProgress[levelId] || { completed: false, accuracy: 0, attempts: 0 };
        
        const newAttempts = current.attempts + 1;
        const newAccuracy = Math.round((current.accuracy * current.attempts + accuracy) / newAttempts);
        // Complete if accuracy >= 80% and at least 10 questions answered
        const completed = accuracy >= 80 && newAttempts >= 1; // Allow completion on first attempt if good enough
        
        const newProgress = {
          ...levelProgress,
          [levelId]: {
            completed,
            accuracy: newAccuracy,
            attempts: newAttempts,
          },
        };
        
        set({ levelProgress: newProgress });
        
        // Debounced persist
        debouncedPersist(AsyncStorage, 'level-progress', newProgress);
      },

      currentItem: () => {
        const { sessionQueue } = get();
        return sessionQueue ? getNextItem(sessionQueue) : null;
      },

      sessionProgress: () => {
        const { sessionQueue } = get();
        if (!sessionQueue) {
          return { current: 0, total: 0, percentage: 0 };
        }
        const current = sessionQueue.currentIndex;
        const total = sessionQueue.size;
        const percentage = Math.round((current / total) * 100);
        return { current, total, percentage };
      },

      sessionAccuracy: () => {
        const { sessionQueue, statsMap } = get();
        if (!sessionQueue || sessionQueue.currentIndex === 0) {
          return 0;
        }

        let totalCorrect = 0;
        let totalAttempts = 0;

        // Calculate accuracy from items already answered in this session
        for (let i = 0; i < sessionQueue.currentIndex; i++) {
          const item = sessionQueue.items[i];
          const stats = statsMap[item.item.id];
          if (stats) {
            totalCorrect += stats.totalCorrect;
            totalAttempts += stats.totalAttempts;
          }
        }

        return totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
      },

      sessionAverageLatency: () => {
        const { sessionQueue, statsMap } = get();
        if (!sessionQueue || sessionQueue.currentIndex === 0) {
          return 0;
        }

        let totalLatency = 0;
        let count = 0;

        // Calculate average latency from items already answered in this session
        for (let i = 0; i < sessionQueue.currentIndex; i++) {
          const item = sessionQueue.items[i];
          const stats = statsMap[item.item.id];
          if (stats && stats.lastLatencyMs > 0) {
            totalLatency += stats.lastLatencyMs;
            count++;
          }
        }

        return count > 0 ? Math.round(totalLatency / count) : 0;
      },

      isSessionActive: () => {
        const { sessionQueue } = get();
        return sessionQueue !== null && !isSessionComplete(sessionQueue);
      },

      getNextLevelXp: () => {
        const { progress } = get();
        return 100 + progress.level * 50;
      },

      getLevelsForTopic: (topic: Topic) => {
        const { levels } = get();
        return Object.values(levels).filter(level => level.topic === topic);
      },

      isLevelUnlocked: (levelId: string) => {
        const { levels, levelProgress } = get();
        const level = levels[levelId];
        if (!level) return false;
        
        // First level is always unlocked
        const topicLevels = Object.values(levels).filter(l => l.topic === level.topic);
        const sortedLevels = topicLevels.sort((a, b) => a.id.localeCompare(b.id));
        const isFirstLevel = sortedLevels[0]?.id === levelId;
        
        if (isFirstLevel) return true;
        
        // Check if previous level is completed
        const currentIndex = sortedLevels.findIndex(l => l.id === levelId);
        if (currentIndex <= 0) return false;
        
        const previousLevel = sortedLevels[currentIndex - 1];
        const previousProgress = levelProgress[previousLevel.id];
        
        return previousProgress?.completed === true;
      },
    }),
    {
      name: `session-store-${DATA_VERSION}`,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        statsMap: state.statsMap,
        items: state.items,
        progress: state.progress,
        levels: state.levels,
        levelProgress: state.levelProgress,
        levelQueue: state.levelQueue,
        levelLoading: state.levelLoading,
        levelError: state.levelError,
      }),
      onRehydrateStorage: () => (state) => {
        // Migrate progress on app boot
        if (state?.progress) {
          state.progress = migrateProgress(state.progress);
        }
      },
    }
  )
);

// Dev action to clear storage
export const clearStorage = async () => {
  if (__DEV__) {
    try {
      await AsyncStorage.clear();
      console.log('Storage cleared for data version', DATA_VERSION);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
};
