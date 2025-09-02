import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import RootNavigator from './src/navigation/RootNavigator';
import { initRTLIfNeeded } from './src/utils/rtl';
import ErrorBoundary from './src/components/ErrorBoundary';

enableScreens();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
  },
};

export default function App() {
  useEffect(() => {
    initRTLIfNeeded();
    // On native platforms, forcing RTL might require a reload to fully apply.
    if (Platform.OS !== 'web' && I18nManager.isRTL !== true) {
      // noop: next reload will apply. We keep UI usable meanwhile.
    }
  }, []);

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
