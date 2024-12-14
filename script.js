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

        // Remove any amount parameters from the URL
        const urlObj = new URL(url);
        urlObj.searchParams.delete('amount');
        const cleanUrl = urlObj.toString().toLowerCase();
        console.log('Clean URL (no amount):', cleanUrl);

        // Convert URL to UTF-8 bytes
        const data = new TextEncoder().encode(cleanUrl);

        // Convert to base64URL
        const base64 = base64UrlEncode(data);

        // Format as Lightning LNURL
        const lnurl = 'LNURL' + base64;
        console.log('LNURL encoded:', lnurl);

        return lnurl;
    } catch (error) {
        console.error('Error in encodeLNURL:', error);
        throw error;
    }
}

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

        // Validate required fields
        if (!data.callback || !data.maxSendable || !data.minSendable || !data.metadata) {
            throw new Error('Invalid LNURL-pay data: missing required fields');
        }

        // Verify metadata format
        if (!Array.isArray(data.metadata) || !data.metadata.length) {
            throw new Error('Invalid LNURL-pay metadata format');
        }

        // Calculate metadata hash
        const metadataString = JSON.stringify(data.metadata);
        const metadataBytes = new TextEncoder().encode(metadataString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', metadataBytes);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return {
            ...data,
            metadataHash: hashHex
        };
    } catch (error) {
        console.error('Error fetching LNURL data:', error);
        throw error;
    }
}

async function verifyMetadataHash(metadata, invoice) {
    try {
        // Convert metadata string to UTF-8 bytes
        const metadataString = JSON.stringify(metadata);
        const metadataBytes = new TextEncoder().encode(metadataString);

        // Calculate SHA256 hash
        const hashBuffer = await crypto.subtle.digest('SHA-256', metadataBytes);
        const hashHex = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // Extract description_hash from invoice
        const descHashMatch = invoice.match(/description_hash=([0-9a-f]{64})/i);
        if (!descHashMatch) {
            throw new Error('Invoice missing description_hash');
        }

        const verified = hashHex === descHashMatch[1].toLowerCase();
        if (!verified) {
            console.error('Metadata hash verification failed');
            console.error('Expected:', descHashMatch[1].toLowerCase());
            console.error('Got:', hashHex);
            throw new Error('Metadata hash verification failed');
        }
        return verified;
    } catch (error) {
        console.error('Error verifying metadata hash:', error);
        throw error;
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

        // Generate base LNURL without amount
        const encodedLNURL = encodeLNURL(lnurlData.callback);
        console.log('Encoded LNURL:', encodedLNURL);

        // Store amount in data attribute if provided
        const qrDiv = document.getElementById('qrcode');
        if (amount !== null) {
            const millisats = parseInt(amount) * 1000;

            // Validate amount is within allowed range
            if (!lnurlData.minSendable || !lnurlData.maxSendable) {
                throw new Error('Invalid LNURL data: missing sendable limits');
            }
            if (millisats < lnurlData.minSendable || millisats > lnurlData.maxSendable) {
                throw new Error(`Amount must be between ${lnurlData.minSendable / 1000} and ${lnurlData.maxSendable / 1000} sats`);
            }

            qrDiv.dataset.amount = millisats.toString();
            qrDiv.dataset.callback = lnurlData.callback;
            console.log('Stored amount in data attribute:', millisats);
        } else {
            delete qrDiv.dataset.amount;
            delete qrDiv.dataset.callback;
        }

        // Clear existing QR code
        qrDiv.innerHTML = '';

        // Generate QR code with optimal settings for Lightning wallets
        const qr = qrcode(0, 'L');
        qr.addData(encodedLNURL, 'Byte');
        qr.make();

        // Generate SVG instead of GIF
        const svgString = qr.createSvgTag(4, 0);
        qrDiv.innerHTML = svgString;

        // Add alt text for accessibility
        const svgElement = qrDiv.querySelector('svg');
        if (svgElement) {
            svgElement.setAttribute('alt', 'Lightning Payment QR Code');
            svgElement.setAttribute('aria-label', 'Scan this QR code to make a Lightning payment');
        }

        // Update lightning address display
        const lightningAddressDiv = document.getElementById('lightningAddress');
        lightningAddressDiv.innerHTML = address;

    } catch (error) {
        console.error('Error generating QR code:', error);
        const qrDiv = document.getElementById('qrcode');
        qrDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

// Callback URL handler for LNURL-pay
async function handleCallback(callbackUrl, amount) {
    try {
        if (!callbackUrl || !amount) {
            throw new Error('Missing required parameters for callback');
        }

        // Construct callback URL with amount
        const url = new URL(callbackUrl);
        url.searchParams.set('amount', amount.toString());
        console.log('Callback URL with amount:', url.toString());

        // Make callback request
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`Failed to fetch invoice: ${response.status}`);
        }
        const data = await response.json();
        console.log('Callback response:', data);

        if (!data.pr) {
            throw new Error('No invoice in callback response');
        }

        return data.pr;
    } catch (error) {
        console.error('Error in callback handler:', error);
        throw error;
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
            const amount = this.dataset.amount;
            console.log('Selected preset amount:', amount);

            // Update button styles
            document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');

            // Generate QR code with preset amount
            await updateQRCode(amount);

            // If there's a stored callback URL and amount, try to generate invoice
            const qrDiv = document.getElementById('qrcode');
            if (qrDiv.dataset.callback && qrDiv.dataset.amount) {
                try {
                    const invoice = await handleCallback(qrDiv.dataset.callback, qrDiv.dataset.amount);
                    if (invoice) {
                        console.log('Generated invoice:', invoice);
                        qrDiv.dataset.invoice = invoice;
                    }
                } catch (error) {
                    console.error('Error generating invoice:', error);
                    qrDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
                }
            }
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
