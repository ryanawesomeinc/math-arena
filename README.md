# Math Arena

A head-to-head math competition game for kids on phones. Two players connect peer-to-peer and race to solve math problems first.

## How to Run

### Option 1: Simple HTTP Server (Python)
```bash
cd ~/math-arena
python3 -m http.server 8080
```
Open http://localhost:8080 on two devices (same WiFi/LAN).

### Option 2: Bun Server
```bash
cd ~/math-arena
bun run --watch index.html
```

### Option 3: Static Hosting
Deploy to GitHub Pages, Netlify, or any static host.

## How to Play

1. **Player A**: Click "Create Game" → Share the 5-letter Room Code with Player B
2. **Player B**: Click "Join Game" → Enter Player A's Room Code
3. Once connected, both players see the same math problem
4. First to tap the correct answer wins the round
5. First to 5 points wins the match!

## Game Rules

- **Win condition**: First to 5 correct answers wins
- **Difficulty ramping**: After 3 correct answers, operands gain one digit (2+3 → 12+23)
- **Timeout**: 30 seconds per round
- **Starting difficulty**: Single-digit addition/subtraction

## Tech Stack

- **Frontend**: Pure HTML, CSS, JavaScript (no framework)
- **P2P Connection**: PeerJS (WebRTC) via CDN
- **Hosting**: Static files only — works on GitHub Pages, Netlify, etc.

## Files

- `index.html` — Main game interface
- `styles.css` — Mobile-first responsive styles
- `game.js` — Game logic, problem generation, scoring
- `peer.js` — PeerJS connection management

## MVP Scope

- Same WiFi/LAN only (no TURN server for cross-Internet)
- 2 players max
- No persistence (scores reset on refresh)
- Addition/subtraction only

## v2 Ideas

- Multiplication/division
- RPG progression (levels, avatars)
- TV casting (Chromecast/AirPlay)
- Tournament mode
- Cross-Internet via TURN server
