import { computeCellSize } from './layout.js';

// 좁은 화면에서 MIN_CELL(26) 하한이 판을 표시 영역 밖으로 밀어내는 경우의 대비 하한.
// #board-wrap이 overflow:hidden이라 잘린 줄의 사과는 다시 못 누르게 되므로,
// 넘칠 때만 이 값까지 낮춰 판 전체가 들어오게 한다.
const FALLBACK_MIN_CELL = 18;

export function fitBoard(boardEl, wrapEl, cols, rows) {
  const style = getComputedStyle(wrapEl);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const availW = wrapEl.clientWidth - padX;
  const availH = wrapEl.clientHeight - padY;

  let cell = computeCellSize(availW, availH, cols, rows);

  // computeCellSize의 하한(MIN_CELL=26)이 가용 영역을 넘어서게 만들면
  // 하한을 18px까지 낮춰 다시 계산한다. 그래도 넘치면 더는 낮추지 않는다
  // (18px 아래로는 손가락으로 누를 수 없다).
  if (cell * cols > availW || cell * rows > availH) {
    const byWidth = Math.floor(availW / cols);
    const byHeight = Math.floor(availH / rows);
    cell = Math.max(FALLBACK_MIN_CELL, Math.min(byWidth, byHeight));
  }

  boardEl.style.setProperty('--cell', `${cell}px`);
  boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
  return cell;
}

export function renderBoard(boardEl, grid, cols, rows, cell) {
  boardEl.style.setProperty('--cell', `${cell}px`);
  boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;

  const frag = document.createDocumentFragment();
  for (let i = 0; i < cols * rows; i++) {
    const cellEl = document.createElement('div');
    cellEl.className = grid[i] === 0 ? 'cell empty' : 'cell';
    const apple = document.createElement('span');
    apple.className = 'apple';
    apple.textContent = grid[i] === 0 ? '' : String(grid[i]);
    cellEl.appendChild(apple);
    frag.appendChild(cellEl);
  }
  boardEl.replaceChildren(frag);
}

export function updateCells(boardEl, cols, indices) {
  for (const i of indices) {
    const el = boardEl.children[i];
    if (!el || el.classList.contains('empty')) continue;
    el.classList.add('popping');
    setTimeout(() => {
      el.classList.remove('popping');
      el.classList.add('empty');
    }, 180);
  }
}

export function boardOrigin(boardEl) {
  const r = boardEl.getBoundingClientRect();
  const cell = parseFloat(getComputedStyle(boardEl).getPropertyValue('--cell'));
  return { left: r.left, top: r.top, cell };
}

export function showSelection(selEl, badgeEl, rect, origin, count) {
  const wrapRect = selEl.parentElement.getBoundingClientRect();
  const x = origin.left - wrapRect.left + rect.c1 * origin.cell;
  const y = origin.top - wrapRect.top + rect.r1 * origin.cell;
  const w = (rect.c2 - rect.c1 + 1) * origin.cell;
  const h = (rect.r2 - rect.r1 + 1) * origin.cell;

  selEl.style.left = `${x}px`;
  selEl.style.top = `${y}px`;
  selEl.style.width = `${w}px`;
  selEl.style.height = `${h}px`;
  selEl.hidden = false;

  // 손가락이 가리지 않도록 사각형 위쪽 바깥에 붙인다
  badgeEl.textContent = `${count}개`;
  badgeEl.style.left = `${x}px`;
  badgeEl.style.top = `${Math.max(0, y - 30)}px`;
  badgeEl.hidden = false;
}

export function hideSelection(selEl, badgeEl) {
  selEl.hidden = true;
  badgeEl.hidden = true;
}
