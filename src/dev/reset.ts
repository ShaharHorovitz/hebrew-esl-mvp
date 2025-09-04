import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlayerProgress } from '../features/vocab/types';

/**
 * Development utility to reset all progress data
 * This clears stats and progress from AsyncStorage
 */
export const resetProgress = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem('session-store'),
      AsyncStorage.removeItem('session-stats'),
      AsyncStorage.removeItem('session-progress'),
    ]);
    console.log('Progress reset successfully');
  } catch (error) {
    console.error('Failed to reset progress:', error);
    throw error;
  }
};

/**
 * Development utility to seed minimal progress for testing
 * This sets up basic progress so levels are unlocked
 */
export const seedDevProgress = async (): Promise<void> => {
  try {
    const progress: PlayerProgress = {
      xp: 200,
      level: 2,
      streak: 0,
      topicMastery: {
        numbers: 85,
        colors: 10,
        weekdays: 10,
        seasons: 10,
        verbs: 0,
        phrases: 0,
      },
    };
    
    // Get current store data and update progress
    const storeKey = 'session-store-2.0.0';
    const existingData = await AsyncStorage.getItem(storeKey);
    let storeData = existingData ? JSON.parse(existingData) : {};
    
    // Update the progress in the store data
    storeData.state = {
      ...storeData.state,
      progress,
    };
    
    await AsyncStorage.setItem(storeKey, JSON.stringify(storeData));
    console.log('Dev progress seeded successfully');
  } catch (error) {
    console.error('Failed to seed dev progress:', error);
    throw error;
  }
};

/**
 * Check if we're in development mode
 */
export const isDevMode = (): boolean => {
  return __DEV__ || process.env.NODE_ENV === 'development';
};
