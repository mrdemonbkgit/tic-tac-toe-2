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

// LNURL encoding utilities
function base64UrlEncode(str) {
    // Convert string to UTF-8 bytes
    const bytes = new TextEncoder().encode(str);
    // Convert bytes to base64 and make URL safe
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function encodeLNURL(url) {
    try {
        console.log('Encoding URL:', url);
        // Ensure URL is properly formatted
        const urlObj = new URL(url);
        // Convert all URL parameters to lowercase as per spec
        const searchParams = new URLSearchParams();
        for (const [key, value] of urlObj.searchParams) {
            searchParams.append(key.toLowerCase(), value);
        }
        // Reconstruct URL with sorted parameters
        const formattedUrl = `${urlObj.origin}${urlObj.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
        console.log('Formatted URL:', formattedUrl);

        // Encode URL to base64
        const encoded = base64UrlEncode(formattedUrl);
        // Add lightning: prefix to make it compatible with Lightning wallets
        const result = 'lightning:LNURL' + encoded.toLowerCase();
        console.log('Encoded LNURL:', result);
        return result;
    } catch (error) {
        console.error('Error in encodeLNURL:', error);
        throw error;
    }
}

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
function getLNURLEndpoint(address) {
    try {
        if (!address || !address.includes('@')) {
            throw new Error('Invalid Lightning address format');
        }
        const [username, domain] = address.split('@');
        if (!username || !domain) {
            throw new Error('Invalid Lightning address: missing username or domain');
        }
        const endpoint = `https://${domain}/.well-known/lnurlp/${username}`;
        console.log('LNURL endpoint:', endpoint);
        return endpoint;
    } catch (error) {
        console.error('Error in getLNURLEndpoint:', error);
        throw error;
    }
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
        const address = 'steelybowling85@walletofsatoshi.com';
        const baseUrl = getLNURLEndpoint(address);
        console.log('Base URL:', baseUrl);

        // Fetch LNURL data first to get callback URL
        const lnurlData = await fetchLNURLData(baseUrl);
        console.log('LNURL data:', lnurlData);

        if (!lnurlData || !lnurlData.callback) {
            throw new Error('Invalid LNURL data: missing callback URL');
        }

        // Validate amount is within allowed range
        let paymentUrl = lnurlData.callback;
        if (amount !== null) {
            const millisats = parseInt(amount) * 1000;
            console.log('Amount in millisats:', millisats);

            if (!lnurlData.minSendable || !lnurlData.maxSendable) {
                throw new Error('Invalid LNURL data: missing sendable limits');
            }

            if (millisats < lnurlData.minSendable || millisats > lnurlData.maxSendable) {
                throw new Error(`Amount must be between ${lnurlData.minSendable / 1000} and ${lnurlData.maxSendable / 1000} sats`);
            }

            // Construct callback URL with amount
            const callbackUrl = new URL(lnurlData.callback);
            callbackUrl.searchParams.set('amount', millisats.toString());
            paymentUrl = callbackUrl.toString();
        }
        console.log('Payment URL:', paymentUrl);

        // Generate LNURL
        const encodedLNURL = encodeLNURL(paymentUrl);
        console.log('Encoded LNURL:', encodedLNURL);

        // Clear existing QR code
        const qrDiv = document.getElementById('qrcode');
        qrDiv.innerHTML = '';

        // Generate QR code with proper settings
        const qr = qrcode(0, 'L');
        qr.addData(encodedLNURL);
        qr.make();

        // Create QR code image
        const qrImage = qr.createImgTag(4);
        qrDiv.innerHTML = qrImage;

        // Update lightning address display
        const lightningAddressDiv = document.getElementById('lightningAddress');
        lightningAddressDiv.innerHTML = address;

    } catch (error) {
        console.error('Error generating QR code:', error);
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
