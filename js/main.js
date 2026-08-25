import { createBoard } from './board.js';
import { renderBoard, fitBoard } from './render.js';

const board = document.getElementById('board');
const wrap = document.getElementById('board-wrap');
const b = createBoard('hard');
document.body.dataset.screen = 'game';
const cell = fitBoard(board, wrap, b.cols, b.rows);
renderBoard(board, b.grid, b.cols, b.rows, cell);
