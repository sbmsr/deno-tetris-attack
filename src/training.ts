import { ALLOWED_MOVES, Game, type GameConfig, type Grid } from "./game.ts";
import { getRandomNumber } from "./lib.ts";

const EPISODES = 100_000;

export class GameEnvironment {
  private game: Game;
  private config: GameConfig = Object.freeze({
    SQUARE_SIZE: 50,
    MS_BETWEEN_RENDERS: 1,
    MS_BETWEEN_ROW_INSERT: 10,
    CELL_HEIGHT: 4,
    CELL_WIDTH: 3,
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
  private getHighestTileRow(): number {
    let highestTileRow = 0;
    for (let y = 0; y < this.game.grid.length; y++) {
      if (
        this.game.grid[y].some((cell) => cell !== undefined)
      ) {
        highestTileRow = y;
        break;
      }
    }
    return highestTileRow;
  }

  scanForPotentialScores(grid: Grid) {
    let potentialScores = 0;

    // Scan horizontally for adjacent matching tiles
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length - 1; x++) {
        const current = grid[y][x];
        const next = grid[y][x + 1];
        if (current && next && current === next) {
          potentialScores++;
        }
      }
    }

    // Scan vertically for adjacent matching tiles
    for (let y = 0; y < grid.length - 1; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const current = grid[y][x];
        const next = grid[y + 1][x];
        if (current && next && current === next) {
          potentialScores++;
        }
      }
    }

    return potentialScores;
  }

  async step(action: string) {
    const { score: oldScore, grid: oldGrid } = this.getState();
    this.game.handleAction({ key: action } as any);

    await new Promise((resolve) =>
      setTimeout(resolve, this.config.MS_BETWEEN_RENDERS)
    );

    // After the action, capture the new state, reward, and game status
    const newState = this.getState();
    const { score: newScore } = newState;

    let reward = 0;

    if (newScore > oldScore) {
      reward = Math.min(30, newScore - oldScore); // Proportional reward for scoring
    } else {
      // Check if the move created potential scoring opportunities
      const { grid } = newState;

      const oldPotentialScores = this.scanForPotentialScores(oldGrid);
      const newPotentialScores = this.scanForPotentialScores(grid);

      if (newPotentialScores > oldPotentialScores) {
        reward += 10; // Small boost for creating more potential scoring opportunities
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

function getState(grid: Grid) {
  return JSON.stringify(
    { grid },
    (_, value) => value === undefined ? "undefined" : value, // needed b/c stringify turns undefined to null
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
      const state = JSON.stringify(
        { grid, cursor },
        (_, value) => value === undefined ? "undefined" : value, // needed b/c stringify turns undefined to null
      );
      const action = agent.chooseAction(state, ALLOWED_MOVES);

      const { newState, reward, done: isDone } = await env.step(action);
      const nextState = JSON.stringify(
        { grid: newState.grid, cursor: newState.cursor },
        (_, value) => value === undefined ? "undefined" : value, // needed b/c stringify turns undefined to null
      );

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
