import { ALLOWED_MOVES, Game, type GameConfig } from "../game.ts";
import {
  getGridAreaAroundCursor,
  getRandomNumber,
} from "../lib.ts";

const EPISODES = 1000;

export class GameEnvironment {
  private game: Game;
  private config: GameConfig = Object.freeze({
    SQUARE_SIZE: 50,
    MS_BETWEEN_RENDERS: 1,
    MS_BETWEEN_ROW_INSERT: 10,
    CELL_HEIGHT: 12,
    CELL_WIDTH: 6,
    CANVAS_HEIGHT: 600,
    CANVAS_WIDTH: 300,
    STARTER_ROWS: 4,
  });

  constructor(headless = true) {
    this.game = new Game(Object.assign({}, this.config), headless); // Run in headless mode
  }

  reset() {
    this.game.restart();
    return this.getState(); // Return initial state
  }

  getState() {
    // Represent just the tiles around cursor and score
    const grid = getGridAreaAroundCursor(this.game.grid, this.game.cursor);
    const score = this.game.score;
    const cursor = this.game.cursor;
    return { grid, score, cursor };
  }

  async step(action: string) {
    const { score: oldScore } = this.getState();
    // Create a simple event-like object with the key property
    this.game.handleAction({ key: action } as any);

    // Introduce a delay between renders
    await new Promise((resolve) =>
      setTimeout(resolve, this.config.MS_BETWEEN_RENDERS)
    );

    // After the action, capture the new state, reward, and game status
    const newState = this.getState();
    const { score: newScore } = newState;
    // More nuanced reward structure
    let reward = -0.01; // Smaller penalty for each move to encourage exploration

    if (newScore > oldScore) {
      reward = Math.min(30, newScore - oldScore); // Proportional reward for scoring
    } else {
      // Check if the move created potential scoring opportunities
      const { grid } = newState;
      const [cursorY, cursorX] = this.game.cursor;

      // Look for pairs of matching tiles that could lead to scoring
      const cursorRow = grid[1]; // Current row is always index 1 in our 3-row view
      if (cursorRow) {
        // Check horizontal pairs
        for (let x = 0; x < cursorRow.length - 1; x++) {
          if (cursorRow[x] !== undefined && cursorRow[x] === cursorRow[x + 1]) {
            reward += 0.1; // Small reward for creating/maintaining pairs
          }
        }

        // Check vertical pairs
        for (let x = 0; x < cursorRow.length; x++) {
          if (
            grid[0] && grid[2] && // Check above and below exist
            cursorRow[x] !== undefined &&
            (cursorRow[x] === grid[0][x] || cursorRow[x] === grid[2][x])
          ) {
            reward += 0.1; // Small reward for vertical pairs
          }
        }
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

  constructor(learningRate = 0.2, discountFactor = 0.7, explorationRate = 1.0) {
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
    this.#explorationRate *= 0.99;
  }
}

export async function startTraining(headless = true) {
  const env = new GameEnvironment(headless);
  const agent = new QLearningAgent();

  for (let episode = 0; episode < EPISODES; episode++) {
    let { grid, cursor } = env.reset();
    let done = false;

    const startTime = Date.now();
    while (!done) {
      const state = JSON.stringify(
        { grid, cursor },
        (_, value) => value === undefined ? "undefined" : value,
      );
      const action = agent.chooseAction(state, ALLOWED_MOVES);

      const { newState, reward, done: isDone } = await env.step(action);
      const nextState = JSON.stringify(newState);

      agent.updateQValue(state, action, reward, nextState);
      agent.decreaseExplorationRate();

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

    console.log(`Episode ${episode + 1} completed with score ${env.getState().score}.`);
  }
}

// if called directly from cli
if (import.meta.main) {
  startTraining(); 
}
