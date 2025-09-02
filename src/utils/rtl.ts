import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RTL_FLAG = 'rtl-initialized';

// Hebrew-first RTL: only enforce on native, and only once to avoid reload loops
export const initRTLIfNeeded = (): void => {
  if (Platform.OS === 'web') return;
  (async () => {
    try {
      const already = await AsyncStorage.getItem(RTL_FLAG);
      if (already) return;
      if (!I18nManager.isRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
      }
      await AsyncStorage.setItem(RTL_FLAG, '1');
    } catch {
      // ignore
    }
  })();
};


