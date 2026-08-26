// 판 생성 — 띠 타일링
//
// 격자를 가로 2줄씩 띠로 나누고, 각 띠를 높이 2·폭 w(1~4)의 사각형으로
// 왼쪽부터 채운다. 사각형(타일) 안의 2w칸은 합이 정확히 10이 되도록 채운다.
// 타일이 격자를 빈틈·겹침 없이 덮고 서로 독립적이라, 어떤 순서로 지워도
// 판이 전부 비는 것이 수학적으로 보장된다.
//
// 상·최상은 tilingRate(0.8) 확률로만 타일링을 쓰고, 나머지는 기존
// 가중치 랜덤(randomBoard)으로 만든다 — 완전 제거를 보장하지 않는다.

export const LEVELS = {
  easy:   { label: '하',   cols:  8, rows:  6, landscapeOnly: false, tilingRate: 1.0, difficulty:  20 },
  normal: { label: '중',   cols: 12, rows:  8, landscapeOnly: false, tilingRate: 1.0, difficulty:  50 },
  hard:   { label: '상',   cols: 17, rows: 10, landscapeOnly: true,  tilingRate: 0.8, difficulty:  80 },
  expert: { label: '최상', cols: 20, rows: 12, landscapeOnly: true,  tilingRate: 0.8, difficulty: 100 },
};

// 타일 폭 w의 가중치. 인덱스 0이 w=1. 면적은 2w칸.
// w=1 → 2칸, w=2 → 4칸, w=3 → 6칸, w=4 → 8칸
export const WIDTH_DIST = {
  easy:   [90, 10,  0,  0],
  normal: [50, 40, 10,  0],
  hard:   [25, 45, 30,  0],
  expert: [10, 35, 40, 15],
};

// 상·최상의 랜덤 20% 경로에만 쓴다. 인덱스 0이 숫자 1.
export const WEIGHTS = {
  hard:   [16, 16, 15, 14, 12, 10, 7, 5, 5], // 평균 4.03
  expert: [24, 22, 18, 13,  9,  6, 4, 2, 2], // 평균 3.17
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

// k칸에 1~9 값을 합이 정확히 10이 되게 나눈다. k는 2·4·6·8 중 하나다.
export function splitTen(k, rnd) {
  const arr = new Array(k).fill(1);
  let rem = 10 - k;

  while (rem > 0) {
    const candidates = [];
    for (let i = 0; i < k; i++) {
      if (arr[i] < 9) candidates.push(i);
    }
    const idx = candidates[Math.floor(rnd() * candidates.length)];
    arr[idx] += 1;
    rem -= 1;
  }

  // Fisher-Yates 셔플
  for (let i = k - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }

  return arr;
}

// 띠 타일링으로 판을 만든다. 항상 성공하며 재시도가 필요 없다.
export function tileBoard(level, rnd = Math.random) {
  const cfg = LEVELS[level];
  if (!cfg) throw new Error(`알 수 없는 난이도: ${level}`);

  const { cols, rows } = cfg;
  const dist = WIDTH_DIST[level];
  const grid = new Array(cols * rows);
  const tiles = [];

  for (let r0 = 0; r0 < rows; r0 += 2) {
    let c = 0;
    while (c < cols) {
      const maxW = Math.min(4, cols - c);
      let w = pickWeighted(dist, rnd); // 1~4
      if (w > maxW) w = maxW;

      const values = splitTen(2 * w, rnd);
      let vi = 0;
      for (let r = r0; r < r0 + 2; r++) {
        for (let cc = c; cc < c + w; cc++) {
          grid[r * cols + cc] = values[vi++];
        }
      }

      tiles.push({ c1: c, r1: r0, c2: c + w - 1, r2: r0 + 1 });
      c += w;
    }
  }

  return { grid, tiles };
}

// 가중치 랜덤으로 판을 만든다. 상·최상 전용 — 완전 제거를 보장하지 않는다.
export function randomBoard(level, rnd = Math.random) {
  const cfg = LEVELS[level];
  if (!cfg) throw new Error(`알 수 없는 난이도: ${level}`);
  const weights = WEIGHTS[level];
  if (!weights) throw new Error(`randomBoard는 상·최상만 지원한다: ${level}`);

  const grid = new Array(cfg.cols * cfg.rows);
  for (let i = 0; i < grid.length; i++) grid[i] = pickWeighted(weights, rnd);
  return { grid };
}

export function createBoard(level, rnd = Math.random) {
  const cfg = LEVELS[level];
  if (!cfg) throw new Error(`알 수 없는 난이도: ${level}`);

  const common = {
    cols: cfg.cols,
    rows: cfg.rows,
    landscapeOnly: cfg.landscapeOnly,
    label: cfg.label,
    difficulty: cfg.difficulty,
  };

  if (rnd() < cfg.tilingRate) {
    const { grid, tiles } = tileBoard(level, rnd);
    return { ...common, grid, tiles, guaranteed: true };
  }

  const { grid } = randomBoard(level, rnd);
  return { ...common, grid, tiles: null, guaranteed: false };
}
