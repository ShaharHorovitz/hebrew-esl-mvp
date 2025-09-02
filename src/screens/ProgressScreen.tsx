import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useSessionStore } from '../store/useSessionStore';
import type { Topic } from '../features/vocab/types';
import { resetProgress, isDevMode } from '../dev/reset';

const TOPIC_NAMES: Record<Topic, string> = {
  numbers: 'מספרים',
  colors: 'צבעים',
  weekdays: 'ימי השבוע',
  seasons: 'עונות השנה',
  verbs: 'פעלים',
  phrases: 'ביטויים',
};

const ProgressScreen: React.FC = () => {
  const statsMap = useSessionStore((s) => s.statsMap);
  const progress = useSessionStore((s) => s.progress);
  const getNextLevelXp = useSessionStore((s) => s.getNextLevelXp);
  
  // Calculate overall statistics
  const stats = Object.values(statsMap);
  const totalAttempts = stats.reduce((sum, stat) => sum + stat.totalAttempts, 0);
  const totalCorrect = stats.reduce((sum, stat) => sum + stat.totalCorrect, 0);
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  
  const longestStreak = stats.reduce((max, stat) => Math.max(max, stat.longestStreak), 0);
  const averageLatency = stats.length > 0 
    ? Math.round(stats.reduce((sum, stat) => sum + stat.averageLatencyMs, 0) / stats.length)
    : 0;

  const nextLevelXp = getNextLevelXp();
  const xpProgress = (progress.xp / nextLevelXp) * 100;

  const handleResetProgress = () => {
    if (!isDevMode()) {
      Alert.alert('שגיאה', 'פונקציה זו זמינה רק במצב פיתוח');
      return;
    }

    Alert.alert(
      'איפוס התקדמות',
      'האם אתה בטוח שברצונך לאפס את כל ההתקדמות? פעולה זו לא ניתנת לביטול.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'איפוס',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetProgress();
              // Force reload the app state
              window.location?.reload?.();
            } catch {
              Alert.alert('שגיאה', 'נכשל באיפוס ההתקדמות');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>התקדמות</Text>
      
      {/* XP and Level Section */}
      <View style={styles.xpSection}>
        <View style={styles.levelContainer}>
          <Text style={styles.levelText}>רמה {progress.level}</Text>
          <Text style={styles.xpText}>{progress.xp} / {nextLevelXp} XP</Text>
        </View>
        <View style={styles.xpBarContainer}>
          <View style={styles.xpBarBackground}>
            <View style={[styles.xpBarFill, { width: `${xpProgress}%` }]} />
          </View>
        </View>
        <Text style={styles.streakText}>רצף נוכחי: {progress.streak}</Text>
      </View>

      {/* Overall Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>סטטיסטיקות כלליות</Text>
        <Text style={styles.stat}>דיוק כללי: {accuracy}%</Text>
        <Text style={styles.stat}>רצף ארוך ביותר: {longestStreak}</Text>
        <Text style={styles.stat}>זמן ממוצע: {averageLatency}ms</Text>
        <Text style={styles.stat}>פריטים שנלמדו: {stats.length}</Text>
      </View>

      {/* Topic Mastery */}
      <View style={styles.masterySection}>
        <Text style={styles.sectionTitle}>שליטה בנושאים</Text>
        {Object.entries(progress.topicMastery).map(([topic, mastery]) => (
          <View key={topic} style={styles.masteryRow}>
            <Text style={styles.masteryTopic}>{TOPIC_NAMES[topic as Topic]}</Text>
            <View style={styles.masteryBarContainer}>
              <View style={styles.masteryBarBackground}>
                <View style={[styles.masteryBarFill, { width: `${mastery}%` }]} />
              </View>
              <Text style={styles.masteryPercentage}>{mastery}%</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Dev Reset Button */}
      {isDevMode() && (
        <View style={styles.devSection}>
          <Pressable style={styles.resetButton} onPress={handleResetProgress}>
            <Text style={styles.resetButtonText}>איפוס (פיתוח)</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'right', marginBottom: 24 },
  
  // XP Section
  xpSection: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  levelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e40af',
  },
  xpText: {
    fontSize: 16,
    color: '#6b7280',
  },
  xpBarContainer: {
    marginBottom: 12,
  },
  xpBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  streakText: {
    fontSize: 16,
    textAlign: 'right',
    color: '#059669',
    fontWeight: '600',
  },
  
  // Stats Section
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 12,
    color: '#374151',
  },
  stat: { 
    fontSize: 16, 
    textAlign: 'right', 
    marginBottom: 8,
    color: '#6b7280',
  },
  
  // Mastery Section
  masterySection: {
    marginBottom: 24,
  },
  masteryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  masteryTopic: {
    fontSize: 16,
    textAlign: 'right',
    fontWeight: '500',
    flex: 1,
  },
  masteryBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    marginLeft: 12,
  },
  masteryBarBackground: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    flex: 1,
    overflow: 'hidden',
  },
  masteryBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  masteryPercentage: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    minWidth: 35,
    textAlign: 'left',
  },
  
  // Dev Section
  devSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  resetButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ProgressScreen;


