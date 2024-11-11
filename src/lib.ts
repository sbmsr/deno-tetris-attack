
export function getRandomNumber(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

export function getGridAreaAroundCursor(
  grid: any[][],
  cursor: [number, number],
) {
  // Only look at the immediate tiles that can be swapped and their neighbors
  const [cursorY] = cursor;
  const relevantTiles = [];

  // Get row above cursor
  if (cursorY - 1 < 0) {
    relevantTiles.push(null);
  } else {
    relevantTiles.push(grid[cursorY - 1]);
  }

  // Get cursor row
  relevantTiles.push(grid[cursorY]);

  // Get row below cursor
  if (cursorY + 1 >= grid.length) {
    relevantTiles.push(null);
  } else {
    relevantTiles.push(grid[cursorY + 1]);
  }

  return relevantTiles;
}
