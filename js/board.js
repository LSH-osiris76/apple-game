// 인덱스 0이 숫자 1. 합계 100 기준.
export const WEIGHTS = {
  easy:   [ 8,  8, 10, 12, 24, 12, 10,  8,  8], // 평균 5.00
  normal: [12, 12, 14, 14, 14, 12,  8,  7,  7], // 평균 4.51
  hard:   [16, 16, 15, 14, 12, 10,  7,  5,  5], // 평균 4.03
  expert: [24, 22, 18, 13,  9,  6,  4,  2,  2], // 평균 3.17
};

export const LEVELS = {
  easy:   { label: '하',   cols:  8, rows:  6, landscapeOnly: false, balance: true  },
  normal: { label: '중',   cols: 12, rows:  8, landscapeOnly: false, balance: false },
  hard:   { label: '상',   cols: 17, rows: 10, landscapeOnly: true,  balance: false },
  expert: { label: '최상', cols: 20, rows: 12, landscapeOnly: true,  balance: false },
};

export function pickWeighted(weights, rnd) {
  let total = 0;
  for (const w of weights) total += w;
  let x = rnd() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i + 1;
  }
  return weights.length;
}

// 전체 합을 10의 배수로 맞춘다. 칸 하나를 골라 값을 조정하고, 1~9를 벗어나면 다른 칸을 고른다.
export function balanceToMultipleOfTen(grid, rnd, maxTries = 20) {
  for (let t = 0; t < maxTries; t++) {
    let total = 0;
    for (const v of grid) total += v;
    const r = total % 10;
    if (r === 0) return true;

    const i = Math.floor(rnd() * grid.length);
    const down = grid[i] - r;
    const up = grid[i] + (10 - r);
    if (down >= 1) grid[i] = down;
    else if (up <= 9) grid[i] = up;
    // 둘 다 범위를 벗어나면 이번 회차는 건너뛰고 다른 칸을 고른다
  }

  let total = 0;
  for (const v of grid) total += v;
  return total % 10 === 0;
}

export function createBoard(level, rnd = Math.random) {
  const cfg = LEVELS[level];
  if (!cfg) throw new Error(`알 수 없는 난이도: ${level}`);
  const w = WEIGHTS[level];

  for (let attempt = 0; attempt < 50; attempt++) {
    const grid = new Array(cfg.cols * cfg.rows);
    for (let i = 0; i < grid.length; i++) grid[i] = pickWeighted(w, rnd);

    if (!cfg.balance) return { grid, ...cfg };
    if (balanceToMultipleOfTen(grid, rnd)) return { grid, ...cfg };
  }
  throw new Error('판 생성에 실패했다');
}
