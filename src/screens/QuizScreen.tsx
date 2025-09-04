import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';

import { useSessionStore } from '../store/useSessionStore';
import QuizCard from '../components/QuizCard';
import { getNextLevelItem } from '../features/adaptive/session';
import { getLevelDef, getDefaultLevel, type LevelType, type TopicId } from '../features/levels/registry';
import { getItemsByTopic } from '../features/vocab/repo';

const QuizScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const params = (route.params ?? {}) as RootStackParamList['Quiz'];
  const { topicId, levelId, levelType } = (params || {}) as Partial<{ topicId: TopicId; levelId: string; levelType: LevelType }>;
  
  // Resolve level definition with fallback
  let levelDef = levelId ? getLevelDef(topicId as TopicId, levelId) : undefined;
  if (!levelDef) {
    console.warn('Level not found; falling back to default', { topicId, levelId, levelType });
    levelDef = getDefaultLevel(topicId as TopicId);
  }
  
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

  
  // Local state for quiz progression
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const answering = useRef(false);
  
  // Level mode tracking
  const [levelCorrect, setLevelCorrect] = useState(0);
  const [levelTotal, setLevelTotal] = useState(0);
  const [latencySum, setLatencySum] = useState(0);

  useEffect(() => {
    // Load items if not already loaded
    if (items.length === 0) {
      loadItems();
    }
    
    // Start session based on level definition
    if (levelDef) {
      if (levelDef.type === 'flashcards') {
        // Build flashcards session using topic items
        const topicItems = getItemsByTopic(topicId as TopicId);
        if (topicItems.length > 0) {
          startSession(topicId as TopicId, 12);
        }
      } else if (levelDef.type === 'math') {
        // Math session - assert topicId === 'numbers'
        if (topicId === 'numbers') {
          startLevel(levelDef.id);
          // Reset level tracking
          setLevelCorrect(0);
          setLevelTotal(0);
          setLatencySum(0);
        } else {
          console.warn('Math level requested for non-numbers topic, falling back to flashcards');
          const topicItems = getItemsByTopic(topicId as TopicId);
          if (topicItems.length > 0) {
            startSession(topicId as TopicId, 12);
          }
        }
      }
    }
  }, [levelDef, topicId, items.length, loadItems, startLevel, startSession]);

  // Derive current question from session queue
  const isLevelMode = levelDef?.type === 'math';
  const total = isLevelMode 
    ? (levelQueue?.items.length || 0)
    : (sessionQueue?.items.length || 0);
  
  const levelItem = isLevelMode ? getNextLevelItem(levelQueue) : null;
  const vocabItem = !isLevelMode ? sessionQueue?.items[current]?.item : null;

  // Options are now built into the items, no need for separate distractors

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
      // Level mode: track results and award XP
      setLevelTotal(t => t + 1);
      if (isCorrect) setLevelCorrect(c => c + 1);
      setLatencySum(s => s + latencyMs);
      
      // Award XP for gamification
      if (levelDef) {
        awardXp({
          isCorrect,
          latencyMs,
          topic: topicId as TopicId,
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
      // Compute real accuracy from level tracking
      const acc = levelTotal ? Math.round((levelCorrect / levelTotal) * 100) : 0;
      markLevelResult(params.levelId, acc);
    }
    
    endSession();
    navigation.goBack();
  };

  // Show session summary when finished
  if (finished) {
    // Use real session results for level mode, fallback to store for topic mode
    const accuracy = isLevelMode 
      ? (levelTotal ? Math.round((levelCorrect / levelTotal) * 100) : 0)
      : sessionAccuracy();
    const avgLatency = isLevelMode 
      ? (levelTotal ? Math.round(latencySum / levelTotal) : 0)
      : sessionAverageLatency();
    
    return (
      <View style={styles.container}>
        <Text style={styles.title}>סשן הושלם</Text>
        <Text style={styles.subtitle}>כל הכבוד! הנה התוצאות שלך:</Text>
        
        <View style={styles.statsContainer}>
          <Text style={styles.stat}>דיוק: {accuracy}%</Text>
          <Text style={styles.stat}>זמן ממוצע: {avgLatency}ms</Text>
          <Text style={styles.stat}>שאלות: {isLevelMode ? levelTotal : total}/{total}</Text>
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

    // Guard against empty prompt
    const hasPrompt = levelItem.promptHe?.trim() || levelItem.promptEn?.trim() || (levelItem as any).question?.trim();
    if (!hasPrompt) {
      console.warn(`Item ${levelItem.id} has no prompt, skipping to next`);
      advance();
      return (
        <View style={styles.container}> 
          <Text style={styles.title}>טוען...</Text>
        </View>
      );
    }

    const currentIndex = levelQueue.currentIndex;

    return (
      <View style={styles.container}> 
        <View style={styles.header}>
          <Text style={styles.progressText}>שאלה {currentIndex + 1} מתוך {total}</Text>
          <Text style={styles.topicText}>{levelDef?.title}</Text>
        </View>
        
        <QuizCard
          key={`${levelItem.id}-${currentIndex}`}
          item={{
            id: levelItem.id,
            topic: topicId as TopicId,
            level: 'A1',
            hebrew: levelItem.promptHe || '',
            english: levelItem.answer,
            example: levelItem.promptEn || levelItem.answer,
            options: levelItem.options || [],
            ttsPrompt: levelItem.ttsPrompt,
            ttsOnCorrect: levelItem.ttsOnCorrect,
          }}
          levelType={levelDef?.type || 'flashcards'}
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
        item={{
          ...vocabItem,
          options: vocabItem.options || [],
          ttsPrompt: vocabItem.ttsPrompt,
          ttsOnCorrect: vocabItem.ttsOnCorrect,
        }}
        levelType={levelDef?.type || 'flashcards'}
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


