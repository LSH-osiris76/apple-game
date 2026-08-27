import { describe, it, expect } from 'vitest';
import { computeScore, insertScore, recordScore, getLevelRecords, formatDate, MAX_RECORDS } from '../js/score.js';

// Node 테스트 환경(jsdom 없음)에는 전역 localStorage가 없다. score.js는
// 브라우저 전역을 그대로 쓰므로, recordScore/getLevelRecords를 왕복
// 검증하는 테스트만을 위해 메모리 기반 최소 구현을 전역에 채운다.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

// cols=5 격자 기준 인덱스 도우미
const at = (r, c, cols = 5) => r * cols + c;

describe('computeScore — 브리프 검산표', () => {
  it('좌우 2칸 → 1', () => {
    // row0: c0,c1
    expect(computeScore([at(0, 0), at(0, 1)], 5)).toBe(1);
  });

  it('상하 2칸 → 1', () => {
    expect(computeScore([at(0, 0), at(1, 0)], 5)).toBe(1);
  });

  it('가로 3칸 → 2', () => {
    expect(computeScore([at(0, 0), at(0, 1), at(0, 2)], 5)).toBe(2);
  });

  it('2×2 블럭 → 2', () => {
    expect(computeScore([at(0, 0), at(0, 1), at(1, 0), at(1, 1)], 5)).toBe(2);
  });

  it('가로 4칸 → 3', () => {
    expect(computeScore([at(0, 0), at(0, 1), at(0, 2), at(0, 3)], 5)).toBe(3);
  });

  it('2×3 → 3', () => {
    const idx = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) idx.push(at(r, c));
    expect(computeScore(idx, 5)).toBe(3);
  });

  it('빈칸을 사이에 둔 "3 0 0 0 7" → 4', () => {
    // 사과 2개, col0과 col4, 같은 행. 사이 빈칸도 외접 네모에 포함된다.
    expect(computeScore([at(0, 0), at(0, 4)], 5)).toBe(4);
  });

  it('큰 네모 안에 사과가 구석에 몰린 경우 — 외접 네모 기준으로만 계산', () => {
    // 드래그는 10x5였지만 실제로 지워진 사과는 (r3,c2)·(r3,c3) 둘뿐.
    // 드래그 사각형이 아니라 지워진 사과만의 외접 네모(2x1)로 계산해야 한다.
    const cols = 10;
    const indices = [3 * cols + 2, 3 * cols + 3];
    expect(computeScore(indices, cols)).toBe(1);
  });

  it('빈 배열은 0점', () => {
    expect(computeScore([], 5)).toBe(0);
  });

  it('사과 한 칸만 지운 경우는 0점(늘린 적이 없다)', () => {
    expect(computeScore([at(2, 2)], 5)).toBe(0);
  });
});

describe('insertScore — 기록 삽입', () => {
  function makeFullList() {
    // 점수 10..1 내림차순, 10개 꽉 찬 리스트
    const list = [];
    for (let s = 10; s >= 1; s--) list.push({ score: s, at: `2026-01-01T00:00:0${10 - s}.000Z` });
    return list;
  }

  it('11번째가 10위 안에 들면 마지막이 밀려나고 길이 10 유지', () => {
    const list = makeFullList();
    const { list: next, rank } = insertScore(list, { score: 5.5, at: 'new' });
    expect(next.length).toBe(10);
    expect(rank).toBe(6); // 10,9,8,7,6,5.5 → 6번째
    expect(next.find((e) => e.at === 'new')).toBeTruthy();
    // 원래 꼴찌(score:1)는 밀려나 사라진다
    expect(next.some((e) => e.score === 1)).toBe(false);
  });

  it('10위와 동점이면 진입하지 못한다', () => {
    const list = makeFullList();
    const { list: next, rank } = insertScore(list, { score: 1, at: 'new' });
    expect(rank).toBeNull();
    expect(next.length).toBe(10);
    expect(next.find((e) => e.at === 'new')).toBeUndefined();
    // 목록 내용도 그대로다
    expect(next).toEqual(list);
  });

  it('동점끼리는 먼저 세운 것이 위에 남는다', () => {
    const list = [
      { score: 10, at: 'first' },
      { score: 5, at: 'earlier-tie' },
      { score: 1, at: 'last' },
    ];
    const { list: next, rank } = insertScore(list, { score: 5, at: 'new-tie' });
    const idxEarlier = next.findIndex((e) => e.at === 'earlier-tie');
    const idxNew = next.findIndex((e) => e.at === 'new-tie');
    expect(idxEarlier).toBeLessThan(idxNew);
    expect(rank).toBe(idxNew + 1);
  });

  it('빈 리스트에 처음 넣으면 1위', () => {
    const { list, rank } = insertScore([], { score: 3, at: 'x' });
    expect(rank).toBe(1);
    expect(list).toEqual([{ score: 3, at: 'x' }]);
  });

  it('가장 낮은 점수로 10위 밖(가득 찬 목록, 10위보다도 낮음)', () => {
    const list = makeFullList();
    const { rank } = insertScore(list, { score: 0, at: 'new' });
    expect(rank).toBeNull();
  });
});

describe('formatDate', () => {
  it('YYYY-MM-DD / HH:MM 형식이다 (콜론)', () => {
    const iso = new Date(2026, 7, 27, 14, 30, 0).toISOString(); // 로컬 2026-08-27 14:30
    expect(formatDate(iso)).toBe('2026-08-27 / 14:30');
  });

  it('한 자리 월/일/시/분은 0으로 채운다', () => {
    const iso = new Date(2026, 0, 5, 9, 5, 0).toISOString(); // 로컬 2026-01-05 09:05
    expect(formatDate(iso)).toBe('2026-01-05 / 09:05');
  });
});

describe('recordScore + getLevelRecords — localStorage 왕복', () => {
  it('빈 저장소에서 첫 기록을 저장하면 조회된다', () => {
    localStorage.clear();
    const result = recordScore('easy', 12, '2026-08-27T00:00:00.000Z');
    expect(result.saved).toBe(true);
    expect(result.rank).toBe(1);
    expect(result.plays).toBe(1);

    const read = getLevelRecords('easy');
    expect(read.records).toEqual([{ score: 12, at: '2026-08-27T00:00:00.000Z' }]);
    expect(read.plays).toBe(1);
  });

  it('난이도별로 최대 MAX_RECORDS개만 남는다', () => {
    localStorage.clear();
    for (let i = 0; i < 15; i++) {
      recordScore('hard', i, `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`);
    }
    const { records, plays } = getLevelRecords('hard');
    expect(records.length).toBe(MAX_RECORDS);
    expect(plays).toBe(15); // 플레이 횟수는 저장 성공 여부와 무관하게 판마다 오른다
    expect(records[0].score).toBe(14);
  });

  it('난이도가 서로 섞이지 않는다', () => {
    localStorage.clear();
    recordScore('easy', 5, 'a');
    recordScore('hard', 99, 'b');
    expect(getLevelRecords('easy').records).toEqual([{ score: 5, at: 'a' }]);
    expect(getLevelRecords('hard').records).toEqual([{ score: 99, at: 'b' }]);
  });

  it('한 번도 안 한 난이도는 빈 기록에 plays 0', () => {
    localStorage.clear();
    const read = getLevelRecords('expert');
    expect(read.records).toEqual([]);
    expect(read.plays).toBe(0);
  });
});
