import { createBoard, LEVELS } from './board.js';
import { TARGET, buildPrefix, rectSum, clearRect, hasAnyMove } from './rules.js';
import { fitBoard, renderBoard, updateCells, boardOrigin, showSelection, hideSelection } from './render.js';
import { attachDrag } from './drag.js';
import { startIntro } from './intro.js';
import { computeScore, recordScore, getLevelRecords, formatDate } from './score.js';

const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const wrapEl = $('board-wrap');
const selEl = $('selection');
const badgeEl = $('count-badge');

const state = {
  level: null,
  grid: null,
  cols: 0,
  rows: 0,
  total: 0,
  cleared: 0,
  score: 0,
  origin: { left: 0, top: 0, cell: 40 },
  detach: null,
  lastRecord: null, // 방금 끝난 판의 {level, score, at, rank} — 기록 화면 강조에 쓴다
};

let shakeTimer = null;

function formatRank(rank) {
  return rank ? `${rank}위` : '10위 밖';
}

function setScreen(name) {
  document.body.dataset.screen = name;
}

/* ── origin 갱신 ──
   relayout()은 #board-wrap 크기 변화를 관찰하는 ResizeObserver 콜백에서 돈다.
   그래도 그 사이 판의 화면상 위치만 바뀌고 #board-wrap 크기는 그대로인
   경우(예: 스크롤)가 있을 수 있다. 그러면 저장된 origin이 실제 위치와
   어긋난 채로 남아 드래그 좌표가 통째로 밀린다.
   손가락이 닿는 순간(pointerdown) origin을 다시 읽어 이를 보정한다.
   drag.js가 같은 pointerdown에서 시작 칸을 계산하므로, 그보다 먼저 돌아야
   해서 캡처 단계(true)로 단다. pointermove마다 하지 않는 이유는
   getBoundingClientRect()를 매 프레임 부르면 레이아웃이 반복 계산되어
   드래그가 끊기기 때문이다 — 드래그 중에는 touch-action:none이라 판이
   움직이지 않으므로 시작 시점 한 번이면 충분하다.
   startGame은 매번 불리지만 이 리스너는 boardEl에 게임 내내 붙어 있어도
   무해하므로, startGame 밖에서 한 번만 등록한다(중복 등록 방지). */
function refreshOrigin() {
  state.origin = boardOrigin(boardEl);
}
boardEl.addEventListener('pointerdown', refreshOrigin, true);

/* ── 게임 시작 ── */
function startGame(level) {
  const b = createBoard(level);
  state.level = level;
  state.grid = b.grid;
  state.cols = b.cols;
  state.rows = b.rows;
  state.total = b.grid.length;
  state.cleared = 0;
  state.score = 0;

  if (shakeTimer) {
    clearTimeout(shakeTimer);
    shakeTimer = null;
  }
  selEl.classList.remove('shake');
  hideSelection(selEl, badgeEl);
  $('stuck-overlay').hidden = true;

  setScreen('game');
  $('hud-level').textContent = `난이도 ${b.label}`;
  updateHud();
  relayout();

  if (state.detach) state.detach();
  state.detach = attachDrag(
    boardEl,
    () => ({ cols: state.cols, rows: state.rows, origin: state.origin }),
    { onMove: onDragMove, onEnd: onDragEnd, onCancel: () => hideSelection(selEl, badgeEl) }
  );
}

function relayout() {
  const cell = fitBoard(boardEl, wrapEl, state.cols, state.rows);
  renderBoard(boardEl, state.grid, state.cols, state.rows, cell);
  state.origin = boardOrigin(boardEl);
}

function updateHud() {
  $('hud-cleared').textContent = `${state.cleared} / ${state.total}`;
  $('hud-score').textContent = `점수 ${state.score}`;
}

/* ── 드래그 ──
   드래그 중에는 합계도 성패도 알리지 않는다. 선택된 사과 개수만 보여 준다. */
function countApples(rect) {
  let n = 0;
  for (let r = rect.r1; r <= rect.r2; r++) {
    for (let c = rect.c1; c <= rect.c2; c++) {
      if (state.grid[r * state.cols + c] !== 0) n++;
    }
  }
  return n;
}

function onDragMove(rect) {
  // 새 드래그가 시작되면 이전 실패 흔들림이 남아 있지 않게 정리한다
  if (shakeTimer) {
    clearTimeout(shakeTimer);
    shakeTimer = null;
    selEl.classList.remove('shake');
  }
  showSelection(selEl, badgeEl, rect, state.origin, countApples(rect));
}

// 합이 10이 아닐 때: 선택 사각형을 흔들었다가 잠깐 뒤 지운다.
// 색은 바꾸지 않는다 — 흔들림은 "입력을 받았다"만 알려 줄 뿐, 판정 결과를 알리지 않는다.
function failFeedback() {
  badgeEl.hidden = true;
  selEl.classList.add('shake');
  shakeTimer = setTimeout(() => {
    selEl.classList.remove('shake');
    hideSelection(selEl, badgeEl);
    shakeTimer = null;
  }, 200);
}

function onDragEnd(rect) {
  const prefix = buildPrefix(state.grid, state.cols, state.rows);
  const sum = rectSum(prefix, state.cols, rect.c1, rect.r1, rect.c2, rect.r2);
  if (sum !== TARGET) {
    failFeedback();
    return;
  }

  hideSelection(selEl, badgeEl);

  const indices = [];
  for (let r = rect.r1; r <= rect.r2; r++) {
    for (let c = rect.c1; c <= rect.c2; c++) {
      const i = r * state.cols + c;
      if (state.grid[i] !== 0) indices.push(i);
    }
  }

  state.cleared += clearRect(state.grid, state.cols, rect.c1, rect.r1, rect.c2, rect.r2);
  state.score += computeScore(indices, state.cols);
  updateCells(boardEl, state.cols, indices);
  updateHud();

  if (!hasAnyMove(state.grid, state.cols, state.rows)) {
    setTimeout(handleGameEnd, 420);
  }
}

/* ── 게임 종료 ──
   전부 제거는 보상이므로 결과 화면(삽화)으로 넘어간다.
   막힘은 드래그를 놓은 직후 화면이 휙 바뀌면 버그처럼 느껴지므로,
   판을 그대로 두고 그 위에 반투명 오버레이만 띄운다.
   막힘·완전 제거 둘 다 「게임이 끝난 것」이므로 기록을 저장한다.
   「그만두기」는 이 함수를 거치지 않으므로 기록에 남지 않는다. */
function handleGameEnd() {
  const at = new Date().toISOString();
  const result = recordScore(state.level, state.score, at);
  state.lastRecord = { level: state.level, score: state.score, at, rank: result.rank };

  if (state.cleared === state.total) {
    showResult(state.lastRecord);
  } else {
    showStuck(state.lastRecord);
  }
}

function showResult(rec) {
  $('result-image').src = 'assets/ending.jpg';
  $('result-image').alt = '깨어난 백설공주와 일곱난쟁이';
  $('result-title').textContent = '공주가 깨어났습니다';
  $('result-score').textContent = `점수 ${rec.score}`;
  $('result-rank').textContent = formatRank(rec.rank);
  setScreen('result');
}

function showStuck(rec) {
  $('stuck-score').textContent = `점수 ${rec.score}`;
  $('stuck-rank').textContent = formatRank(rec.rank);
  $('stuck-overlay').hidden = false;
}

/* ── 기록 화면 ──
   같은 모달을 두 경로에서 연다.
   - 게임 끝(막힘·완전 제거) 직후 「기록 보기」: 방금 그 난이도로 고정,
     탭 없음, 방금 기록이 있으면 그 줄을 강조하고 「지금 점수 — 등수」를 보여 준다.
   - 메뉴 화면 「기록 보기」: 탭으로 네 난이도를 전환할 수 있고, 강조·현재
     점수 줄은 없다. 처음 열 때는 하 난이도를 보여 준다.
   닫기는 모달만 숨긴다 — body[data-screen]을 바꾸지 않으므로 있던
   화면(메뉴 또는 게임 결과·막힘 화면) 그대로 돌아간다. */
const recordsModalEl = $('records-modal');
const recordsTabsEl = $('records-tabs');
let recordsCtx = { source: 'menu', level: 'easy' };

function renderRecords(level, opts = {}) {
  const cfg = LEVELS[level];
  const { records, plays } = getLevelRecords(level);

  $('records-title').textContent = `${cfg.label} · 최고 기록`;
  $('records-plays').textContent = plays > 0 ? `${plays}판 플레이` : '';

  const listEl = $('records-list');
  listEl.innerHTML = '';
  const empty = records.length === 0;
  $('records-empty').hidden = !empty;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${r.score}점  ${formatDate(r.at)}`;
    if (opts.highlightAt && r.at === opts.highlightAt) li.classList.add('just-now');
    listEl.appendChild(li);
  }

  const currentEl = $('records-current');
  if (opts.currentScore != null) {
    currentEl.hidden = false;
    currentEl.textContent = `지금 점수 ${opts.currentScore} — ${formatRank(opts.currentRank)}`;
  } else {
    currentEl.hidden = true;
  }
}

function updateRecordsTabsActive() {
  for (const btn of recordsTabsEl.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.level === recordsCtx.level);
  }
}

function openRecordsFromGame() {
  const rec = state.lastRecord;
  recordsCtx = { source: 'game', level: rec.level };
  recordsTabsEl.hidden = true;
  renderRecords(rec.level, { highlightAt: rec.at, currentScore: rec.score, currentRank: rec.rank });
  recordsModalEl.hidden = false;
}

function openRecordsFromMenu() {
  recordsCtx = { source: 'menu', level: recordsCtx.level };
  recordsTabsEl.hidden = false;
  updateRecordsTabsActive();
  renderRecords(recordsCtx.level, {});
  recordsModalEl.hidden = false;
}

for (const btn of recordsTabsEl.querySelectorAll('button')) {
  btn.addEventListener('click', () => {
    if (recordsCtx.source !== 'menu') return; // 게임 종료 경로에서는 난이도 고정
    recordsCtx.level = btn.dataset.level;
    updateRecordsTabsActive();
    renderRecords(recordsCtx.level, {});
  });
}
$('records-close').addEventListener('click', () => { recordsModalEl.hidden = true; });

/* ── 배선 ── */
for (const btn of document.querySelectorAll('.level-btn')) {
  btn.addEventListener('click', () => startGame(btn.dataset.level));
}
$('menu-records').addEventListener('click', openRecordsFromMenu);
$('game-menu').addEventListener('click', () => setScreen('menu'));
$('result-retry').addEventListener('click', () => startGame(state.level));
$('result-menu').addEventListener('click', () => setScreen('menu'));
$('result-records').addEventListener('click', openRecordsFromGame);
$('stuck-retry').addEventListener('click', () => startGame(state.level));
$('stuck-menu').addEventListener('click', () => setScreen('menu'));
$('stuck-records').addEventListener('click', openRecordsFromGame);

/* ── 레이아웃 갱신 ──
   resize/orientationchange + 타이머 대신 #board-wrap의 실제 크기 변화를
   직접 관찰한다. 기기마다 회전 애니메이션 길이가 달라 고정 지연으로는
   맞출 수 없고, 모바일 주소창이 숨거나 나타날 때는 resize가 안 오거나
   늦게 오는 경우가 있었다. ResizeObserver는 가용 영역이 실제로 바뀐
   순간 정확히 한 번 불린다. 관찰 시작 직후 초기 크기로 한 번 불리지만
   게임 화면이 아닐 때는 아무것도 하지 않으므로 무해하다. */
const ro = new ResizeObserver(() => {
  if (document.body.dataset.screen === 'game') {
    requestAnimationFrame(relayout);
  }
});
ro.observe(wrapEl);

startIntro(() => setScreen('menu'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });

  // 새 서비스워커가 제어권을 가져가면 페이지를 한 번만 새로고침한다.
  // 그래야 HTML·CSS·JS가 전부 같은 버전으로 맞춰진다 — skipWaiting()·
  // clients.claim() 때문에 새 SW가 페이지를 읽는 도중 제어권을 가져가면
  // 옛 HTML과 새 JS가 섞여 새 JS가 옛 HTML에 없는 요소를 찾다가 죽을
  // 수 있다. swReloading 가드가 없으면 controllerchange가 반복될 때마다
  // reload → 새 등록 → controllerchange → reload로 무한 루프에 빠진다.
  let swReloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swReloading) return;
    swReloading = true;
    location.reload();
  });
}
