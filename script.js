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

// Bech32 implementation
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

// Initialize bech32 functionality
let bech32Initialized = false;

function initializeBech32() {
    if (!CHARSET || !GENERATOR) {
        throw new Error('Failed to initialize bech32 library: missing constants');
    }
    bech32Initialized = true;
}

function bech32_polymod(values) {
    if (!bech32Initialized) {
        initializeBech32();
    }
    let chk = 1;
    for (let p = 0; p < values.length; ++p) {
        const top = chk >> 25;
        chk = (chk & 0x1ffffff) << 5 ^ values[p];
        for (let i = 0; i < 5; ++i) {
            if ((top >> i) & 1) {
                chk ^= GENERATOR[i];
            }
        }
    }
    return chk;
}

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

// Game event listeners
document.querySelectorAll('.cell').forEach(cell => cell.addEventListener('click', handleCellClick));
document.querySelector('#restart').addEventListener('click', handleRestartGame);

// LNURL utilities
function getLNURLEndpoint(address) {
    const [username, domain] = address.split('@');
    return `https://${domain}/.well-known/lnurlp/${username}`;
}

async function fetchLNURLData(endpoint) {
    try {
        console.log('Fetching LNURL data from:', endpoint);
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('LNURL data received:', data);
        if (!data.callback) {
            throw new Error('Invalid LNURL response: missing callback URL');
        }
        return data;
    } catch (error) {
        console.error('LNURL data fetch error:', error);
        throw new Error(`Failed to fetch LNURL data: ${error.message}`);
    }
}

function encodeLNURL(url) {
    try {
        console.log('Encoding URL:', url);

        // Convert string to byte array
        const data = new TextEncoder().encode(url.toLowerCase());

        // Convert to 5-bit array
        const words = [];
        for (let i = 0; i < data.length; ++i) {
            const b = data[i];
            for (let j = 0; j < 8; j += 5) {
                words.push((b >> (8 - (j + 5))) & 31);
            }
        }

        // Add checksum
        const checksum = bech32_polymod([...Array(5).fill(2), ...words, ...Array(6).fill(0)]) ^ 1;
        for (let i = 0; i < 6; ++i) {
            words.push((checksum >> (5 * (5 - i))) & 31);
        }

        // Encode to bech32
        const result = 'lnurl' + words.map(w => CHARSET.charAt(w)).join('');
        console.log('Successfully encoded LNURL:', result);
        return result.toUpperCase();
    } catch (error) {
        console.error('LNURL encoding error:', error);
        throw error;
    }
}

// QR code generation function
async function updateQRCode(amount = null) {
    try {
        // Check if QR code library is loaded
        if (typeof qrcode !== 'function') {
            throw new Error('QR code library not loaded');
        }

        // Initialize bech32 if not already initialized
        if (!bech32Initialized) {
            initializeBech32();
        }

        const address = 'steelybowling85@walletofsatoshi.com';
        const [username, domain] = address.split('@');
        const baseUrl = `https://${domain}/.well-known/lnurlp/${username}`;

        // Fetch LNURL data first to get callback URL
        const lnurlData = await fetchLNURLData(baseUrl);
        console.log('LNURL data:', lnurlData);

        // Construct payment URL with proper callback handling
        let paymentUrl;
        if (amount) {
            const millisats = parseInt(amount) * 1000;
            if (millisats < lnurlData.minSendable || millisats > lnurlData.maxSendable) {
                throw new Error(`Amount must be between ${lnurlData.minSendable / 1000} and ${lnurlData.maxSendable / 1000} sats`);
            }
            // Use callback URL for preset amounts
            paymentUrl = `${lnurlData.callback}?amount=${millisats}`;
            console.log('Using callback URL with amount:', paymentUrl);
        } else {
            // Use base URL for initial QR code
            paymentUrl = baseUrl;
            console.log('Using base URL:', paymentUrl);
        }

        // Generate LNURL with proper encoding
        const encodedLNURL = await encodeLNURL(paymentUrl);
        const lnurlString = `lightning:${encodedLNURL.toLowerCase()}`;
        console.log('Final LNURL string:', lnurlString);

        // Clear previous QR code and generate new one
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = '';

        // Create QR code with version 40 for maximum capacity and proper error correction
        const qr = qrcode(40, 'M');
        qr.addData(lnurlString);
        qr.make();

        // Create canvas element for PNG conversion
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const cellSize = 5;
        const margin = 20;
        const size = qr.getModuleCount() * cellSize + 2 * margin;

        canvas.width = size;
        canvas.height = size;

        // Fill background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        // Draw QR code
        ctx.fillStyle = '#000000';
        for (let row = 0; row < qr.getModuleCount(); row++) {
            for (let col = 0; col < qr.getModuleCount(); col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect(
                        col * cellSize + margin,
                        row * cellSize + margin,
                        cellSize,
                        cellSize
                    );
                }
            }
        }

        // Convert canvas to image
        const qrImage = document.createElement('img');
        qrImage.src = canvas.toDataURL('image/png');
        qrImage.style.width = '250px';
        qrImage.style.height = '250px';
        qrContainer.appendChild(qrImage);

    } catch (error) {
        console.error('Error generating QR code:', error);
        alert('Error generating Lightning payment QR code. Please try again.');
    }
}

// Donation Modal Functionality
const modal = document.getElementById('donationModal');
const btn = document.getElementById('donateBtn');
const span = document.getElementsByClassName('close')[0];
const lightningAddress = document.getElementById('lightningAddress');
let selectedAmount = null;

// Handle preset amount selection
document.querySelectorAll('.preset-btn').forEach(button => {
    button.addEventListener('click', async function() {
        const amount = this.dataset.amount;
        selectedAmount = amount;

        // Update button styles
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
        this.classList.add('selected');

        // Update QR code with amount
        await updateQRCode(amount);
    });
});

// Create QR code when modal opens
btn.onclick = async function() {
    modal.style.display = 'block';
    if (!document.getElementById('qrcode').hasChildNodes()) {
        await updateQRCode();
    }
}

// Close modal
span.onclick = function() {
    modal.style.display = 'none';
    // Reset selection when modal closes
    selectedAmount = null;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
}

// Copy lightning address to clipboard
lightningAddress.onclick = async function() {
    const address = 'steelybowling85@walletofsatoshi.com';
    const endpoint = getLNURLEndpoint(address);
    try {
        const lnurlData = await fetchLNURLData(endpoint);
        const callback = lnurlData.callback;

        let finalUrl;
        if (selectedAmount) {
            const millisats = parseInt(selectedAmount) * 1000;
            if (millisats < lnurlData.minSendable || millisats > lnurlData.maxSendable) {
                throw new Error(`Amount must be between ${lnurlData.minSendable / 1000} and ${lnurlData.maxSendable / 1000} sats`);
            }
            finalUrl = `${callback}?amount=${millisats}`;
        } else {
            finalUrl = endpoint;
        }

        const encodedLNURL = encodeLNURL(finalUrl);
        const lnurlString = `lightning:${encodedLNURL}`;
        await navigator.clipboard.writeText(lnurlString);
        alert('Lightning payment link copied to clipboard!');
    } catch (error) {
        console.error('Error copying payment link:', error);
        alert('Error generating Lightning payment link. Please try again.');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
        // Reset selection when modal closes
        selectedAmount = null;
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
    }
}
