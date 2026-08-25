import { describe, it, expect } from 'vitest';
import { MIN_CELL, MAX_CELL, computeCellSize, normalizeRect, pointToCell } from '../js/layout.js';

describe('computeCellSize', () => {
  it('넓은 화면에서는 상한을 넘지 않는다', () => {
    expect(computeCellSize(4000, 3000, 8, 6)).toBe(MAX_CELL);
  });

  it('좁은 화면에서는 하한 아래로 내려가지 않는다', () => {
    expect(computeCellSize(200, 200, 20, 12)).toBe(MIN_CELL);
  });

  it('가로가 좁으면 가로를 기준으로 맞춘다', () => {
    // 800px에 20열 → 40px. 세로는 여유
    expect(computeCellSize(800, 2000, 20, 12)).toBe(40);
  });

  it('세로가 좁으면 세로를 기준으로 맞춘다', () => {
    // 360px에 12행 → 30px. 가로는 여유
    expect(computeCellSize(2000, 360, 20, 12)).toBe(30);
  });

  it('정수를 반환한다', () => {
    expect(Number.isInteger(computeCellSize(777, 555, 17, 10))).toBe(true);
  });
});

describe('normalizeRect', () => {
  it('좌상단에서 우하단으로 끈 경우', () => {
    expect(normalizeRect({ c: 1, r: 2 }, { c: 4, r: 5 }))
      .toEqual({ c1: 1, r1: 2, c2: 4, r2: 5 });
  });

  it('우하단에서 좌상단으로 끈 경우도 같은 결과', () => {
    expect(normalizeRect({ c: 4, r: 5 }, { c: 1, r: 2 }))
      .toEqual({ c1: 1, r1: 2, c2: 4, r2: 5 });
  });

  it('우상단에서 좌하단으로 끈 경우', () => {
    expect(normalizeRect({ c: 4, r: 2 }, { c: 1, r: 5 }))
      .toEqual({ c1: 1, r1: 2, c2: 4, r2: 5 });
  });

  it('한 칸만 누른 경우', () => {
    expect(normalizeRect({ c: 3, r: 3 }, { c: 3, r: 3 }))
      .toEqual({ c1: 3, r1: 3, c2: 3, r2: 3 });
  });
});

describe('pointToCell', () => {
  const origin = { left: 100, top: 50, cell: 40 };

  it('격자 안의 점을 칸으로 바꾼다', () => {
    expect(pointToCell(100, 50, origin, 10, 5)).toEqual({ c: 0, r: 0 });
    expect(pointToCell(139, 89, origin, 10, 5)).toEqual({ c: 0, r: 0 });
    expect(pointToCell(140, 90, origin, 10, 5)).toEqual({ c: 1, r: 1 });
  });

  it('왼쪽·위로 벗어나면 0으로 자른다', () => {
    expect(pointToCell(-500, -500, origin, 10, 5)).toEqual({ c: 0, r: 0 });
  });

  it('오른쪽·아래로 벗어나면 마지막 칸으로 자른다', () => {
    expect(pointToCell(9999, 9999, origin, 10, 5)).toEqual({ c: 9, r: 4 });
  });
});
