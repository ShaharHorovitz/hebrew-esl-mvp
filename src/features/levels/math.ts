import { buildChoices } from '../adaptive/choices';
import type { QuizItem } from '../adaptive/session';

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export const buildMathItems = (count: number = 10): QuizItem[] => {
  const items: QuizItem[] = [];
  
  for (let i = 0; i < count; i++) {
    // Pick a, b with 1 ≤ b < a ≤ 10
    const a = Math.floor(Math.random() * 10) + 1; // 1-10
    const b = Math.floor(Math.random() * a) + 1;  // 1 to a-1
    
    const aWord = NUM_WORDS[a];
    const bWord = NUM_WORDS[b];
    const result = a - b;
    const resultWord = NUM_WORDS[result];
    
    const promptEn = `${aWord} - ${bWord} =`;
    const correct = resultWord;
    
    // Build options using choice builder
    const options = buildChoices(correct, NUM_WORDS, 4);
    
    items.push({
      id: `math-${i}-${a}-${b}`,
      promptHe: '', // Math prompts are in English
      promptEn,
      answer: correct,
      options,
      ttsPrompt: promptEn, // Speak the full exercise
      ttsOnCorrect: correct, // Speak the correct answer
      topic: 'numbers',
      level: 'A1',
    });
  }
  
  return items;
};
