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

const bech32 = {
    toWords(bytes) {
        const ret = [];
        let acc = 0;
        let bits = 0;
        const maxv = (1 << 5) - 1;

        for (let p = 0; p < bytes.length; ++p) {
            acc = (acc << 8) | bytes[p];
            bits += 8;
            while (bits >= 5) {
                bits -= 5;
                ret.push((acc >> bits) & maxv);
            }
        }

        if (bits > 0) {
            ret.push((acc << (5 - bits)) & maxv);
        }

        return ret;
    },

    encode(hrp, data) {
        const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
        const combined = data.map(d => {
            if (d >> 5 !== 0) {
                throw new Error(`Invalid data value: ${d}`);
            }
            return d;
        });

        let checksum = bech32_polymod([...hrp.split('').map(c => c.charCodeAt(0) >> 5),
            0,
            ...hrp.split('').map(c => c.charCodeAt(0) & 31),
            ...combined]);

        // Convert to 5-bit groups and add checksum
        const words = [...combined, ...Array(6).fill(0).map((_, i) => (checksum >> (5 * (5 - i))) & 31)];

        // Encode to base32
        return `${hrp}1${words.map(i => CHARSET.charAt(i)).join('')}`;
    }
};

function bech32_polymod(values) {
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
function getLNURLEndpoint() {
    const username = 'steelybowling85';
    return `https://walletofsatoshi.com/.well-known/lnurlp/${username}`;
}

async function fetchLNURLData(endpoint) {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('LNURL data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching LNURL data:', error);
        throw error;
    }
}

// Metadata hash verification function
async function verifyMetadataHash(metadata, invoice) {
    try {
        console.log('Verifying metadata hash for:', metadata);

        // Convert metadata string to UTF-8 bytes
        const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));

        // Calculate SHA256 hash
        const hash = await crypto.subtle.digest('SHA-256', metadataBytes);

        // Convert hash to hex string
        const hashHex = Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        console.log('Calculated metadata hash:', hashHex);

        // Extract description_hash from invoice
        const descHashMatch = invoice.match(/description_hash=([0-9a-f]{64})/i);
        if (!descHashMatch) {
            throw new Error('Invoice missing description_hash');
        }

        const matches = hashHex === descHashMatch[1].toLowerCase();
        console.log('Hash verification result:', matches);
        return matches;
    } catch (error) {
        console.error('Error verifying metadata hash:', error);
        throw new Error('Failed to verify metadata hash: ' + error.message);
    }
}

async function encodeLNURL(url) {
    try {
        console.log('Encoding URL:', url);

        // Convert URL to UTF-8 bytes using TextEncoder
        const encoder = new TextEncoder();
        const bytes = encoder.encode(url.toLowerCase());
        console.log('URL bytes:', bytes);

        // Convert to 5-bit words using our bech32 implementation
        const words = bech32.toWords(Array.from(bytes));
        console.log('Words:', words);

        // Encode with proper hrp (human readable part)
        const encoded = bech32.encode('lnurl', words);
        console.log('Encoded LNURL:', encoded);

        // Return uppercase as per spec
        return encoded.toUpperCase();
    } catch (error) {
        console.error('Error in encodeLNURL:', error);
        throw new Error('Failed to encode LNURL: ' + error.message);
    }
}

// QR code generation function
async function updateQRCode(amount = null) {
    try {
        console.log('Updating QR code with amount:', amount);
        const qrDiv = document.getElementById('qrcode');
        qrDiv.innerHTML = ''; // Clear existing QR code

        // Get LNURL data
        const lnurlData = await fetchLNURLData(getLNURLEndpoint());
        console.log('LNURL data received:', lnurlData);

        // Validate amount if provided
        if (amount !== null) {
            const amountMsat = amount * 1000; // Convert sats to millisats
            if (amountMsat < lnurlData.minSendable || amountMsat > lnurlData.maxSendable) {
                throw new Error(`Amount must be between ${lnurlData.minSendable / 1000} and ${lnurlData.maxSendable / 1000} sats`);
            }
        }

        // Construct the callback URL with amount if provided
        const callbackUrl = new URL(lnurlData.callback);
        if (amount !== null) {
            callbackUrl.searchParams.set('amount', amount * 1000); // Convert to millisats
        }

        try {
            // Generate LNURL with optimized encoding
            const encodedUrl = await encodeLNURL(callbackUrl.toString());
            console.log('Generated LNURL:', encodedUrl);

            // Create QR code with higher version and error correction
            if (typeof qrcode !== 'function') {
                throw new Error('QR code library not initialized');
            }

            const qr = qrcode(0, 'L'); // Auto version with low error correction
            qr.addData(`lightning:${encodedUrl.toUpperCase()}`);
            qr.make();

            // Create optimized QR code image
            const img = new Image();
            img.src = qr.createDataURL(4);
            qrDiv.appendChild(img);

            console.log('QR code generated successfully');
        } catch (qrError) {
            console.error('QR code generation error:', qrError);
            throw new Error(`Failed to generate QR code: ${qrError.message}`);
        }
    } catch (error) {
        console.error('Error in updateQRCode:', error);
        const qrDiv = document.getElementById('qrcode');
        qrDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
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
        try {
            const amount = parseInt(this.dataset.amount, 10);
            if (isNaN(amount)) {
                throw new Error('Invalid amount');
            }
            selectedAmount = amount;

            // Update button styles
            document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');

            // Update QR code with amount
            await updateQRCode(amount);
        } catch (error) {
            console.error('Error handling preset amount:', error);
            const qrDiv = document.getElementById('qrcode');
            qrDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        }
    });
});

// Create QR code when modal opens
btn.onclick = async function() {
    modal.style.display = 'block';
    await updateQRCode();
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

        const encodedLNURL = await encodeLNURL(finalUrl);
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
