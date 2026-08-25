export const TARGET = 10;

// 2차원 누적합. 크기는 (cols+1) x (rows+1), 인덱스는 r*(cols+1)+c
export function buildPrefix(grid, cols, rows) {
  const W = cols + 1;
  const p = new Int32Array(W * (rows + 1));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      p[(r + 1) * W + (c + 1)] =
        grid[r * cols + c] +
        p[r * W + (c + 1)] +
        p[(r + 1) * W + c] -
        p[r * W + c];
    }
  }
  return p;
}

export function rectSum(prefix, cols, c1, r1, c2, r2) {
  const W = cols + 1;
  return (
    prefix[(r2 + 1) * W + (c2 + 1)] -
    prefix[r1 * W + (c2 + 1)] -
    prefix[(r2 + 1) * W + c1] +
    prefix[r1 * W + c1]
  );
}

export function isValidRect(prefix, cols, c1, r1, c2, r2) {
  return rectSum(prefix, cols, c1, r1, c2, r2) === TARGET;
}

export function clearRect(grid, cols, c1, r1, c2, r2) {
  let n = 0;
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const i = r * cols + c;
      if (grid[i] !== 0) {
        grid[i] = 0;
        n++;
      }
    }
  }
  return n;
}

// 남은 유효 조합이 하나라도 있는지.
// 값이 모두 0 이상이라 사각형을 넓히면 합이 줄지 않는다 → 10을 넘으면 조기 종료한다.
export function hasAnyMove(grid, cols, rows) {
  const p = buildPrefix(grid, cols, rows);
  for (let r1 = 0; r1 < rows; r1++) {
    for (let r2 = r1; r2 < rows; r2++) {
      for (let c1 = 0; c1 < cols; c1++) {
        for (let c2 = c1; c2 < cols; c2++) {
          const s = rectSum(p, cols, c1, r1, c2, r2);
          if (s === TARGET) return true;
          if (s > TARGET) break; // c2를 더 넓혀도 줄지 않음
        }
      }
    }
  }
  return false;
}
