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

let shakeTimer = null;

/* ── 최고 기록 (localStorage) ──
   시크릿 모드·저장소 차단 설정에서는 localStorage가 예외를 던진다.
   읽기·쓰기 모두 실패해도 게임 진행에는 영향이 없어야 하므로 전부 try/catch로 감싼다. */
const BEST_KEY = 'apple-game-best';

function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return null; // 저장소 사용 불가
  }
}

function saveBest(data) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(data));
  } catch {
    // 쓰기 실패는 무시한다 — 기록만 못 남을 뿐 게임은 그대로 진행된다
  }
}

// 이번 판 결과를 반영하고 화면에 보여 줄 정보를 돌려준다.
// 저장소를 아예 못 쓰거나(시크릿 모드) 이 난이도의 이전 기록이 없으면(첫 판)
// show:false를 돌려주며, 호출부는 그 줄을 생략한다.
function updateBest(level, rate) {
  const data = loadBest();
  if (data === null) return { show: false };

  const hadPrior = Object.prototype.hasOwnProperty.call(data, level);
  const prevBest = hadPrior ? data[level] : undefined;
  const isNew = !hadPrior || rate > prevBest;
  const best = isNew ? rate : prevBest;

  if (isNew) {
    data[level] = rate;
    saveBest(data);
  }

  return { show: hadPrior, best, isNew: hadPrior && isNew };
}

function renderBestLine(el, result) {
  if (!result || !result.show) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = result.isNew ? `최고 기록 갱신! ${result.best}%` : `최고 기록 ${result.best}%`;
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
  updateCells(boardEl, state.cols, indices);
  updateHud();

  if (!hasAnyMove(state.grid, state.cols, state.rows)) {
    setTimeout(handleGameEnd, 420);
  }
}

/* ── 게임 종료 ──
   전부 제거는 보상이므로 결과 화면(삽화)으로 넘어간다.
   막힘은 드래그를 놓은 직후 화면이 휙 바뀌면 버그처럼 느껴지므로,
   판을 그대로 두고 그 위에 반투명 오버레이만 띄운다. */
function handleGameEnd() {
  if (state.cleared === state.total) {
    showResult();
  } else {
    showStuck();
  }
}

function showResult() {
  const rate = Math.round((state.cleared / state.total) * 100);
  const best = updateBest(state.level, rate);

  $('result-image').src = 'assets/ending.jpg';
  $('result-image').alt = '깨어난 백설공주와 일곱난쟁이';
  $('result-title').textContent = '공주가 깨어났습니다';
  $('result-score').textContent = `${state.cleared} / ${state.total} 개를 없앴습니다`;
  renderBestLine($('result-best'), best);
  setScreen('result');
}

function showStuck() {
  const rate = Math.round((state.cleared / state.total) * 100);
  const best = updateBest(state.level, rate);

  $('stuck-score').textContent = `${state.cleared} / ${state.total} 개를 없앴어요 (${rate}%)`;
  renderBestLine($('stuck-best'), best);
  $('stuck-overlay').hidden = false;
}

/* ── 배선 ── */
for (const btn of document.querySelectorAll('.level-btn')) {
  btn.addEventListener('click', () => startGame(btn.dataset.level));
}
$('game-menu').addEventListener('click', () => setScreen('menu'));
$('result-retry').addEventListener('click', () => startGame(state.level));
$('result-menu').addEventListener('click', () => setScreen('menu'));
$('stuck-retry').addEventListener('click', () => startGame(state.level));
$('stuck-menu').addEventListener('click', () => setScreen('menu'));

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
}
