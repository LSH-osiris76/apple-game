// 판 생성 — 띠 타일링
//
// 격자를 높이 h(2~4)인 띠로 위에서부터 나눈다. 각 띠를 다시 폭 w(1~4)
// 구간으로 왼쪽부터 나눈다. 구간(h행×w열, h*w칸)은 세 가지 방식 중
// 하나로 채운다.
//   - cols  : h×1 세로 타일 w개. 타일마다 h칸이 독립적으로 합 10
//   - rows  : 1×w 가로 타일 h개. 타일마다 w칸이 독립적으로 합 10 (w≥2)
//   - whole : h×w 타일 1개. h*w칸 전체가 합 10 (4 ≤ h*w ≤ 8일 때만)
// 셋 다 구간을 빈틈·겹침 없이 덮으므로, 어떤 방식을 섞어도 판이 전부
// 비는 것이 수학적으로 보장된다.
//
// w=1이면 rows가 불가능하다(한 칸으로 합 10을 못 만든다) → cols로 간다.
// h*w > 8이면 whole이 불가능하다(아홉 칸 이상 한 덩어리는 나머지 여덟
// 칸이 대부분 1이 되어 오히려 쉬워진다) → cols·rows 중에서 다시 고른다.
//
// 띠 높이를 뽑을 때 남은 줄 수가 정확히 1로 떨어지면 안 된다 — 한
// 줄짜리 띠는 채울 수 없다. pickBandHeight가 이를 후보에서 제외한다.
//
// 모양을 cols 하나로만 채우면(과거 방식, 항상 h=2) 세로로 붙은 두 칸이
// 거의 항상 합 10이 되어 패턴이 너무 쉽게 읽힌다. MODE_DIST·HEIGHT_DIST로
// 모양과 묶음 크기를 섞어 이 규칙성을 깬다.
//
// 상·최상은 tilingRate(0.8) 확률로만 타일링을 쓰고, 나머지는 기존
// 가중치 랜덤(randomBoard)으로 만든다 — 완전 제거를 보장하지 않는다.

export const LEVELS = {
  easy:   { label: '하',   cols:  8, rows:  6, tilingRate: 1.0, difficulty:  20 },
  normal: { label: '중',   cols: 12, rows:  8, tilingRate: 1.0, difficulty:  50 },
  hard:   { label: '상',   cols: 12, rows: 16, tilingRate: 0.8, difficulty:  80 },
  expert: { label: '최상', cols: 12, rows: 20, tilingRate: 0.8, difficulty: 100 },
};

// 띠 높이 h의 가중치. 인덱스 0이 h=2.
export const HEIGHT_DIST = {
  easy:   [55, 35, 10],
  normal: [45, 35, 20],
  hard:   [40, 35, 25],
  expert: [35, 35, 30],
};

// 구간 폭 w의 가중치. 인덱스 0이 w=1.
export const WIDTH_DIST = {
  easy:   [15, 45, 30, 10],
  normal: [10, 40, 35, 15],
  hard:   [ 8, 32, 38, 22],
  expert: [ 5, 25, 40, 30],
};

// 구간을 나누는 방식의 가중치. [cols, rows, whole]
// w=1이면 이 분포를 쓰지 않고 항상 cols로 간다.
// h*w > 8이면 whole을 뺀 [cols, rows] 두 값만으로 다시 고른다.
export const MODE_DIST = {
  easy:   [40, 40, 20],
  normal: [32, 34, 34],
  hard:   [22, 30, 48],
  expert: [15, 25, 60],
};

const MODE_NAMES = ['cols', 'rows', 'whole'];
const BAND_HEIGHTS = [2, 3, 4];

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

// k칸에 1~9 값을 합이 정확히 10이 되게 나눈다. k는 2 이상 8 이하다.
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

// 남은 줄 수(remaining)에서 다음 띠 높이를 하나 고른다.
// 「남은 줄 - h」가 0이거나 2 이상인 h만 후보로 둔다 — 1로 떨어지면
// 그 한 줄은 어떤 방식으로도 채울 수 없기 때문이다.
function pickBandHeight(remaining, heightDist, rnd) {
  const candidates = [];
  const weights = [];
  for (const h of BAND_HEIGHTS) {
    if (h > remaining) continue;
    const rest = remaining - h;
    if (rest === 1) continue;
    candidates.push(h);
    weights.push(heightDist[h - 2]);
  }
  const idx = pickWeighted(weights, rnd);
  return candidates[idx - 1];
}

// rows줄을 h=2~4 띠로 나눈 높이 배열을 돌려준다. 합은 항상 rows와 같다.
// tileBoard와 별도로 export하는 이유는 분할 로직만 단독으로 검증하기
// 위해서다(나머지 1 미발생 등).
export function bandHeights(rows, heightDist, rnd = Math.random) {
  const heights = [];
  let remaining = rows;
  while (remaining > 0) {
    const h = pickBandHeight(remaining, heightDist, rnd);
    heights.push(h);
    remaining -= h;
  }
  return heights;
}

// 구간(h행×w열)을 채울 방식을 고른다.
// w=1 → cols 고정. h*w>8 → whole을 뺀 [cols, rows]에서 고른다.
function chooseMode(h, w, modeDist, rnd) {
  if (w === 1) return 'cols';
  const allowWhole = h * w <= 8;
  const weights = allowWhole ? modeDist : modeDist.slice(0, 2);
  const idx = pickWeighted(weights, rnd);
  return MODE_NAMES[idx - 1];
}

// 구간 하나(r0..r0+h-1, c..c+w-1)를 mode 방식으로 채우고, 만들어진
// 타일을 tiles에 추가한다.
function fillSegment(grid, tiles, cols, r0, c, h, w, mode, rnd) {
  if (mode === 'cols') {
    for (let cc = c; cc < c + w; cc++) {
      const values = splitTen(h, rnd);
      for (let i = 0; i < h; i++) grid[(r0 + i) * cols + cc] = values[i];
      tiles.push({ c1: cc, r1: r0, c2: cc, r2: r0 + h - 1, mode });
    }
  } else if (mode === 'rows') {
    for (let i = 0; i < h; i++) {
      const values = splitTen(w, rnd);
      const r = r0 + i;
      for (let j = 0; j < w; j++) grid[r * cols + (c + j)] = values[j];
      tiles.push({ c1: c, r1: r, c2: c + w - 1, r2: r, mode });
    }
  } else {
    const values = splitTen(h * w, rnd);
    let vi = 0;
    for (let r = r0; r < r0 + h; r++) {
      for (let cc = c; cc < c + w; cc++) {
        grid[r * cols + cc] = values[vi++];
      }
    }
    tiles.push({ c1: c, r1: r0, c2: c + w - 1, r2: r0 + h - 1, mode });
  }
}

// 띠 타일링으로 판을 만든다. 항상 성공하며 재시도가 필요 없다.
export function tileBoard(level, rnd = Math.random) {
  const cfg = LEVELS[level];
  if (!cfg) throw new Error(`알 수 없는 난이도: ${level}`);

  const { cols, rows } = cfg;
  // 임시 검증용 레벨(테스트)은 WIDTH_DIST만 등록하고 HEIGHT_DIST·MODE_DIST는
  // 등록하지 않을 수 있어 상 난이도 분포로 대체한다.
  const widthDist = WIDTH_DIST[level] || WIDTH_DIST.hard;
  const heightDist = HEIGHT_DIST[level] || HEIGHT_DIST.hard;
  const modeDist = MODE_DIST[level] || MODE_DIST.hard;
  const grid = new Array(cols * rows);
  const tiles = [];

  let r0 = 0;
  for (const h of bandHeights(rows, heightDist, rnd)) {
    let c = 0;
    while (c < cols) {
      const maxW = Math.min(4, cols - c);
      let w = pickWeighted(widthDist, rnd); // 1~4
      if (w > maxW) w = maxW;

      const mode = chooseMode(h, w, modeDist, rnd);
      fillSegment(grid, tiles, cols, r0, c, h, w, mode, rnd);
      c += w;
    }
    r0 += h;
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
