import { describe, it, expect } from 'vitest';
import { LEVELS, WEIGHTS, pickWeighted, balanceToMultipleOfTen, createBoard } from '../js/board.js';

const sum = (a) => a.reduce((x, y) => x + y, 0);

describe('LEVELS', () => {
  it('네 단계의 격자 크기가 스펙과 같다', () => {
    expect([LEVELS.easy.cols, LEVELS.easy.rows]).toEqual([8, 6]);
    expect([LEVELS.normal.cols, LEVELS.normal.rows]).toEqual([12, 8]);
    expect([LEVELS.hard.cols, LEVELS.hard.rows]).toEqual([17, 10]);
    expect([LEVELS.expert.cols, LEVELS.expert.rows]).toEqual([20, 12]);
  });

  it('상·최상만 가로 전용이다', () => {
    expect(LEVELS.easy.landscapeOnly).toBe(false);
    expect(LEVELS.normal.landscapeOnly).toBe(false);
    expect(LEVELS.hard.landscapeOnly).toBe(true);
    expect(LEVELS.expert.landscapeOnly).toBe(true);
  });

  it('하만 총합 보정을 한다', () => {
    expect(LEVELS.easy.balance).toBe(true);
    expect(LEVELS.normal.balance).toBe(false);
    expect(LEVELS.hard.balance).toBe(false);
    expect(LEVELS.expert.balance).toBe(false);
  });
});

describe('WEIGHTS', () => {
  const expected = { easy: 5.0, normal: 4.51, hard: 4.03, expert: 3.17 };

  for (const [level, avg] of Object.entries(expected)) {
    it(`${level}의 가중 평균이 ${avg}이다`, () => {
      const w = WEIGHTS[level];
      expect(w).toHaveLength(9);
      const total = sum(w);
      const mean = w.reduce((acc, weight, i) => acc + weight * (i + 1), 0) / total;
      expect(mean).toBeCloseTo(avg, 2);
    });
  }
});

describe('pickWeighted', () => {
  it('가중치가 한 곳에 몰리면 항상 그 숫자가 나온다', () => {
    const w = [0, 0, 0, 0, 100, 0, 0, 0, 0]; // 숫자 5만
    expect(pickWeighted(w, () => 0.0)).toBe(5);
    expect(pickWeighted(w, () => 0.5)).toBe(5);
    expect(pickWeighted(w, () => 0.999)).toBe(5);
  });

  it('경계에서 올바른 숫자를 고른다', () => {
    const w = [50, 50, 0, 0, 0, 0, 0, 0, 0]; // 1이 절반, 2가 절반
    expect(pickWeighted(w, () => 0.0)).toBe(1);
    expect(pickWeighted(w, () => 0.49)).toBe(1);
    expect(pickWeighted(w, () => 0.51)).toBe(2);
  });

  it('언제나 1~9를 반환한다', () => {
    for (let i = 0; i < 500; i++) {
      const v = pickWeighted(WEIGHTS.expert, Math.random);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(9);
    }
  });
});

describe('balanceToMultipleOfTen', () => {
  it('이미 10의 배수면 그대로 둔다', () => {
    const g = [5, 5];
    expect(balanceToMultipleOfTen(g, Math.random)).toBe(true);
    expect(g).toEqual([5, 5]);
  });

  it('나머지를 없애 10의 배수로 만든다', () => {
    const g = [5, 5, 3]; // 합 13
    expect(balanceToMultipleOfTen(g, Math.random)).toBe(true);
    expect(sum(g) % 10).toBe(0);
  });

  it('보정 후에도 값이 1~9를 벗어나지 않는다', () => {
    for (let t = 0; t < 200; t++) {
      const g = Array.from({ length: 48 }, () => 1 + Math.floor(Math.random() * 9));
      balanceToMultipleOfTen(g, Math.random);
      for (const v of g) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(9);
      }
    }
  });
});

describe('createBoard', () => {
  it('난이도별 칸 수가 맞는다', () => {
    expect(createBoard('easy').grid).toHaveLength(48);
    expect(createBoard('normal').grid).toHaveLength(96);
    expect(createBoard('hard').grid).toHaveLength(170);
    expect(createBoard('expert').grid).toHaveLength(240);
  });

  it('모든 칸이 1~9다', () => {
    for (const level of ['easy', 'normal', 'hard', 'expert']) {
      for (const v of createBoard(level).grid) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(9);
      }
    }
  });

  it('easy는 전체 합이 항상 10의 배수다', () => {
    for (let i = 0; i < 100; i++) {
      expect(sum(createBoard('easy').grid) % 10).toBe(0);
    }
  });

  it('easy 외에는 보정하지 않는다', () => {
    const remainders = new Set();
    for (let i = 0; i < 60; i++) {
      remainders.add(sum(createBoard('hard').grid) % 10);
    }
    expect(remainders.size).toBeGreaterThan(1);
  });

  it('부를 때마다 다른 판이 나온다', () => {
    const a = createBoard('hard').grid.join(',');
    const b = createBoard('hard').grid.join(',');
    expect(a).not.toBe(b);
  });

  it('실제 표본 평균이 가중 평균에 가깝다', () => {
    const g = createBoard('expert').grid; // 240칸
    expect(sum(g) / g.length).toBeCloseTo(3.17, 0);
  });
});
