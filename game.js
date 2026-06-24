// Math Arena — Game Logic

const ROUND_TIME = 10;
const NEXT_QUESTION_DELAY = 1000;

// Audio manager will be created by audio-system.js
// Audio functions are legacy compatibility - will be overridden
let audioManager = null;
let soundEnabled = true;

// Legacy function for compatibility - delegates to audioManager
function playSound(type) {
    if (window.audioManager) {
        window.audioManager.playSound(type);
    }
}

class MathArena {
    constructor() {
        this.myScore = 0;
        this.opponentScore = 0;
        this.difficulty = 1;
        this.correctStreak = 0;
        this.currentProblem = null;
        this.timer = null;
        this.pendingAdvanceTimeout = null;
        this.timeLeft = ROUND_TIME;
        this.roundActive = false;
        this.isHost = false;
        this.roundStartTime = null;
        this.currentQuestionNumber = 0;
        this.matchActive = false;
        this.myAvatar = '🦊';
        this.opponentAvatar = null;
        this.currentMatchCorrect = 0;
        this.currentMatchQuestions = 0;
        this.matchStartTime = null;

        // Get settings
        this.questionsPerMatch = settingsManager ? settingsManager.get('questionsPerMatch') : 20;
        this.startingDifficulty = settingsManager ? settingsManager.get('startingDifficulty') : 1;
        this.operationsMode = settingsManager ? settingsManager.get('operationsMode') : 'addsub';
        this.curriculumMode = settingsManager ? settingsManager.get('curriculumMode') : 'custom';
        this.customSettings = settingsManager ? settingsManager.get('customSettings') : {
            operations: { add: true, sub: true, mul: false, div: false },
            minOperand: 1,
            maxOperand: 10,
            cleanDivisionOnly: true,
            difficultyRamping: true,
            rampAfterCorrect: 3
        };
        soundEnabled = settingsManager ? settingsManager.get('soundEnabled') : true;

        // DOM elements
        this.elements = {
            screens: {
                connection: document.getElementById('connection-screen'),
                game: document.getElementById('game-screen'),
                gameover: document.getElementById('gameover-screen')
            },
            connection: {
                createBtn: document.getElementById('create-btn'),
                joinBtn: document.getElementById('join-btn'),
                createSection: document.getElementById('create-section'),
                joinSection: document.getElementById('join-section'),
                myPeerId: document.getElementById('my-peer-id'),
                copyIdBtn: document.getElementById('copy-id-btn'),
                joinPeerId: document.getElementById('join-peer-id'),
                connectBtn: document.getElementById('connect-btn'),
                cancelCreateBtn: document.getElementById('cancel-create-btn'),
                cancelJoinBtn: document.getElementById('cancel-join-btn'),
                hostStatus: document.getElementById('host-status'),
                joinStatus: document.getElementById('join-status')
            },
            game: {
                yourScore: document.getElementById('your-score'),
                opponentScore: document.getElementById('opponent-score'),
                timer: document.getElementById('timer'),
                problemText: document.getElementById('problem-text'),
                answersGrid: document.getElementById('answers-grid'),
                roundResult: document.getElementById('round-result'),
                connectionIndicator: document.getElementById('connection-indicator'),
                connectionText: document.getElementById('connection-text'),
                difficultyLevel: document.getElementById('difficulty-level'),
                streakIndicator: document.getElementById('streak-indicator'),
                speedIndicator: document.getElementById('speed-indicator'),
                progressIndicator: document.getElementById('progress-indicator'),
                yourAvatar: document.getElementById('your-avatar'),
                opponentAvatar: document.getElementById('opponent-avatar')
            },
            gameover: {
                finalResult: document.getElementById('final-result'),
                finalYourScore: document.getElementById('final-your-score'),
                finalOpponentScore: document.getElementById('final-opponent-score'),
                playAgainBtn: document.getElementById('play-again-btn'),
                newGameBtn: document.getElementById('new-game-btn')
            }
        };

        this.setupConnectionHandlers();
        this.setupGameHandlers();
        this.setupKeyboardHandlers();
        this.setupSettingsListeners();
        this.loadAvatar();
        this.setupRPGUI();
    }

    loadAvatar() {
        if (settingsManager) {
            this.myAvatar = settingsManager.get('selectedAvatar');
            if (this.elements.game.yourAvatar) {
                this.elements.game.yourAvatar.textContent = this.myAvatar;
            }
        }
    }

    setupRPGUI() {
        // Setup stats modal
        const statsBtn = document.getElementById('stats-btn');
        const closeStatsBtn = document.getElementById('close-stats');
        const statsModal = document.getElementById('stats-modal');

        if (statsBtn && statsModal) {
            statsBtn.addEventListener('click', () => {
                this.updateStatsDisplay();
                statsModal.classList.remove('hidden');
            });
        }

        if (closeStatsBtn && statsModal) {
            closeStatsBtn.addEventListener('click', () => {
                statsModal.classList.add('hidden');
            });

            // Close on backdrop click
            statsModal.addEventListener('click', (e) => {
                if (e.target === statsModal) {
                    statsModal.classList.add('hidden');
                }
            });
        }

        // Setup quests modal
        this.setupQuestsModal();

        // Setup titles modal
        this.setupTitlesModal();

        // Setup inventory modal
        this.setupInventoryModal();

        // Update initial RPG UI
        this.updateRPGUI();

        // Update player name displays
        if (settingsManager) {
            this.updatePlayerNameDisplay();
        }
    }

    updateRPGUI() {
        if (!rpgManager) return;

        const stats = rpgManager.getStats();

        // Update connection screen elements
        const levelBadge = document.getElementById('level-badge');
        const xpFill = document.getElementById('xp-fill');
        const xpText = document.getElementById('xp-text');
        const yourLevel = document.getElementById('your-level');

        if (levelBadge) levelBadge.textContent = `Level ${stats.level}`;
        if (xpFill) xpFill.style.width = `${stats.progress}%`;
        if (xpText) xpText.textContent = `${stats.xp} / ${stats.xp + stats.xpToNext} XP`;
        if (yourLevel) yourLevel.textContent = `Lv.${stats.level}`;

        // Update avatar grid based on unlocks
        this.updateAvatarGrid();
    }

    updateAvatarGrid() {
        if (!rpgManager) return;

        const avatarGrid = document.getElementById('avatar-grid');
        if (!avatarGrid) return;

        const unlockedAvatars = rpgManager.getUnlockedAvatars();
        const avatarBtns = avatarGrid.querySelectorAll('.avatar-btn');

        avatarBtns.forEach(btn => {
            const avatar = btn.dataset.avatar;
            if (avatar) {
                if (unlockedAvatars.includes(avatar)) {
                    btn.textContent = avatar;
                    btn.dataset.locked = 'false';
                    btn.classList.remove('locked');
                } else {
                    btn.textContent = '🔒';
                    btn.dataset.locked = 'true';
                    btn.classList.add('locked');
                }
            }
        });
    }

    setupQuestsModal() {
        const questsBtn = document.getElementById('quests-btn');
        const closeQuestsBtn = document.getElementById('close-quests');
        const questsModal = document.getElementById('quests-modal');
        const claimBtn = document.getElementById('claim-quests-btn');

        if (questsBtn && questsModal) {
            questsBtn.addEventListener('click', () => {
                this.updateQuestsDisplay();
                questsModal.classList.remove('hidden');
            });
        }

        if (closeQuestsBtn && questsModal) {
            closeQuestsBtn.addEventListener('click', () => {
                questsModal.classList.add('hidden');
            });

            questsModal.addEventListener('click', (e) => {
                if (e.target === questsModal) {
                    questsModal.classList.add('hidden');
                }
            });
        }

        if (claimBtn) {
            claimBtn.addEventListener('click', () => {
                if (questsManager) {
                    const xpGained = questsManager.claimRewards();
                    if (xpGained > 0 && rpgManager) {
                        rpgManager.addXP(xpGained);
                        this.showXPGained(xpGained);

                        // Random chance to give an item as bonus reward
                        if (itemsManager && Math.random() < 0.3) {
                            const item = itemsManager.giveItemAsReward('common');
                            this.showItemRewardNotification(item);
                        }
                    }
                    this.updateQuestsDisplay();
                    questsBtn.classList.remove('has-rewards');
                }
            });
        }

        // Listen for quest updates
        window.addEventListener('questUpdate', () => {
            this.updateQuestsButton();
            this.updateQuestsDisplay();
        });

        // Start quest reset timer update
        this.startQuestTimerUpdate();
    }

    setupTitlesModal() {
        const titlesBtn = document.getElementById('titles-btn');
        const closeTitlesBtn = document.getElementById('close-titles');
        const titlesModal = document.getElementById('titles-modal');

        if (titlesModal) {
            // Open titles from stats modal (we'll add a button later)
            if (closeTitlesBtn) {
                closeTitlesBtn.addEventListener('click', () => {
                    titlesModal.classList.add('hidden');
                });

                titlesModal.addEventListener('click', (e) => {
                    if (e.target === titlesModal) {
                        titlesModal.classList.add('hidden');
                    }
                });
            }

            this.updateTitlesDisplay();
        }
    }

    setupInventoryModal() {
        const inventoryBtn = document.getElementById('inventory-btn');
        const closeInventoryBtn = document.getElementById('close-inventory');
        const inventoryModal = document.getElementById('inventory-modal');

        if (inventoryBtn && inventoryModal) {
            inventoryBtn.addEventListener('click', () => {
                this.updateInventoryDisplay();
                inventoryModal.classList.remove('hidden');
            });
        }

        if (closeInventoryBtn && inventoryModal) {
            closeInventoryBtn.addEventListener('click', () => {
                inventoryModal.classList.add('hidden');
            });

            inventoryModal.addEventListener('click', (e) => {
                if (e.target === inventoryModal) {
                    inventoryModal.classList.add('hidden');
                }
            });
        }

        // Listen for inventory updates
        window.addEventListener('inventoryUpdate', () => {
            this.updateInventoryButton();
            this.updateInventoryDisplay();
        });

        this.updateInventoryDisplay();
    }

    updatePlayerNameDisplay() {
        if (!settingsManager) return;

        const name = settingsManager.getPlayerName();
        const nameDisplay = document.getElementById('your-name');
        if (nameDisplay) {
            nameDisplay.textContent = name;
        }

        // Update current title
        if (titlesManager && rpgManager) {
            const level = rpgManager.rpgData.level;
            const currentTitle = titlesManager.getCurrentTitle(level);
            const titleDisplay = document.getElementById('your-title');
            if (titleDisplay) {
                titleDisplay.textContent = currentTitle.name;
            }
        }
    }

    updateQuestsDisplay() {
        if (!questsManager) return;

        const questsList = document.getElementById('quests-list');
        const completedCount = document.getElementById('quests-completed');
        const claimBtn = document.getElementById('claim-quests-btn');
        const totalXP = document.getElementById('total-quest-xp');

        if (!questsList) return;

        const quests = questsManager.dailyQuests;
        let totalReward = 0;

        questsList.innerHTML = quests.map(quest => {
            const progress = Math.min(quest.current, quest.target);
            const progressPercent = (progress / quest.target) * 100;
            const isCompleted = quest.completed && !quest.claimed;

            if (isCompleted) {
                totalReward += quest.reward;
            }

            return `
                <div class="quest-card ${quest.completed ? 'completed' : ''} ${quest.claimed ? 'claimed' : ''}">
                    <div class="quest-header">
                        <span class="quest-title">${quest.title}</span>
                        <span class="quest-check">${quest.completed ? '✓' : ''}</span>
                    </div>
                    <div class="quest-description">${quest.description}</div>
                    <div class="quest-progress">
                        <div class="quest-progress-bar">
                            <div class="quest-progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <span class="quest-progress-text">${progress}/${quest.target}</span>
                    </div>
                    <div class="quest-reward">
                        <span>🎁</span>
                        <span>+${quest.reward} XP</span>
                    </div>
                </div>
            `;
        }).join('');

        if (completedCount) {
            completedCount.textContent = `${questsManager.getCompletedCount()}/3`;
        }

        if (totalXP) {
            totalXP.textContent = totalReward;
        }

        if (claimBtn) {
            claimBtn.disabled = totalReward === 0 || questsManager.getAllClaimed();
        }
    }

    updateQuestsButton() {
        if (!questsManager) return;

        const questsBtn = document.getElementById('quests-btn');
        if (!questsBtn) return;

        const hasUnclaimedRewards = questsManager.dailyQuests.some(q => q.completed && !q.claimed);
        if (hasUnclaimedRewards) {
            questsBtn.classList.add('has-rewards');
        } else {
            questsBtn.classList.remove('has-rewards');
        }
    }

    startQuestTimerUpdate() {
        // Update quest reset timer every minute
        setInterval(() => {
            if (questsManager) {
                const timerEl = document.getElementById('quest-reset-timer');
                if (timerEl) {
                    timerEl.textContent = questsManager.getResetTimeString();
                }
            }
        }, 60000);

        // Initial update
        if (questsManager) {
            const timerEl = document.getElementById('quest-reset-timer');
            if (timerEl) {
                timerEl.textContent = questsManager.getResetTimeString();
            }
        }
    }

    updateTitlesDisplay() {
        if (!titlesManager) return;

        const currentTitleIcon = document.getElementById('current-title-icon');
        const currentTitleName = document.getElementById('current-title-name');
        const titlesGrid = document.getElementById('titles-grid');
        const lockedTitlesGrid = document.getElementById('locked-titles-grid');

        const level = rpgManager ? rpgManager.rpgData.level : 1;
        const currentTitle = titlesManager.getCurrentTitle(level);
        const unlockedTitles = titlesManager.getUnlockedTitles();
        const allTitles = Object.values(titlesManager.titles);
        const lockedTitles = allTitles.filter(t => !unlockedTitles.includes(t));

        if (currentTitleIcon) currentTitleIcon.textContent = currentTitle.icon;
        if (currentTitleName) currentTitleName.textContent = currentTitle.name;

        if (titlesGrid) {
            const equippedTitle = settingsManager ? settingsManager.getEquippedTitle() : null;

            titlesGrid.innerHTML = unlockedTitles.map(title => `
                <div class="title-card ${equippedTitle === title.id ? 'equipped' : ''}" data-title-id="${title.id}">
                    <div class="title-card-icon">${title.icon}</div>
                    <div class="title-card-name">${title.name}</div>
                    <div class="title-card-desc">${title.description}</div>
                </div>
            `).join('');

            // Add click handlers
            titlesGrid.querySelectorAll('.title-card').forEach(card => {
                card.addEventListener('click', () => {
                    const titleId = card.dataset.titleId;
                    if (settingsManager) {
                        settingsManager.setEquippedTitle(titleId);
                        this.updateTitlesDisplay();
                        this.updatePlayerNameDisplay();
                    }
                });
            });
        }

        if (lockedTitlesGrid) {
            lockedTitlesGrid.innerHTML = lockedTitles.map(title => `
                <div class="title-card locked">
                    <div class="title-card-icon">${title.icon}</div>
                    <div class="title-card-name">${title.name}</div>
                    <div class="title-card-desc">${title.description}</div>
                </div>
            `).join('');
        }
    }

    updateInventoryDisplay() {
        if (!itemsManager) return;

        const inventoryGrid = document.getElementById('inventory-grid');
        const equippedItemModal = document.getElementById('equipped-item-modal');
        const inventoryEmpty = document.getElementById('inventory-empty');

        const inventory = itemsManager.inventory;
        const equippedItem = itemsManager.getEquippedItem();

        // Update equipped item display
        if (equippedItemModal) {
            if (equippedItem) {
                const quantity = itemsManager.getItemQuantity(itemsManager.equippedItem);
                equippedItemModal.innerHTML = `
                    <div class="equipped-item-info">
                        <span class="item-icon">${equippedItem.icon}</span>
                        <div>
                            <div class="item-name">${equippedItem.name}</div>
                            <div class="item-uses">${quantity} uses</div>
                        </div>
                    </div>
                    <button class="unequip-item-btn" id="unequip-item-btn">Unequip</button>
                `;

                // Add unequip handler
                document.getElementById('unequip-item-btn').addEventListener('click', () => {
                    itemsManager.unequipItem();
                    this.updateInventoryDisplay();
                    this.updateEquippedItemInGame();
                });
            } else {
                equippedItemModal.innerHTML = '<div class="no-equipped-item">No item equipped</div>';
            }
        }

        // Update inventory grid
        if (inventoryGrid) {
            const items = Object.keys(inventory);

            if (items.length === 0) {
                inventoryGrid.classList.add('hidden');
                if (inventoryEmpty) inventoryEmpty.classList.remove('hidden');
            } else {
                inventoryGrid.classList.remove('hidden');
                if (inventoryEmpty) inventoryEmpty.classList.add('hidden');

                inventoryGrid.innerHTML = items.map(itemId => {
                    const item = itemsManager.itemDefinitions[itemId];
                    const quantity = inventory[itemId];
                    const isEquipped = itemsManager.equippedItem === itemId;

                    return `
                        <div class="inventory-item-card ${isEquipped ? 'equipped' : ''}" data-item-id="${itemId}">
                            <span class="item-card-quantity">${quantity}</span>
                            <div class="item-card-icon">${item.icon}</div>
                            <div class="item-card-name">${item.name}</div>
                            <span class="item-card-rarity ${item.rarity}">${item.rarity}</span>
                        </div>
                    `;
                }).join('');

                // Add click handlers
                inventoryGrid.querySelectorAll('.inventory-item-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const itemId = card.dataset.itemId;
                        if (itemsManager.equippedItem === itemId) {
                            itemsManager.unequipItem();
                        } else {
                            itemsManager.equipItem(itemId);
                        }
                        this.updateInventoryDisplay();
                        this.updateEquippedItemInGame();
                    });
                });
            }
        }
    }

    updateEquippedItemInGame() {
        const equippedItemDisplay = document.getElementById('equipped-item-display');
        const equippedItemIcon = document.getElementById('equipped-item-icon');
        const equippedItemName = document.getElementById('equipped-item-name');
        const equippedItemUses = document.getElementById('equipped-item-uses');

        if (!itemsManager) return;

        const equippedItem = itemsManager.getEquippedItem();

        if (equippedItem && equippedItemDisplay) {
            const quantity = itemsManager.getItemQuantity(itemsManager.equippedItem);
            equippedItemDisplay.classList.remove('hidden');
            if (equippedItemIcon) equippedItemIcon.textContent = equippedItem.icon;
            if (equippedItemName) equippedItemName.textContent = equippedItem.name;
            if (equippedItemUses) equippedItemUses.textContent = `(${quantity})`;
        } else if (equippedItemDisplay) {
            equippedItemDisplay.classList.add('hidden');
        }
    }

    updateInventoryButton() {
        if (!itemsManager) return;

        const inventoryBtn = document.getElementById('inventory-btn');
        if (!inventoryBtn) return;

        const hasItems = Object.keys(itemsManager.inventory).length > 0;
        if (hasItems) {
            inventoryBtn.classList.add('has-rewards');
        } else {
            inventoryBtn.classList.remove('has-rewards');
        }
    }

    updateStatsDisplay() {
        if (!rpgManager) return;

        const stats = rpgManager.getStats();

        // Level progress
        document.getElementById('stats-level').textContent = stats.level;
        document.getElementById('stats-xp-fill').style.width = `${stats.progress}%`;
        document.getElementById('stats-xp-text').textContent = `${stats.xp} / ${stats.xp + stats.xpToNext} XP`;

        // Overall stats
        document.getElementById('stat-matches-expanded').textContent = stats.totalMatches;
        document.getElementById('stat-wins').textContent = stats.totalWins;
        document.getElementById('stat-winrate').textContent = `${stats.winRate}%`;
        document.getElementById('stat-correct-expanded').textContent = stats.totalCorrect;
        document.getElementById('stat-best-streak').textContent = stats.bestStreak;
        document.getElementById('stat-accuracy').textContent = `${stats.avgAccuracy}%`;

        // Operation levels
        ['add', 'sub', 'mult', 'div'].forEach(op => {
            const opStats = stats.operationStats[op];
            const fill = document.getElementById(`op-level-${op}`);
            const text = document.getElementById(`op-level-text-${op}`);

            if (fill && text) {
                const progress = (opStats.xp / rpgManager.getXPForLevel(opStats.level + 1)) * 100;
                fill.style.width = `${Math.min(100, progress)}%`;
                text.textContent = `Lv.${opStats.level}`;
            }
        });

        // Achievement progress
        document.getElementById('achievement-count').textContent = `${stats.achievementsUnlocked} / ${stats.totalAchievements}`;
        document.getElementById('achievement-bar-fill').style.width = `${(stats.achievementsUnlocked / stats.totalAchievements) * 100}%`;

        // Achievement categories
        const categories = ['speed', 'accuracy', 'streak', 'curriculum', 'win'];
        categories.forEach(cat => {
            const achievements = rpgManager.getAchievementsByCategory(cat);
            const unlocked = achievements.filter(a => a.unlocked).length;
            const total = achievements.length;
            document.getElementById(`category-${cat}`).textContent = `${unlocked}/${total}`;
        });

        // Avatar progress
        document.getElementById('avatar-count').textContent = `${stats.unlockedAvatars} / ${stats.totalAvatars}`;
        document.getElementById('avatar-bar-fill').style.width = `${(stats.unlockedAvatars / stats.totalAvatars) * 100}%`;

        // Recent matches
        const recentMatches = document.getElementById('recent-matches');
        if (recentMatches) {
            const matches = rpgManager.getRecentMatches(10);
            if (matches.length === 0) {
                recentMatches.innerHTML = '<div class="no-matches">No matches yet</div>';
            } else {
                recentMatches.innerHTML = matches.map(m => {
                    const date = new Date(m.date);
                    const dateStr = date.toLocaleDateString();
                    const resultClass = m.result;
                    const resultText = m.result === 'win' ? 'WIN' : m.result === 'lose' ? 'LOSS' : 'TIE';
                    return `
                        <div class="match-history-item">
                            <span class="match-result ${resultClass}">${resultText}</span>
                            <div class="match-stats">
                                <span>${m.accuracy}% accuracy</span>
                            </div>
                            <span class="match-date">${dateStr}</span>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    showLevelUp(oldLevel, newLevel) {
        const overlay = document.getElementById('levelup-overlay');
        const levelText = document.getElementById('levelup-level');
        const badge = document.getElementById('levelup-badge');
        const message = document.getElementById('levelup-message');

        if (!overlay) return;

        // Set content
        levelText.textContent = `Level ${newLevel}`;

        // Badge based on level
        const badges = ['🎖️', '⭐', '🌟', '💫', '🏅', '🎯', '🔥', '💪', '👑', '🏆'];
        badge.textContent = badges[Math.min(newLevel - 1, badges.length - 1)];

        // Message based on level
        const messages = [
            'Great start!',
            'Keep going!',
            'You\'re improving!',
            'Amazing work!',
            'Unstoppable!',
            'Math wizard!',
            'Incredible!',
            'Legendary!',
            'Godlike!',
            'Champion!'
        ];
        message.textContent = messages[Math.min(newLevel - 1, messages.length - 1)];

        // Show overlay
        overlay.classList.remove('hidden');

        // Play sound
        playSound('levelUp');

        // Hide after 2.5 seconds
        setTimeout(() => {
            overlay.classList.add('hidden');
            this.updateRPGUI();
        }, 2500);
    }

    showAchievementNotification(achievement) {
        const notification = document.getElementById('achievement-notification');
        const achievementName = document.getElementById('achievement-name');

        if (!notification) return;

        achievementName.textContent = achievement.name;
        notification.classList.remove('hidden');

        // Play sound
        playSound('achievement');

        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);

        // Random chance to give item for achievement unlock
        if (itemsManager && Math.random() < 0.25) {
            const item = itemsManager.giveItemAsReward('uncommon');
            setTimeout(() => {
                this.showItemRewardNotification(item);
            }, 3500);
        }
    }

    showItemRewardNotification(item) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.style.top = '140px';
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">${item.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-title">Item Reward!</div>
                    <div class="achievement-name">${item.name}</div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        playSound('streak');

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showXPGained(xp) {
        const xpText = document.getElementById('game-xp-text');
        if (xpText) {
            xpText.textContent = `+${xp} XP`;
            xpText.style.animation = 'none';
            setTimeout(() => {
                xpText.style.animation = 'slideIn 0.3s ease';
            }, 10);
        }
    }

    setupConnectionHandlers() {
        const { connection } = this.elements;

        connection.createBtn.addEventListener('click', () => {
            this.showScreen('connection');
            connection.createSection.classList.remove('hidden');
            connection.joinSection.classList.add('hidden');
            this.isHost = true;
            peerManager.createPeer();

            if (analyticsManager) {
                analyticsManager.trackConnectionAttempt('host');
            }
        });

        connection.joinBtn.addEventListener('click', () => {
            this.showScreen('connection');
            connection.joinSection.classList.remove('hidden');
            connection.createSection.classList.add('hidden');
            this.isHost = false;
        });

        connection.copyIdBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(connection.myPeerId.textContent);
            connection.copyIdBtn.textContent = 'Copied!';
            setTimeout(() => {
                connection.copyIdBtn.textContent = 'Copy';
            }, 1500);
        });

        connection.joinPeerId.addEventListener('input', () => {
            const input = connection.joinPeerId;
            input.value = input.value.toUpperCase();
            const validChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            input.value = input.value.split('').filter(c => validChars.includes(c)).join('');
        });

        connection.connectBtn.addEventListener('click', () => {
            const roomCode = connection.joinPeerId.value.trim().toUpperCase();

            if (!roomCode) {
                this.setConnectionStatus('error', 'Please enter a room code.');
                return;
            }

            if (roomCode.length !== 5) {
                this.setConnectionStatus('error', 'Room code must be 5 characters.');
                return;
            }

            if (settingsManager) {
                settingsManager.setLastRoomCode(roomCode);
            }

            peerManager.connectToPeer(roomCode);

            if (analyticsManager) {
                analyticsManager.trackConnectionAttempt('join');
            }
        });

        connection.cancelCreateBtn.addEventListener('click', () => this.cancelConnection());
        connection.cancelJoinBtn.addEventListener('click', () => this.cancelConnection());
    }

    setupGameHandlers() {
        const { gameover } = this.elements;

        gameover.playAgainBtn.addEventListener('click', () => {
            this.resetGame();
            peerManager.send({ type: 'playAgain' });
        });

        gameover.newGameBtn.addEventListener('click', () => {
            this.resetGame();
            this.showScreen('connection');
            peerManager.disconnect();
        });
    }

    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            // Only handle keyboard when on game screen and round is active
            if (!this.elements.screens.game.classList.contains('hidden')) {
                // Number keys 1-4 for answers
                if (['1', '2', '3', '4'].includes(e.key) && this.roundActive) {
                    e.preventDefault();
                    const index = parseInt(e.key) - 1;
                    const buttons = this.elements.game.answersGrid.querySelectorAll('.answer-btn');
                    if (buttons[index] && !buttons[index].disabled) {
                        this.handleAnswer(index);
                    }
                }

                // Enter for play again
                if (e.key === 'Enter' && !this.elements.screens.gameover.classList.contains('hidden')) {
                    e.preventDefault();
                    this.resetGame();
                    peerManager.send({ type: 'playAgain' });
                }
            }

            // M for mute (global)
            if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                const soundToggle = document.getElementById('sound-toggle');
                if (soundToggle) {
                    soundToggle.click();
                }
            }

            // ? for instructions (global)
            if (e.key === '?') {
                e.preventDefault();
                const instructionsBtn = document.getElementById('instructions-btn');
                if (instructionsBtn) {
                    instructionsBtn.click();
                }
            }
        });
    }

    setupSettingsListeners() {
        // Listen for sound toggle changes
        window.addEventListener('soundToggled', (e) => {
            soundEnabled = e.detail.enabled;
        });

        // Listen for settings changes
        window.addEventListener('settingsChanged', (e) => {
            const newSettings = e.detail;
            this.questionsPerMatch = newSettings.questionsPerMatch;
            this.startingDifficulty = newSettings.startingDifficulty;
            this.operationsMode = newSettings.operationsMode;
            this.curriculumMode = newSettings.curriculumMode || 'custom';
            this.customSettings = newSettings.customSettings || this.customSettings;
            soundEnabled = newSettings.soundEnabled;
        });

        // Listen for help viewed
        const instructionsBtn = document.getElementById('instructions-btn');
        if (instructionsBtn && analyticsManager) {
            instructionsBtn.addEventListener('click', () => {
                analyticsManager.trackHelpViewed();
            });
        }

        // Listen for RPG updates
        window.addEventListener('rpgUpdate', () => {
            this.updateRPGUI();
        });

        // Listen for achievement unlocks
        window.addEventListener('achievementUnlocked', (e) => {
            this.showAchievementNotification(e.detail);
        });

        // Listen for avatar unlocks
        window.addEventListener('avatarsUnlocked', (e) => {
            this.showAvatarUnlockNotification(e.detail);
        });
    }

    showAvatarUnlockNotification(avatars) {
        if (!avatars || avatars.length === 0) return;

        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.style.top = '140px'; // Position below achievement notifications
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">🎨</div>
                <div class="achievement-info">
                    <div class="achievement-title">New Avatar Unlocked!</div>
                    <div class="achievement-name">${avatars.join(' ')}</div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        playSound('streak');

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    cancelConnection() {
        peerManager.disconnect();
        this.showScreen('connection');
        this.elements.connection.createSection.classList.add('hidden');
        this.elements.connection.joinSection.classList.add('hidden');
    }

    showScreen(screenName) {
        Object.values(this.elements.screens).forEach(screen => {
            screen.classList.add('hidden');
        });
        this.elements.screens[screenName].classList.remove('hidden');
    }

    setPeerId(id) {
        this.elements.connection.myPeerId.textContent = id;
        this.elements.connection.myPeerId.style.letterSpacing = '3px';
        this.elements.connection.myPeerId.style.fontWeight = 'bold';
    }

    setConnectionStatus(status, message) {
        const statusEl = this.isHost ?
            this.elements.connection.hostStatus :
            this.elements.connection.joinStatus;

        statusEl.querySelector('.status-dot').className = `status-dot ${status === 'connected' ? 'connected' : ''}`;
        statusEl.querySelector('span:last-child').textContent = message;
    }

    onPeerConnected() {
        this.showScreen('game');
        this.elements.game.connectionIndicator.querySelector('.status-dot').classList.add('connected');
        this.elements.game.connectionText.textContent = 'Connected';

        // Initialize audio on first user interaction
        document.addEventListener('click', initAudio, { once: true });

        if (analyticsManager) {
            analyticsManager.trackConnectionSuccess(this.isHost ? 'host' : 'join');
        }

        if (this.isHost) {
            setTimeout(() => this.startMatch(), 500);
        }
    }

    onPeerDisconnected() {
        this.elements.game.connectionIndicator.querySelector('.status-dot').classList.remove('connected');
        this.elements.game.connectionText.textContent = 'Disconnected - Reconnecting...';

        if (this.roundActive) {
            this.endRound(null, 'disconnected');
        }
    }

    generateProblem() {
        const config = this.getCurriculumConfig();

        // Choose operation based on config
        const availableOps = config.operations.filter(op => op.enabled).map(op => op.symbol);
        const operation = availableOps[Math.floor(Math.random() * availableOps.length)];

        let answer, question;

        switch (operation) {
            case '+':
                answer = this.generateAddition(config);
                question = answer.question;
                break;
            case '-':
                answer = this.generateSubtraction(config);
                question = answer.question;
                break;
            case '×':
                answer = this.generateMultiplication(config);
                question = answer.question;
                break;
            case '÷':
                answer = this.generateDivision(config);
                question = answer.question;
                break;
        }

        // Generate wrong answers (close to correct answer)
        const wrongAnswers = new Set();
        while (wrongAnswers.size < 3) {
            const offset = Math.floor(Math.random() * 21) - 10;
            const wrong = answer.answer + offset;
            if (wrong !== answer.answer && wrong >= 0 && !wrongAnswers.has(wrong)) {
                wrongAnswers.add(wrong);
            }
        }

        // Shuffle and create options
        const options = [answer.answer, ...wrongAnswers].sort(() => Math.random() - 0.5);
        const correctIndex = options.indexOf(answer.answer);

        return {
            question,
            options,
            correctIndex,
            answer: answer.answer,
            operation
        };
    }

    getCurriculumConfig() {
        // Returns configuration based on curriculum mode
        switch (this.curriculumMode) {
            case 'ontario-1-2':
                return {
                    operations: [
                        { symbol: '+', enabled: true, min: 1, max: 10 },
                        { symbol: '-', enabled: true, min: 1, max: 10 }
                    ],
                    allowNegativeAnswers: false
                };
            case 'ontario-3-4':
                return {
                    operations: [
                        { symbol: '+', enabled: true, min: 1, max: 50 },
                        { symbol: '-', enabled: true, min: 1, max: 50 },
                        { symbol: '×', enabled: true, min: 2, max: 7 },
                        { symbol: '÷', enabled: true, min: 1, max: 10, cleanOnly: true }
                    ],
                    allowNegativeAnswers: false
                };
            case 'ontario-5-6':
                return {
                    operations: [
                        { symbol: '+', enabled: true, min: 10, max: 100 },
                        { symbol: '-', enabled: true, min: 10, max: 100 },
                        { symbol: '×', enabled: true, min: 2, max: 12 },
                        { symbol: '÷', enabled: true, min: 1, max: 12, cleanOnly: true }
                    ],
                    allowNegativeAnswers: false
                };
            case 'ontario-7-8':
                return {
                    operations: [
                        { symbol: '+', enabled: true, min: 10, max: 1000 },
                        { symbol: '-', enabled: true, min: 10, max: 1000 },
                        { symbol: '×', enabled: true, min: 2, max: 15 },
                        { symbol: '÷', enabled: true, min: 1, max: 15, cleanOnly: true }
                    ],
                    allowNegativeAnswers: false
                };
            case 'custom':
                // Use legacy mode for backward compatibility
                return this.getLegacyConfig();
            default:
                return this.getLegacyConfig();
        }
    }

    getLegacyConfig() {
        // Legacy mode for backward compatibility
        const maxDigits = Math.max(1, this.difficulty);
        const min = Math.pow(10, maxDigits - 1);
        const max = Math.pow(10, maxDigits) - 1;

        const ops = [];
        const mode = this.operationsMode;

        if (mode === 'add') {
            ops.push({ symbol: '+', enabled: true, min, max });
        } else if (mode === 'addsub') {
            ops.push({ symbol: '+', enabled: true, min, max });
            ops.push({ symbol: '-', enabled: true, min, max });
        } else {
            // All four
            ops.push({ symbol: '+', enabled: true, min, max });
            ops.push({ symbol: '-', enabled: true, min, max });
            ops.push({ symbol: '×', enabled: true, min: 2, max: 12 });
            ops.push({ symbol: '÷', enabled: true, min: 1, max: 12, cleanOnly: true });
        }

        return { operations: ops, allowNegativeAnswers: false };
    }

    generateAddition(config) {
        const opConfig = config.operations.find(op => op.symbol === '+');
        const min = opConfig.min;
        const max = opConfig.max;

        const a = Math.floor(Math.random() * (max - min + 1)) + min;
        const b = Math.floor(Math.random() * (max - min + 1)) + min;

        return { question: `${a} + ${b}`, answer: a + b };
    }

    generateSubtraction(config) {
        const opConfig = config.operations.find(op => op.symbol === '-');
        const min = opConfig.min;
        const max = opConfig.max;

        const a = Math.floor(Math.random() * (max - min + 1)) + min;
        const b = Math.floor(Math.random() * (max - min + 1)) + min;

        // Ensure non-negative result
        const big = Math.max(a, b);
        const small = Math.min(a, b);

        return { question: `${big} - ${small}`, answer: big - small };
    }

    generateMultiplication(config) {
        const opConfig = config.operations.find(op => op.symbol === '×');
        const min = opConfig.min;
        const max = opConfig.max;

        const a = Math.floor(Math.random() * (max - min + 1)) + min;
        const b = Math.floor(Math.random() * (max - min + 1)) + min;

        return { question: `${a} × ${b}`, answer: a * b };
    }

    generateDivision(config) {
        const opConfig = config.operations.find(op => op.symbol === '÷');
        const min = opConfig.min || 1;
        const max = opConfig.max || 12;
        const cleanOnly = opConfig.cleanOnly !== false;

        if (cleanOnly) {
            // Generate clean division: divisor * quotient = dividend
            const quotient = Math.floor(Math.random() * (max - min + 1)) + min;
            const divisor = Math.floor(Math.random() * (max - min + 1)) + min;
            const dividend = quotient * divisor;

            return { question: `${dividend} ÷ ${divisor}`, answer: quotient };
        } else {
            // Generate any division (may have remainders)
            const a = Math.floor(Math.random() * (max * max - min)) + min;
            const b = Math.floor(Math.random() * (max - min + 1)) + min;
            const answer = Math.floor(a / b);

            return { question: `${a} ÷ ${b}`, answer };
        }
    }

    startMatch() {
        this.currentQuestionNumber = 0;
        this.matchActive = true;
        this.myScore = 0;
        this.opponentScore = 0;
        this.difficulty = this.startingDifficulty;
        this.correctStreak = 0;
        this.currentMatchCorrect = 0;
        this.currentMatchQuestions = 0;
        this.matchStartTime = Date.now();
        this.elements.game.yourScore.textContent = '0';
        this.elements.game.opponentScore.textContent = '0';
        this.elements.game.progressIndicator.classList.remove('hidden');

        // Update RPG UI
        this.updateRPGUI();

        // Track analytics
        if (analyticsManager) {
            analyticsManager.trackMatchStarted(this.isHost ? 'host' : 'join');
            analyticsManager.startMatchTimer();
        }

        this.startRound();
    }

    startRound() {
        // Clear any pending advances from previous round
        this.clearPendingAdvance();

        this.currentQuestionNumber++;
        this.currentProblem = this.generateProblem();
        this.timeLeft = ROUND_TIME;
        this.roundActive = true;
        this.roundStartTime = Date.now();

        // Update progress
        this.elements.game.progressIndicator.textContent = `Question ${this.currentQuestionNumber} of ${this.questionsPerMatch}`;

        // Update UI
        this.elements.game.difficultyLevel.textContent = this.difficulty;
        this.elements.game.problemText.textContent = this.currentProblem.question;
        this.elements.game.roundResult.classList.add('hidden');

        // Hide speed indicator at round start
        this.elements.game.speedIndicator.classList.add('hidden');

        // Clear and create answer buttons
        this.elements.game.answersGrid.innerHTML = '';
        this.currentProblem.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.textContent = option;
            btn.dataset.index = index;
            btn.addEventListener('click', () => this.handleAnswer(index));
            this.elements.game.answersGrid.appendChild(btn);
        });

        // Sync problem to opponent
        peerManager.send({
            type: 'newProblem',
            problem: this.currentProblem,
            questionNumber: this.currentQuestionNumber
        });

        // Start timer
        this.startTimer();
    }

    startTimer() {
        this.updateTimerDisplay();
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.handleTimeout();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        this.elements.game.timer.textContent = this.timeLeft;

        if (this.timeLeft <= 3) {
            this.elements.game.timer.classList.add('urgent');
            this.elements.game.timer.classList.remove('warning');
        } else if (this.timeLeft <= 5) {
            this.elements.game.timer.classList.add('warning');
            this.elements.game.timer.classList.remove('urgent');
        } else {
            this.elements.game.timer.classList.remove('urgent', 'warning');
        }
    }

    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    clearPendingAdvance() {
        if (this.pendingAdvanceTimeout) {
            clearTimeout(this.pendingAdvanceTimeout);
            this.pendingAdvanceTimeout = null;
        }
    }

    handleAnswer(answerIndex) {
        if (!this.roundActive) return;

        // Immediately lock the round and stop timer
        this.roundActive = false;
        this.clearTimer();

        const isCorrect = answerIndex === this.currentProblem.correctIndex;
        const timestamp = Date.now();
        const answerTime = ((timestamp - this.roundStartTime) / 1000).toFixed(1);

        // Send answer to peer immediately
        peerManager.send({
            type: 'answer',
            answerIndex,
            isCorrect,
            timestamp
        });

        // Disable all buttons immediately
        this.disableAnswers();

        if (isCorrect) {
            this.processAnswer(true, timestamp, answerTime);
        } else {
            const btn = this.elements.game.answersGrid.children[answerIndex];
            btn.classList.add('wrong');
            playSound('wrong');
            this.showRoundResult('wrong');

            peerManager.send({
                type: 'wrongAnswer',
                timestamp
            });

            // Auto-advance after 1 second (tracked)
            this.clearPendingAdvance();
            this.pendingAdvanceTimeout = setTimeout(() => this.advanceToNextQuestion(), NEXT_QUESTION_DELAY);
        }
    }

    handleTimeout() {
        if (!this.roundActive) return;

        // Lock the round and ensure timer is cleared
        this.roundActive = false;
        this.clearTimer();
        this.disableAnswers();

        playSound('timeout');
        this.showRoundResult('timeout');

        peerManager.send({ type: 'timeout' });

        // Auto-advance after 1 second (tracked)
        this.clearPendingAdvance();
        this.pendingAdvanceTimeout = setTimeout(() => this.advanceToNextQuestion(), NEXT_QUESTION_DELAY);
    }

    processAnswer(isCorrect, timestamp, answerTime) {
        // Timer already cleared and round locked by handleAnswer

        if (isCorrect) {
            this.myScore++;
            this.correctStreak++;
            this.currentMatchCorrect++;
            this.currentMatchQuestions++;

            // Animate score counter
            this.animateScoreCounter(this.elements.game.yourScore, this.myScore);

            this.elements.game.speedIndicator.textContent = `${answerTime}s`;
            this.elements.game.speedIndicator.classList.remove('hidden');

            playSound('correct');

            // Calculate XP
            let xpGained = 10; // Base XP
            const timeToAnswer = parseFloat(answerTime);

            // Speed bonus
            if (timeToAnswer < 3) {
                xpGained += 5;
            }

            // Streak bonus
            xpGained += Math.min(10, this.correctStreak * 2);

            // Show floating XP at the position of the correct button
            const correctBtn = this.elements.game.answersGrid.children[this.currentProblem.correctIndex];
            if (correctBtn) {
                const rect = correctBtn.getBoundingClientRect();
                this.showFloatingXP(xpGained, rect.left + rect.width / 2, rect.top);
            }

            // Map operation for RPG tracking
            const operationMap = { '+': 'add', '-': 'sub', '×': 'mult', '÷': 'div' };
            const rpgOperation = operationMap[this.currentProblem.operation] || 'add';

            // Track RPG
            if (rpgManager) {
                rpgManager.trackAnswer({
                    isCorrect: true,
                    timeToAnswer,
                    operation: rpgOperation,
                    difficulty: this.difficulty
                });

                // Add XP and check for level up
                const levelResult = rpgManager.addXP(xpGained, rpgOperation);

                if (levelResult.leveledUp) {
                    setTimeout(() => {
                        this.showLevelUp(levelResult.oldLevel, levelResult.newLevel);
                    }, 1000);
                }

                // Show XP gained
                this.showXPGained(xpGained);

                // Track streak achievements
                rpgManager.trackStreak(this.correctStreak);
            }

            // Track quests
            if (questsManager) {
                questsManager.trackCorrectAnswer(rpgOperation);

                // Track streak quests
                if (this.correctStreak >= 3) {
                    questsManager.trackStreak(this.correctStreak);
                }
            }

            // Track analytics
            if (analyticsManager) {
                analyticsManager.trackQuestionAnswered({
                    difficulty: this.difficulty,
                    isCorrect: true,
                    timeToAnswer: timeToAnswer,
                    operation: this.currentProblem.operation
                });
            }

            const rampThreshold = this.customSettings?.difficultyRamping
                ? (this.customSettings.rampAfterCorrect || 3)
                : 3;

            if (this.correctStreak >= rampThreshold) {
                playSound('streak');
                const streakCount = this.correctStreak;
                this.elements.game.streakIndicator.innerHTML = `🔥 ON FIRE! (${streakCount})`;
                this.elements.game.streakIndicator.classList.remove('hidden');
                this.elements.game.streakIndicator.classList.add('streak-active');
            } else {
                this.elements.game.streakIndicator.classList.add('hidden');
            }

            if (this.correctStreak >= rampThreshold) {
                this.showRoundResult('streak');
            } else {
                this.showRoundResult('correct');
            }

            // Difficulty ramp after threshold correct (if enabled)
            if (this.customSettings?.difficultyRamping !== false && this.correctStreak >= rampThreshold) {
                this.difficulty++;
                this.correctStreak = 0;
            }

            // Auto-advance after 1 second (tracked)
            this.clearPendingAdvance();
            this.pendingAdvanceTimeout = setTimeout(() => this.advanceToNextQuestion(), NEXT_QUESTION_DELAY);
        }
    }

    handleOpponentAnswer(data) {
        if (!this.roundActive) return;

        const { answerIndex, isCorrect, timestamp } = data;

        if (isCorrect) {
            // Immediately lock the round and stop timer
            this.roundActive = false;
            this.clearTimer();
            this.disableAnswers();

            const correctBtn = this.elements.game.answersGrid.children[this.currentProblem.correctIndex];
            correctBtn.classList.add('correct');

            playSound('timeout');
            this.showRoundResult('too-slow');
            this.opponentScore++;
            this.elements.game.opponentScore.textContent = this.opponentScore;

            this.correctStreak = 0;
            this.elements.game.streakIndicator.classList.add('hidden');

            // Auto-advance after 1 second (tracked)
            this.clearPendingAdvance();
            this.pendingAdvanceTimeout = setTimeout(() => this.advanceToNextQuestion(), NEXT_QUESTION_DELAY);
        } else {
            const btn = this.elements.game.answersGrid.children[answerIndex];
            if (btn) btn.style.opacity = '0.3';
        }
    }

    handleOpponentWrong(timestamp) {
        // Opponent answered wrong
    }

    disableAnswers() {
        Array.from(this.elements.game.answersGrid.children).forEach(btn => {
            btn.disabled = true;
        });
    }

    showRoundResult(result) {
        const resultEl = this.elements.game.roundResult;
        resultEl.classList.remove('hidden', 'correct', 'wrong', 'timeout', 'too-slow', 'streak', 'opponent-wrong', 'opponent-timeout');

        const messages = {
            correct: '+1 Point!',
            wrong: 'Wrong!',
            timeout: "Time's Up!",
            'too-slow': 'Too Slow!',
            streak: '🔥 STREAK! 🔥',
            'opponent-wrong': 'Opponent Wrong!',
            'opponent-timeout': 'Opponent Timeout!'
        };

        resultEl.textContent = messages[result];
        resultEl.classList.add(result);
    }

    advanceToNextQuestion() {
        // Clear the timeout that triggered this advance
        this.clearPendingAdvance();

        if (this.currentQuestionNumber >= this.questionsPerMatch) {
            this.endGame();
            return;
        }

        if (this.isHost) {
            this.startRound();
        }
    }

    waitForNextQuestion() {
        // Clear the timeout that triggered this
        this.clearPendingAdvance();
        // Non-host just waits - the host will send newProblem message
        // This is called after showing result to allow time for the visual feedback
    }

    loadProblem(problemData, questionNumber) {
        // Clear any pending advances from previous round
        this.clearPendingAdvance();

        this.currentProblem = problemData;
        this.currentQuestionNumber = questionNumber;
        this.timeLeft = ROUND_TIME;
        this.roundActive = true;
        this.roundStartTime = Date.now();

        this.elements.game.progressIndicator.textContent = `Question ${this.currentQuestionNumber} of ${this.questionsPerMatch}`;

        this.elements.game.difficultyLevel.textContent = this.difficulty;
        this.elements.game.problemText.textContent = this.currentProblem.question;
        this.elements.game.roundResult.classList.add('hidden');

        this.elements.game.speedIndicator.classList.add('hidden');

        this.elements.game.answersGrid.innerHTML = '';
        this.currentProblem.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.textContent = option;
            btn.dataset.index = index;
            btn.addEventListener('click', () => this.handleAnswer(index));
            this.elements.game.answersGrid.appendChild(btn);
        });

        this.startTimer();
    }

    endGame() {
        this.clearTimer();
        this.clearPendingAdvance();

        const resultEl = this.elements.gameover.finalResult;
        resultEl.classList.remove('win', 'lose', 'tie');

        let result;
        if (this.myScore > this.opponentScore) {
            result = 'win';
            resultEl.textContent = 'You Win!';
            resultEl.classList.add('win');
            playSound('streak');

            // Trigger confetti
            if (typeof confetti !== 'undefined') {
                this.triggerConfetti();
            }
        } else if (this.myScore < this.opponentScore) {
            result = 'lose';
            resultEl.textContent = 'You Lose!';
            resultEl.classList.add('lose');
        } else {
            result = 'tie';
            resultEl.textContent = "It's a Tie!";
            resultEl.classList.add('tie');
        }

        this.elements.gameover.finalYourScore.textContent = this.myScore;
        this.elements.gameover.finalOpponentScore.textContent = this.opponentScore;

        // Calculate accuracy
        const accuracy = this.currentMatchQuestions > 0
            ? Math.round((this.currentMatchCorrect / this.currentMatchQuestions) * 100)
            : 0;

        // Track RPG match result
        if (rpgManager) {
            // Add win bonus
            let xpBonus = 0;
            if (result === 'win') {
                xpBonus = 20;
                const levelResult = rpgManager.addXP(xpBonus);

                if (levelResult.leveledUp) {
                    setTimeout(() => {
                        this.showLevelUp(levelResult.oldLevel, levelResult.newLevel);
                    }, 1500);
                }

                // Track win quest
                if (questsManager) {
                    questsManager.trackWin();
                }
            }

            // Track match for achievements
            const wasFirst = this.myScore > this.opponentScore;
            rpgManager.trackMatch(result, accuracy, wasFirst);

            // Check for newly unlocked achievements
            this.checkAchievementUnlocks();
        }

        // Track final streak for quests
        if (questsManager && this.correctStreak >= 3) {
            questsManager.trackStreak(this.correctStreak);
        }

        // Track analytics
        if (analyticsManager) {
            analyticsManager.trackMatchEnded(result, this.myScore, this.opponentScore);
        }

        this.showScreen('gameover');
    }

    checkAchievementUnlocks() {
        if (!rpgManager) return;

        const allAchievements = rpgManager.achievements;
        const newlyUnlocked = [];

        Object.values(allAchievements).forEach(achievement => {
            if (achievement.unlocked) {
                // Check if we should show notification (could add tracking for shown status)
                newlyUnlocked.push(achievement);
            }
        });

        // Show notifications for newly unlocked achievements
        // (In a more sophisticated version, we'd track which have been shown)
    }

    triggerConfetti() {
        // Confetti burst from center
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#667eea', '#764ba2', '#f093fb', '#4ade80', '#f5576c']
        });

        // Side bursts
        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#667eea', '#764ba2', '#f093fb']
            });
        }, 200);

        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#4ade80', '#f5576c', '#f093fb']
            });
        }, 400);

        // Final celebration burst
        setTimeout(() => {
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.7 },
                colors: ['#667eea', '#764ba2', '#f093fb', '#4ade80', '#f5576c', '#ffc107']
            });
        }, 600);
    }

    resetGame() {
        this.clearTimer();
        this.clearPendingAdvance();

        this.myScore = 0;
        this.opponentScore = 0;
        this.difficulty = this.startingDifficulty;
        this.correctStreak = 0;
        this.currentProblem = null;
        this.roundActive = false;
        this.currentQuestionNumber = 0;

        this.elements.game.yourScore.textContent = '0';
        this.elements.game.opponentScore.textContent = '0';
        this.elements.game.difficultyLevel.textContent = this.difficulty;
        this.elements.game.roundResult.classList.add('hidden');
        this.elements.game.streakIndicator.classList.add('hidden');
        this.elements.game.speedIndicator.classList.add('hidden');
        this.elements.game.progressIndicator.classList.add('hidden');

        this.showScreen('game');

        if (this.isHost) {
            setTimeout(() => this.startMatch(), 500);
        }
    }

    handlePeerMessage(data) {
        switch (data.type) {
            case 'newProblem':
                this.loadProblem(data.problem, data.questionNumber);
                break;
            case 'answer':
                this.handleOpponentAnswer(data);
                break;
            case 'wrongAnswer':
                // Opponent answered wrong - show result and auto-advance
                if (this.roundActive) {
                    this.roundActive = false;
                    this.clearTimer();
                    this.disableAnswers();
                    this.showRoundResult('opponent-wrong');
                    playSound('correct'); // You got it right by default

                    // Auto-advance after 1 second (wait for host's next problem)
                    this.clearPendingAdvance();
                    this.pendingAdvanceTimeout = setTimeout(() => this.waitForNextQuestion(), NEXT_QUESTION_DELAY);
                }
                break;
            case 'timeout':
                // Opponent timed out - show result and auto-advance
                if (this.roundActive) {
                    this.roundActive = false;
                    this.clearTimer();
                    this.disableAnswers();
                    this.showRoundResult('opponent-timeout');
                    playSound('correct'); // You got it right by default

                    // Auto-advance after 1 second (wait for host's next problem)
                    this.clearPendingAdvance();
                    this.pendingAdvanceTimeout = setTimeout(() => this.waitForNextQuestion(), NEXT_QUESTION_DELAY);
                }
                break;
            case 'playAgain':
                this.resetGame();
                break;
            case 'avatar':
                this.opponentAvatar = data.avatar;
                if (this.elements.game.opponentAvatar) {
                    this.elements.game.opponentAvatar.textContent = data.avatar;
                }
                break;
        }
    }

    /**
     * Show a floating XP notification at the specified position
     */
    showFloatingXP(xp, x, y) {
        const floatingXP = document.createElement('div');
        floatingXP.className = 'floating-xp';
        floatingXP.textContent = `+${xp} XP`;
        floatingXP.style.left = `${x}px`;
        floatingXP.style.top = `${y}px`;
        document.body.appendChild(floatingXP);

        setTimeout(() => {
            floatingXP.remove();
        }, 1000);
    }

    /**
     * Animate a score counter smoothly from current value to new value
     */
    animateScoreCounter(element, targetValue, duration = 500) {
        const startValue = parseInt(element.textContent) || 0;
        const diff = targetValue - startValue;
        const startTime = performance.now();

        element.classList.add('counting');

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.round(startValue + diff * easeOutQuart);

            element.textContent = currentValue;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.classList.remove('counting');
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Show a toast notification
     */
    showToast(message, duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.setAttribute('role', 'status');
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, duration);
    }

    /**
     * Setup enhanced button click animations
     */
    setupButtonAnimations() {
        // Add click sound and animation to all buttons
        const allButtons = document.querySelectorAll('button, .answer-btn');

        allButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Play subtle click sound
                if (window.audioManager) {
                    window.audioManager.playSound('buttonClick');
                }

                // Visual feedback already handled by CSS :active state
            }, { passive: true });
        });
    }

    /**
     * Announce game state to screen readers
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;

        document.body.appendChild(announcement);

        setTimeout(() => {
            announcement.remove();
        }, 1000);
    }

    /**
     * Setup modal open/close animations
     */
    setupModalAnimations() {
        const modals = document.querySelectorAll('.modal');

        modals.forEach(modal => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        const isHidden = modal.classList.contains('hidden');

                        if (!isHidden && audioManager) {
                            // Modal opened
                            window.audioManager.playSound('modalOpen');
                        } else if (isHidden && audioManager) {
                            // Modal closed
                            window.audioManager.playSound('modalClose');
                        }
                    }
                });
            });

            observer.observe(modal, { attributes: true });
        });
    }

    /**
     * Setup loading states for async operations
     */
    setupLoadingStates() {
        // Add loading state support to buttons
        const setupButtonLoading = (btn) => {
            const originalText = btn.textContent;
            const originalDisabled = btn.disabled;

            btn.setLoading = (loading) => {
                if (loading) {
                    btn.disabled = true;
                    btn.dataset.originalText = originalText;
                    btn.innerHTML = '<span class="loading-spinner"></span>';
                } else {
                    btn.disabled = originalDisabled;
                    btn.textContent = originalText;
                }
            };
        };

        document.querySelectorAll('button').forEach(setupButtonLoading);
    }

    /**
     * Enhance answer button animations
     */
    enhanceAnswerButtonAnimations() {
        const answerBtns = this.elements.game.answersGrid?.querySelectorAll('.answer-btn');

        answerBtns?.forEach(btn => {
            // Add press animation
            btn.addEventListener('mousedown', () => {
                btn.style.transform = 'scale(0.95)';
            });

            btn.addEventListener('mouseup', () => {
                btn.style.transform = 'scale(1)';
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
            });
        });
    }
}

// MathArena class will be initialized in index.html
