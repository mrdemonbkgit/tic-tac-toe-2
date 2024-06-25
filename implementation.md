# Tic-Tac-Toe Game Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [HTML Structure](#html-structure)
4. [CSS Styling](#css-styling)
5. [JavaScript Logic](#javascript-logic)
6. [AI Opponent Implementation](#ai-opponent-implementation)
7. [Game Flow](#game-flow)
8. [Future Enhancements](#future-enhancements)

## Overview

This document outlines the technical implementation of a Tic-Tac-Toe game using HTML, CSS, and JavaScript. The game allows two players to take turns or a single player to play against an AI opponent. It detects wins and draws, offers a restart functionality, and includes multiple AI difficulty levels.

## File Structure

The project consists of three main files:

- `index.html`: Contains the game's HTML structure
- `styles.css`: Defines the game's appearance
- `script.js`: Implements the game logic and AI opponent

## HTML Structure

The `index.html` file contains the following key elements:

1. A container div with class `game-container`
2. Game mode and AI difficulty selectors
3. A heading (h1) for the game title
4. A div with id `status-display` to show game status
5. A div with class `game-board` containing nine cell divs
6. A restart button with id `restart`
7. A footer with creator information

Key HTML snippet (updated):

```html
<div class="game-controls">
    <div>
        <label>Game Mode:</label>
        <select id="gameMode">
            <option value="PvP">Player vs Player</option>
            <option value="PvAI">Player vs AI</option>
        </select>
    </div>
    <div id="aiDifficultyControl" style="display: none;">
        <label>AI Difficulty:</label>
        <select id="aiDifficulty">
            <option value="Easy">Easy</option>
            <option value="Medium" selected>Medium</option>
            <option value="Hard">Hard</option>
        </select>
    </div>
</div>
<div class="game-container">
    <!-- ... (existing game board structure) ... -->
</div>
```

## CSS Styling

(No significant changes to this section)

## JavaScript Logic

The `script.js` file contains the game's logic. Key components now include:

1. Game state variables (including game mode and AI difficulty)
2. Winning conditions array
3. Cell click handler
4. Game state update functions
5. Win/draw detection
6. Player turn management
7. Game restart functionality
8. AI opponent logic
9. Game mode and difficulty selectors handlers

Key JavaScript functions (updated):

```javascript
function handleCellClick(clickedCellEvent) {
    // ... (check if the move is valid and it's player's turn)
    handleCellPlayed(clickedCell, clickedCellIndex);
    handleResultValidation();
    if (gameMode === 'PvAI' && gameActive) {
        // Trigger AI move
        makeAIMove();
    }
}

function handleRestartGame() {
    // ... (reset game state)
    if (gameMode === 'PvAI' && currentPlayer === "O") {
        makeAIMove();
    }
}
```

## AI Opponent Implementation

The AI opponent is implemented using the Minimax algorithm with alpha-beta pruning. It offers three difficulty levels: Easy, Medium, and Hard.

Key components of the AI implementation:

1. `getBestMove()`: Selects the best move based on the current difficulty level
2. `getRandomMove()`: Used for the Easy difficulty level
3. `minimax()`: Implements the Minimax algorithm with alpha-beta pruning
4. `checkWinner()`: Helper function to check if a player has won

Key AI functions:

```javascript
function getBestMove() {
    if (aiDifficulty === 'Easy') {
        return getRandomMove();
    } else {
        return minimax(gameState, currentPlayer, 0, -Infinity, Infinity).index;
    }
}

function minimax(board, player, depth, alpha, beta) {
    // ... (Minimax implementation with alpha-beta pruning)
}
```

Difficulty levels are implemented as follows:
- Easy: Makes random moves
- Medium: Uses Minimax with a depth limit
- Hard: Uses full Minimax with alpha-beta pruning

## Game Flow

1. The game initializes with Player X's turn in PvP mode or player's turn in PvAI mode.
2. Players can select game mode (PvP or PvAI) and AI difficulty.
3. In PvP mode, players take turns clicking on empty cells.
4. In PvAI mode, the player clicks on empty cells, and the AI responds automatically.
5. After each move, the game checks for a win or draw condition.
6. When a player wins or the game draws, a message is displayed.
7. Players can restart the game at any time using the restart button.

## Future Enhancements

Potential areas for improvement include:

1. Implementing move animations
2. Adding sound effects
3. Creating a win streak counter
4. Implementing an undo move feature
5. Adding a timed mode

To implement these enhancements, modify the existing JavaScript logic and add new functions as needed. Ensure to update the HTML and CSS accordingly for any new UI elements.
