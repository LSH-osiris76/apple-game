import { describe, it, expect } from 'vitest';
import {
  LEVELS,
  WIDTH_DIST,
  HEIGHT_DIST,
  MODE_DIST,
  WEIGHTS,
  pickWeighted,
  splitTen,
  tileBoard,
  bandHeights,
  randomBoard,
  createBoard,
} from '../js/board.js';

const sum = (a) => a.reduce((x, y) => x + y, 0);
const LEVEL_KEYS = ['easy', 'normal', 'hard', 'expert'];

describe('LEVELS', () => {
  it('네 단계의 격자 크기가 스펙과 같다', () => {
    expect([LEVELS.easy.cols, LEVELS.easy.rows]).toEqual([8, 6]);
    expect([LEVELS.normal.cols, LEVELS.normal.rows]).toEqual([12, 8]);
    expect([LEVELS.hard.cols, LEVELS.hard.rows]).toEqual([12, 16]);
    expect([LEVELS.expert.cols, LEVELS.expert.rows]).toEqual([12, 20]);
  });

  it('네 단계 모두 세로가 짝수다 (띠 타일링의 전제)', () => {
    for (const level of LEVEL_KEYS) {
      expect(LEVELS[level].rows % 2).toBe(0);
    }
  });

  it('하·중은 tilingRate 1.0, 상·최상은 0.8이다', () => {
    expect(LEVELS.easy.tilingRate).toBe(1.0);
    expect(LEVELS.normal.tilingRate).toBe(1.0);
    expect(LEVELS.hard.tilingRate).toBe(0.8);
    expect(LEVELS.expert.tilingRate).toBe(0.8);
  });

  it('난이도 지수가 20·50·80·100이다', () => {
    expect(LEVELS.easy.difficulty).toBe(20);
    expect(LEVELS.normal.difficulty).toBe(50);
    expect(LEVELS.hard.difficulty).toBe(80);
    expect(LEVELS.expert.difficulty).toBe(100);
  });
});

describe('WIDTH_DIST', () => {
  it('네 세트 모두 길이 4이고(w=5 없음) 합이 100이다', () => {
    for (const level of LEVEL_KEYS) {
      const dist = WIDTH_DIST[level];
      expect(dist).toHaveLength(4);
      expect(sum(dist)).toBe(100);
    }
  });
});

describe('HEIGHT_DIST', () => {
  it('네 세트 모두 길이 3이고(h=2,3,4) 합이 100이다', () => {
    for (const level of LEVEL_KEYS) {
      const dist = HEIGHT_DIST[level];
      expect(dist).toHaveLength(3);
      expect(sum(dist)).toBe(100);
    }
  });
});

describe('MODE_DIST', () => {
  it('네 세트 모두 길이 3이고([cols, rows, whole]) 합이 100이다', () => {
    for (const level of LEVEL_KEYS) {
      const dist = MODE_DIST[level];
      expect(dist).toHaveLength(3);
      expect(sum(dist)).toBe(100);
    }
  });
});

describe('bandHeights — 띠 높이 분할', () => {
  it('실제 격자 세로(6·8·16·20) 어디서도 나머지 1을 남기지 않는다', () => {
    for (const rows of [6, 8, 16, 20]) {
      for (let t = 0; t < 200; t++) {
        const heights = bandHeights(rows, HEIGHT_DIST.hard, Math.random);
        expect(sum(heights)).toBe(rows);
        for (const h of heights) {
          expect([2, 3, 4]).toContain(h);
        }
      }
    }
  });
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

describe('splitTen', () => {
  for (const k of [2, 4, 6, 8]) {
    it(`k=${k}이면 길이 ${k}, 합 10, 값 1~9`, () => {
      for (let t = 0; t < 200; t++) {
        const arr = splitTen(k, Math.random);
        expect(arr).toHaveLength(k);
        expect(sum(arr)).toBe(10);
        for (const v of arr) {
          expect(v).toBeGreaterThanOrEqual(1);
          expect(v).toBeLessThanOrEqual(9);
        }
      }
    });
  }

  it('여러 번 호출하면 서로 다른 배열이 나온다', () => {
    const seen = new Set();
    for (let i = 0; i < 30; i++) {
      seen.add(splitTen(6, Math.random).join(','));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('타일 모양 다양화 — cols/rows/whole', () => {
  it('w=1 구간은 항상 cols로 처리된다 (MODE_DIST에서 cols 확률이 0이어도)', () => {
    // w=1을 강제하는 WIDTH_DIST와, cols 가중치를 0으로 둔 MODE_DIST를
    // 임시 등록한다. 그래도 w=1 구간은 MODE_DIST를 무시하고 cols로 가야
    // 한다 — 한 칸으로는 합 10을 만들 수 없기 때문이다.
    LEVELS.__forceW1Test__ = { label: 'w1테스트', cols: 8, rows: 6, tilingRate: 1.0, difficulty: 0 };
    WIDTH_DIST.__forceW1Test__ = [100, 0, 0, 0]; // 항상 w=1
    HEIGHT_DIST.__forceW1Test__ = HEIGHT_DIST.hard;
    MODE_DIST.__forceW1Test__ = [0, 50, 50]; // cols 가중치 0 — rows·whole만 원함

    try {
      for (let t = 0; t < 30; t++) {
        const { tiles } = tileBoard('__forceW1Test__', Math.random);
        for (const tile of tiles) {
          expect(tile.mode).toBe('cols');
          expect(tile.c2 - tile.c1 + 1).toBe(1);
        }
      }
    } finally {
      delete LEVELS.__forceW1Test__;
      delete WIDTH_DIST.__forceW1Test__;
      delete HEIGHT_DIST.__forceW1Test__;
      delete MODE_DIST.__forceW1Test__;
    }
  });

  it('h*w > 8인 구간에는 whole이 쓰이지 않는다', () => {
    for (const level of LEVEL_KEYS) {
      for (let t = 0; t < 30; t++) {
        const { tiles } = tileBoard(level, Math.random);
        for (const tile of tiles) {
          if (tile.mode !== 'whole') continue;
          const area = (tile.c2 - tile.c1 + 1) * (tile.r2 - tile.r1 + 1);
          expect(area).toBeLessThanOrEqual(8);
        }
      }
    }
  });

  it('cols로 만든 타일은 폭 1·높이 h(2~4)이고 합이 10이다', () => {
    for (const level of LEVEL_KEYS) {
      for (let t = 0; t < 30; t++) {
        const { grid, tiles } = tileBoard(level, Math.random);
        const { cols } = LEVELS[level];
        for (const tile of tiles) {
          if (tile.mode !== 'cols') continue;
          const w = tile.c2 - tile.c1 + 1;
          const h = tile.r2 - tile.r1 + 1;
          expect(w).toBe(1);
          expect(h).toBeGreaterThanOrEqual(2);
          expect(h).toBeLessThanOrEqual(4);

          let s = 0;
          for (let r = tile.r1; r <= tile.r2; r++) s += grid[r * cols + tile.c1];
          expect(s).toBe(10);
        }
      }
    }
  });

  it('rows로 만든 타일은 높이 1·폭 w(2~4)이고, 각 줄(윗줄·아랫줄 등)의 합이 10이다', () => {
    for (const level of LEVEL_KEYS) {
      for (let t = 0; t < 30; t++) {
        const { grid, tiles } = tileBoard(level, Math.random);
        const { cols } = LEVELS[level];
        for (const tile of tiles) {
          if (tile.mode !== 'rows') continue;
          const w = tile.c2 - tile.c1 + 1;
          const h = tile.r2 - tile.r1 + 1;
          expect(h).toBe(1);
          expect(w).toBeGreaterThanOrEqual(2);
          expect(w).toBeLessThanOrEqual(4);

          let s = 0;
          for (let c = tile.c1; c <= tile.c2; c++) s += grid[tile.r1 * cols + c];
          expect(s).toBe(10);
        }
      }
    }
  });
});

describe('세로 인접 짝 합10 비율 — 하 난이도 회귀 테스트', () => {
  // 제보: "세로로 인접한 두 칸의 합이 10"인 패턴이 반복돼 아이가 규칙을
  // 바로 알아채 버렸다. 모양을 cols 하나로만 채우던 구버전은 이 비율이
  // 90%를 넘었다(측정: 55.8%, 격자 전체 평균). 모양을 cols·rows·whole로
  // 섞은 뒤에는 크게 떨어져야 한다.
  it('하 난이도 판에서 세로 인접 짝이 전부(또는 대부분) 합 10인 것은 아니다', () => {
    const { cols, rows } = LEVELS.easy;
    let total = 0;
    let sum10 = 0;
    for (let t = 0; t < 200; t++) {
      const { grid } = createBoard('easy');
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols; c++) {
          total++;
          if (grid[r * cols + c] + grid[(r + 1) * cols + c] === 10) sum10++;
        }
      }
    }
    const ratio = sum10 / total;
    expect(ratio).toBeLessThan(0.5);
  });
});

describe('tileBoard — 덮기(covering) 검증', () => {
  for (const level of LEVEL_KEYS) {
    it(`${level}: 타일이 격자를 빈틈·겹침 없이 정확히 덮는다`, () => {
      const { cols, rows } = LEVELS[level];
      for (let t = 0; t < 20; t++) {
        const { tiles } = tileBoard(level, Math.random);
        const covered = new Array(cols * rows).fill(0);

        for (const { c1, r1, c2, r2 } of tiles) {
          for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
              covered[r * cols + c] += 1;
            }
          }
        }

        // 겹침 0: 모든 칸이 정확히 1번씩만 덮인다
        for (const n of covered) expect(n).toBe(1);
        // 빈틈 0: 덮인 칸 수가 전체 칸 수와 같다
        expect(covered.length).toBe(cols * rows);
      }
    });

    // 모양이 cols(세로, h×1)·rows(가로, 1×w)·whole(덩어리, h×w)로
    // 다양화되면서 타일 높이가 2 고정에서 1~4로 넓어졌다. 폭 1~4·합 10은
    // 세 모양 모두에서 그대로 지켜야 하는 불변식이라 계속 검증한다.
    it(`${level}: 각 타일의 폭 1~4, 높이 1~4, 합 10`, () => {
      for (let t = 0; t < 20; t++) {
        const { grid, tiles } = tileBoard(level, Math.random);
        const { cols } = LEVELS[level];
        for (const { c1, r1, c2, r2 } of tiles) {
          const w = c2 - c1 + 1;
          const h = r2 - r1 + 1;
          expect(w).toBeGreaterThanOrEqual(1);
          expect(w).toBeLessThanOrEqual(4);
          expect(h).toBeGreaterThanOrEqual(1);
          expect(h).toBeLessThanOrEqual(4);

          let tileSum = 0;
          for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
              tileSum += grid[r * cols + c];
            }
          }
          expect(tileSum).toBe(10);
        }
      }
    });
  }

  it('hard(12열)에서도 빈틈이 남지 않는다', () => {
    const { cols, rows } = LEVELS.hard;
    for (let t = 0; t < 50; t++) {
      const { tiles } = tileBoard('hard', Math.random);
      const covered = new Array(cols * rows).fill(0);
      for (const { c1, r1, c2, r2 } of tiles) {
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            covered[r * cols + c] += 1;
          }
        }
      }
      expect(covered.every((n) => n === 1)).toBe(true);
    }
  });

  it('임의 홀수 열(13열)로 직접 호출해도 빈틈·겹침이 없다 (홀수 폭 처리 로직 검증)', () => {
    // tileBoard는 level 이름으로 LEVELS/WIDTH_DIST를 찾으므로, 검증용 임시
    // 항목(13열·짝수 행)을 등록해 tileBoard를 직접 호출한 뒤 되돌린다.
    const cols = 13;
    const rows = 8;
    LEVELS.__oddColsTest__ = { label: '홀수테스트', cols, rows, tilingRate: 1.0, difficulty: 0 };
    WIDTH_DIST.__oddColsTest__ = WIDTH_DIST.hard;

    try {
      for (let t = 0; t < 50; t++) {
        const { tiles } = tileBoard('__oddColsTest__', Math.random);
        const covered = new Array(cols * rows).fill(0);
        for (const { c1, r1, c2, r2 } of tiles) {
          for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
              covered[r * cols + c] += 1;
            }
          }
        }
        expect(covered.every((n) => n === 1)).toBe(true);
      }
    } finally {
      delete LEVELS.__oddColsTest__;
      delete WIDTH_DIST.__oddColsTest__;
    }
  });
});

describe('randomBoard', () => {
  it('상·최상만 지원한다', () => {
    expect(() => randomBoard('hard', Math.random)).not.toThrow();
    expect(() => randomBoard('expert', Math.random)).not.toThrow();
  });

  it('칸 수와 값 범위가 맞는다', () => {
    for (const level of ['hard', 'expert']) {
      const { grid } = randomBoard(level, Math.random);
      expect(grid).toHaveLength(LEVELS[level].cols * LEVELS[level].rows);
      for (const v of grid) {
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
    expect(createBoard('hard').grid).toHaveLength(192);
    expect(createBoard('expert').grid).toHaveLength(240);
  });

  it('모든 칸이 1~9다', () => {
    for (const level of LEVEL_KEYS) {
      for (const v of createBoard(level).grid) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(9);
      }
    }
  });

  it('grid·cols·rows·label을 돌려준다 (main.js 계약)', () => {
    const b = createBoard('normal');
    expect(b.cols).toBe(12);
    expect(b.rows).toBe(8);
    expect(b.label).toBe('중');
  });

  it('하·중은 100번 생성해도 항상 guaranteed === true', () => {
    for (let i = 0; i < 100; i++) {
      expect(createBoard('easy').guaranteed).toBe(true);
      expect(createBoard('normal').guaranteed).toBe(true);
    }
  });

  it('상·최상은 400번 생성 시 guaranteed 비율이 0.72~0.88 사이다 (목표 0.8)', () => {
    for (const level of ['hard', 'expert']) {
      let guaranteedCount = 0;
      const n = 400;
      for (let i = 0; i < n; i++) {
        if (createBoard(level).guaranteed) guaranteedCount++;
      }
      const rate = guaranteedCount / n;
      expect(rate).toBeGreaterThanOrEqual(0.72);
      expect(rate).toBeLessThanOrEqual(0.88);
    }
  });

  it('타일링 판이면 tiles가 배열, 랜덤 판이면 null이다', () => {
    const easy = createBoard('easy'); // tilingRate 1.0 → 항상 타일링
    expect(Array.isArray(easy.tiles)).toBe(true);

    // rnd를 고정해 랜덤 분기를 강제한다 (tilingRate 0.8 미만 실패하도록 0.9 반환)
    const forceRandom = () => 0.9;
    const b = createBoard('hard', forceRandom);
    expect(b.tiles).toBeNull();
    expect(b.guaranteed).toBe(false);
  });

  it('부를 때마다 다른 판이 나온다', () => {
    const a = createBoard('hard').grid.join(',');
    const b = createBoard('hard').grid.join(',');
    expect(a).not.toBe(b);
  });
});

describe('난이도 지수 반영 — 평균 타일 크기', () => {
  it('타일링 판의 평균 타일 크기가 하 < 중 < 상 < 최상 순으로 커진다', () => {
    const avgTileSize = (level) => {
      let totalCells = 0;
      let totalTiles = 0;
      for (let i = 0; i < 30; i++) {
        const { tiles } = tileBoard(level, Math.random);
        for (const { c1, r1, c2, r2 } of tiles) {
          totalCells += (c2 - c1 + 1) * (r2 - r1 + 1);
          totalTiles += 1;
        }
      }
      return totalCells / totalTiles;
    };

    const easyAvg = avgTileSize('easy');
    const normalAvg = avgTileSize('normal');
    const hardAvg = avgTileSize('hard');
    const expertAvg = avgTileSize('expert');

    expect(easyAvg).toBeLessThan(normalAvg);
    expect(normalAvg).toBeLessThan(hardAvg);
    expect(hardAvg).toBeLessThan(expertAvg);
  });
});
