import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Topic } from '../features/vocab/types';
import { useSessionStore } from '../store/useSessionStore';
import QuizCard from '../components/QuizCard';
import { chooseDistractors } from '../features/adaptive/session';

const QuizScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const params = (route.params ?? {}) as RootStackParamList['Quiz'];
  
  const loadItems = useSessionStore((s) => s.loadItems);
  const startSession = useSessionStore((s) => s.startSession);
  const currentItem = useSessionStore((s) => s.currentItem);
  const answer = useSessionStore((s) => s.answer);
  const awardXp = useSessionStore((s) => s.awardXp);
  const endSession = useSessionStore((s) => s.endSession);
  const sessionProgress = useSessionStore((s) => s.sessionProgress);
  const sessionAccuracy = useSessionStore((s) => s.sessionAccuracy);
  const sessionAverageLatency = useSessionStore((s) => s.sessionAverageLatency);
  const isSessionActive = useSessionStore((s) => s.isSessionActive);
  const items = useSessionStore((s) => s.items);

  useEffect(() => {
    // Load items if not already loaded
    if (items.length === 0) {
      loadItems();
    }
    
    // Start session
    startSession(params?.topicId as Topic | undefined, 12);
  }, [params?.topicId, items.length, loadItems, startSession]);

  const sessionItem = currentItem();

  const distractors = useMemo(() => {
    if (!sessionItem) return [];
    return chooseDistractors(sessionItem.item, items, 3);
  }, [sessionItem, items]);

  const handleAnswer = ({ isCorrect, latencyMs }: { isCorrect: boolean; latencyMs: number }) => {
    if (sessionItem) {
      // Update SRS stats first
      answer(sessionItem.item.id, isCorrect, latencyMs);
      
      // Award XP for gamification
      awardXp({
        isCorrect,
        latencyMs,
        topic: sessionItem.item.topic,
        itemId: sessionItem.item.id,
      });
    }
  };

  const handleEndSession = () => {
    endSession();
    navigation.goBack();
  };

  // Show session summary when complete
  if (!isSessionActive()) {
    const progress = sessionProgress();
    const accuracy = sessionAccuracy();
    const avgLatency = sessionAverageLatency();
    
    return (
      <View style={styles.container}>
        <Text style={styles.title}>סשן הושלם</Text>
        <Text style={styles.subtitle}>כל הכבוד! הנה התוצאות שלך:</Text>
        
        <View style={styles.statsContainer}>
          <Text style={styles.stat}>דיוק: {accuracy}%</Text>
          <Text style={styles.stat}>זמן ממוצע: {avgLatency}ms</Text>
          <Text style={styles.stat}>שאלות: {progress.current}/{progress.total}</Text>
        </View>
        
        <Pressable style={styles.button} onPress={handleEndSession}>
          <Text style={styles.buttonText}>חזור לנושאים</Text>
        </Pressable>
      </View>
    );
  }

  if (!sessionItem) {
    return (
      <View style={styles.container}> 
        <Text style={styles.title}>טוען...</Text>
      </View>
    );
  }

  const progress = sessionProgress();

  return (
    <View style={styles.container}> 
      <View style={styles.header}>
        <Text style={styles.progressText}>שאלה {progress.current + 1} מתוך {progress.total}</Text>
        <Text style={styles.topicText}>{sessionItem.item.topic}</Text>
      </View>
      
      <QuizCard
        item={sessionItem.item}
        distractors={distractors}
        onAnswer={handleAnswer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'right', marginBottom: 12 },
  subtitle: { fontSize: 16, textAlign: 'right', color: '#444', marginBottom: 24 },
  header: { marginBottom: 24 },
  progressText: { fontSize: 16, textAlign: 'right', color: '#666', marginBottom: 4 },
  topicText: { fontSize: 18, textAlign: 'right', fontWeight: '600', color: '#333' },
  statsContainer: { marginBottom: 24 },
  stat: { fontSize: 18, textAlign: 'right', marginBottom: 8, color: '#333' },
  button: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, marginTop: 16 },
  buttonText: { textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#fff' },
});

export default QuizScreen;


