import { describe, it, expect } from 'vitest';
import { computeFittedCell } from '../js/render.js';

describe('computeFittedCell — 좁은 화면 넘침 방지', () => {
  it('expert 20x12, 가용 643x307 → MIN_CELL(26) 하한을 넘치는 경우 18px 바닥까지 낮춰 25로 맞춘다', () => {
    const cell = computeFittedCell(643, 307, 20, 12);
    expect(cell).toBe(25);
    expect(cell * 20).toBeLessThanOrEqual(643);
    expect(cell * 12).toBeLessThanOrEqual(307);
  });

  it('easy 8x6, 가용 800x600 → 넘치지 않으므로 하한 26 이상(64)을 그대로 유지한다', () => {
    const cell = computeFittedCell(800, 600, 8, 6);
    expect(cell).toBe(64);
    expect(cell).toBeGreaterThanOrEqual(26);
  });

  it('넓은 화면 8x6, 가용 4000x3000 → 상한 64를 넘지 않는다', () => {
    expect(computeFittedCell(4000, 3000, 8, 6)).toBe(64);
  });

  it('경계가 딱 맞는 경우 → 재계산이 일어나지 않는다 (넘치지 않으므로 원래 값 그대로)', () => {
    // 10x6, cell=30이면 cell*cols=300=availW, cell*rows=180<=availH(200) → 넘치지 않음
    const cell = computeFittedCell(300, 200, 10, 6);
    expect(cell).toBe(30);
  });

  it('아주 좁은 화면 20x12, 가용 200x150 → 18px 바닥에서 멈춘다', () => {
    const cell = computeFittedCell(200, 150, 20, 12);
    expect(cell).toBe(18);
    expect(cell).toBeGreaterThanOrEqual(18);
  });
});
