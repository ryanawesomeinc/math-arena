// Math Arena - Phase 3 RPG System (Campaign, Gear, Skills, Clans)

// ==================== CAMPAIGN MANAGER ====================

class CampaignManager {
    constructor() {
        this.worlds = this.getWorldDefinitions();
        this.playerProgress = this.getDefaultProgress();
        this.loadFromStorage();
    }

    getWorldDefinitions() {
        return {
            additionForest: {
                id: 'additionForest',
                name: 'Addition Forest',
                icon: '🌲',
                description: 'Master basic addition',
                color: '#4ade80',
                levels: 5,
                operation: 'add',
                difficulty: 1,
                bossLevel: 5,
                rewards: { xp: 100, item: 'timeFreeze' }
            },
            multiplicationMountain: {
                id: 'multiplicationMountain',
                name: 'Multiplication Mountain',
                icon: '⛰️',
                description: 'Conquer multiplication',
                color: '#f5576c',
                levels: 5,
                operation: 'mult',
                difficulty: 2,
                bossLevel: 5,
                rewards: { xp: 200, item: 'calculator' }
            },
            divisionDungeon: {
                id: 'divisionDungeon',
                name: 'Division Dungeon',
                icon: '🏰',
                description: 'Descend into division',
                color: '#a78bfa',
                levels: 5,
                operation: 'div',
                difficulty: 3,
                bossLevel: 5,
                rewards: { xp: 300, item: 'shield' }
            },
            fractionValley: {
                id: 'fractionValley',
                name: 'Fraction Valley',
                icon: '🏞️',
                description: 'Explore fractions',
                color: '#fbbf24',
                levels: 5,
                operation: 'mixed',
                difficulty: 4,
                bossLevel: 5,
                rewards: { xp: 400, item: 'luckyPencil' }
            },
            algebraCastle: {
                id: 'algebraCastle',
                name: 'Algebra Castle',
                icon: '🏰',
                description: 'Rule algebra',
                color: '#f093fb',
                levels: 5,
                operation: 'mixed',
                difficulty: 5,
                bossLevel: 5,
                rewards: { xp: 500, item: 'wizardHat' }
            }
        };
    }

    getDefaultProgress() {
        const progress = {};
        Object.values(this.worlds).forEach(world => {
            progress[world.id] = {
                unlocked: world.id === 'additionForest',
                completedLevels: [],
                stars: {}, // { levelId: starCount (0-3) }
                bossDefeated: false
            };
        });
        return progress;
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('mathArena_campaign');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.playerProgress = { ...this.playerProgress, ...parsed };
            }
        } catch (e) {
            console.error('Failed to load campaign progress:', e);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('mathArena_campaign', JSON.stringify(this.playerProgress));
        } catch (e) {
            console.error('Failed to save campaign progress:', e);
        }
    }

    isWorldUnlocked(worldId) {
        return this.playerProgress[worldId]?.unlocked || false;
    }

    isLevelUnlocked(worldId, level) {
        if (!this.isWorldUnlocked(worldId)) return false;
        if (level === 1) return true;
        return this.playerProgress[worldId]?.completedLevels?.includes(level - 1) || false;
    }

    getLevelStars(worldId, level) {
        return this.playerProgress[worldId]?.stars?.[level] || 0;
    }

    completeLevel(worldId, level, stars, accuracy) {
        const progress = this.playerProgress[worldId];
        if (!progress) return false;

        // Update stars (keep maximum)
        if (!progress.stars[level] || stars > progress.stars[level]) {
            progress.stars[level] = stars;
        }

        // Mark level as completed
        if (!progress.completedLevels.includes(level)) {
            progress.completedLevels.push(level);
        }

        // Check if boss level defeated
        if (level === this.worlds[worldId].bossLevel) {
            progress.bossDefeated = true;
            // Unlock next world
            this.unlockNextWorld(worldId);
        }

        // Unlock next level
        if (level < this.worlds[worldId].levels) {
            // Next level is now unlocked
        }

        this.saveToStorage();
        return true;
    }

    unlockNextWorld(completedWorldId) {
        const worldIds = Object.keys(this.worlds);
        const currentIndex = worldIds.indexOf(completedWorldId);
        if (currentIndex < worldIds.length - 1) {
            const nextWorldId = worldIds[currentIndex + 1];
            this.playerProgress[nextWorldId].unlocked = true;
        }
    }

    getAIDifficulty(worldId, level) {
        const world = this.worlds[worldId];
        const isBoss = level === world.bossLevel;

        if (isBoss) {
            // Boss: 95% accuracy, faster speed
            return {
                accuracy: 0.95,
                minDelay: 500,
                maxDelay: 1500,
                isBoss: true
            };
        }

        // Regular level difficulty scales with world and level
        const baseAccuracy = 0.70 + (world.difficulty * 0.03) + (level * 0.02);
        const accuracy = Math.min(0.90, baseAccuracy);

        return {
            accuracy: accuracy,
            minDelay: 1000 - (world.difficulty * 100) - (level * 50),
            maxDelay: 3000 - (world.difficulty * 200) - (level * 100),
            isBoss: false
        };
    }

    calculateStars(accuracy, won) {
        if (!won) return 0;
        if (accuracy >= 100) return 3;
        if (accuracy >= 80) return 2;
        return 1;
    }

    getTotalStars() {
        let total = 0;
        Object.values(this.playerProgress).forEach(progress => {
            Object.values(progress.stars || {}).forEach(starCount => {
                total += starCount;
            });
        });
        return total;
    }

    getMaxStars() {
        return Object.keys(this.worlds).length * 5 * 3; // 5 worlds * 5 levels * 3 stars
    }

    getWorldProgress(worldId) {
        const progress = this.playerProgress[worldId];
        const world = this.worlds[worldId];

        let earnedStars = 0;
        Object.values(progress.stars || {}).forEach(stars => {
            earnedStars += stars;
        });

        const maxStars = world.levels * 3;

        return {
            unlocked: progress.unlocked,
            completedLevels: progress.completedLevels.length,
            totalLevels: world.levels,
            earnedStars,
            maxStars,
            bossDefeated: progress.bossDefeated
        };
    }
}

// ==================== GEAR MANAGER ====================

class GearManager {
    constructor() {
        this.gearDefinitions = this.getGearDefinitions();
        this.inventory = {};
        this.equipped = { head: null, body: null, accessory: null };
        this.loadFromStorage();
    }

    getGearDefinitions() {
        return {
            // Head gear
            wizardHat: {
                id: 'wizardHat',
                name: 'Wizard Hat',
                icon: '🧙',
                slot: 'head',
                rarity: 'rare',
                stats: { timerExtension: 0.05 }, // +5% timer
                description: '+5% timer extension'
            },
            mathCrown: {
                id: 'mathCrown',
                name: 'Math Crown',
                icon: '👑',
                slot: 'head',
                rarity: 'legendary',
                stats: { xpBonus: 0.10 }, // +10% XP
                description: '+10% XP gain'
            },
            thinkingCap: {
                id: 'thinkingCap',
                name: 'Thinking Cap',
                icon: '🎓',
                slot: 'head',
                rarity: 'common',
                stats: { streakBonus: 0.5 }, // +0.5s streak bonus
                description: '+0.5s extra time on streak'
            },

            // Body gear
            speedCape: {
                id: 'speedCape',
                name: 'Speed Cape',
                icon: '🦸',
                slot: 'body',
                rarity: 'epic',
                stats: { timeExtension: 0.5 }, // +0.5s per streak
                description: '+0.5s extra time on streak'
            },
            armor: {
                id: 'armor',
                name: 'Math Armor',
                icon: '🛡️',
                slot: 'body',
                rarity: 'rare',
                stats: { wrongAnswerShield: 1 }, // 1 free wrong answer
                description: 'One free wrong answer per match'
            },
            luckyRobe: {
                id: 'luckyRobe',
                name: 'Lucky Robe',
                icon: '👘',
                slot: 'body',
                rarity: 'uncommon',
                stats: { easierProblems: 0.15 }, // 15% chance
                description: '15% chance for easier problem'
            },

            // Accessories
            calculatorGauntlets: {
                id: 'calculatorGauntlets',
                name: 'Calculator Gauntlets',
                icon: '🧤',
                slot: 'accessory',
                rarity: 'epic',
                stats: { multiplicationEasier: true },
                description: 'Multiplication problems become easier'
            },
            divisionShield: {
                id: 'divisionShield',
                name: 'Division Shield',
                icon: '🛡️',
                slot: 'accessory',
                rarity: 'rare',
                stats: { divisionShield: 1 }, // 1 free wrong on division
                description: 'One free wrong answer on division problems'
            },
            luckyCharm: {
                id: 'luckyCharm',
                name: 'Lucky Charm',
                icon: '🍀',
                slot: 'accessory',
                rarity: 'uncommon',
                stats: { luckyBreak: 0.10 }, // 10% chance
                description: '10% chance for easier problem'
            },
            focusAmulet: {
                id: 'focusAmulet',
                name: 'Focus Amulet',
                icon: '📿',
                slot: 'accessory',
                rarity: 'rare',
                stats: { accuracyBonus: 0.05 }, // +5% accuracy tracking
                description: '+5% streak bonus for accuracy'
            }
        };
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('mathArena_gear');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.inventory = parsed.inventory || {};
                this.equipped = parsed.equipped || { head: null, body: null, accessory: null };
            }
        } catch (e) {
            console.error('Failed to load gear:', e);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('mathArena_gear', JSON.stringify({
                inventory: this.inventory,
                equipped: this.equipped
            }));
        } catch (e) {
            console.error('Failed to save gear:', e);
        }
    }

    addGear(gearId, quantity = 1) {
        if (!this.inventory[gearId]) {
            this.inventory[gearId] = 0;
        }
        this.inventory[gearId] += quantity;
        this.saveToStorage();
        this.notifyGearUpdate();
    }

    removeGear(gearId, quantity = 1) {
        if (this.inventory[gearId] && this.inventory[gearId] >= quantity) {
            this.inventory[gearId] -= quantity;
            if (this.inventory[gearId] <= 0) {
                delete this.inventory[gearId];
                // Unequip if removed
                if (this.equipped.head === gearId) this.equipped.head = null;
                if (this.equipped.body === gearId) this.equipped.body = null;
                if (this.equipped.accessory === gearId) this.equipped.accessory = null;
            }
            this.saveToStorage();
            this.notifyGearUpdate();
            return true;
        }
        return false;
    }

    hasGear(gearId) {
        return (this.inventory[gearId] || 0) > 0;
    }

    equipGear(gearId, slot) {
        if (!this.hasGear(gearId)) return false;

        const gear = this.gearDefinitions[gearId];
        if (!gear || gear.slot !== slot) return false;

        this.equipped[slot] = gearId;
        this.saveToStorage();
        this.notifyGearUpdate();
        return true;
    }

    unequipGear(slot) {
        this.equipped[slot] = null;
        this.saveToStorage();
        this.notifyGearUpdate();
    }

    getEquippedGear() {
        const equipped = {};
        ['head', 'body', 'accessory'].forEach(slot => {
            const gearId = this.equipped[slot];
            if (gearId && this.gearDefinitions[gearId]) {
                equipped[slot] = this.gearDefinitions[gearId];
            }
        });
        return equipped;
    }

    getTotalStats() {
        const stats = {
            timerExtension: 0,
            xpBonus: 0,
            streakBonus: 0,
            timeExtension: 0,
            wrongAnswerShield: 0,
            easierProblems: 0,
            multiplicationEasier: false,
            divisionShield: 0,
            accuracyBonus: 0
        };

        const equipped = this.getEquippedGear();
        Object.values(equipped).forEach(gear => {
            Object.entries(gear.stats).forEach(([stat, value]) => {
                if (typeof stats[stat] === 'number') {
                    stats[stat] += value;
                } else {
                    stats[stat] = value;
                }
            });
        });

        return stats;
    }

    notifyGearUpdate() {
        window.dispatchEvent(new CustomEvent('gearUpdate', {
            detail: {
                inventory: this.inventory,
                equipped: this.equipped
            }
        }));
    }

    giveGearAsReward(rarity = 'common') {
        const gearByRarity = {
            common: ['thinkingCap'],
            uncommon: ['luckyRobe', 'luckyCharm'],
            rare: ['wizardHat', 'armor', 'divisionShield', 'focusAmulet'],
            epic: ['speedCape', 'calculatorGauntlets'],
            legendary: ['mathCrown']
        };

        const availableGear = gearByRarity[rarity] || gearByRarity.common;
        const randomGear = availableGear[Math.floor(Math.random() * availableGear.length)];

        this.addGear(randomGear, 1);
        return this.gearDefinitions[randomGear];
    }
}

// ==================== SKILL MANAGER ====================

class SkillManager {
    constructor() {
        this.skillTrees = this.getSkillTreeDefinitions();
        this.playerSkills = this.getDefaultSkills();
        this.skillPoints = 0;
        this.loadFromStorage();
    }

    getSkillTreeDefinitions() {
        return {
            speed: {
                id: 'speed',
                name: 'Speed Tree',
                icon: '⚡',
                color: '#fbbf24',
                description: 'Answer faster, more time',
                skills: {
                    quickThinking: {
                        id: 'quickThinking',
                        name: 'Quick Thinking',
                        description: '+1s base time',
                        maxPoints: 5,
                        tier: 1,
                        requires: null,
                        effect: { baseTimeBonus: 1 }
                    },
                    lightningReflexes: {
                        id: 'lightningReflexes',
                        name: 'Lightning Reflexes',
                        description: '-0.5s streak delay',
                        maxPoints: 5,
                        tier: 2,
                        requires: 'quickThinking',
                        effect: { streakDelayReduction: 0.5 }
                    },
                    timeMaster: {
                        id: 'timeMaster',
                        name: 'Time Master',
                        description: '+2s timer',
                        maxPoints: 3,
                        tier: 3,
                        requires: 'lightningReflexes',
                        effect: { timerBonus: 2 }
                    }
                }
            },
            accuracy: {
                id: 'accuracy',
                name: 'Accuracy Tree',
                icon: '🎯',
                color: '#4ade80',
                description: 'Better performance',
                skills: {
                    focusMind: {
                        id: 'focusMind',
                        name: 'Focus Mind',
                        description: '+5% accuracy streak bonus',
                        maxPoints: 5,
                        tier: 1,
                        requires: null,
                        effect: { accuracyStreakBonus: 0.05 }
                    },
                    errorReduction: {
                        id: 'errorReduction',
                        name: 'Error Reduction',
                        description: 'Shield at 5 correct',
                        maxPoints: 3,
                        tier: 2,
                        requires: 'focusMind',
                        effect: { shieldThreshold: 5 }
                    },
                    precisionist: {
                        id: 'precisionist',
                        name: 'Precisionist',
                        description: '+10% XP for correct answers',
                        maxPoints: 5,
                        tier: 3,
                        requires: 'errorReduction',
                        effect: { xpBonus: 0.10 }
                    }
                }
            },
            knowledge: {
                id: 'knowledge',
                name: 'Knowledge Tree',
                icon: '📚',
                color: '#667eea',
                description: 'Operation mastery',
                skills: {
                    additionExpert: {
                        id: 'additionExpert',
                        name: 'Addition Expert',
                        description: '+20% XP for addition',
                        maxPoints: 5,
                        tier: 1,
                        requires: null,
                        effect: { additionXpBonus: 0.20 }
                    },
                    multiplicationMaster: {
                        id: 'multiplicationMaster',
                        name: 'Multiplication Master',
                        description: 'Multiplication easier',
                        maxPoints: 5,
                        tier: 2,
                        requires: 'additionExpert',
                        effect: { multiplicationEasier: true }
                    },
                    divisionSage: {
                        id: 'divisionSage',
                        name: 'Division Sage',
                        description: '+15% XP for division',
                        maxPoints: 5,
                        tier: 3,
                        requires: 'multiplicationMaster',
                        effect: { divisionXpBonus: 0.15 }
                    }
                }
            },
            luck: {
                id: 'luck',
                name: 'Luck Tree',
                icon: '🍀',
                color: '#a78bfa',
                description: 'Random advantages',
                skills: {
                    fortunate: {
                        id: 'fortunate',
                        name: 'Fortunate',
                        description: '10% chance for easy problem',
                        maxPoints: 5,
                        tier: 1,
                        requires: null,
                        effect: { easyProblemChance: 0.10 }
                    },
                    generous: {
                        id: 'generous',
                        name: 'Generous',
                        description: '+50% quest rewards',
                        maxPoints: 3,
                        tier: 2,
                        requires: 'fortunate',
                        effect: { questBonusMultiplier: 0.50 }
                    },
                    explorer: {
                        id: 'explorer',
                        name: 'Explorer',
                        description: '20% chance for item drop',
                        maxPoints: 5,
                        tier: 3,
                        requires: 'generous',
                        effect: { itemDropChance: 0.20 }
                    }
                }
            }
        };
    }

    getDefaultSkills() {
        const skills = {};
        Object.values(this.skillTrees).forEach(tree => {
            Object.values(tree.skills).forEach(skill => {
                skills[skill.id] = 0;
            });
        });
        return skills;
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('mathArena_skills');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.playerSkills = { ...this.playerSkills, ...parsed.skills };
                this.skillPoints = parsed.skillPoints || 0;
            }
        } catch (e) {
            console.error('Failed to load skills:', e);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('mathArena_skills', JSON.stringify({
                skills: this.playerSkills,
                skillPoints: this.skillPoints
            }));
        } catch (e) {
            console.error('Failed to save skills:', e);
        }
    }

    addSkillPoints(points) {
        this.skillPoints += points;
        this.saveToStorage();
        this.notifySkillUpdate();
    }

    getSkillPoints() {
        return this.skillPoints;
    }

    getSkillLevel(skillId) {
        return this.playerSkills[skillId] || 0;
    }

    canUnlockSkill(skillId) {
        const skill = this.findSkillById(skillId);
        if (!skill) return false;

        // Check if player has skill points
        if (this.skillPoints < 1) return false;

        // Check if max points reached
        if (this.getSkillLevel(skillId) >= skill.maxPoints) return false;

        // Check if requirement is met
        if (skill.requires) {
            const requiredLevel = this.getSkillLevel(skill.requires);
            if (requiredLevel < 5) return false; // Need max level in prerequisite
        }

        // Check tier requirement (need 5 points in previous tier)
        if (skill.tier > 1) {
            const tree = this.findTreeForSkill(skillId);
            if (tree) {
                let tierPoints = 0;
                Object.values(tree.skills).forEach(s => {
                    if (s.tier === skill.tier - 1) {
                        tierPoints += this.getSkillLevel(s.id);
                    }
                });
                if (tierPoints < 5) return false;
            }
        }

        return true;
    }

    findSkillById(skillId) {
        for (const tree of Object.values(this.skillTrees)) {
            if (tree.skills[skillId]) {
                return tree.skills[skillId];
            }
        }
        return null;
    }

    findTreeForSkill(skillId) {
        for (const tree of Object.values(this.skillTrees)) {
            if (tree.skills[skillId]) {
                return tree;
            }
        }
        return null;
    }

    unlockSkill(skillId) {
        if (!this.canUnlockSkill(skillId)) return false;

        this.playerSkills[skillId] = (this.playerSkills[skillId] || 0) + 1;
        this.skillPoints--;
        this.saveToStorage();
        this.notifySkillUpdate();
        return true;
    }

    getSkillEffect(skillId) {
        const level = this.getSkillLevel(skillId);
        if (level === 0) return null;

        const skill = this.findSkillById(skillId);
        if (!skill) return null;

        // Scale effect by level
        const effect = { ...skill.effect };
        Object.keys(effect).forEach(key => {
            if (typeof effect[key] === 'number') {
                effect[key] *= level;
            }
        });

        return effect;
    }

    getTotalEffects() {
        const effects = {
            baseTimeBonus: 0,
            streakDelayReduction: 0,
            timerBonus: 0,
            accuracyStreakBonus: 0,
            shieldThreshold: 0,
            xpBonus: 0,
            additionXpBonus: 0,
            multiplicationEasier: false,
            divisionXpBonus: 0,
            easyProblemChance: 0,
            questBonusMultiplier: 0,
            itemDropChance: 0
        };

        Object.keys(this.playerSkills).forEach(skillId => {
            const effect = this.getSkillEffect(skillId);
            if (effect) {
                Object.entries(effect).forEach(([key, value]) => {
                    if (typeof effects[key] === 'number') {
                        effects[key] += value;
                    } else {
                        effects[key] = value;
                    }
                });
            }
        });

        return effects;
    }

    respec() {
        // Calculate total spent points
        let totalSpent = 0;
        Object.values(this.playerSkills).forEach(level => {
            totalSpent += level;
        });

        // Reset all skills
        this.playerSkills = this.getDefaultSkills();

        // Return points (minus respec cost if we want)
        this.skillPoints += totalSpent;

        this.saveToStorage();
        this.notifySkillUpdate();
    }

    notifySkillUpdate() {
        window.dispatchEvent(new CustomEvent('skillUpdate', {
            detail: {
                skills: this.playerSkills,
                skillPoints: this.skillPoints
            }
        }));
    }
}

// ==================== CLAN MANAGER ====================

class ClanManager {
    constructor() {
        this.clans = this.getDefaultClans();
        this.playerClanId = null;
        this.loadFromStorage();
    }

    getDefaultClans() {
        return {};
    }

    generateClanCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('mathArena_clans');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.clans = parsed.clans || {};
                this.playerClanId = parsed.playerClanId || null;
            }
        } catch (e) {
            console.error('Failed to load clans:', e);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('mathArena_clans', JSON.stringify({
                clans: this.clans,
                playerClanId: this.playerClanId
            }));
        } catch (e) {
            console.error('Failed to save clans:', e);
        }
    }

    createClan(name, tag) {
        const code = this.generateClanCode();

        const clan = {
            id: code,
            name: name,
            tag: tag,
            level: 1,
            totalXP: 0,
            members: [],
            createdAt: new Date().toISOString(),
            weeklyChallenge: this.generateWeeklyChallenge(),
            chat: []
        };

        this.clans[code] = clan;
        this.joinClan(code);
        this.saveToStorage();
        this.notifyClanUpdate();

        return clan;
    }

    joinClan(clanCode) {
        clanCode = clanCode.toUpperCase();
        if (!this.clans[clanCode]) {
            return { success: false, error: 'Clan not found' };
        }

        this.playerClanId = clanCode;
        this.saveToStorage();
        this.notifyClanUpdate();

        return { success: true, clan: this.clans[clanCode] };
    }

    leaveClan() {
        if (this.playerClanId && this.clans[this.playerClanId]) {
            // Remove from members list
            const playerName = settingsManager ? settingsManager.getPlayerName() : 'Player';
            this.clans[this.playerClanId].members = this.clans[this.playerClanId].members.filter(
                m => m.name !== playerName
            );

            this.playerClanId = null;
            this.saveToStorage();
            this.notifyClanUpdate();
        }
    }

    getPlayerClan() {
        if (this.playerClanId && this.clans[this.playerClanId]) {
            return this.clans[this.playerClanId];
        }
        return null;
    }

    addMemberToClan(clanCode, memberName, memberXP) {
        if (!this.clans[clanCode]) return false;

        const clan = this.clans[clanCode];
        if (!clan.members.find(m => m.name === memberName)) {
            clan.members.push({
                name: memberName,
                xp: memberXP,
                joinedAt: new Date().toISOString()
            });

            this.updateClanLevel(clanCode);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    updateMemberXP(memberName, xp) {
        if (!this.playerClanId) return;

        const clan = this.clans[this.playerClanId];
        const member = clan.members.find(m => m.name === memberName);
        if (member) {
            member.xp = xp;
            clan.totalXP = clan.members.reduce((sum, m) => sum + m.xp, 0);
            this.updateClanLevel(this.playerClanId);
            this.saveToStorage();
        }
    }

    updateClanLevel(clanCode) {
        const clan = this.clans[clanCode];
        const totalXP = clan.members.reduce((sum, m) => sum + m.xp, 0);

        const levels = [0, 500, 2000, 5000, 10000, 20000, 50000];
        let newLevel = 1;
        for (let i = 1; i < levels.length; i++) {
            if (totalXP >= levels[i]) {
                newLevel = i + 1;
            }
        }

        clan.level = newLevel;
        clan.totalXP = totalXP;
    }

    generateWeeklyChallenge() {
        const challenges = [
            { id: 'correct100', type: 'correct', target: 100, reward: 500, title: 'Get 100 correct answers' },
            { id: 'win10', type: 'win', target: 10, reward: 300, title: 'Win 10 matches' },
            { id: 'streak5', type: 'streak', target: 5, reward: 400, title: 'Achieve a 5-streak' },
            { id: 'xp1000', type: 'xp', target: 1000, reward: 600, title: 'Earn 1000 XP' }
        ];

        return challenges[Math.floor(Math.random() * challenges.length)];
    }

    getClanLeaderboard(limit = 10) {
        return Object.values(this.clans)
            .sort((a, b) => b.totalXP - a.totalXP)
            .slice(0, limit);
    }

    addChatMessage(message) {
        if (!this.playerClanId) return;

        const clan = this.clans[this.playerClanId];
        const playerName = settingsManager ? settingsManager.getPlayerName() : 'Player';

        clan.chat.push({
            name: playerName,
            message: message,
            timestamp: new Date().toISOString()
        });

        // Keep only last 50 messages
        if (clan.chat.length > 50) {
            clan.chat = clan.chat.slice(-50);
        }

        this.saveToStorage();
    }

    getClanChat() {
        if (!this.playerClanId || !this.clans[this.playerClanId]) {
            return [];
        }
        return this.clans[this.playerClanId].chat;
    }

    notifyClanUpdate() {
        window.dispatchEvent(new CustomEvent('clanUpdate', {
            detail: {
                clans: this.clans,
                playerClanId: this.playerClanId
            }
        }));
    }

    getClanPerks(clanCode) {
        const clan = this.clans[clanCode];
        if (!clan) return [];

        const perks = [];
        if (clan.level >= 2) perks.push({ name: 'XP Boost', description: '+5% XP for all members' });
        if (clan.level >= 3) perks.push({ name: 'Item Luck', description: '+10% item drop chance' });
        if (clan.level >= 5) perks.push({ name: 'Quest Master', description: '+25% quest rewards' });
        if (clan.level >= 7) perks.push({ name: 'Legendary Luck', description: '+5% legendary item chance' });

        return perks;
    }
}

// Classes will be initialized in index.html
