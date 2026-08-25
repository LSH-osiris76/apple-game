export const MIN_CELL = 26;
export const MAX_CELL = 64;

// 주어진 표시 영역에 cols x rows 격자를 넣을 때의 한 칸 크기(px)
export function computeCellSize(viewW, viewH, cols, rows) {
  const byWidth = Math.floor(viewW / cols);
  const byHeight = Math.floor(viewH / rows);
  const fit = Math.min(byWidth, byHeight);
  return Math.max(MIN_CELL, Math.min(MAX_CELL, fit));
}

export function normalizeRect(a, b) {
  return {
    c1: Math.min(a.c, b.c),
    r1: Math.min(a.r, b.r),
    c2: Math.max(a.c, b.c),
    r2: Math.max(a.r, b.r),
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function pointToCell(x, y, origin, cols, rows) {
  const c = Math.floor((x - origin.left) / origin.cell);
  const r = Math.floor((y - origin.top) / origin.cell);
  return { c: clamp(c, 0, cols - 1), r: clamp(r, 0, rows - 1) };
}
