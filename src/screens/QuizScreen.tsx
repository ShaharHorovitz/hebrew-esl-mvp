import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  const answer = useSessionStore((s) => s.answer);
  const awardXp = useSessionStore((s) => s.awardXp);
  const endSession = useSessionStore((s) => s.endSession);
  const sessionAccuracy = useSessionStore((s) => s.sessionAccuracy);
  const sessionAverageLatency = useSessionStore((s) => s.sessionAverageLatency);
  const items = useSessionStore((s) => s.items);
  const sessionQueue = useSessionStore((s) => s.sessionQueue);
  
  // Local state for quiz progression
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const answering = useRef(false);

  useEffect(() => {
    // Load items if not already loaded
    if (items.length === 0) {
      loadItems();
    }
    
    // Start session
    startSession(params?.topicId as Topic | undefined, 12);
  }, [params?.topicId, items.length, loadItems, startSession]);

  // Derive current question from session queue
  const total = sessionQueue?.items.length || 0;
  const item = sessionQueue?.items[current]?.item;

  const distractors = useMemo(() => {
    if (!item) return [];
    return chooseDistractors(item, items, 3);
  }, [item, items]);

  const advance = () => {
    if (current + 1 < total) {
      setCurrent((i) => i + 1);
    } else {
      setFinished(true);
    }
  };

  const handleAnswer = ({ isCorrect, latencyMs }: { isCorrect: boolean; latencyMs: number }) => {
    if (answering.current || !item) return;
    
    answering.current = true;
    
    // Update SRS stats first
    answer(item.id, isCorrect, latencyMs);
    
    // Award XP for gamification
    awardXp({
      isCorrect,
      latencyMs,
      topic: item.topic,
      itemId: item.id,
    });
    
    // Short feedback delay then advance
    setTimeout(() => {
      answering.current = false;
      advance();
    }, 350);
  };

  const handleEndSession = () => {
    endSession();
    navigation.goBack();
  };

  // Show session summary when finished
  if (finished) {
    const accuracy = sessionAccuracy();
    const avgLatency = sessionAverageLatency();
    
    return (
      <View style={styles.container}>
        <Text style={styles.title}>סשן הושלם</Text>
        <Text style={styles.subtitle}>כל הכבוד! הנה התוצאות שלך:</Text>
        
        <View style={styles.statsContainer}>
          <Text style={styles.stat}>דיוק: {accuracy}%</Text>
          <Text style={styles.stat}>זמן ממוצע: {avgLatency}ms</Text>
          <Text style={styles.stat}>שאלות: {total}/{total}</Text>
        </View>
        
        <Pressable style={styles.button} onPress={handleEndSession}>
          <Text style={styles.buttonText}>חזור לנושאים</Text>
        </Pressable>
      </View>
    );
  }

  if (!item || !sessionQueue) {
    return (
      <View style={styles.container}> 
        <Text style={styles.title}>טוען...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}> 
      <View style={styles.header}>
        <Text style={styles.progressText}>שאלה {current + 1} מתוך {total}</Text>
        <Text style={styles.topicText}>{item.topic}</Text>
      </View>
      
      <QuizCard
        key={`${item.id}-${current}`}
        item={item}
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


