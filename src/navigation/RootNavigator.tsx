import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthScreen from '../screens/AuthScreen';
import TopicsScreen from '../screens/TopicsScreen';
import LevelSelectScreen from '../screens/LevelSelectScreen';
import QuizScreen from '../screens/QuizScreen';
import ProgressScreen from '../screens/ProgressScreen';
import type { Topic } from '../features/vocab/types';

export type RootStackParamList = {
  Auth: undefined;
  Topics: undefined;
  LevelSelect: { topic: Topic };
  Quiz: { topicId?: Topic; levelId?: string } | undefined;
  Progress: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Topics"
      screenOptions={{
        headerTitleAlign: 'center',
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'כניסה' }} />
      <Stack.Screen name="Topics" component={TopicsScreen} options={{ title: 'נושאים' }} />
      <Stack.Screen name="LevelSelect" component={LevelSelectScreen} options={{ title: 'רמות למידה' }} />
      <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: 'חידון' }} />
      <Stack.Screen name="Progress" component={ProgressScreen} options={{ title: 'התקדמות' }} />
    </Stack.Navigator>
  );
};

export default RootNavigator;


