export const tileOptions = ["z", "i", "e", "w", "a"] as const;
export type Tile = typeof tileOptions[number] | undefined;

export type Direction = "up" | "down" | "left" | "right";
export type Grid = Tile[][];
export type Cursor = [number, number]; // [y,x]

const SQUARE_SIZE = 50;
const MS_BETWEEN_RENDERS = 20;
const MS_BETWEEN_ROW_INSERT = 3_000;
const [CELL_HEIGHT, CELL_WIDTH] = [12, 6];
const [CANVAS_HEIGHT, CANVAS_WIDTH] = [
  CELL_HEIGHT * SQUARE_SIZE,
  CELL_WIDTH * SQUARE_SIZE,
];
const STARTER_ROWS = 4;

class Game {
  #grid: Tile[][] = [];
  #playing = false;
  #ctx: CanvasRenderingContext2D;
  #cursor: [number, number] = [0, 0]; // [y,x]
  #intervalId: number | undefined;
  #time_ms = 0;
  #score = 0;

  constructor() {
    this.#playing = false;
    const canvas = document.getElementById("canvas")! as HTMLCanvasElement;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    this.#ctx = canvas.getContext("2d")!;
  }

  resetGrid() {
    this.#grid = Array(CELL_HEIGHT).fill(Array(CELL_WIDTH).fill(undefined));
    for (let i = 0; i < STARTER_ROWS; i++) {
      const [newGrid, newCursor] = this.appendRow(this.#grid, this.#cursor);
      this.#grid = newGrid;
      this.#cursor = newCursor;
    }
    this.#cursor = [
      CELL_HEIGHT - STARTER_ROWS,
      Math.floor(CELL_WIDTH / 2 - 1),
    ];
  }

  get isGameOver() {
    return !this.#grid[0].every((x) => x === undefined);
  }

  start() {
    if (this.#playing) {
      return; // can't start a running game
    }

    // start
    this.#playing = true;
    this.#time_ms = 0;
    this.#score = 0;
    this.resetGrid();
    this.drawGrid();

    document.addEventListener("keydown", (event) => {
      if (!this.#playing) return;
      switch (event.key) {
        case "ArrowUp":
          this.moveCursor("up");
          break;
        case "ArrowDown":
          this.moveCursor("down");
          break;
        case "ArrowLeft":
          this.moveCursor("left");
          break;
        case "ArrowRight":
          this.moveCursor("right");
          break;
        case " ": {
          this.swapTiles();
          let prevScore;
          while (this.#score !== prevScore) {
            prevScore = this.#score;
            const [newGrid, score] = this.scoreTiles(
              this.#grid,
              CELL_HEIGHT,
              CELL_WIDTH,
            );
            this.#grid = newGrid;
            this.#score += score;
            this.applyGravity();
          }
          break;
        }
      }
    });

    // game loop
    this.#intervalId = setInterval(() => {
      this.drawGrid();
      this.#time_ms += MS_BETWEEN_RENDERS;

      // add row if its time to
      if (this.#time_ms % MS_BETWEEN_ROW_INSERT === 0) {
        if (this.isGameOver) {
          this.stop();
          this.renderGameOver();
        }
        const [newGrid, newCursor] = this.appendRow(this.#grid, this.#cursor);
        this.#grid = newGrid;
        this.#cursor = newCursor;
      }
    }, MS_BETWEEN_RENDERS);
  }

  scoreTiles(
    grid: Tile[][],
    CELL_HEIGHT: number,
    CELL_WIDTH: number,
  ): [Tile[][], number] {
    let score = 0;
    const newGrid = grid.map((row) => [...row]);
    const scoredTiles = Array.from(
      { length: CELL_HEIGHT },
      () => Array(CELL_WIDTH).fill(false),
    );

    // Helper function to calculate combo scores
    const calculateComboScore = (length: number) => {
      if (length <= 3) return 0;
      if (length === 4) return 20;
      if (length === 5) return 30;
      if (length === 6) return 50;
      return 50 + (length - 6) * 10; // Beyond 6, add 10 points for each extra block
    };

    // Horizontal check
    for (let y = 0; y < CELL_HEIGHT; y++) {
      let i = 0;
      while (i < CELL_WIDTH) {
        let j = i;
        while (
          j < CELL_WIDTH && grid[y][j] !== undefined &&
          grid[y][j] === grid[y][i]
        ) {
          j++;
        }

        // Check if sequence length is 3 or more
        if (j - i >= 3) {
          score += calculateComboScore(j - i);
          for (let x = i; x < j; x++) {
            console.log("scoring!");
            scoredTiles[y][x] = true;
          }
        }
        // Ensure i is incremented if j hasn't moved
        if (j === i) {
          i++; // Increment i to avoid infinite loop
        } else {
          i = j; // Move i to j if j has moved
        }
      }
    }

    // Vertical check
    for (let x = 0; x < CELL_WIDTH; x++) {
      let i = 0;
      while (i < CELL_HEIGHT) {
        let j = i;
        while (
          j < CELL_HEIGHT && grid[j][x] !== undefined &&
          grid[j][x] === grid[i][x]
        ) {
          j++;
        }

        // Check if sequence length is 3 or more
        if (j - i >= 3) {
          score += calculateComboScore(j - i);
          for (let y = i; y < j; y++) {
            scoredTiles[y][x] = true;
          }
        }
        // Ensure i is incremented if j hasn't moved
        if (j === i) {
          i++; // Increment i to avoid infinite loop
        } else {
          i = j; // Move i to j if j has moved
        }
      }
    }

    // Update newGrid based on scored tiles and handle clearing
    for (let y = 0; y < CELL_HEIGHT; y++) {
      for (let x = 0; x < CELL_WIDTH; x++) {
        if (scoredTiles[y][x]) {
          newGrid[y][x] = undefined; // Clear scored tile
        } else {
          newGrid[y][x] = grid[y][x]; // Keep the tile if not scored
        }
      }
    }

    // Log before and after grid and the score
    console.log(
      `Before:\n${grid.map((row) => row.join(" ")).join("\n")}\n\nAfter:\n${
        newGrid.map((row) => row.join(" ")).join("\n")
      }\n\nScored Tiles:\n${
        scoredTiles.map((row) => row.map((tile) => tile.toString()).join(" "))
          .join("\n")
      }\n\nScore: ${score}`,
    );

    return [newGrid, score];
  }

  applyGravity() {
    let x, y;
    for (x = 0; x < CELL_WIDTH; x++) {
      let undefinedIdx;
      for (y = CELL_HEIGHT - 1; y >= 0; y--) {
        if (this.#grid[y][x] === undefined && undefinedIdx === undefined) {
          undefinedIdx = y;
        } else if (
          undefinedIdx !== undefined && this.#grid[y][x] !== undefined
        ) {
          // this cell has a slot below it
          this.#grid[undefinedIdx][x] = this.#grid[y][x];
          this.#grid[y][x] = undefined;
          if (this.#grid[undefinedIdx - 1][x] === undefined) {
            undefinedIdx -= 1;
          }
        }
      }
    }
  }

  stop() {
    this.#playing = false;
    clearInterval(this.#intervalId ?? undefined);
    this.clearCanvas();
  }

  renderGameOver() {
    this.#ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.#ctx.fillStyle = "red";
    this.#ctx.font = "48px Arial";
    this.#ctx.textAlign = "center";
    this.#ctx.textBaseline = "middle";
    this.#ctx.fillText("Game Over", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  getRandomElement<T>(arr: readonly T[]): T {
    return arr[crypto.getRandomValues(new Uint32Array(1))[0] % arr.length];
  }

  generateRandomRow(l = CELL_WIDTH) {
    const row = Array(l);

    for (let idx = 0; idx < l; idx++) {
      let newTile = this.getRandomElement(tileOptions);
      if (idx > 1) {
        const [leftleft, left] = [row[idx - 2], row[idx - 1]];
        if (newTile === leftleft && newTile === left) {
          newTile = this.getRandomElement(
            tileOptions.filter((tile) => tile !== newTile),
          );
        }
      }
      row[idx] = newTile;
    }

    return row;
  }

  appendRow(
    grid: Tile[][],
    cursor: [number, number],
  ): [Tile[][], [number, number]] {
    const clonedGrid = grid.map((row) => [...row]);
    // shed top row
    clonedGrid.shift();

    let row;
    let score = 0;
    do {
      row = this.generateRandomRow();
      const bottom3Rows = clonedGrid.slice(-2);
      bottom3Rows.push(row);
      const [_, newScore] = this.scoreTiles(bottom3Rows, 3, CELL_WIDTH);
      score = newScore;
    } while (score !== 0);

    clonedGrid.push(row);

    const clonedCursor: [number, number] = [cursor[0] ?? 0, cursor[1] ?? 0];
    // keep cursor on its original row
    if (clonedCursor !== undefined && clonedCursor[0] > 0) {
      clonedCursor[0]--;
    }

    return [clonedGrid, clonedCursor];
  }

  clearCanvas() {
    this.#ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  allowedCursorMoves() {
    const directions = [];
    if (this.#cursor[0] > 0) {
      directions.push("up");
    }

    if (this.#cursor[0] < this.#grid.length - 1) {
      directions.push("down");
    }

    if (this.#cursor[1] > 0) {
      directions.push("left");
    }

    if (this.#cursor[1] < this.#grid[this.#cursor[0]].length - 2) {
      directions.push("right");
    }

    return directions;
  }

  moveCursor(direction: Direction) {
    if (!this.allowedCursorMoves().includes(direction)) {
      return; // can't move there
    }
    switch (direction) {
      case "up":
        this.#cursor[0]--;
        break;
      case "down":
        this.#cursor[0]++;
        break;
      case "left":
        this.#cursor[1]--;
        break;
      case "right":
        this.#cursor[1]++;
        break;
    }
  }

  swapTiles() {
    const [y, x] = this.#cursor;
    const left = this.#grid[y][x];
    const right = this.#grid[y][x + 1];
    this.#grid[y][x] = right;
    this.#grid[y][x + 1] = left;
  }

  drawGrid() {
    this.clearCanvas();
    let x, y;
    for (y = 0; y < this.#grid.length; y++) {
      for (x = 0; x < this.#grid[y].length; x++) {
        // draw tile
        this.drawSquare(
          x * SQUARE_SIZE,
          y * SQUARE_SIZE,
          this.#grid[y][x],
        );
        // draw cursor
        if ((this.#cursor[0] === y && this.#cursor[1] === x)) {
          this.drawSquare(
            x * SQUARE_SIZE + 10,
            y * SQUARE_SIZE + 10,
            null,
            SQUARE_SIZE - 20,
          );
          this.drawSquare(
            (x + 1) * SQUARE_SIZE + 10,
            y * SQUARE_SIZE + 10,
            null,
            SQUARE_SIZE - 20,
          );
        }
      }
    }
  }

  drawSquare(x: number, y: number, c: Tile | null = null, s = SQUARE_SIZE) {
    this.#ctx.beginPath();
    this.#ctx.moveTo(x, y);
    this.#ctx.lineTo(x + s, y);
    this.#ctx.lineTo(x + s, y + s);
    this.#ctx.lineTo(x, y + s);
    this.#ctx.lineTo(x, y);
    this.#ctx.stroke();
    this.#ctx.closePath();
    if (c) {
      this.#ctx.fillStyle = "black";
      this.#ctx.font = "24px Arial";
      this.#ctx.textAlign = "center";
      this.#ctx.textBaseline = "middle";
      this.#ctx.fillText(c, x + s / 2, y + s / 2);
    }
  }
}

const gs = new Game();
gs.start();
