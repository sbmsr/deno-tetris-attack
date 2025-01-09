# Deno Tetris Attack

A Tetris Attack clone, built on Deno, with Bot support.

## Table of Contents
- [Description](#description)
- [How It Works](#how-it-works)
- [Running the Project](#running-the-project)
- [Development Setup](#development-setup)
- [Contribution Guidelines](#contribution-guidelines)

## Description
This project is a Tetris Attack clone implemented using Deno. The game includes features such as random tile generation, scoring, gravity effects, and a bot to play the game.

## How It Works
The game logic is primarily found in the `game.ts` file, which includes the game configuration, grid handling, cursor movements, and scoring logic. The game is run as a web server that serves the game files and handles game logic requests.

### Key Features
- **Grid Management:** Handles the game grid, including tile placement and clearing.
- **Cursor Movements:** Allows users to move a cursor to swap tiles.
- **Scoring:** Implements scoring based on tile matches.
- **Bot:** An optional bot that uses a Q-learning approach to play the game.

## Running the Project
To run the project, you need to have Deno installed. Follow the steps below to start the game:

1. Clone the repository:
   ```bash
   git clone https://github.com/sbmsr/deno-tetris-attack.git
   cd deno-tetris-attack
   ```

2. Start the development server:
   ```bash
   deno task dev
   ```

3. Open your browser and navigate to `http://localhost:8000`.

## Development Setup
To set up the development environment, follow these steps:

1. Ensure you have Deno installed. You can install Deno from [the official website](https://deno.land/).

2. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/sbmsr/deno-tetris-attack.git
   cd deno-tetris-attack
   ```

3. Start the development server:
   ```bash
   deno task dev
   ```

4. Make your changes and the server will automatically reload with your updates.
