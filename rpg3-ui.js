// Math Arena - Phase 3 UI Integration
// This file handles all the UI interactions for Campaign, Gear, Skills, and Clan features

// ==================== CAMPAIGN UI ====================

class CampaignUI {
    constructor(campaignManager, rpgManager) {
        this.campaignManager = campaignManager;
        this.rpgManager = rpgManager;
        this.selectedWorld = null;
        this.currentWorld = null;
        this.currentLevel = null;
        this.setupModals();
    }

    setupModals() {
        // Campaign button
        const campaignBtn = document.getElementById('campaign-play-btn');
        const campaignHeaderBtn = document.getElementById('campaign-btn');

        if (campaignBtn) {
            campaignBtn.addEventListener('click', () => this.openCampaignModal());
        }

        if (campaignHeaderBtn) {
            campaignHeaderBtn.addEventListener('click', () => this.openCampaignModal());
        }

        // Campaign modal
        const closeCampaignBtn = document.getElementById('close-campaign');
        const campaignModal = document.getElementById('campaign-modal');

        if (closeCampaignBtn && campaignModal) {
            closeCampaignBtn.addEventListener('click', () => {
                campaignModal.classList.add('hidden');
            });

            campaignModal.addEventListener('click', (e) => {
                if (e.target === campaignModal) {
                    campaignModal.classList.add('hidden');
                }
            });
        }

        // Level select modal
        const closeLevelSelectBtn = document.getElementById('close-level-select');
        const levelSelectModal = document.getElementById('level-select-modal');

        if (closeLevelSelectBtn && levelSelectModal) {
            closeLevelSelectBtn.addEventListener('click', () => {
                levelSelectModal.classList.add('hidden');
            });

            levelSelectModal.addEventListener('click', (e) => {
                if (e.target === levelSelectModal) {
                    levelSelectModal.classList.add('hidden');
                }
            });
        }

        // Initialize campaign display
        this.updateCampaignDisplay();
    }

    openCampaignModal() {
        const campaignModal = document.getElementById('campaign-modal');
        if (campaignModal) {
            this.updateCampaignDisplay();
            campaignModal.classList.remove('hidden');
        }
    }

    updateCampaignDisplay() {
        const totalStarsEl = document.getElementById('campaign-total-stars');
        const worldsListEl = document.getElementById('worlds-list');

        if (totalStarsEl) {
            totalStarsEl.textContent = this.campaignManager.getTotalStars();
        }

        if (worldsListEl) {
            worldsListEl.innerHTML = '';

            Object.values(this.campaignManager.worlds).forEach(world => {
                const isUnlocked = this.campaignManager.isWorldUnlocked(world.id);
                const progress = this.campaignManager.getWorldProgress(world.id);
                const isBossDefeated = progress.bossDefeated;

                const worldCard = document.createElement('div');
                worldCard.className = `world-card ${isUnlocked ? '' : 'locked'}`;
                worldCard.innerHTML = `
                    <div class="world-card-header">
                        <div class="world-card-icon">${world.icon}</div>
                        <div class="world-card-info">
                            <div class="world-card-name">${world.name}</div>
                            <div class="world-card-description">${world.description}</div>
                        </div>
                        <div class="world-card-stars">
                            ${this.renderStars(progress.earnedStars, progress.maxStars)}
                        </div>
                    </div>
                    <div class="world-card-progress">
                        <div class="world-progress-bar">
                            <div class="world-progress-fill" style="width: ${(progress.completedLevels / progress.totalLevels) * 100}%"></div>
                        </div>
                        <div class="world-progress-text">${progress.completedLevels}/${progress.totalLevels}</div>
                        ${isBossDefeated ? '<span class="boss-badge">BOSS DEFEATED</span>' : ''}
                    </div>
                `;

                if (isUnlocked) {
                    worldCard.addEventListener('click', () => this.openLevelSelect(world.id));
                }

                worldsListEl.appendChild(worldCard);
            });
        }
    }

    renderStars(earned, max) {
        const fullStars = Math.floor(earned / 3);
        const partialStar = earned % 3;
        const emptyStars = Math.floor(max / 3) - fullStars - (partialStar > 0 ? 1 : 0);

        let stars = '';
        for (let i = 0; i < fullStars; i++) stars += '⭐';
        if (partialStar > 0) stars += '✨';
        for (let i = 0; i < emptyStars; i++) stars += '☆';

        return stars;
    }

    openLevelSelect(worldId) {
        this.selectedWorld = worldId;
        const world = this.campaignManager.worlds[worldId];
        const levelSelectModal = document.getElementById('level-select-modal');
        const worldNameEl = document.getElementById('level-select-world-name');
        const levelsGridEl = document.getElementById('levels-grid');

        if (worldNameEl) {
            worldNameEl.textContent = world.name;
        }

        if (levelsGridEl) {
            levelsGridEl.innerHTML = '';

            for (let level = 1; level <= world.levels; level++) {
                const isUnlocked = this.campaignManager.isLevelUnlocked(worldId, level);
                const isBoss = level === world.bossLevel;
                const stars = this.campaignManager.getLevelStars(worldId, level);
                const isCompleted = stars > 0;

                const levelNode = document.createElement('div');
                levelNode.className = `level-node ${isUnlocked ? '' : 'locked'} ${isBoss ? 'boss' : ''} ${isCompleted ? 'completed' : ''}`;
                levelNode.innerHTML = `
                    <div class="level-number">${level}</div>
                    <div class="level-stars">
                        ${this.renderLevelStars(stars)}
                    </div>
                    ${isBoss ? '<div class="boss-badge">BOSS</div>' : ''}
                `;

                if (isUnlocked) {
                    levelNode.addEventListener('click', () => this.startCampaignLevel(worldId, level));
                }

                levelsGridEl.appendChild(levelNode);
            }
        }

        if (levelSelectModal) {
            levelSelectModal.classList.remove('hidden');
        }
    }

    renderLevelStars(stars) {
        let starHtml = '';
        for (let i = 0; i < 3; i++) {
            starHtml += `<span class="level-star ${i < stars ? 'earned' : ''}">★</span>`;
        }
        return starHtml;
    }

    startCampaignLevel(worldId, level) {
        this.currentWorld = worldId;
        this.currentLevel = level;

        // Close modals
        document.getElementById('level-select-modal').classList.add('hidden');
        document.getElementById('campaign-modal').classList.add('hidden');

        // Start campaign match
        if (window.game) {
            window.game.startCampaignMatch(worldId, level);
        }
    }

    completeCampaignMatch(worldId, level, accuracy, won) {
        const stars = this.campaignManager.calculateStars(accuracy, won);
        this.campaignManager.completeLevel(worldId, level, stars, accuracy);

        // Show completion notification
        this.showCompletionNotification(worldId, level, stars, won);

        // Update displays
        this.updateCampaignDisplay();
    }

    showCompletionNotification(worldId, level, stars, won) {
        const world = this.campaignManager.worlds[worldId];
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';

        const starsText = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        const resultText = won ? 'VICTORY!' : 'DEFEAT';

        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">${won ? '🏆' : '💔'}</div>
                <div class="achievement-info">
                    <div class="achievement-title">${resultText}</div>
                    <div class="achievement-name">${world.name} Level ${level} - ${starsText}</div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
}

// ==================== GEAR UI ====================

class GearUI {
    constructor(gearManager) {
        this.gearManager = gearManager;
        this.setupModals();
    }

    setupModals() {
        // Gear button
        const gearBtn = document.getElementById('gear-btn');
        if (gearBtn) {
            gearBtn.addEventListener('click', () => this.openGearModal());
        }

        // Gear modal
        const closeGearBtn = document.getElementById('close-gear');
        const gearModal = document.getElementById('gear-modal');

        if (closeGearBtn && gearModal) {
            closeGearBtn.addEventListener('click', () => {
                gearModal.classList.add('hidden');
            });

            gearModal.addEventListener('click', (e) => {
                if (e.target === gearModal) {
                    gearModal.classList.add('hidden');
                }
            });
        }

        // Listen for gear updates
        window.addEventListener('gearUpdate', () => {
            this.updateGearDisplay();
        });

        this.updateGearDisplay();
    }

    openGearModal() {
        const gearModal = document.getElementById('gear-modal');
        if (gearModal) {
            this.updateGearDisplay();
            gearModal.classList.remove('hidden');
        }
    }

    updateGearDisplay() {
        const equipped = this.gearManager.getEquippedGear();
        const inventory = this.gearManager.inventory;
        const totalStats = this.gearManager.getTotalStats();

        // Update equipment slots
        ['head', 'body', 'accessory'].forEach(slot => {
            const slotContent = document.getElementById(`slot-${slot}`);
            if (slotContent) {
                const gear = equipped[slot];
                if (gear) {
                    slotContent.innerHTML = `
                        <div class="equipped-gear">
                            <span class="equipped-gear-icon">${gear.icon}</span>
                            <span class="equipped-gear-name">${gear.name}</span>
                            <span class="equipped-gear-rarity ${gear.rarity}">${gear.rarity}</span>
                            <button class="unequip-slot-btn" data-slot="${slot}">Unequip</button>
                        </div>
                    `;
                } else {
                    slotContent.innerHTML = '<div class="empty-slot">Empty</div>';
                }
            }
        });

        // Add unequip handlers
        document.querySelectorAll('.unequip-slot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const slot = e.target.dataset.slot;
                this.gearManager.unequipGear(slot);
                this.updateGearDisplay();
            });
        });

        // Update total stats
        const statsList = document.getElementById('gear-stats-list');
        if (statsList) {
            const statDescriptions = {
                timerExtension: '+{0}% timer extension',
                xpBonus: '+{0}% XP gain',
                streakBonus: '+{0}s streak bonus',
                timeExtension: '+{0}s time on streak',
                wrongAnswerShield: '{0} free wrong answer',
                easierProblems: '{0}% chance for easier problem',
                multiplicationEasier: 'Multiplication easier',
                divisionShield: '{0} free wrong on division',
                accuracyBonus: '+{0}% accuracy bonus'
            };

            let statsHtml = '';
            Object.entries(totalStats).forEach(([stat, value]) => {
                if (value !== 0 && value !== false) {
                    const desc = statDescriptions[stat] || stat;
                    let displayValue = value;
                    if (typeof value === 'number' && stat !== 'wrongAnswerShield' && stat !== 'divisionShield') {
                        displayValue = (value * 100).toFixed(0);
                    }
                    statsHtml += `
                        <div class="stat-item-display">
                            <span>${desc.replace('{0}', displayValue)}</span>
                        </div>
                    `;
                }
            });

            statsList.innerHTML = statsHtml || '<div class="stat-item-display">No bonuses equipped</div>';
        }

        // Update gear inventory
        const gearGrid = document.getElementById('gear-grid');
        const gearEmpty = document.getElementById('gear-empty');

        if (gearGrid) {
            const ownedGear = Object.keys(inventory);

            if (ownedGear.length === 0) {
                gearGrid.classList.add('hidden');
                if (gearEmpty) gearEmpty.classList.remove('hidden');
            } else {
                gearGrid.classList.remove('hidden');
                if (gearEmpty) gearEmpty.classList.add('hidden');

                gearGrid.innerHTML = ownedGear.map(gearId => {
                    const gear = this.gearManager.gearDefinitions[gearId];
                    const isEquipped = Object.values(equipped).some(e => e && e.id === gearId);

                    return `
                        <div class="gear-item-card ${isEquipped ? 'equipped' : ''}" data-gear-id="${gearId}">
                            <div class="gear-item-icon">${gear.icon}</div>
                            <div class="gear-item-name">${gear.name}</div>
                            <div class="gear-item-slot">${gear.slot}</div>
                        </div>
                    `;
                }).join('');

                // Add click handlers
                gearGrid.querySelectorAll('.gear-item-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const gearId = card.dataset.gearId;
                        const gear = this.gearManager.gearDefinitions[gearId];

                        if (Object.values(equipped).some(e => e && e.id === gearId)) {
                            // Unequip
                            this.gearManager.unequipGear(gear.slot);
                        } else {
                            // Equip
                            this.gearManager.equipGear(gearId, gear.slot);
                        }
                        this.updateGearDisplay();
                    });
                });
            }
        }
    }
}

// ==================== SKILLS UI ====================

class SkillsUI {
    constructor(skillManager, rpgManager) {
        this.skillManager = skillManager;
        this.rpgManager = rpgManager;
        this.activeTree = 'speed';
        this.setupModals();
    }

    setupModals() {
        // Skills button
        const skillsBtn = document.getElementById('skills-btn');
        if (skillsBtn) {
            skillsBtn.addEventListener('click', () => this.openSkillsModal());
        }

        // Skills modal
        const closeSkillsBtn = document.getElementById('close-skills');
        const skillsModal = document.getElementById('skills-modal');

        if (closeSkillsBtn && skillsModal) {
            closeSkillsBtn.addEventListener('click', () => {
                skillsModal.classList.add('hidden');
            });

            skillsModal.addEventListener('click', (e) => {
                if (e.target === skillsModal) {
                    skillsModal.classList.add('hidden');
                }
            });
        }

        // Respec button
        const respecBtn = document.getElementById('respec-skills-btn');
        if (respecBtn) {
            respecBtn.addEventListener('click', () => {
                if (confirm('Respec all skills? This will refund all skill points.')) {
                    this.skillManager.respec();
                    this.updateSkillsDisplay();
                }
            });
        }

        // Listen for skill updates
        window.addEventListener('skillUpdate', () => {
            this.updateSkillsDisplay();
        });

        // Listen for level ups to award skill points
        window.addEventListener('rpgUpdate', () => {
            // Could award skill points on level up here
        });

        this.updateSkillsDisplay();
    }

    openSkillsModal() {
        const skillsModal = document.getElementById('skills-modal');
        if (skillsModal) {
            this.updateSkillsDisplay();
            skillsModal.classList.remove('hidden');
        }
    }

    updateSkillsDisplay() {
        const skillPointsCount = document.getElementById('skill-points-count');
        const skillTreesTabs = document.getElementById('skill-trees-tabs');
        const skillTreeContent = document.getElementById('skill-tree-content');

        if (skillPointsCount) {
            skillPointsCount.textContent = this.skillManager.getSkillPoints();
        }

        // Create skill tree tabs
        if (skillTreesTabs) {
            skillTreesTabs.innerHTML = Object.values(this.skillManager.skillTrees).map(tree => `
                <button class="skill-tree-tab ${tree.id === this.activeTree ? 'active' : ''}" data-tree="${tree.id}">
                    <span style="font-size: 1.2rem">${tree.icon}</span>
                    <div>${tree.name}</div>
                </button>
            `).join('');

            // Add click handlers
            skillTreesTabs.querySelectorAll('.skill-tree-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    this.activeTree = tab.dataset.tree;
                    this.updateSkillsDisplay();
                });
            });
        }

        // Display current skill tree
        if (skillTreeContent) {
            const tree = this.skillManager.skillTrees[this.activeTree];
            const effects = this.skillManager.getTotalEffects();

            skillTreeContent.innerHTML = `
                <div class="skill-tree-description">${tree.description}</div>
                <div class="skills-list">
                    ${Object.values(tree.skills).map(skill => {
                        const level = this.skillManager.getSkillLevel(skill.id);
                        const canUnlock = this.skillManager.canUnlockSkill(skill.id);
                        const isMaxed = level >= skill.maxPoints;
                        const isActive = level > 0;

                        return `
                            <div class="skill-item ${!canUnlock && !isActive ? 'locked' : ''} ${canUnlock ? 'available' : ''} ${isMaxed ? 'maxed' : ''}"
                                 data-skill-id="${skill.id}">
                                <div class="skill-header">
                                    <span class="skill-name">${skill.name}</span>
                                    <span class="skill-tier">Tier ${skill.tier}</span>
                                </div>
                                <div class="skill-description">${skill.description}</div>
                                <div class="skill-progress">
                                    <div class="skill-points-bar">
                                        <div class="skill-points-fill" style="width: ${(level / skill.maxPoints) * 100}%"></div>
                                    </div>
                                    <span class="skill-points-text">${level}/${skill.maxPoints}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Add click handlers for available skills
            skillTreeContent.querySelectorAll('.skill-item.available').forEach(item => {
                if (!item.classList.contains('maxed')) {
                    item.addEventListener('click', () => {
                        const skillId = item.dataset.skillId;
                        if (this.skillManager.unlockSkill(skillId)) {
                            this.updateSkillsDisplay();
                        }
                    });
                }
            });
        }
    }
}

// ==================== CLAN UI ====================

class ClanUI {
    constructor(clanManager, rpgManager, settingsManager) {
        this.clanManager = clanManager;
        this.rpgManager = rpgManager;
        this.settingsManager = settingsManager;
        this.setupModals();
    }

    setupModals() {
        // Clan button
        const clanBtn = document.getElementById('clan-btn');
        if (clanBtn) {
            clanBtn.addEventListener('click', () => this.openClanModal());
        }

        // Clan modal
        const closeClanBtn = document.getElementById('close-clan');
        const clanModal = document.getElementById('clan-modal');

        if (closeClanBtn && clanModal) {
            closeClanBtn.addEventListener('click', () => {
                clanModal.classList.add('hidden');
            });

            clanModal.addEventListener('click', (e) => {
                if (e.target === clanModal) {
                    clanModal.classList.add('hidden');
                }
            });
        }

        // Create clan button
        const createClanBtn = document.getElementById('create-clan-btn');
        if (createClanBtn) {
            createClanBtn.addEventListener('click', () => this.createClan());
        }

        // Join clan button
        const joinClanBtn = document.getElementById('join-clan-btn');
        if (joinClanBtn) {
            joinClanBtn.addEventListener('click', () => this.joinClan());
        }

        // Leave clan button
        const leaveClanBtn = document.getElementById('leave-clan-btn');
        if (leaveClanBtn) {
            leaveClanBtn.addEventListener('click', () => this.leaveClan());
        }

        // Listen for clan updates
        window.addEventListener('clanUpdate', () => {
            this.updateClanDisplay();
        });

        // Update clan XP when player gains XP
        const originalAddXP = this.rpgManager.addXP;
        this.rpgManager.addXP = (amount, operation) => {
            const result = originalAddXP.call(this.rpgManager, amount, operation);
            this.updateMemberXP();
            return result;
        };

        this.updateClanDisplay();
    }

    openClanModal() {
        const clanModal = document.getElementById('clan-modal');
        if (clanModal) {
            this.updateClanDisplay();
            clanModal.classList.remove('hidden');
        }
    }

    updateClanDisplay() {
        const playerClan = this.clanManager.getPlayerClan();
        const actionSection = document.getElementById('clan-action-section');
        const currentClanSection = document.getElementById('current-clan-section');
        const leaderboardList = document.getElementById('clan-leaderboard-list');

        // Show/hide sections based on clan membership
        if (playerClan) {
            if (actionSection) actionSection.classList.add('hidden');
            if (currentClanSection) {
                currentClanSection.classList.remove('hidden');
                this.populateCurrentClan(playerClan);
            }
        } else {
            if (actionSection) actionSection.classList.remove('hidden');
            if (currentClanSection) currentClanSection.classList.add('hidden');
        }

        // Update leaderboard
        if (leaderboardList) {
            const leaderboard = this.clanManager.getClanLeaderboard(10);
            leaderboardList.innerHTML = leaderboard.map((clan, index) => {
                const isPlayerClan = playerClan && clan.id === playerClan.id;
                return `
                    <div class="clan-leaderboard-item ${isPlayerClan ? 'style="border-color: #667eea"' : ''}">
                        <div class="clan-rank">${index + 1}</div>
                        <div class="clan-leaderboard-info">
                            <span class="clan-leaderboard-name">${clan.name}</span>
                            <span class="clan-leaderboard-tag">[${clan.tag}]</span>
                        </div>
                        <div class="clan-leaderboard-xp">${clan.totalXP} XP</div>
                    </div>
                `;
            }).join('');
        }
    }

    populateCurrentClan(clan) {
        const clanName = document.getElementById('clan-display-name');
        const clanTag = document.getElementById('clan-display-tag');
        const clanLevel = document.getElementById('clan-display-level');
        const membersList = document.getElementById('clan-members-list');
        const perksList = document.getElementById('clan-perks-list');

        if (clanName) clanName.textContent = clan.name;
        if (clanTag) clanTag.textContent = `[${clan.tag}]`;
        if (clanLevel) clanLevel.textContent = clan.level;

        if (membersList) {
            membersList.innerHTML = clan.members.map(member => `
                <div class="clan-member-item">
                    <span class="clan-member-name">${member.name}</span>
                    <span class="clan-member-xp">${member.xp} XP</span>
                </div>
            `).join('');
        }

        if (perksList) {
            const perks = this.clanManager.getClanPerks(clan.id);
            perksList.innerHTML = perks.map(perk => `
                <div class="clan-perk-item">
                    <span class="clan-perk-icon">✨</span>
                    <span class="clan-perk-name">${perk.name}</span>
                    <span class="clan-perk-description">${perk.description}</span>
                </div>
            `).join('') || '<div class="clan-perk-item">Level up your clan to unlock perks!</div>';
        }
    }

    createClan() {
        const nameInput = document.getElementById('clan-name-input');
        const tagInput = document.getElementById('clan-tag-input');

        const name = nameInput?.value?.trim();
        const tag = tagInput?.value?.trim().toUpperCase();

        if (!name || name.length < 3) {
            alert('Clan name must be at least 3 characters');
            return;
        }

        if (!tag || tag.length !== 3) {
            alert('Clan tag must be exactly 3 characters');
            return;
        }

        const clan = this.clanManager.createClan(name, tag);

        // Add current player as member
        const playerName = this.settingsManager ? this.settingsManager.getPlayerName() : 'Player';
        const playerXP = this.rpgManager ? this.rpgManager.rpgData.xp : 0;
        this.clanManager.addMemberToClan(clan.id, playerName, playerXP);

        // Clear inputs
        if (nameInput) nameInput.value = '';
        if (tagInput) tagInput.value = '';

        this.updateClanDisplay();
    }

    joinClan() {
        const codeInput = document.getElementById('clan-code-input');
        const code = codeInput?.value?.trim().toUpperCase();

        if (!code || code.length !== 6) {
            alert('Please enter a valid 6-character clan code');
            return;
        }

        const result = this.clanManager.joinClan(code);

        if (result.success) {
            // Add player as member
            const playerName = this.settingsManager ? this.settingsManager.getPlayerName() : 'Player';
            const playerXP = this.rpgManager ? this.rpgManager.rpgData.xp : 0;
            this.clanManager.addMemberToClan(code, playerName, playerXP);

            if (codeInput) codeInput.value = '';
            this.updateClanDisplay();
        } else {
            alert(result.error || 'Clan not found');
        }
    }

    leaveClan() {
        if (confirm('Are you sure you want to leave your clan?')) {
            this.clanManager.leaveClan();
            this.updateClanDisplay();
        }
    }

    updateMemberXP() {
        const playerClan = this.clanManager.getPlayerClan();
        if (playerClan) {
            const playerName = this.settingsManager ? this.settingsManager.getPlayerName() : 'Player';
            const playerXP = this.rpgManager ? this.rpgManager.rpgData.xp : 0;
            this.clanManager.updateMemberXP(playerName, playerXP);
        }
    }
}

// ==================== CAMPAIGN GAME INTEGRATION ====================

// Extend MathArena class with campaign functionality
// Wait for MathArena to be defined before extending
function extendMathArenaForCampaign() {
    if (typeof MathArena === 'undefined') {
        // MathArena not defined yet, retry in 50ms
        setTimeout(extendMathArenaForCampaign, 50);
        return;
    }

    const originalStartMatch = MathArena.prototype.startMatch;

    MathArena.prototype.startCampaignMatch = function(worldId, level) {
        this.isCampaignMode = true;
        this.campaignWorldId = worldId;
        this.campaignLevel = level;

        // Get AI difficulty for this level
        if (window.campaignManager) {
            this.campaignAIDifficulty = window.campaignManager.getAIDifficulty(worldId, level);
        }

        // Start the match
        this.showScreen('game');
        this.startMatch();

        // Add AI opponent simulation
        this.startCampaignAI();
    };

    MathArena.prototype.startCampaignAI = function() {
        if (!this.isCampaignMode || !this.campaignAIDifficulty) return;

        const ai = this.campaignAIDifficulty;
        let questionCount = 0;

        // Simulate AI answering
        this.campaignAITimer = setInterval(() => {
            if (!this.roundActive || !this.currentProblem) return;

            questionCount++;

            // Check if AI answers correctly
            const isCorrect = Math.random() < ai.accuracy;

            // Random delay
            const delay = ai.minDelay + Math.random() * (ai.maxDelay - ai.minDelay);

            setTimeout(() => {
                if (this.roundActive && isCorrect) {
                    // AI answers correctly
                    this.opponentScore++;
                    this.elements.game.opponentScore.textContent = this.opponentScore;

                    // Show opponent answered
                    const correctBtn = this.elements.game.answersGrid.children[this.currentProblem.correctIndex];
                    if (correctBtn) {
                        correctBtn.style.opacity = '0.5';
                    }

                    // If AI is faster, player loses this round
                    this.roundActive = false;
                    this.clearTimer();
                    this.disableAnswers();
                    this.showRoundResult('too-slow');
                    playSound('timeout');

                    this.clearPendingAdvance();
                    this.pendingAdvanceTimeout = setTimeout(() => this.advanceToNextQuestion(), NEXT_QUESTION_DELAY);
                }
            }, delay);
        }, 2000);
    };

    const originalEndGame = MathArena.prototype.endGame;

    MathArena.prototype.endGame = function() {
        // Clean up campaign AI
        if (this.campaignAITimer) {
            clearInterval(this.campaignAITimer);
            this.campaignAITimer = null;
        }

        const result = this.myScore > this.opponentScore ? 'win' :
                      this.myScore < this.opponentScore ? 'lose' : 'tie';

        const accuracy = this.currentMatchQuestions > 0
            ? Math.round((this.currentMatchCorrect / this.currentMatchQuestions) * 100)
            : 0;

        // Handle campaign completion
        if (this.isCampaignMode && window.campaignUI) {
            window.campaignUI.completeCampaignMatch(
                this.campaignWorldId,
                this.campaignLevel,
                accuracy,
                result === 'win'
            );

            this.isCampaignMode = false;
            this.campaignWorldId = null;
            this.campaignLevel = null;
            this.campaignAIDifficulty = null;
        }

        // Call original end game
        originalEndGame.call(this);
    };

    // Award skill points on level up
    const originalAddXP = RPGManager.prototype.addXP;
    RPGManager.prototype.addXP = function(amount, operation) {
        const result = originalAddXP.call(this, amount, operation);

        if (result.leveledUp && window.skillManager) {
            // Award 1 skill point per level up
            window.skillManager.addSkillPoints(1);
        }

        return result;
    };
}

// Start the extension process
extendMathArenaForCampaign();

// ==================== INITIALIZATION ====================

// Initialize all Phase 3 UI classes after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for managers to be initialized
    setTimeout(() => {
        if (window.campaignManager && window.rpgManager) {
            window.campaignUI = new CampaignUI(window.campaignManager, window.rpgManager);
        }

        if (window.gearManager) {
            window.gearUI = new GearUI(window.gearManager);
        }

        if (window.skillManager && window.rpgManager) {
            window.skillsUI = new SkillsUI(window.skillManager, window.rpgManager);
        }

        if (window.clanManager && window.rpgManager && window.settingsManager) {
            window.clanUI = new ClanUI(window.clanManager, window.rpgManager, window.settingsManager);
        }
    }, 100);
});
