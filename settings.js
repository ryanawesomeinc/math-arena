// Math Arena - Settings and Local Storage Management

class SettingsManager {
    constructor() {
        this.settings = {
            soundEnabled: true,
            selectedAvatar: '🦊',
            playerName: 'Player',
            equippedTitle: null,
            lastRoomCode: '',
            questionsPerMatch: 20,
            startingDifficulty: 2,
            operationsMode: 'addsub', // 'add', 'addsub', 'all'
            curriculumMode: 'custom', // 'custom', 'ontario-1-2', 'ontario-3-4', 'ontario-5-6', 'ontario-7-8'
            customSettings: {
                operations: { add: true, sub: true, mul: false, div: false },
                minOperand: 1,
                maxOperand: 10,
                cleanDivisionOnly: true,
                difficultyRamping: true,
                rampAfterCorrect: 3
            },
            dontShowInstructions: false,
            analyticsEnabled: false
        };

        this.stats = {
            totalMatches: 0,
            totalCorrect: 0,
            totalQuestions: 0
        };

        this.loadFromStorage();
        this.setupUI();
    }

    loadFromStorage() {
        try {
            const savedSettings = localStorage.getItem('mathArena_settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }

            const savedStats = localStorage.getItem('mathArena_stats');
            if (savedStats) {
                this.stats = { ...this.stats, ...JSON.parse(savedStats) };
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('mathArena_settings', JSON.stringify(this.settings));
            localStorage.setItem('mathArena_stats', JSON.stringify(this.stats));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.saveToStorage();
    }

    updateStats(event, data = {}) {
        switch (event) {
            case 'matchStarted':
                this.stats.totalMatches++;
                break;
            case 'answerCorrect':
                this.stats.totalCorrect++;
                // fallthrough to count question
            case 'answerWrong':
            case 'answerTimeout':
                this.stats.totalQuestions++;
                break;
        }
        this.saveToStorage();
    }

    setupUI() {
        // Sound toggle
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            this.updateSoundIcon();
            soundToggle.addEventListener('click', () => this.toggleSound());

            // Initialize audioManager sound state from settings
            if (typeof audioManager !== 'undefined') {
                window.audioManager.soundEnabled = this.settings.soundEnabled;
            }
        }

        // Avatar selection
        this.setupAvatarSelection();

        // Instructions modal
        this.setupInstructionsModal();

        // Settings modal
        this.setupSettingsModal();

        // Analytics opt-in
        this.setupAnalyticsOptIn();

        // Pre-fill last room code
        this.prefillRoomCode();
    }

    updateSoundIcon() {
        const soundIcon = document.querySelector('.sound-icon');
        if (soundIcon) {
            soundIcon.textContent = this.settings.soundEnabled ? '🔊' : '🔇';
        }
    }

    toggleSound() {
        this.settings.soundEnabled = !this.settings.soundEnabled;
        this.saveToStorage();
        this.updateSoundIcon();

        // Update audioManager state
        if (typeof audioManager !== 'undefined') {
            window.audioManager.soundEnabled = this.settings.soundEnabled;
        }

        // Dispatch custom event for game to listen
        window.dispatchEvent(new CustomEvent('soundToggled', {
            detail: { enabled: this.settings.soundEnabled }
        }));

        // Play confirmation sound if enabling
        if (this.settings.soundEnabled && typeof audioManager !== 'undefined') {
            window.audioManager.playSound('buttonClick');
        }
    }

    setupAvatarSelection() {
        const avatarGrid = document.getElementById('avatar-grid');
        const selectedAvatarInput = document.getElementById('selected-avatar');
        const playerNameInput = document.getElementById('player-name-input');
        const saveNameBtn = document.getElementById('save-player-name');

        if (!avatarGrid) return;

        // Setup player name input
        if (playerNameInput && saveNameBtn) {
            playerNameInput.value = this.settings.playerName || 'Player';

            saveNameBtn.addEventListener('click', () => {
                const result = this.setPlayerName(playerNameInput.value);
                if (result.success) {
                    // Show success feedback
                    saveNameBtn.textContent = 'Saved!';
                    saveNameBtn.classList.add('success');
                    setTimeout(() => {
                        saveNameBtn.textContent = 'Save';
                        saveNameBtn.classList.remove('success');
                    }, 1500);

                    // Update player name display
                    this.updatePlayerNameDisplays();
                } else {
                    // Show error
                    playerNameInput.classList.add('error');
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'name-error';
                    errorMsg.textContent = result.error;
                    playerNameInput.parentNode.appendChild(errorMsg);
                    setTimeout(() => {
                        playerNameInput.classList.remove('error');
                        errorMsg.remove();
                    }, 2000);
                }
            });

            // Allow Enter key to save
            playerNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveNameBtn.click();
                }
            });
        }

        // Update avatar grid based on RPG unlocks
        this.updateAvatarGrid();

        // Set initial selection
        const avatarBtns = avatarGrid.querySelectorAll('.avatar-btn');
        avatarBtns.forEach(btn => {
            if (btn.dataset.avatar === this.settings.selectedAvatar) {
                btn.classList.add('selected');
            }
        });

        if (selectedAvatarInput) {
            selectedAvatarInput.value = this.settings.selectedAvatar;
        }

        // Handle selection
        avatarGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.avatar-btn');
            if (!btn) return;

            // Check if avatar is locked
            if (btn.dataset.locked === 'true' || !btn.dataset.avatar) {
                // Show locked notification
                this.showLockedNotification();
                return;
            }

            // Remove previous selection
            avatarBtns.forEach(b => b.classList.remove('selected'));

            // Add selection to clicked button
            btn.classList.add('selected');

            // Update settings
            const newAvatar = btn.dataset.avatar;
            this.settings.selectedAvatar = newAvatar;
            if (selectedAvatarInput) {
                selectedAvatarInput.value = newAvatar;
            }
            this.saveToStorage();

            // Update player avatar display
            const yourAvatar = document.getElementById('your-avatar');
            if (yourAvatar) {
                yourAvatar.textContent = newAvatar;
            }

            // Track analytics
            if (analyticsManager) {
                analyticsManager.trackAvatarChanged(newAvatar);
            }
        });
    }

    updatePlayerNameDisplays() {
        const name = this.getPlayerName();
        // Update all player name displays
        document.querySelectorAll('.player-name-display').forEach(el => {
            el.textContent = name;
        });
    }

    updateAvatarGrid() {
        if (!rpgManager) return;

        const avatarGrid = document.getElementById('avatar-grid');
        if (!avatarGrid) return;

        const unlockedAvatars = rpgManager.getUnlockedAvatars();
        const avatarBtns = avatarGrid.querySelectorAll('.avatar-btn');

        avatarBtns.forEach(btn => {
            const avatar = btn.dataset.avatar;
            if (avatar && unlockedAvatars.includes(avatar)) {
                btn.textContent = avatar;
                btn.dataset.locked = 'false';
                btn.classList.remove('locked');
                btn.title = avatar; // Tooltip
            } else if (avatar) {
                btn.textContent = '🔒';
                btn.dataset.locked = 'true';
                btn.classList.add('locked');
                // Show unlock requirement
                const unlockLevel = this.getAvatarUnlockLevel(avatar);
                btn.title = `Unlocks at Level ${unlockLevel}`;
            }
        });
    }

    getAvatarUnlockLevel(avatar) {
        const unlockLevels = {
            '🐸': 3, '🦋': 3, '🐯': 3, '🐙': 3,
            '🦈': 5, '🦖': 5, '🐉': 5, '🦁': 5,
            '🚀': 7, '🌟': 7, '💎': 7, '🔮': 7,
            '👑': 10, '🏆': 10, '🎯': 10, '⚡': 10,
            '🎪': 'Achievement', '🌈': 'Achievement', '🎨': 'Achievement'
        };
        return unlockLevels[avatar] || '???';
    }

    showLockedNotification() {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = 'locked-notification';
        notification.textContent = '🔒 This avatar is locked! Level up to unlock more.';
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(245, 87, 108, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    setupInstructionsModal() {
        const instructionsBtn = document.getElementById('instructions-btn');
        const closeBtn = document.getElementById('close-instructions');
        const modal = document.getElementById('instructions-modal');
        const dontShowCheckbox = document.getElementById('dont-show-instructions');

        if (!instructionsBtn || !modal) return;

        instructionsBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });

        closeBtn.addEventListener('click', () => {
            this.closeInstructionsModal(dontShowCheckbox);
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeInstructionsModal(dontShowCheckbox);
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                this.closeInstructionsModal(dontShowCheckbox);
            }
        });

        // Check if we should show on first visit
        if (!this.settings.dontShowInstructions) {
            // Small delay to let page load
            setTimeout(() => {
                if (document.getElementById('connection-screen').classList.contains('hidden')) return;
                modal.classList.remove('hidden');
            }, 500);
        }
    }

    closeInstructionsModal(checkbox) {
        const modal = document.getElementById('instructions-modal');
        if (!modal) return;

        if (checkbox && checkbox.checked) {
            this.settings.dontShowInstructions = true;
            this.saveToStorage();
        }

        modal.classList.add('hidden');
    }

    setupSettingsModal() {
        const settingsBtn = document.getElementById('settings-btn');
        const closeBtn = document.getElementById('close-settings');
        const saveBtn = document.getElementById('save-settings');
        const modal = document.getElementById('settings-modal');

        if (!settingsBtn || !modal) return;

        settingsBtn.addEventListener('click', () => {
            this.loadSettingsIntoModal();
            modal.classList.remove('hidden');
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        saveBtn.addEventListener('click', () => {
            this.saveSettingsFromModal();
            modal.classList.add('hidden');
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        // Setup option buttons
        this.setupOptionButtons();

        // Setup analytics checkbox
        const analyticsCheckbox = document.getElementById('analytics-optin');
        if (analyticsCheckbox) {
            analyticsCheckbox.checked = this.settings.analyticsEnabled;
        }

        // Setup export button
        const exportBtn = document.getElementById('export-analytics');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportAnalytics());
        }

        // Update stats display
        this.updateStatsDisplay();
    }

    setupOptionButtons() {
        // Questions per match
        this.setupButtonGroup('questions-count', (value) => {
            this.settings.questionsPerMatch = parseInt(value);
        });

        // Starting difficulty
        this.setupButtonGroup('starting-difficulty', (value) => {
            this.settings.startingDifficulty = parseInt(value);
        });

        // Curriculum mode
        this.setupButtonGroup('curriculum-mode', (value) => {
            this.settings.curriculumMode = value;
            this.updateCustomSettingsVisibility();
            this.updateCurriculumDescription();
        });

        // Operations mode (legacy)
        this.setupButtonGroup('operations-mode', (value) => {
            this.settings.operationsMode = value;
        });

        // Custom settings checkboxes
        this.setupCustomSettingsCheckboxes();

        // Number range sliders
        this.setupNumberRangeSliders();
    }

    setupCustomSettingsCheckboxes() {
        ['op-add', 'op-sub', 'op-mul', 'op-div'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => this.updateCustomSettings());
            }
        });

        const cleanDivision = document.getElementById('clean-division');
        if (cleanDivision) {
            cleanDivision.addEventListener('change', () => this.updateCustomSettings());
        }

        const ramping = document.getElementById('difficulty-ramping');
        if (ramping) {
            ramping.addEventListener('change', () => this.updateCustomSettings());
        }

        const rampAfter = document.getElementById('ramp-after-correct');
        if (rampAfter) {
            rampAfter.addEventListener('change', () => this.updateCustomSettings());
        }
    }

    setupNumberRangeSliders() {
        const minSlider = document.getElementById('min-operand');
        const maxSlider = document.getElementById('max-operand');
        const minValue = document.getElementById('min-operand-value');
        const maxValue = document.getElementById('max-operand-value');

        if (minSlider && minValue) {
            minSlider.addEventListener('input', () => {
                minValue.textContent = minSlider.value;
                this.updateCustomSettings();
            });
        }

        if (maxSlider && maxValue) {
            maxSlider.addEventListener('input', () => {
                maxValue.textContent = maxSlider.value;
                this.updateCustomSettings();
            });
        }
    }

    updateCustomSettings() {
        const settings = {
            operations: {
                add: document.getElementById('op-add')?.checked ?? true,
                sub: document.getElementById('op-sub')?.checked ?? true,
                mul: document.getElementById('op-mul')?.checked ?? false,
                div: document.getElementById('op-div')?.checked ?? false
            },
            minOperand: parseInt(document.getElementById('min-operand')?.value ?? '1'),
            maxOperand: parseInt(document.getElementById('max-operand')?.value ?? '10'),
            cleanDivisionOnly: document.getElementById('clean-division')?.checked ?? true,
            difficultyRamping: document.getElementById('difficulty-ramping')?.checked ?? true,
            rampAfterCorrect: parseInt(document.getElementById('ramp-after-correct')?.value ?? '3')
        };

        this.settings.customSettings = settings;
        this.saveToStorage();
    }

    updateCustomSettingsVisibility() {
        const panel = document.getElementById('custom-settings-panel');
        const legacyOps = document.querySelector('.legacy-operations');
        const curriculumDesc = document.getElementById('curriculum-desc');

        if (!panel) return;

        if (this.settings.curriculumMode === 'custom') {
            panel.classList.remove('hidden');
            legacyOps?.classList.remove('hidden');
            if (curriculumDesc) curriculumDesc.textContent = 'Customize your own settings below';
        } else {
            panel.classList.add('hidden');
            legacyOps?.classList.add('hidden');
            if (curriculumDesc) {
                const descriptions = {
                    'ontario-1-2': 'Addition/subtraction within 20, single digit',
                    'ontario-3-4': 'Add/sub within 100, multiplication to 7×7, division within 100',
                    'ontario-5-6': 'Multi-digit add/sub, multiplication to 12×12, division within 144',
                    'ontario-7-8': 'All operations, larger numbers, order of operations'
                };
                curriculumDesc.textContent = descriptions[this.settings.curriculumMode] || '';
            }
        }
    }

    updateCurriculumDescription() {
        this.updateCustomSettingsVisibility();
    }

    setupButtonGroup(inputId, callback) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const parent = input.parentElement;
        const buttons = parent.querySelectorAll('.option-btn');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from siblings
                buttons.forEach(b => b.classList.remove('active'));

                // Add active class to clicked button
                btn.classList.add('active');

                // Update hidden input and trigger callback
                input.value = btn.dataset.value;
                callback(btn.dataset.value);
            });
        });
    }

    loadSettingsIntoModal() {
        // Questions per match
        this.setActiveOption('questions-count', this.settings.questionsPerMatch.toString());

        // Starting difficulty
        this.setActiveOption('starting-difficulty', this.settings.startingDifficulty.toString());

        // Curriculum mode
        this.setActiveOption('curriculum-mode', this.settings.curriculumMode || 'custom');

        // Operations mode (legacy)
        this.setActiveOption('operations-mode', this.settings.operationsMode);

        // Custom settings
        this.loadCustomSettings();

        // Analytics checkbox
        const analyticsCheckbox = document.getElementById('analytics-optin');
        if (analyticsCheckbox) {
            analyticsCheckbox.checked = this.settings.analyticsEnabled;
        }

        // Update stats and visibility
        this.updateStatsDisplay();
        this.updateCustomSettingsVisibility();
    }

    loadCustomSettings() {
        const custom = this.settings.customSettings || {};

        // Operation checkboxes
        if (document.getElementById('op-add')) document.getElementById('op-add').checked = custom.operations?.add ?? true;
        if (document.getElementById('op-sub')) document.getElementById('op-sub').checked = custom.operations?.sub ?? true;
        if (document.getElementById('op-mul')) document.getElementById('op-mul').checked = custom.operations?.mul ?? false;
        if (document.getElementById('op-div')) document.getElementById('op-div').checked = custom.operations?.div ?? false;

        // Number ranges
        if (document.getElementById('min-operand')) {
            document.getElementById('min-operand').value = custom.minOperand ?? 1;
            document.getElementById('min-operand-value').textContent = custom.minOperand ?? 1;
        }
        if (document.getElementById('max-operand')) {
            document.getElementById('max-operand').value = custom.maxOperand ?? 10;
            document.getElementById('max-operand-value').textContent = custom.maxOperand ?? 10;
        }

        // Division settings
        if (document.getElementById('clean-division')) {
            document.getElementById('clean-division').checked = custom.cleanDivisionOnly !== false;
        }

        // Ramping settings
        if (document.getElementById('difficulty-ramping')) {
            document.getElementById('difficulty-ramping').checked = custom.difficultyRamping !== false;
        }
        if (document.getElementById('ramp-after-correct')) {
            document.getElementById('ramp-after-correct').value = custom.rampAfterCorrect ?? 3;
        }
    }

    setActiveOption(inputId, value) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const parent = input.parentElement;
        const buttons = parent.querySelectorAll('.option-btn');

        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === value);
        });
    }

    saveSettingsFromModal() {
        // Analytics checkbox
        const analyticsCheckbox = document.getElementById('analytics-optin');
        if (analyticsCheckbox) {
            this.settings.analyticsEnabled = analyticsCheckbox.checked;
        }

        this.saveToStorage();

        // Notify game of settings change
        window.dispatchEvent(new CustomEvent('settingsChanged', {
            detail: this.settings
        }));
    }

    updateStatsDisplay() {
        const matchesEl = document.getElementById('stat-matches');
        const correctEl = document.getElementById('stat-correct');

        if (matchesEl) matchesEl.textContent = this.stats.totalMatches;
        if (correctEl) correctEl.textContent = this.stats.totalCorrect;
    }

    setupAnalyticsOptIn() {
        const modal = document.getElementById('analytics-optin-modal');
        const acceptBtn = document.getElementById('analytics-accept');
        const declineBtn = document.getElementById('analytics-decline');

        if (!modal) return;

        // Check if user has already made a choice
        if (localStorage.getItem('mathArena_analyticsChoice')) {
            return;
        }

        // Show modal after a short delay
        setTimeout(() => {
            // Only show if not already showing another modal
            if (document.getElementById('connection-screen').classList.contains('hidden')) return;
            if (!document.getElementById('instructions-modal').classList.contains('hidden')) return;

            modal.classList.remove('hidden');
        }, 1500);

        acceptBtn.addEventListener('click', () => {
            this.settings.analyticsEnabled = true;
            localStorage.setItem('mathArena_analyticsChoice', 'accepted');
            this.saveToStorage();
            modal.classList.add('hidden');
        });

        declineBtn.addEventListener('click', () => {
            this.settings.analyticsEnabled = false;
            localStorage.setItem('mathArena_analyticsChoice', 'declined');
            this.saveToStorage();
            modal.classList.add('hidden');
        });
    }

    exportAnalytics() {
        const data = {
            settings: this.settings,
            stats: this.stats,
            events: analyticsManager ? analyticsManager.getEvents() : []
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `math-arena-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    prefillRoomCode() {
        const input = document.getElementById('join-peer-id');
        if (input && this.settings.lastRoomCode) {
            input.value = this.settings.lastRoomCode;
        }
    }

    setLastRoomCode(code) {
        this.settings.lastRoomCode = code;
        this.saveToStorage();
    }

    setPlayerName(name) {
        // Validate name: 3-12 characters, alphanumeric + spaces
        const sanitizedName = name.trim().slice(0, 12);
        if (sanitizedName.length >= 3 && /^[A-Za-z0-9\s]+$/.test(sanitizedName)) {
            this.settings.playerName = sanitizedName;
            this.saveToStorage();
            return { success: true, name: sanitizedName };
        }
        return { success: false, error: sanitizedName.length < 3 ? 'Name must be at least 3 characters' : 'Name can only contain letters and numbers' };
    }

    getPlayerName() {
        return this.settings.playerName || 'Player';
    }

    setEquippedTitle(titleId) {
        this.settings.equippedTitle = titleId;
        this.saveToStorage();
    }

    getEquippedTitle() {
        return this.settings.equippedTitle;
    }
}

// SettingsManager class will be initialized in index.html
