import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import type { Topic } from '../features/vocab/types';
import { useSessionStore } from '../store/useSessionStore';
import { isAdvancedTopic } from '../features/vocab/topics';
import { seedDevProgress } from '../dev/reset';

type Props = NativeStackScreenProps<RootStackParamList, 'Topics'>;

const TOPICS: { id: Topic; title: string }[] = [
  { id: 'numbers', title: 'מספרים' },
  { id: 'colors', title: 'צבעים' },
  { id: 'weekdays', title: 'ימי השבוע' },
  { id: 'seasons', title: 'עונות השנה' },
  { id: 'verbs', title: 'פעלים' },
  { id: 'phrases', title: 'ביטויים' },
];

const TopicsScreen: React.FC<Props> = ({ navigation }) => {
  const progress = useSessionStore((s) => s.progress);
  
  const renderTopicItem = ({ item }: { item: { id: Topic; title: string } }) => {
    const mastery = progress.topicMastery[item.id];
    
    // New locking logic: only advanced topics can be locked
    const isLocked = isAdvancedTopic(item.id) && (progress.level < 2 || mastery < 80);
    
    return (
      <Pressable
        style={[styles.row, isLocked && styles.lockedRow]}
        onPress={() => !isLocked && navigation.navigate('LevelSelect', { topic: item.id })}
        accessibilityRole="button"
        disabled={isLocked}
      >
        <View style={styles.rowContent}>
          <Text style={[styles.rowTitle, isLocked && styles.lockedText]}>
            {item.title}
          </Text>
          <View style={styles.masteryContainer}>
            <Text style={styles.masteryText}>שליטה: {mastery}%</Text>
            {isLocked && <Text style={styles.lockedLabel}>נעול</Text>}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>שלום, זה עובד</Text>
      <FlatList
        data={TOPICS}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.listContainer}
        renderItem={renderTopicItem}
      />
      <Pressable style={styles.progressBtn} onPress={() => navigation.navigate('Progress')}>
        <Text style={styles.progressText}>התקדמות</Text>
      </Pressable>
      
      {/* Dev button for seeding progress */}
      {__DEV__ && (
        <Pressable 
          style={styles.devButton} 
          onLongPress={async () => { 
            try {
              await seedDevProgress(); 
              Alert.alert('Seeded', 'Dev progress seeded successfully');
            } catch {
              Alert.alert('Error', 'Failed to seed progress');
            }
          }}
        >
          <Text style={styles.devButtonText}>dev</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: '700', textAlign: 'right', marginTop: 16, marginRight: 16 },
  listContainer: { padding: 16, gap: 12 },
  row: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  lockedRow: {
    backgroundColor: '#e5e7eb',
    opacity: 0.6,
  },
  rowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: { fontSize: 18, textAlign: 'right', fontWeight: '600' },
  lockedText: {
    color: '#9ca3af',
  },
  masteryContainer: {
    alignItems: 'flex-end',
  },
  masteryText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'right',
  },
  lockedLabel: {
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'right',
    marginTop: 2,
  },
  devButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
  },
  devButtonText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.3)',
  },
  progressBtn: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: '#0a84ff',
    paddingVertical: 14,
    borderRadius: 12,
  },
  progressText: { color: '#fff', fontSize: 18, textAlign: 'center', fontWeight: '600' },
});

export default TopicsScreen;


