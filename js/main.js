import { LEVELS, createBoard } from './board.js';
import { TARGET, buildPrefix, rectSum, clearRect, hasAnyMove } from './rules.js';
import { fitBoard, renderBoard, updateCells, boardOrigin, showSelection, hideSelection } from './render.js';
import { attachDrag } from './drag.js';
import { startIntro } from './intro.js';

const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const wrapEl = $('board-wrap');
const selEl = $('selection');
const badgeEl = $('count-badge');
const rotateEl = $('rotate-notice');

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
  checkOrientation();
}

/* ── 가로 전용 처리 ── */
function checkOrientation() {
  const inGame = document.body.dataset.screen === 'game';
  const needsLandscape = inGame && state.level && LEVELS[state.level].landscapeOnly;
  const isPortrait = window.innerHeight > window.innerWidth;
  rotateEl.hidden = !(needsLandscape && isPortrait);
}

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
  checkOrientation();
  if (document.body.dataset.screen === 'game') relayout();
});

startIntro(() => setScreen('menu'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
