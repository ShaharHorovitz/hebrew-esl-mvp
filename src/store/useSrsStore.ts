import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import type { SrsStats, VocabItem } from '../types';
import { difficultyFrom, initialStatsFor, updateSRS } from '../features/srs/srs';
import { getSeedByTopic } from '../features/seed/loader';

type SessionItem = {
  item: VocabItem;
  stats: SrsStats;
};

interface SrsState {
  itemsById: Record<string, SrsStats>;
  currentSession: SessionItem[];
  sessionIndex: number;
  sessionSize: number;
  startSession: (topicId?: VocabItem['topicId'], size?: number) => void;
  current: () => SessionItem | null;
  answer: (itemId: string, wasCorrect: boolean, latencyMs: number) => void;
  accuracy: () => number;
  streak: () => number;
}

export const useSrsStore = create<SrsState>()(
  persist(
    (set, get) => ({
      itemsById: {},
      currentSession: [],
      sessionIndex: 0,
      sessionSize: 12,
      startSession: (topicId, size) => {
        const pool = getSeedByTopic(topicId);
        const now = dayjs();
        const itemsById = { ...get().itemsById };

        const enrich = (v: VocabItem): SessionItem => {
          const existing = itemsById[v.id] ?? initialStatsFor(v.id);
          itemsById[v.id] = existing;
          return { item: v, stats: existing };
        };

        const due = pool.filter((v) => dayjs(itemsById[v.id]?.dueAt ?? now.toISOString()).isBefore(now.add(1, 'minute')));
        const rest = pool.filter((v) => !due.find((d) => d.id === v.id));
        const selected = [...due.map(enrich), ...rest.map(enrich)].slice(0, size ?? get().sessionSize);

        set({ currentSession: selected, sessionIndex: 0, itemsById });
      },
      current: () => {
        const { currentSession, sessionIndex } = get();
        return currentSession[sessionIndex] ?? null;
      },
      answer: (itemId, wasCorrect, latencyMs) => {
        const { itemsById, currentSession, sessionIndex } = get();
        const prev = itemsById[itemId] ?? initialStatsFor(itemId);
        const difficulty = difficultyFrom(wasCorrect, latencyMs);
        const next = updateSRS(prev, { correct: wasCorrect, latencyMs, difficulty });
        const nextMap = { ...itemsById, [itemId]: next };

        const nextIndex = Math.min(sessionIndex + 1, Math.max(0, currentSession.length));
        set({ itemsById: nextMap, sessionIndex: nextIndex });
      },
      accuracy: () => {
        const items = Object.values(get().itemsById);
        const attempts = items.reduce((s, i) => s + i.totalAttempts, 0);
        if (attempts === 0) return 0;
        const correct = items.reduce((s, i) => s + i.totalCorrect, 0);
        return Math.round((100 * correct) / attempts);
      },
      streak: () => {
        const items = Object.values(get().itemsById);
        return items.reduce((m, i) => Math.max(m, i.longestStreak), 0);
      },
    }),
    { name: 'srs-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);


