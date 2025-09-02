import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';
import type { VocabItem, ItemStats, PlayerProgress, Topic } from '../features/vocab/types';
import type { SessionQueue, SessionItem } from '../features/adaptive/session';
import { loadVocab, getVocabByTopic } from '../features/vocab/repo';
import { buildSessionQueue, getNextItem, advanceQueue, isSessionComplete } from '../features/adaptive/session';
import { updateSRS, difficultyFrom, initialStatsFor } from '../features/adaptive/srs';
import { BASIC_TOPICS, ADVANCED_TOPICS } from '../features/vocab/topics';

interface SessionState {
  // Data
  items: VocabItem[];
  statsMap: Record<string, ItemStats>;
  sessionQueue: SessionQueue | null;
  progress: PlayerProgress;
  
  // Actions
  loadItems: () => void;
  startSession: (topic?: string, size?: number) => void;
  answer: (itemId: string, isCorrect: boolean, latencyMs: number) => void;
  awardXp: (params: { isCorrect: boolean; latencyMs: number; topic: Topic; itemId: string }) => void;
  endSession: () => void;
  
  // Computed
  currentItem: () => SessionItem | null;
  sessionProgress: () => { current: number; total: number; percentage: number };
  sessionAccuracy: () => number;
  sessionAverageLatency: () => number;
  isSessionActive: () => boolean;
  getNextLevelXp: () => number;
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
        
        set({ sessionQueue: queue });
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
        set({ sessionQueue: null });
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
    }),
    {
      name: 'session-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        statsMap: state.statsMap,
        items: state.items,
        progress: state.progress,
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
