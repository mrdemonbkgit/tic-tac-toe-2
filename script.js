const statusDisplay = document.querySelector('#status-display');
let gameActive = true;
let currentPlayer = "X";
let gameState = ["", "", "", "", "", "", "", "", ""];
let gameMode = 'PvP'; // 'PvP' or 'PvAI'
let aiDifficulty = 'Medium'; // 'Easy', 'Medium', or 'Hard'
let isPlayerTurn = true;

const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

document.getElementById('gameMode').addEventListener('change', function(e) {
    gameMode = e.target.value;
    const aiDifficultyControl = document.getElementById('aiDifficultyControl');
    aiDifficultyControl.style.display = gameMode === 'PvAI' ? 'block' : 'none';
    handleRestartGame();
});

document.getElementById('aiDifficulty').addEventListener('change', function(e) {
    aiDifficulty = e.target.value;
    handleRestartGame();
});

function makeAIMove() {
    const aiMove = getBestMove();
    const cell = document.querySelector(`[data-cell-index="${aiMove}"]`);
    handleCellPlayed(cell, aiMove);
    handleResultValidation();
    isPlayerTurn = true;
}

function getBestMove() {
    if (aiDifficulty === 'Easy') {
        return getRandomMove();
    } else {
        return minimax(gameState, currentPlayer, 0, -Infinity, Infinity).index;
    }
}

function getRandomMove() {
    const availableMoves = gameState.reduce((acc, cell, index) => {
        if (cell === "") acc.push(index);
        return acc;
    }, []);
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

function minimax(board, player, depth, alpha, beta) {
    const availableMoves = board.reduce((acc, cell, index) => {
        if (cell === "") acc.push(index);
        return acc;
    }, []);

    if (checkWinner(board, "X")) return { score: -10 + depth };
    if (checkWinner(board, "O")) return { score: 10 - depth };
    if (availableMoves.length === 0) return { score: 0 };

    if (aiDifficulty === 'Medium' && depth > 2) {
        return { score: 0 };
    }

    const moves = [];
    for (let i = 0; i < availableMoves.length; i++) {
        const move = {};
        move.index = availableMoves[i];
        board[availableMoves[i]] = player;

        if (player === "O") {
            const result = minimax(board, "X", depth + 1, alpha, beta);
            move.score = result.score;
            alpha = Math.max(alpha, move.score);
        } else {
            const result = minimax(board, "O", depth + 1, alpha, beta);
            move.score = result.score;
            beta = Math.min(beta, move.score);
        }

        board[availableMoves[i]] = "";
        moves.push(move);

        if (beta <= alpha) {
            break;
        }
    }

    let bestMove;
    if (player === "O") {
        let bestScore = -Infinity;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score > bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score < bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    }

    return moves[bestMove];
}

function checkWinner(board, player) {
    for (let i = 0; i <= 7; i++) {
        const winCondition = winningConditions[i];
        let a = board[winCondition[0]];
        let b = board[winCondition[1]];
        let c = board[winCondition[2]];
        if (a === player && b === player && c === player) {
            return true;
        }
    }
    return false;
}

function handleCellClick(clickedCellEvent) {
    const clickedCell = clickedCellEvent.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-cell-index'));

    if (gameState[clickedCellIndex] !== "" || !gameActive || (gameMode === 'PvAI' && !isPlayerTurn)) {
        return;
    }

    handleCellPlayed(clickedCell, clickedCellIndex);
    handleResultValidation();

    if (gameMode === 'PvAI' && gameActive) {
        isPlayerTurn = false;
        statusDisplay.innerHTML = "AI is thinking...";
        setTimeout(() => {
            makeAIMove();
        }, 500);
    }
}

function handleCellPlayed(clickedCell, clickedCellIndex) {
    gameState[clickedCellIndex] = currentPlayer;
    clickedCell.innerHTML = currentPlayer;
}

function handleResultValidation() {
    let roundWon = false;
    for (let i = 0; i <= 7; i++) {
        const winCondition = winningConditions[i];
        let a = gameState[winCondition[0]];
        let b = gameState[winCondition[1]];
        let c = gameState[winCondition[2]];
        if (a === '' || b === '' || c === '') {
            continue;
        }
        if (a === b && b === c) {
            roundWon = true;
            break
        }
    }

    if (roundWon) {
        statusDisplay.innerHTML = `Player ${currentPlayer} has won!`;
        gameActive = false;
        return;
    }

    let roundDraw = !gameState.includes("");
    if (roundDraw) {
        statusDisplay.innerHTML = `Game ended in a draw!`;
        gameActive = false;
        return;
    }

    handlePlayerChange();
}

function handlePlayerChange() {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    if (gameMode === 'PvAI') {
        isPlayerTurn = currentPlayer === "X";
        statusDisplay.innerHTML = isPlayerTurn ? "Your turn (X)" : "AI's turn (O)";
    } else {
        statusDisplay.innerHTML = `Player ${currentPlayer}'s turn`;
    }
}

function handleRestartGame() {
    gameActive = true;
    currentPlayer = "X";
    gameState = ["", "", "", "", "", "", "", "", ""];
    isPlayerTurn = true;
    statusDisplay.innerHTML = gameMode === 'PvAI' ? "Your turn (X)" : `Player ${currentPlayer}'s turn`;
    document.querySelectorAll('.cell').forEach(cell => cell.innerHTML = "");
    if (gameMode === 'PvAI' && currentPlayer === "O") {
        isPlayerTurn = false;
        makeAIMove();
    }
}

function runAITest(games = 100) {
    let aiWins = 0;
    let playerWins = 0;
    let draws = 0;

    for (let i = 0; i < games; i++) {
        const result = playSingleGame();
        if (result === 'AI') aiWins++;
        else if (result === 'Player') playerWins++;
        else draws++;
    }

    console.log(`AI Wins: ${aiWins}, Player Wins: ${playerWins}, Draws: ${draws}`);
}

function playSingleGame() {
    handleRestartGame();
    while (gameActive) {
        if (currentPlayer === 'X') {
            const move = getRandomMove();
            handleCellPlayed(document.querySelector(`[data-cell-index="${move}"]`), move);
        } else {
            makeAIMove();
        }
        handleResultValidation();
    }

    if (statusDisplay.innerHTML.includes('Player X')) return 'Player';
    if (statusDisplay.innerHTML.includes('Player O')) return 'AI';
    return 'Draw';
}

// runAITest();

document.querySelectorAll('.cell').forEach(cell => cell.addEventListener('click', handleCellClick));
document.querySelector('#restart').addEventListener('click', handleRestartGame);