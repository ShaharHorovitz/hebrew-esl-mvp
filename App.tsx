import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import RootNavigator from './src/navigation/RootNavigator';
import { initRTLIfNeeded } from './src/utils/rtl';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useSessionStore } from './src/store/useSessionStore';
import { numbersLevels } from './src/features/levels/numbers';
import type { Topic } from './src/features/vocab/types';

enableScreens();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
  },
};

export default function App() {
  const registerLevels = useSessionStore((s) => s.registerLevels);
  
  useEffect(() => {
    initRTLIfNeeded();
    // On native platforms, forcing RTL might require a reload to fully apply.
    if (Platform.OS !== 'web' && I18nManager.isRTL !== true) {
      // noop: next reload will apply. We keep UI usable meanwhile.
    }
    
    // Register numbers levels
    registerLevels(numbersLevels);
    
    // Register default flashcards level for other topics
    const otherTopics: Topic[] = ['colors', 'weekdays', 'seasons', 'verbs', 'phrases'];
    const defaultLevels = otherTopics.map(topic => ({
      id: `${topic}-1-flashcards`,
      topic,
      kind: 'flashcards' as const,
      titleHe: 'זיהוי בסיסי',
      descriptionHe: `זיהוי ${topic} בעברית`,
      size: 12,
    }));
    
    registerLevels(defaultLevels);
  }, [registerLevels]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
