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

        // Fetch invoice data from callback URL
        const invoiceResponse = await fetch(paymentUrl);
        if (!invoiceResponse.ok) {
            throw new Error(`Failed to fetch invoice: ${invoiceResponse.status}`);
        }
        const invoiceData = await invoiceResponse.json();
        console.log('Invoice data:', invoiceData);

        // Verify metadata hash
        if (!(await verifyMetadataHash(lnurlData.metadata, invoiceData.pr))) {
            throw new Error('Invoice metadata verification failed');
        }

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
