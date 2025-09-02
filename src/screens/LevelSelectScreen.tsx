import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import type { Topic } from '../features/vocab/types';
import { useSessionStore } from '../store/useSessionStore';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

const LevelSelectScreen: React.FC<Props> = ({ navigation, route }) => {
  const { topic } = route.params;
  const getLevelsForTopic = useSessionStore((s) => s.getLevelsForTopic);
  const isLevelUnlocked = useSessionStore((s) => s.isLevelUnlocked);
  const levelProgress = useSessionStore((s) => s.levelProgress);
  
  const levels = getLevelsForTopic(topic);
  
  const renderLevelItem = ({ item }: { item: any }) => {
    const progress = levelProgress[item.id];
    const isUnlocked = isLevelUnlocked(item.id);
    const isCompleted = progress?.completed === true;
    
    let statusText = 'פתוח';
    let statusColor = '#10b981';
    
    if (isCompleted) {
      statusText = 'הושלם';
      statusColor = '#3b82f6';
    } else if (!isUnlocked) {
      statusText = 'נעול';
      statusColor = '#ef4444';
    }
    
    return (
      <Pressable
        style={[styles.levelRow, !isUnlocked && styles.lockedRow]}
        onPress={() => isUnlocked && navigation.navigate('Quiz', { levelId: item.id })}
        accessibilityRole="button"
        disabled={!isUnlocked}
      >
        <View style={styles.levelContent}>
          <View style={styles.levelHeader}>
            <Text style={[styles.levelTitle, !isUnlocked && styles.lockedText]}>
              {item.titleHe}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          </View>
          
          {item.descriptionHe && (
            <Text style={[styles.levelDescription, !isUnlocked && styles.lockedText]}>
              {item.descriptionHe}
            </Text>
          )}
          
          {progress && progress.attempts > 0 && (
            <Text style={styles.progressText}>
              דיוק: {progress.accuracy}% ({progress.attempts} ניסיונות)
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>רמות למידה - {getTopicName(topic)}</Text>
      
      <FlatList
        data={levels}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={renderLevelItem}
      />
    </View>
  );
};

const getTopicName = (topic: Topic): string => {
  const names: Record<Topic, string> = {
    numbers: 'מספרים',
    colors: 'צבעים',
    weekdays: 'ימי השבוע',
    seasons: 'עונות השנה',
    verbs: 'פעלים',
    phrases: 'ביטויים',
  };
  return names[topic];
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    textAlign: 'right', 
    marginTop: 16, 
    marginRight: 16,
    marginBottom: 16,
  },
  listContainer: { padding: 16, gap: 12 },
  levelRow: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  lockedRow: {
    backgroundColor: '#f1f5f9',
    opacity: 0.6,
  },
  levelContent: {
    gap: 8,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  lockedText: {
    color: '#9ca3af',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  levelDescription: {
    fontSize: 14,
    textAlign: 'right',
    color: '#6b7280',
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
    color: '#9ca3af',
  },
});

export default LevelSelectScreen;
