import { createBoard } from './board.js';
import { TARGET, buildPrefix, rectSum, clearRect, hasAnyMove } from './rules.js';
import { fitBoard, renderBoard, updateCells, boardOrigin, showSelection, hideSelection } from './render.js';
import { attachDrag } from './drag.js';
import { startIntro } from './intro.js';

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
  origin: { left: 0, top: 0, cell: 40 },
  detach: null,
};

function setScreen(name) {
  document.body.dataset.screen = name;
}

/* ── origin 갱신 ──
   relayout()은 resize/orientationchange에서만 돈다. 모바일에서는 주소창이
   숨거나 나타나며 판의 화면상 위치가 바뀌는데 resize가 안 오거나 늦게 온다.
   그러면 저장된 origin이 실제 위치와 어긋난 채로 남아 드래그 좌표가 통째로 밀린다.
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
  showSelection(selEl, badgeEl, rect, state.origin, countApples(rect));
}

function onDragEnd(rect) {
  hideSelection(selEl, badgeEl);

  const prefix = buildPrefix(state.grid, state.cols, state.rows);
  const sum = rectSum(prefix, state.cols, rect.c1, rect.r1, rect.c2, rect.r2);
  if (sum !== TARGET) return; // 실패는 아무 표시도 하지 않는다

  const indices = [];
  for (let r = rect.r1; r <= rect.r2; r++) {
    for (let c = rect.c1; c <= rect.c2; c++) {
      const i = r * state.cols + c;
      if (state.grid[i] !== 0) indices.push(i);
    }
  }

  state.cleared += clearRect(state.grid, state.cols, rect.c1, rect.r1, rect.c2, rect.r2);
  updateCells(boardEl, state.cols, indices);
  updateHud();

  if (!hasAnyMove(state.grid, state.cols, state.rows)) {
    setTimeout(showResult, 420);
  }
}

/* ── 결과 ── */
function showResult() {
  const allCleared = state.cleared === state.total;
  $('result-image').src = allCleared ? 'assets/ending.jpg' : 'assets/intro3.jpg';
  $('result-image').alt = allCleared
    ? '깨어난 백설공주와 일곱난쟁이'
    : '쓰러진 백설공주';
  $('result-title').textContent = allCleared
    ? '공주가 깨어났습니다'
    : '아직 깨어나지 못했습니다';
  $('result-score').textContent = `${state.cleared} / ${state.total} 개를 없앴습니다`;
  setScreen('result');
}

/* ── 배선 ── */
for (const btn of document.querySelectorAll('.level-btn')) {
  btn.addEventListener('click', () => startGame(btn.dataset.level));
}
$('game-menu').addEventListener('click', () => setScreen('menu'));
$('result-retry').addEventListener('click', () => startGame(state.level));
$('result-menu').addEventListener('click', () => setScreen('menu'));

window.addEventListener('resize', () => {
  if (document.body.dataset.screen === 'game') relayout();
});

window.addEventListener('orientationchange', () => {
  // 회전 직후에는 innerWidth/Height가 아직 갱신되지 않는 브라우저가 있다
  setTimeout(() => {
    if (document.body.dataset.screen === 'game') relayout();
  }, 100);
});

startIntro(() => setScreen('menu'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
