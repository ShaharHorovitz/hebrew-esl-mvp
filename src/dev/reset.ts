import AsyncStorage from '@react-native-async-storage/async-storage';

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
 * Check if we're in development mode
 */
export const isDevMode = (): boolean => {
  return __DEV__ || process.env.NODE_ENV === 'development';
};
