import { describe, it, expect } from 'vitest';
import { computeFittedCell } from '../js/render.js';

describe('computeFittedCell — 좁은 화면 넘침 방지', () => {
  it('가로로 넓은 판 20x12, 가용 643x307 → MIN_CELL(26) 하한을 넘치는 경우 18px 바닥까지 낮춰 25로 맞춘다', () => {
    const cell = computeFittedCell(643, 307, 20, 12);
    expect(cell).toBe(25);
    expect(cell * 20).toBeLessThanOrEqual(643);
    expect(cell * 12).toBeLessThanOrEqual(307);
  });

  it('세로로 긴 판 8x6, 가용 800x600 → 넘치지 않으므로 하한 26 이상(64)을 그대로 유지한다', () => {
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

  it('아주 좁은 화면 20x12, 가용 200x150 → 18px도 넘치므로 하한을 풀어 10으로 맞춘다', () => {
    // task-14: 18px 바닥이어도 넘치면(360>200) 더는 하한에 묶이지 않고
    // 가용 영역 안으로 낮춘다. 판이 잘려 눌리지 않는 열이 생기는 쪽이
    // 손가락으로 누르기 불편한 것보다 훨씬 나쁘기 때문이다.
    const cell = computeFittedCell(200, 150, 20, 12);
    expect(cell).toBe(10);
    expect(cell * 20).toBeLessThanOrEqual(200);
    expect(cell * 12).toBeLessThanOrEqual(150);
  });
});

describe('computeFittedCell — task-14: 넘칠 때 하한 완전 해제', () => {
  it('가로로 넓은 판 20x12, 가용 336x732 (갤럭시 S 세로) → 잘리지 않는다', () => {
    const cell = computeFittedCell(336, 732, 20, 12);
    expect(cell * 20).toBeLessThanOrEqual(336);
    expect(cell * 12).toBeLessThanOrEqual(732);
  });

  it('가로로 넓은 판 20x12, 가용 351x599 (아이폰 SE 세로) → 잘리지 않는다', () => {
    const cell = computeFittedCell(351, 599, 20, 12);
    expect(cell * 20).toBeLessThanOrEqual(351);
    expect(cell * 12).toBeLessThanOrEqual(599);
  });

  it('가로로 긴 판 17x10, 가용 296x500 (아주 좁은 폰) → 잘리지 않는다', () => {
    const cell = computeFittedCell(296, 500, 17, 10);
    expect(cell * 17).toBeLessThanOrEqual(296);
    expect(cell * 10).toBeLessThanOrEqual(500);
  });

  it('극단적으로 작은 가용 20x12, cols/rows 10x10 → 최소 1 이상이고 잘리지 않는다', () => {
    const cell = computeFittedCell(20, 12, 10, 10);
    expect(cell).toBeGreaterThanOrEqual(1);
    expect(cell * 10).toBeLessThanOrEqual(20);
    expect(cell * 10).toBeLessThanOrEqual(12);
  });
});

describe('computeFittedCell — 현재 배포된 격자', () => {
  it('상 난이도 12x16, 가용 336x732 (갤럭시 S 세로) → 잘리지 않는다', () => {
    const cell = computeFittedCell(336, 732, 12, 16);
    expect(cell * 12).toBeLessThanOrEqual(336);
    expect(cell * 16).toBeLessThanOrEqual(732);
  });

  it('최상 난이도 12x20, 가용 336x732 (갤럭시 S 세로) → 잘리지 않는다', () => {
    const cell = computeFittedCell(336, 732, 12, 20);
    expect(cell * 12).toBeLessThanOrEqual(336);
    expect(cell * 20).toBeLessThanOrEqual(732);
  });

  it('최상 난이도 12x20, 가용 296x500 (아주 좁은 폰) → 잘리지 않는다', () => {
    const cell = computeFittedCell(296, 500, 12, 20);
    expect(cell * 12).toBeLessThanOrEqual(296);
    expect(cell * 20).toBeLessThanOrEqual(500);
  });

  it('하 난이도 8x6, 가용 336x732 (갤럭시 S 세로) → 잘리지 않고 하한 26 이상', () => {
    const cell = computeFittedCell(336, 732, 8, 6);
    expect(cell * 8).toBeLessThanOrEqual(336);
    expect(cell * 6).toBeLessThanOrEqual(732);
    expect(cell).toBeGreaterThanOrEqual(26);
  });
});
