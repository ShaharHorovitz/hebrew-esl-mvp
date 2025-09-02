import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Speech from 'expo-speech';
import type { VocabItem } from '../features/vocab/types';

type Props = {
  item: VocabItem;
  onAnswer: ({ isCorrect, latencyMs }: { isCorrect: boolean; latencyMs: number }) => void;
  distractors: string[];
};

const QuizCard: React.FC<Props> = ({ item, onAnswer, distractors }) => {
  const startRef = useRef<number>(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  // Reset disabled state on remount (when item changes)
  useEffect(() => {
    setDisabled(false);
    setSelected(null);
    startRef.current = Date.now();
  }, [item.hebrew]);

  const options = useMemo(() => {
    const opts = [item.english, ...distractors].slice(0, 4);
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }, [item.english, distractors]);

  const handleSpeak = () => {
    if (item.example) {
      Speech.speak(item.example, { language: 'en-US', rate: 0.95 });
    } else {
      Speech.speak(item.english, { language: 'en-US', rate: 0.95 });
    }
  };

  const handleSelect = (opt: string) => {
    if (disabled) return;
    
    setDisabled(true);
    setSelected(opt);
    
    const latencyMs = Date.now() - startRef.current;
    const isCorrect = opt === item.english;
    
    // Call onAnswer immediately
    onAnswer({ isCorrect, latencyMs });
    
    // Optionally speak the selected option (don't await)
    if (isCorrect) {
      Speech.speak(opt, { language: 'en-US', rate: 0.95 });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{item.hebrew}</Text>
      <Pressable style={styles.ttsBtn} onPress={handleSpeak} accessibilityRole="button">
        <Text style={styles.ttsText}>השמעה</Text>
      </Pressable>
      <View style={styles.options}>
        {options.map((opt) => {
          const isCorrect = opt === item.english;
          const isSelected = selected === opt;
          const bg = !selected
            ? '#f3f4f6'
            : isSelected
            ? isCorrect
              ? '#34d399'
              : '#fca5a5'
            : '#f3f4f6';
          return (
            <Pressable 
              key={opt} 
              style={[styles.option, { backgroundColor: bg }]} 
              onPress={() => handleSelect(opt)}
              disabled={disabled}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 16 },
  prompt: { fontSize: 28, textAlign: 'right', fontWeight: '700' },
  ttsBtn: { alignSelf: 'flex-start', backgroundColor: '#dbeafe', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  ttsText: { color: '#1d4ed8', fontSize: 14 },
  options: { gap: 12 },
  option: { paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12 },
  optionText: { fontSize: 18, textAlign: 'center', fontWeight: '600' },
});

export default QuizCard;


