// Math Arena — PeerJS Connection Manager with Short Room Codes

// Characters to use for room codes (A-Z, 2-9 - skipping O, I, 0, 1 for clarity)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;
const MAX_RETRY_ATTEMPTS = 5;

class PeerManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.roomCode = null;
        this.retryCount = 0;
    }

    /**
     * Generate a random 5-character alphanumeric room code
     * Uses characters that are visually distinct (no O, I, 0, 1)
     */
    generateRoomCode() {
        let code = '';
        for (let i = 0; i < CODE_LENGTH; i++) {
            const randomIndex = Math.floor(Math.random() * CODE_CHARS.length);
            code += CODE_CHARS[randomIndex];
        }
        return code;
    }

    /**
     * Validate that a room code is properly formatted
     */
    isValidRoomCode(code) {
        if (!code || code.length !== CODE_LENGTH) return false;
        // Check all characters are valid
        for (const char of code.toUpperCase()) {
            if (!CODE_CHARS.includes(char)) return false;
        }
        return true;
    }

    /**
     * Create a new peer with a custom short room code
     * Retries with a new code if the ID is already taken
     */
    async createPeerWithRetry() {
        if (this.retryCount >= MAX_RETRY_ATTEMPTS) {
            game.setConnectionStatus('error', 'Could not create room. Please try again.');
            this.retryCount = 0;
            return;
        }

        this.roomCode = this.generateRoomCode();
        console.log(`Attempting room code: ${this.roomCode} (attempt ${this.retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);

        // Create peer with custom ID (our short room code)
        this.peer = new Peer(this.roomCode, {
            debug: 2
        });

        return new Promise((resolve, reject) => {
            // Set up error handler for "unavailable-id" error
            this.peer.once('error', (err) => {
                if (err.type === 'unavailable-id') {
                    console.log(`Room code ${this.roomCode} already taken, generating new one...`);
                    this.retryCount++;
                    // Clean up the failed peer
                    try {
                        this.peer.destroy();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    // Retry with a new code
                    this.createPeerWithRetry().then(resolve).catch(reject);
                } else {
                    // Other errors - propagate
                    this.setupPeerEvents();
                    reject(err);
                }
            });

            // Success - the ID was available
            this.peer.once('open', (id) => {
                console.log(`Room code ${this.roomCode} is available!`);
                this.retryCount = 0; // Reset retry count on success
                this.setupPeerEvents();
                this.isHost = true;
                resolve(id);
            });
        });
    }

    createPeer() {
        // Use the retry mechanism to get an available room code
        this.createPeerWithRetry().then((id) => {
            game.setPeerId(this.roomCode);
            game.setConnectionStatus('waiting', 'Waiting for opponent...');
        }).catch((err) => {
            console.error('Failed to create room:', err);
            game.setConnectionStatus('error', 'Connection error: ' + err.type);
        });
    }

    connectToPeer(roomCode) {
        // Validate room code format
        const normalizedCode = roomCode.toUpperCase().trim();
        if (!this.isValidRoomCode(normalizedCode)) {
            game.setConnectionStatus('error', 'Invalid room code. Must be 5 characters.');
            return;
        }

        game.setConnectionStatus('connecting', 'Connecting...');
        this.roomCode = normalizedCode;

        // Create peer first (if not exists)
        if (!this.peer) {
            // Joining peer gets a random ID from PeerJS
            this.peer = new Peer(null, {
                debug: 2
            });
            this.setupPeerEvents();
        }

        // Connect to host's room code
        this.conn = this.peer.connect(this.roomCode, {
            reliable: true
        });

        this.setupConnectionEvents();
        this.isHost = false;
    }

    setupPeerEvents() {
        this.peer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            if (this.isHost) {
                // For host, id should match our room code
                game.setPeerId(this.roomCode);
            }
            game.setConnectionStatus('waiting', 'Waiting for opponent...');
        });

        this.peer.on('connection', (conn) => {
            console.log('Incoming connection from: ' + conn.peer);
            this.conn = conn;
            this.setupConnectionEvents();
        });

        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
            if (err.type === 'peer-unavailable') {
                game.setConnectionStatus('error', 'Room not found. Check the code and try again.');
            } else {
                game.setConnectionStatus('error', 'Connection error: ' + err.type);
            }
        });

        this.peer.on('disconnected', () => {
            console.log('Peer disconnected');
            game.onPeerDisconnected();
        });
    }

    setupConnectionEvents() {
        this.conn.on('open', () => {
            console.log('Connection established!');
            game.setConnectionStatus('connected', 'Connected');
            game.onPeerConnected();

            // Send avatar after connection
            if (game && game.myAvatar) {
                this.send({ type: 'avatar', avatar: game.myAvatar });
            }
        });

        this.conn.on('data', (data) => {
            console.log('Received:', data);
            game.handlePeerMessage(data);
        });

        this.conn.on('close', () => {
            console.log('Connection closed');
            game.onPeerDisconnected();
        });

        this.conn.on('error', (err) => {
            console.error('Connection error:', err);
            game.setConnectionStatus('error', 'Connection failed. Room may not exist.');
        });
    }

    send(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    disconnect() {
        if (this.conn) {
            this.conn.close();
            this.conn = null;
        }
        if (this.peer) {
            this.peer.disconnect();
            this.peer.destroy();
            this.peer = null;
        }
        this.roomCode = null;
        this.retryCount = 0;
        game.setConnectionStatus('disconnected', 'Disconnected');
    }
}

// Initialize peer manager
const peerManager = new PeerManager();
