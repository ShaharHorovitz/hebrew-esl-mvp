import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';

import { useSessionStore } from '../store/useSessionStore';
import QuizCard from '../components/QuizCard';
import { chooseDistractors, getNextLevelItem } from '../features/adaptive/session';

const QuizScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const params = (route.params ?? {}) as RootStackParamList['Quiz'];
  
  const loadItems = useSessionStore((s) => s.loadItems);
  const startSession = useSessionStore((s) => s.startSession);
  const startLevel = useSessionStore((s) => s.startLevel);
  const answer = useSessionStore((s) => s.answer);
  const awardXp = useSessionStore((s) => s.awardXp);
  const endSession = useSessionStore((s) => s.endSession);
  const advanceLevel = useSessionStore((s) => s.advanceLevel);
  const sessionAccuracy = useSessionStore((s) => s.sessionAccuracy);
  const sessionAverageLatency = useSessionStore((s) => s.sessionAverageLatency);
  const markLevelResult = useSessionStore((s) => s.markLevelResult);
  const items = useSessionStore((s) => s.items);
  const sessionQueue = useSessionStore((s) => s.sessionQueue);
  const levelQueue = useSessionStore((s) => s.levelQueue);
  const levelLoading = useSessionStore((s) => s.levelLoading);
  const levelError = useSessionStore((s) => s.levelError);
  const levels = useSessionStore((s) => s.levels);
  
  // Local state for quiz progression
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const answering = useRef(false);

  useEffect(() => {
    // Load items if not already loaded
    if (items.length === 0) {
      loadItems();
    }
    
    // Start session based on params
    if (params?.levelId) {
      // Level-based session
      startLevel(params.levelId);
    } else if (params?.topicId) {
      // Topic-based session (legacy)
      startSession(params.topicId, 12);
    }
  }, [params?.topicId, params?.levelId, items.length, loadItems, startSession, startLevel]);

  // Derive current question from session queue
  const isLevelMode = !!params?.levelId;
  const total = isLevelMode 
    ? (levelQueue?.items.length || 0)
    : (sessionQueue?.items.length || 0);
  
  const levelItem = isLevelMode ? getNextLevelItem(levelQueue) : null;
  const vocabItem = !isLevelMode ? sessionQueue?.items[current]?.item : null;

  const distractors = useMemo(() => {
    if (isLevelMode && levelItem) {
      return levelItem.options || [];
    }
    if (!isLevelMode && vocabItem) {
      return chooseDistractors(vocabItem, items, 3);
    }
    return [];
  }, [isLevelMode, levelItem, vocabItem, items]);

  const advance = () => {
    if (isLevelMode) {
      // Level mode: advance level session queue
      if (levelQueue && levelQueue.currentIndex + 1 < levelQueue.items.length) {
        advanceLevel();
      } else {
        setFinished(true);
      }
    } else {
      // Topic mode: advance regular session
      if (current + 1 < total) {
        setCurrent((i) => i + 1);
      } else {
        setFinished(true);
      }
    }
  };

  const handleAnswer = ({ isCorrect, latencyMs }: { isCorrect: boolean; latencyMs: number }) => {
    if (answering.current) return;
    
    answering.current = true;
    
    if (isLevelMode && levelItem) {
      // Level mode: just track for level completion
      // Award XP for gamification
      const level = levels[params.levelId!];
      if (level) {
        awardXp({
          isCorrect,
          latencyMs,
          topic: level.topic,
          itemId: levelItem.id,
        });
      }
    } else if (!isLevelMode && vocabItem) {
      // Topic mode: update SRS stats
      answer(vocabItem.id, isCorrect, latencyMs);
      
      // Award XP for gamification
      awardXp({
        isCorrect,
        latencyMs,
        topic: vocabItem.topic,
        itemId: vocabItem.id,
      });
    }
    
    // Short feedback delay then advance
    setTimeout(() => {
      answering.current = false;
      advance();
    }, 350);
  };

  const handleEndSession = () => {
    if (isLevelMode && params?.levelId) {
      // Mark level result
      const accuracy = sessionAccuracy();
      markLevelResult(params.levelId, accuracy);
    }
    
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

  if (isLevelMode) {
    // Show loading state
    if (levelLoading) {
      return (
        <View style={styles.container}> 
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.title}>טוען רמה...</Text>
        </View>
      );
    }

    // Show error state
    if (levelError) {
      return (
        <View style={styles.container}> 
          <Text style={styles.title}>שגיאה</Text>
          <Text style={styles.subtitle}>{levelError}</Text>
          <Pressable style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>חזור</Text>
          </Pressable>
        </View>
      );
    }

    // Show empty state
    if (!levelQueue || !levelItem) {
      return (
        <View style={styles.container}> 
          <Text style={styles.title}>אין פריטים לשלב זה</Text>
          <Pressable style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>חזור</Text>
          </Pressable>
        </View>
      );
    }

    const level = levels[params.levelId!];
    const currentIndex = levelQueue.currentIndex;

    return (
      <View style={styles.container}> 
        <View style={styles.header}>
          <Text style={styles.progressText}>שאלה {currentIndex + 1} מתוך {total}</Text>
          <Text style={styles.topicText}>{level?.titleHe}</Text>
        </View>
        
        <QuizCard
          key={`${levelItem.id}-${currentIndex}`}
          item={{
            id: levelItem.id,
            topic: level?.topic || 'numbers',
            level: 'A1',
            hebrew: levelItem.promptHe || '',
            english: levelItem.answer,
            example: levelItem.promptEn || levelItem.answer,
          }}
          distractors={distractors}
          onAnswer={handleAnswer}
        />
      </View>
    );
  }

  if (!vocabItem || !sessionQueue) {
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
        <Text style={styles.topicText}>{vocabItem.topic}</Text>
      </View>
      
      <QuizCard
        key={`${vocabItem.id}-${current}`}
        item={vocabItem}
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


