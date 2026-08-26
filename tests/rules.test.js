import { describe, it, expect } from 'vitest';
import { TARGET, buildPrefix, rectSum, isValidRect, hasAnyMove, clearRect } from '../js/rules.js';

// 3열 2행
//  1 2 7
//  9 8 3
const GRID = [1, 2, 7, 9, 8, 3];
const COLS = 3, ROWS = 2;

describe('TARGET', () => {
  it('목표 합은 10이다', () => {
    expect(TARGET).toBe(10);
  });
});

describe('rectSum', () => {
  const p = buildPrefix(GRID, COLS, ROWS);

  it('한 칸의 합은 그 칸의 값이다', () => {
    expect(rectSum(p, COLS, 0, 0, 0, 0)).toBe(1);
    expect(rectSum(p, COLS, 2, 1, 2, 1)).toBe(3);
  });

  it('윗줄 전체는 10이다', () => {
    expect(rectSum(p, COLS, 0, 0, 2, 0)).toBe(10);
  });

  it('첫 열 세로 두 칸은 10이다', () => {
    expect(rectSum(p, COLS, 0, 0, 0, 1)).toBe(10);
  });

  it('2x2 왼쪽 블록은 20이다', () => {
    expect(rectSum(p, COLS, 0, 0, 1, 1)).toBe(20);
  });

  it('격자 전체는 30이다', () => {
    expect(rectSum(p, COLS, 0, 0, 2, 1)).toBe(30);
  });
});

describe('isValidRect', () => {
  const p = buildPrefix(GRID, COLS, ROWS);

  it('합이 10이면 참', () => {
    expect(isValidRect(p, COLS, 0, 0, 2, 0)).toBe(true);
  });

  it('합이 10이 아니면 거짓', () => {
    expect(isValidRect(p, COLS, 0, 0, 1, 1)).toBe(false);
  });
});

describe('clearRect', () => {
  it('사각형 안을 0으로 바꾸고 지운 개수를 반환한다', () => {
    const g = [...GRID];
    const n = clearRect(g, COLS, 0, 0, 2, 0);
    expect(n).toBe(3);
    expect(g).toEqual([0, 0, 0, 9, 8, 3]);
  });

  it('이미 빈 칸은 개수에 세지 않는다', () => {
    const g = [0, 0, 0, 9, 8, 3];
    const n = clearRect(g, COLS, 0, 0, 2, 1);
    expect(n).toBe(3);
    expect(g).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe('hasAnyMove', () => {
  it('세로 짝이 남아 있으면 참', () => {
    expect(hasAnyMove(GRID, COLS, ROWS)).toBe(true);
  });

  it('윗줄을 지우면 9 8 3만 남아 막힌다', () => {
    const g = [...GRID];
    clearRect(g, COLS, 0, 0, 2, 0);
    expect(hasAnyMove(g, COLS, ROWS)).toBe(false);
  });

  it('빈칸은 0으로 세므로 떨어진 두 사과도 묶인다', () => {
    // 3 0 0 7  →  전체를 감싸면 10
    const g = [3, 0, 0, 7];
    expect(hasAnyMove(g, 4, 1)).toBe(true);
  });

  it('전부 비면 거짓', () => {
    expect(hasAnyMove([0, 0, 0, 0, 0, 0], COLS, ROWS)).toBe(false);
  });
});

describe('성능', () => {
  it('240칸 판(20×12)에서 hasAnyMove가 50ms 안에 끝난다', () => {
    const cols = 20, rows = 12;
    const g = Array.from({ length: cols * rows }, (_, i) => (i % 9) + 1);
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) hasAnyMove(g, cols, rows);
    const per = (performance.now() - t0) / 20;
    expect(per).toBeLessThan(50);
  });
});
