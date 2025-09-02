import { difficultyFrom, initialStatsFor, toGrade, updateSRS } from './srs';

describe('SRS logic', () => {
  test('difficultyFrom maps correctness and latency', () => {
    expect(difficultyFrom(true, 1000)).toBe('easy');
    expect(difficultyFrom(true, 4000)).toBe('medium');
    expect(difficultyFrom(true, 8000)).toBe('hard');
    expect(difficultyFrom(false, 1000)).toBe('hard');
  });

  test('toGrade respects difficulty', () => {
    expect(toGrade({ correct: true, difficulty: 'easy' })).toBe(5);
    expect(toGrade({ correct: true, difficulty: 'medium' })).toBe(4);
    expect(toGrade({ correct: true, difficulty: 'hard' })).toBe(3);
    expect(toGrade({ correct: false, difficulty: 'easy' })).toBe(2);
  });

  test('updateSRS increments reps and interval on correct answers', () => {
    const base = initialStatsFor('x');
    const res1 = updateSRS(base, { correct: true, latencyMs: 1200, difficulty: 'easy' });
    expect(res1.repetitions).toBe(1);
    expect(res1.intervalDays).toBeGreaterThanOrEqual(1);

    const res2 = updateSRS(res1, { correct: true, latencyMs: 2200, difficulty: 'easy' });
    expect(res2.repetitions).toBe(2);
    expect(res2.intervalDays).toBeGreaterThanOrEqual(3);
  });

  test('updateSRS resets reps on incorrect', () => {
    const base = initialStatsFor('y');
    const correct = updateSRS(base, { correct: true, latencyMs: 1200, difficulty: 'easy' });
    const wrong = updateSRS(correct, { correct: false, latencyMs: 9000, difficulty: 'hard' });
    expect(wrong.repetitions).toBe(0);
    expect(wrong.intervalDays).toBe(1);
  });
});
