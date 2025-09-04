import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Speech from 'expo-speech';
import type { VocabItem } from '../features/vocab/types';

function normalizeMath(text: string): string {
  return text
    .replace(/\+/g, ' plus ')
    .replace(/-/g, ' minus ')
    .replace(/[=]/g, ' equals ')
    .replace(/\s+/g, ' ')
    .trim();
}



function isHebrewText(s: string): boolean {
  return /[\u0590-\u05FF]/.test(s);
}

function speakOnce(text: string): void {
  if (!text) return;
  Speech.stop();
  Speech.speak(text, { language: isHebrewText(text) ? 'he-IL' : 'en-US', rate: 1.0, pitch: 1.0 });
}

// Derive what to speak on the play button:
function getPlayText(item: VocabItem, levelType: 'flashcards' | 'math'): string {
  if (levelType === 'math') {
    const raw = (item.hebrew ?? (item as any).promptEn ?? (item as any).question ?? '').trim();
    return normalizeMath(raw);
  }
  // flashcards: pronounce the ENGLISH answer
  const ans = (item.english ?? (item as any).answer ?? '').toString().trim();
  return ans;
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};



const NUM_POOL = ['zero','one','two','three','four','five','six','seven','eight','nine','ten'];

function fixOptions(options: string[] | undefined, answer: string, levelType: 'flashcards' | 'math'): string[] {
  const pool = levelType === 'math' ? NUM_POOL : [];
  let out = Array.from(new Set((options ?? []).filter(Boolean)));
  if (!out.includes(answer)) out.unshift(answer);
  while (out.filter(x => x === answer).length > 1) out.splice(out.lastIndexOf(answer), 1);
  // backfill for math to 4 options
  if (levelType === 'math') {
    for (const cand of shuffle(pool.filter(w => w !== answer))) {
      if (out.length >= 4) break;
      if (!out.includes(cand)) out.push(cand);
    }
    out = out.slice(0, 4);
  }
  return shuffle(out);
}

type Props = {
  item: VocabItem & {
    options?: string[];
    ttsPrompt?: string;
    ttsOnCorrect?: string;
  };
  levelType: 'flashcards' | 'math';
  onAnswer: ({ isCorrect, latencyMs }: { isCorrect: boolean; latencyMs: number }) => void;
};

const QuizCard: React.FC<Props> = ({ item, levelType, onAnswer }) => {
  const startRef = useRef<number>(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const lastSpeakTime = useRef<number>(0);

  // Reset disabled state on remount (when item changes)
  useEffect(() => {
    setDisabled(false);
    setSelected(null);
    startRef.current = Date.now();
  }, [item.hebrew]);

  const options = useMemo(() => {
    // Use the pre-built options from the item
    const itemOptions = item.options || [];
    
    // Ensure we have exactly 4 options
    if (itemOptions.length === 4) {
      return itemOptions;
    }
    
    // Fallback: build options using the choice builder
    const safeOptions = fixOptions(itemOptions, item.english as string, levelType);
    
    // Dev assertion for MCQ integrity
    if (__DEV__) {
      const c = safeOptions.filter(x => x === item.english).length;
      if (safeOptions.length !== 4 || c !== 1) {
        console.warn('MCQ integrity (render) failed', { id: item.id, answer: item.english, safeOptions });
      }
    }
    
    return safeOptions;
  }, [item, levelType]);

  const onSpeakPress = () => {
    const now = Date.now();
    // Debounce rapid presses (ignore within 400ms)
    if (now - lastSpeakTime.current < 400) return;
    
    lastSpeakTime.current = now;
    // Use ttsPrompt if available, otherwise fall back to the old logic
    const t = item.ttsPrompt || getPlayText(item, levelType);
    console.log('TTS play:', levelType, t);
    speakOnce(t);
  };

  const handleSelect = (opt: string) => {
    if (disabled) return;
    
    setDisabled(true);
    setSelected(opt);
    
    const latencyMs = Date.now() - startRef.current;
    const isCorrect = opt === item.english;
    
    // Call onAnswer immediately
    onAnswer({ isCorrect, latencyMs });
    
    // Speak correct answer after a short delay for natural feel
    if (isCorrect) {
      const ansText = item.ttsOnCorrect || (item.english ?? opt ?? '').toString().trim();
      setTimeout(() => speakOnce(ansText), 150);
    }
  };

  const prompt =
    item.hebrew?.trim?.() ||
    item.example?.trim?.() ||
    (item as any).promptEn?.trim?.() ||
    (item as any).promptHe?.trim?.() ||
    (item as any).question?.trim?.() ||
    '';
  
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{prompt}</Text>
      <Pressable style={styles.ttsBtn} onPress={onSpeakPress} accessibilityRole="button">
        <Text style={styles.ttsText}>השמעה</Text>
      </Pressable>
      <View style={styles.options}>
        {options.map((opt, idx) => {
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
              key={`${item.id}-opt-${idx}`} 
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


