import { ALLOWED_MOVES, Game, type GameConfig, type Grid } from "./game.ts";
import { getRandomNumber } from "./lib.ts";

const EPISODES = 100_000;

export class GameEnvironment {
  private game: Game;
  private config: GameConfig = Object.freeze({
    SQUARE_SIZE: 50,
    MS_BETWEEN_RENDERS: 1,
    MS_BETWEEN_ROW_INSERT: 5,
    CELL_HEIGHT: 4,
    CELL_WIDTH: 4,
    CANVAS_HEIGHT: 600,
    CANVAS_WIDTH: 300,
    STARTER_ROWS: 1,
    TILES: ["z", "a"] as const,
  });

  constructor(headless = true) {
    this.game = new Game(Object.assign({}, this.config), headless); // Run in headless mode
  }

  reset() {
    this.game.restart();
    return this.getState(); // Return initial state
  }

  getState() {
    return { grid: this.game.grid, score: this.game.score, cursor: this.game.cursor };
  }

  // Find the highest tile's position
  static getHighestTileRow(grid: Grid): number {
    let highestTileRow = 0;
    for (let y = 0; y < grid.length; y++) {
      if (
        grid[y].some((cell) => cell !== undefined)
      ) {
        highestTileRow = y;
        break;
      }
    }
    return highestTileRow;
  }

  static scanForPotentialScores(grid: Grid) {
    let potentialScores = 0;

    // Scan horizontally for adjacent matching tiles, ignoring bottom row
    const rowToCheck = grid.length - 2;
    for (let x = 0; x < grid[rowToCheck].length - 2; x++) {
      const tiles = [
        grid[rowToCheck][x],
        grid[rowToCheck][x + 1], 
        grid[rowToCheck][x + 2]
      ];
      
      // Check if we have 2 matching tiles that could form a match-3
      if (tiles[0] && tiles[1] && tiles[0] === tiles[1] && !tiles[2]) {
        potentialScores++;
      }
      if (tiles[1] && tiles[2] && tiles[1] === tiles[2] && !tiles[0]) {
        potentialScores++;
      }
    }

    // Scan vertically for adjacent matching tiles, ignoring bottom row
    for (let x = 0; x < grid[0].length; x++) {
      for (let y = 0; y < grid.length - 3; y++) {
        const tiles = [
          grid[y][x],
          grid[y + 1][x],
          grid[y + 2][x]
        ];

        // Check if we have 2 matching tiles that could form a match-3
        if (tiles[0] && tiles[1] && tiles[0] === tiles[1] && !tiles[2]) {
          potentialScores++;
        }
        if (tiles[1] && tiles[2] && tiles[1] === tiles[2] && !tiles[0]) {
          potentialScores++;
        }
      }
    }

    return potentialScores;
  }

  async step(action: string) {
    const { score: oldScore, grid: oldGrid, cursor: oldCursor } = this.getState();
    
    // Check for edge cases before action
    const isAtRightEdge = oldCursor[1] + 1 === this.config.CELL_WIDTH - 1;
    const isAtLeftEdge = oldCursor[1] === 0;
    const isAtTopEdge = oldCursor[0] === 0;
    const isAtBottomEdge = oldCursor[0] === this.config.CELL_HEIGHT - 1;
    const isOnSameTiles = oldGrid[oldCursor[0]][oldCursor[1]] === oldGrid[oldCursor[0]][oldCursor[1]+1];

    let reward = 0;

    // Apply heavy penalties for wasteful moves
    if ((isAtRightEdge && action === "ArrowRight") || 
        (isAtLeftEdge && action === "ArrowLeft") ||
        (isAtTopEdge && action === "ArrowUp") ||
        (isAtBottomEdge && action === "ArrowDown")) {
      reward -= 50;
    }

    if (isOnSameTiles && action === " ") {
      reward -= 50; // swapped same tiles, which is no-op
    }
    
    this.game.handleAction({ key: action } as any);

    await new Promise((resolve) =>
      setTimeout(resolve, this.config.MS_BETWEEN_RENDERS)
    );

    // After the action, capture the new state, reward, and game status
    const newState = this.getState();
    const { score: newScore } = newState;

    // Check if we moved to a blank spot
    const { grid: newGrid, cursor: newCursor } = newState;
    if (newGrid[newCursor[0]][newCursor[1]] === undefined && 
        newGrid[newCursor[0]][newCursor[1] + 1] === undefined) {
      reward -= 50; // Penalty for moving to empty space
    }

    if (newScore > oldScore) {
      reward = Math.min(30, newScore - oldScore); // Proportional reward for scoring
    } 

    // Check if the move created potential scoring opportunities
    if (action === " ") { // Only check after swaps
      const oldPotentialScores = GameEnvironment.scanForPotentialScores(oldGrid);
      const newPotentialScores = GameEnvironment.scanForPotentialScores(newGrid);

      if (newPotentialScores > oldPotentialScores) {
        reward += 10; // Small boost for creating more potential scoring opportunities
      }
    }

    // Check if we moved to a position where swapping would create a match
    if (action !== " ") { // Only check cursor moves, not swaps
      // Simulate the swap
      const simGrid = JSON.parse(JSON.stringify(newGrid));
      const [y, x] = newCursor;
      [simGrid[y][x], simGrid[y][x + 1]] = [simGrid[y][x + 1], simGrid[y][x]];
      
      // Check if the simulated swap would create more scoring opportunities
      const simPotentialScores = GameEnvironment.scanForPotentialScores(simGrid);
      if (simPotentialScores > 0) {
        reward += 5; // Small reward for moving to a position that enables scoring
      }
    }

    const done = !this.game.playing;

    return { newState, reward, done };
  }
}

export class QLearningAgent {
  #qTable = new Map<string, number>();
  #learningRate: number;
  #discountFactor: number;
  #explorationRate: number;

  constructor(
    learningRate = 0.1,
    discountFactor = 0.95,
    explorationRate = 1.0,
    private minExplorationRate = 0.001,
  ) {
    this.#learningRate = learningRate;
    this.#discountFactor = discountFactor;
    this.#explorationRate = explorationRate;
  }

  get qTable(): Map<string, number> {
    return this.#qTable;
  }

  getQValue(state: string, action: string) {
    return this.#qTable.get(`${state}-${action}`) || 0;
  }

  rand() {
    return getRandomNumber() / 0xFFFFFFFF; // Use full 32-bit range
  }

  chooseAction(state: string, possibleActions: string[]) {
    if (this.rand() < this.#explorationRate) {
      return possibleActions[
        Math.floor(this.rand() * possibleActions.length)
      ];
    }
    return possibleActions.reduce((bestAction, action) => {
      return this.getQValue(state, action) > this.getQValue(state, bestAction)
        ? action
        : bestAction;
    }, possibleActions[0]);
  }

  updateQValue(
    state: string,
    action: string,
    reward: number,
    nextState: string,
  ) {
    const currentQ = this.getQValue(state, action);
    const maxNextQ = Math.max(
      ...ALLOWED_MOVES.map((a) => this.getQValue(nextState, a)),
    );
    const updatedQ = currentQ +
      this.#learningRate *
        (reward + this.#discountFactor * maxNextQ - currentQ);
    this.#qTable.set(`${state}-${action}`, updatedQ);
  }

  decreaseExplorationRate() {
    this.#explorationRate = Math.max(
      this.minExplorationRate,
      this.#explorationRate * 0.9995,
    );
  }
}

function getCompactGameState(grid: Grid, cursor: [number, number]) {
  return JSON.stringify({
    // Just look at the active area (cursor position and adjacent cells)
    activeArea: [
      cursor[0] > 0 ? grid[cursor[0] - 1][cursor[1]] : null, // Above current
      cursor[0] > 0 && cursor[1] < grid[0].length - 1 ? grid[cursor[0] - 1][cursor[1] + 1] : null, // Above right
      grid[cursor[0]][cursor[1]], // Current position
      cursor[1] < grid[0].length - 1 ? grid[cursor[0]][cursor[1] + 1] : null, // Right position
      cursor[0] + 1 < grid.length - 1 ? grid[cursor[0] + 1][cursor[1]] : null, // Below current
      cursor[0] < grid.length - 1 && cursor[1] < grid[0].length - 1 ? grid[cursor[0] + 1][cursor[1] + 1] : null, // Below right
    ],
    cursor, // Just need x position since y context is in activeArea
    potentialMatches: GameEnvironment.scanForPotentialScores(grid),
    tilesToTop: cursor[0] - GameEnvironment.getHighestTileRow(grid) // Distance from cursor to highest tile
  }, (_, v) => { return v === undefined ? "undefined" : v; } // retain undefined
);
}

export async function startTraining(headless = true) {
  const env = new GameEnvironment(headless);
  const agent = new QLearningAgent();
  let bestScore = 0;
  let highestScore = 0;
  let highestScoreEpisode = 0;

  for (let episode = 0; episode < EPISODES; episode++) {
    let { grid, cursor } = env.reset();
    let done = false;

    const startTime = Date.now();
    while (!done) {
      const state = getCompactGameState(grid, cursor);
      const action = agent.chooseAction(state, ALLOWED_MOVES);

      const { newState, reward, done: isDone } = await env.step(action);
      const nextState = getCompactGameState(newState.grid, newState.cursor);

      agent.updateQValue(state, action, reward, nextState);

      if (env.getState().score > bestScore) {
        agent.decreaseExplorationRate();
        bestScore = env.getState().score;
      }

      done = isDone;
      ({ grid } = newState);

      if (Date.now() - startTime >= 60000 && !done) {
        console.log(`Game lasted > 60 seconds!`);
        done = true;
      }
    }
    if ((episode + 1) % 25 === 0) {
      if (headless) {
        Deno.writeTextFile(
          "qTable.txt",
          JSON.stringify(Object.fromEntries(agent.qTable), null, 2),
        ).catch(console.error);
      } else {
        console.log("Q-Table:", Object.fromEntries(agent.qTable));
      }
    }

    const finalScore = env.getState().score;
    if (finalScore > highestScore) {
      highestScore = finalScore;
      highestScoreEpisode = episode;
    }



    console.log(
      `Episode ${
        episode + 1
      } completed with score ${finalScore}. Highest score so far: ${highestScore} at episode ${highestScoreEpisode}`,
    );
  }
}

// if called directly from cli
if (import.meta.main) {
  startTraining();
}
