/**
 * Enhanced Audio System for Math Arena
 * Uses Web Audio API to create engaging sound effects
 */

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.soundEnabled = true;
        this.masterGain = null;
        this.initialized = false;
    }

    /**
     * Initialize audio context (must be called after user interaction)
     */
    async init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create master gain node for volume control
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.5; // Default volume
            this.masterGain.connect(this.audioContext.destination);

            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    /**
     * Ensure audio is initialized (lazy init on first sound)
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.init();
        }

        // Resume audio context if suspended (browser requirement)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Play a sound effect
     * @param {string} type - The type of sound to play
     */
    async playSound(type) {
        if (!this.soundEnabled) return;
        await this.ensureInitialized();

        if (!this.audioContext) return;

        try {
            switch (type) {
                case 'correct':
                    this.playCorrectAnswer();
                    break;
                case 'wrong':
                    this.playWrongAnswer();
                    break;
                case 'streak':
                    this.playStreakSound();
                    break;
                case 'timeout':
                    this.playTimeoutSound();
                    break;
                case 'levelUp':
                    this.playLevelUpSound();
                    break;
                case 'achievement':
                    this.playAchievementSound();
                    break;
                case 'buttonClick':
                    this.playButtonClick();
                    break;
                case 'modalOpen':
                    this.playModalOpen();
                    break;
                case 'modalClose':
                    this.playModalClose();
                    break;
                default:
                    console.warn('Unknown sound type:', type);
            }
        } catch (e) {
            // Silently fail to avoid breaking gameplay
            console.debug('Sound play error:', e);
        }
    }

    /**
     * Correct answer - Satisfying "ding!" with harmonic layers
     */
    playCorrectAnswer() {
        const now = this.audioContext.currentTime;
        const duration = 0.4;

        // Primary tone - bright major third arpeggio
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.03);

            // Envelope for bell-like sound
            gain.gain.setValueAtTime(0, now + i * 0.03);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.03 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.03 + duration);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + i * 0.03);
            osc.stop(now + i * 0.03 + duration);
        });

        // Add sparkle layer (higher harmonics)
        const sparkle = this.audioContext.createOscillator();
        const sparkleGain = this.audioContext.createGain();
        sparkle.type = 'triangle';
        sparkle.frequency.setValueAtTime(1046.50, now); // C6
        sparkle.frequency.exponentialRampToValueAtTime(1567.98, now + 0.1); // G6
        sparkleGain.gain.setValueAtTime(0, now);
        sparkleGain.gain.linearRampToValueAtTime(0.08, now + 0.02);
        sparkleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        sparkle.connect(sparkleGain);
        sparkleGain.connect(this.masterGain);
        sparkle.start(now);
        sparkle.stop(now + 0.15);
    }

    /**
     * Wrong answer - Gentle "wah-wah" descending tone
     */
    playWrongAnswer() {
        const now = this.audioContext.currentTime;

        // Primary wah-wah effect
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.linearRampToValueAtTime(200, now + 0.3);

        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.25);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    /**
     * Streak sound - Ascending major arpeggio (C-E-G-C)
     */
    playStreakSound() {
        const now = this.audioContext.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5

        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.06);

            const noteDuration = 0.2;
            gain.gain.setValueAtTime(0, now + i * 0.06);
            gain.gain.linearRampToValueAtTime(0.12, now + i * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + noteDuration);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + noteDuration);
        });

        // Add bass layer
        const bass = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(130.81, now); // C3
        bass.frequency.linearRampToValueAtTime(196.00, now + 0.24); // G3
        bassGain.gain.setValueAtTime(0, now);
        bassGain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        bass.connect(bassGain);
        bassGain.connect(this.masterGain);
        bass.start(now);
        bass.stop(now + 0.3);
    }

    /**
     * Timeout - Soft descending tone
     */
    playTimeoutSound() {
        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.4);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.4);
    }

    /**
     * Level up - Triumphant fanfare
     */
    playLevelUpSound() {
        const now = this.audioContext.currentTime;

        // Main fanfare sequence
        const fanfare = [
            { freq: 523.25, start: 0, dur: 0.15 },    // C5
            { freq: 659.25, start: 0.1, dur: 0.15 },  // E5
            { freq: 783.99, start: 0.2, dur: 0.15 },  // G5
            { freq: 1046.50, start: 0.3, dur: 0.4 },  // C6 (sustained)
        ];

        fanfare.forEach(({ freq, start, dur }) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + start);

            gain.gain.setValueAtTime(0, now + start);
            gain.gain.linearRampToValueAtTime(0.15, now + start + 0.02);
            gain.gain.setValueAtTime(0.15, now + start + dur - 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + start + dur);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + start);
            osc.stop(now + start + dur);
        });

        // Add celebration sparkle
        for (let i = 0; i < 5; i++) {
            const sparkle = this.audioContext.createOscillator();
            const sparkleGain = this.audioContext.createGain();

            sparkle.type = 'sine';
            sparkle.frequency.setValueAtTime(1000 + Math.random() * 500, now + 0.4 + i * 0.05);

            sparkleGain.gain.setValueAtTime(0, now + 0.4 + i * 0.05);
            sparkleGain.gain.linearRampToValueAtTime(0.05, now + 0.4 + i * 0.05 + 0.01);
            sparkleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4 + i * 0.05 + 0.08);

            sparkle.connect(sparkleGain);
            sparkleGain.connect(this.masterGain);

            sparkle.start(now + 0.4 + i * 0.05);
            sparkle.stop(now + 0.4 + i * 0.05 + 0.08);
        }
    }

    /**
     * Achievement unlock - Magical chime
     */
    playAchievementSound() {
        const now = this.audioContext.currentTime;

        // Ethereal chime layers
        [783.99, 987.77, 1174.66, 1318.51].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.04);

            const noteDuration = 0.5;
            gain.gain.setValueAtTime(0, now + i * 0.04);
            gain.gain.linearRampToValueAtTime(0.1, now + i * 0.04 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.04 + noteDuration);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + i * 0.04);
            osc.stop(now + i * 0.04 + noteDuration);
        });

        // Add shimmer effect
        const shimmer = this.audioContext.createOscillator();
        const shimmerGain = this.audioContext.createGain();
        const shimmerFilter = this.audioContext.createBiquadFilter();

        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(2000, now);
        shimmerFilter.type = 'highpass';
        shimmerFilter.frequency.setValueAtTime(3000, now);

        shimmerGain.gain.setValueAtTime(0, now);
        shimmerGain.gain.linearRampToValueAtTime(0.03, now + 0.1);
        shimmerGain.gain.linearRampToValueAtTime(0, now + 0.6);

        shimmer.connect(shimmerFilter);
        shimmerFilter.connect(shimmerGain);
        shimmerGain.connect(this.masterGain);

        shimmer.start(now);
        shimmer.stop(now + 0.6);
    }

    /**
     * Button click - Subtle tap sound
     */
    playButtonClick() {
        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    /**
     * Modal open - Smooth slide sound
     */
    playModalOpen() {
        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    /**
     * Modal close - Reverse slide
     */
    playModalClose() {
        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.03);
        gain.gain.linearRampToValueAtTime(0, now + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    /**
     * Toggle sound on/off
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }

    /**
     * Set master volume (0.0 to 1.0)
     */
    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    /**
     * Get current sound state
     */
    isSoundEnabled() {
        return this.soundEnabled;
    }
}

// Export singleton instance
// Create AudioManager and make it available globally
window.audioManager = new AudioManager();

// Also update the global audioManager variable if it exists (for compatibility)
if (typeof audioManager !== 'undefined') {
    audioManager = window.audioManager;
}
