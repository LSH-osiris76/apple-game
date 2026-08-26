import { computeCellSize } from './layout.js';

// 좁은 화면에서 MIN_CELL(26) 하한이 판을 표시 영역 밖으로 밀어내는 경우의 대비 하한.
// #board-wrap이 overflow:hidden이라 잘린 줄의 사과는 다시 못 누르게 되므로,
// 넘칠 때만 이 값까지 낮춰 판 전체가 들어오게 한다.
const FALLBACK_MIN_CELL = 18;

// 뱃지와 선택 사각형 사이 여백(px)
const BADGE_GAP = 6;

// DOM에 의존하지 않는 순수 계산. computeCellSize의 MIN_CELL 하한이 가용 영역을
// 넘어서게 만들면 하한을 18px까지 낮춰 다시 계산한다. 그래도 넘치면 하한을
// 완전히 풀어 반드시 가용 영역 안에 들어오게 한다 — #board-wrap이
// overflow:hidden이라 잘린 열은 다시 누를 수 없어 게임이 끝나지 않는
// 상태(갇힘)가 되기 때문이다. 손가락으로 누르기 불편해지는 것보다
// 판이 잘려 진행 불가능해지는 쪽이 훨씬 나쁘다. 최소 1px은 보장한다.
export function computeFittedCell(availW, availH, cols, rows) {
  let cell = computeCellSize(availW, availH, cols, rows);

  if (cell * cols > availW || cell * rows > availH) {
    const byWidth = Math.floor(availW / cols);
    const byHeight = Math.floor(availH / rows);
    cell = Math.max(FALLBACK_MIN_CELL, Math.min(byWidth, byHeight));

    if (cell * cols > availW || cell * rows > availH) {
      cell = Math.max(1, Math.min(byWidth, byHeight));
    }
  }

  return cell;
}

export function fitBoard(boardEl, wrapEl, cols, rows) {
  const style = getComputedStyle(wrapEl);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const availW = wrapEl.clientWidth - padX;
  const availH = wrapEl.clientHeight - padY;

  const cell = computeFittedCell(availW, availH, cols, rows);

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

  // 뱃지 크기를 실측하려면 먼저 보이게 하고 내용을 채운 뒤 측정한다
  badgeEl.textContent = `${count}개`;
  badgeEl.hidden = false;
  const badgeRect = badgeEl.getBoundingClientRect();
  const badgeW = badgeRect.width;
  const badgeH = badgeRect.height;

  // 세로: 사각형 위쪽에 자리가 있으면 위, 없으면 아래로 붙여 절대 겹치지 않게 한다
  let badgeY = y - BADGE_GAP - badgeH;
  if (badgeY < 0) badgeY = y + h + BADGE_GAP;
  badgeY = Math.max(0, Math.min(badgeY, wrapRect.height - badgeH));

  // 가로: #board-wrap의 overflow:hidden 경계 안에 뱃지 전체가 들어오게 제한한다
  const badgeX = Math.max(0, Math.min(x, wrapRect.width - badgeW));

  badgeEl.style.left = `${badgeX}px`;
  badgeEl.style.top = `${badgeY}px`;
}

export function hideSelection(selEl, badgeEl) {
  selEl.hidden = true;
  badgeEl.hidden = true;
}
