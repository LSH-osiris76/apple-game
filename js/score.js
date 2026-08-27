// 점수 계산과 Best 10 기록 — DOM을 만지지 않는 순수 함수만 둔다(테스트 가능).
//
// 저장 형식 (localStorage 키: apple-game-scores)
// {
//   "easy":   { "records": [ { "score": 34, "at": "2026-08-27T14:30:00.000Z" }, ... ], "plays": 12 },
//   "normal": { "records": [...], "plays": ... },
//   "hard":   { "records": [...], "plays": ... },
//   "expert": { "records": [...], "plays": ... }
// }
// records는 점수 내림차순, 난이도별 최대 MAX_RECORDS개. plays는 이 난이도에서
// 「막힘」이나 「완전 제거」로 끝난 판의 누적 횟수다 — 그만두기는 세지 않는다
// (기록을 남기는 조건과 동일). 옛 키 apple-game-best(제거율 %)는 쓰지 않는다.

export const SCORES_KEY = 'apple-game-scores';
export const MAX_RECORDS = 10;

function emptyLevel() {
  return { records: [], plays: 0 };
}

/* localStorage 읽기·쓰기 — 시크릿 모드·저장소 차단 설정에서 예외를 던질 수
   있으므로 전부 try/catch로 감싼다. 실패해도 게임 진행에는 영향이 없어야
   한다(js/main.js의 기존 최고 기록 코드와 같은 패턴). */
export function loadScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return null; // 저장소 사용 불가
  }
}

export function saveScores(data) {
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(data));
  } catch {
    // 쓰기 실패는 무시한다 — 기록만 못 남을 뿐 게임은 그대로 진행된다
  }
}

// 한 수의 점수 = (외접 네모 가로 칸수 − 1) + (외접 네모 세로 칸수 − 1)
// 「외접 네모」는 그 수로 실제 지워진 사과들(indices)을 감싸는 최소
// 직사각형이다. 드래그 사각형이 아니라 실제로 지워진 칸만 써야 사과
// 사이의 빈칸은 포함하되 사과 바깥의 여백은 빠진다.
export function computeScore(indices, cols) {
  if (!indices || indices.length === 0) return 0;

  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const i of indices) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }

  return (maxC - minC) + (maxR - minR);
}

// entry({score, at})를 점수 내림차순 위치에 끼워 넣는다.
// 동점이면 먼저 있던 기록이 위에 남도록, "점수가 더 낮은 첫 위치" 바로
// 앞에 넣는다(findIndex는 동점 기존 항목을 건너뛴다). 10위와 동점이면
// 삽입 위치가 배열 끝(10번 인덱스) 밖으로 밀려 slice에서 잘려나가
// 자연히 진입하지 못한다.
export function insertScore(list, entry, maxSize = MAX_RECORDS) {
  const arr = list ? list.slice() : [];
  let idx = arr.findIndex((e) => e.score < entry.score);
  if (idx === -1) idx = arr.length;
  arr.splice(idx, 0, entry);

  const capped = arr.slice(0, maxSize);
  const at = capped.indexOf(entry);
  return { list: capped, rank: at === -1 ? null : at + 1 };
}

// ISO 문자열을 화면 표시용 "YYYY-MM-DD / HH:MM"으로 바꾼다.
// 저장은 항상 ISO로 하고 표시 형식은 읽을 때만 만든다.
export function formatDate(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} / ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 한 판이 끝났을 때(막힘·완전 제거)만 호출한다. 그만두기는 호출하지 않는다.
// 저장소를 아예 못 쓰면(시크릿 모드 등) rank:null, saved:false를 돌려주고
// 게임 진행에는 영향을 주지 않는다.
export function recordScore(level, score, at = new Date().toISOString()) {
  const data = loadScores();
  if (data === null) {
    return { rank: null, list: [], plays: 0, saved: false };
  }

  const cur = data[level] && Array.isArray(data[level].records) ? data[level] : emptyLevel();
  const { list, rank } = insertScore(cur.records, { score, at });
  const plays = (cur.plays || 0) + 1;

  data[level] = { records: list, plays };
  saveScores(data);

  return { rank, list, plays, saved: true };
}

// 기록 화면 조회 전용 — 저장하지 않는다.
export function getLevelRecords(level) {
  const data = loadScores();
  if (data === null) return { records: [], plays: 0, unavailable: true };

  const cur = data[level] && Array.isArray(data[level].records) ? data[level] : emptyLevel();
  return { records: cur.records, plays: cur.plays || 0, unavailable: false };
}
