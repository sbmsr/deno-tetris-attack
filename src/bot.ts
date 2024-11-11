import type { Game } from "./game.ts";
import { ALLOWED_MOVES, getGridAreaAroundCursor } from "./lib.ts";

export class Bot {
  #qTable;
  #playRateMs;
  #game;
  #interval: number | null = null;

  constructor(qTable: Map<string, number>, playRateMs: number, game: Game) {
    this.#qTable = qTable;
    this.#playRateMs = playRateMs;
    this.#game = game;
  }

  start() {
    if (!this.#game.playing) return;

    this.#interval = setInterval(() => {
      if (!this.#game.playing) {
        this.stop();
        return;
      }

      // Get current state
      const cursor = this.#game.cursor;
      const grid = getGridAreaAroundCursor(this.#game.grid, cursor);
      const state = JSON.stringify(
        { grid, cursor },
        (_, value) => value === undefined ? "undefined" : value,
      );

      // Find best action from Q-table
      const bestAction = ALLOWED_MOVES.reduce((best, action) => {
        const qValue = this.#qTable.get(`${state}-${action}`) || 0;
        return qValue > (this.#qTable.get(`${state}-${best}`) || 0)
          ? action
          : best;
      }, ALLOWED_MOVES[0]);

      // Execute the action
      this.#game.handleAction({ key: bestAction } as any);
    }, this.#playRateMs);
  }

  stop() {
    if (this.#interval) {
      clearInterval(this.#interval);
      this.#interval = null;
    }
  }
}
