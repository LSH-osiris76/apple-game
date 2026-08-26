import { pointToCell, normalizeRect } from './layout.js';

export function attachDrag(boardEl, getState, callbacks) {
  let start = null;
  let pointerId = null;

  function cellAt(ev) {
    const { cols, rows, origin } = getState();
    return pointToCell(ev.clientX, ev.clientY, origin, cols, rows);
  }

  function onDown(ev) {
    if (pointerId !== null) return;
    if (ev.button !== undefined && ev.button !== 0) return;
    pointerId = ev.pointerId;
    boardEl.setPointerCapture(pointerId);
    start = cellAt(ev);
    callbacks.onMove(normalizeRect(start, start));
    ev.preventDefault();
  }

  function onMove(ev) {
    if (start === null || ev.pointerId !== pointerId) return;
    callbacks.onMove(normalizeRect(start, cellAt(ev)));
    ev.preventDefault();
  }

  function finish(ev, cancelled) {
    if (start === null || ev.pointerId !== pointerId) return;
    const rect = normalizeRect(start, cellAt(ev));
    start = null;
    if (boardEl.hasPointerCapture(pointerId)) boardEl.releasePointerCapture(pointerId);
    pointerId = null;
    if (cancelled) callbacks.onCancel();
    else callbacks.onEnd(rect);
  }

  const onUp = (ev) => finish(ev, false);
  const onCancel = (ev) => finish(ev, true);

  // 드래그가 브라우저 기본 동작(이미지 끌기 등)으로 새지 않게 막는다
  const onDragStart = (e) => e.preventDefault();
  const onContextMenu = (e) => e.preventDefault();

  // Capture 손실 시 상태 정리 (멱등성: 이미 끝났으면 무시)
  const onLostPointerCapture = (ev) => {
    if (start === null || ev.pointerId !== pointerId) return;
    finish(ev, true);
  };

  boardEl.addEventListener('pointerdown', onDown);
  boardEl.addEventListener('pointermove', onMove);
  boardEl.addEventListener('pointerup', onUp);
  boardEl.addEventListener('pointercancel', onCancel);
  boardEl.addEventListener('lostpointercapture', onLostPointerCapture);
  boardEl.addEventListener('dragstart', onDragStart);
  boardEl.addEventListener('contextmenu', onContextMenu);

  return () => {
    boardEl.removeEventListener('pointerdown', onDown);
    boardEl.removeEventListener('pointermove', onMove);
    boardEl.removeEventListener('pointerup', onUp);
    boardEl.removeEventListener('pointercancel', onCancel);
    boardEl.removeEventListener('lostpointercapture', onLostPointerCapture);
    boardEl.removeEventListener('dragstart', onDragStart);
    boardEl.removeEventListener('contextmenu', onContextMenu);
  };
}
