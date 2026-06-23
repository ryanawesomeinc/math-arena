// Math Arena - Phase 2 RPG System (Titles, Daily Quests, Consumable Items)

class TitlesManager {
    constructor(rpgManager) {
        this.rpgManager = rpgManager;
        this.titles = this.getTitleDefinitions();
        this.loadFromStorage();
    }

    getTitleDefinitions() {
        return {
            // Level-based titles (automatic based on level)
            mathApprentice: { id: 'mathApprentice', name: 'Math Apprentice', description: 'Levels 1-4', type: 'level', minLevel: 1, maxLevel: 4, icon: '📚' },
            numberNinja: { id: 'numberNinja', name: 'Number Ninja', description: 'Levels 5-9', type: 'level', minLevel: 5, maxLevel: 9, icon: '🥷' },
            arithmeticMaster: { id: 'arithmeticMaster', name: 'Arithmetic Master', description: 'Levels 10-14', type: 'level', minLevel: 10, maxLevel: 14, icon: '🎓' },
            calculationChampion: { id: 'calculationChampion', name: 'Calculation Champion', description: 'Levels 15-19', type: 'level', minLevel: 15, maxLevel: 19, icon: '🏅' },
            mathLegend: { id: 'mathLegend', name: 'Math Legend', description: 'Level 20+', type: 'level', minLevel: 20, maxLevel: 999, icon: '👑' },

            // Unlockable achievement titles
            speedDemon: { id: 'speedDemon', name: 'Speed Demon', description: '10 answers in under 1 second', type: 'achievement', requirement: 'lightning', icon: '⚡' },
            perfectScore: { id: 'perfectScore', name: 'Perfect Score', description: '100% accuracy in 10 matches', type: 'achievement', requirement: 'steady', icon: '💯' },
            streakMaster: { id: 'streakMaster', name: 'Streak Master', description: 'Achieve a 15-streak', type: 'achievement', requirement: 'unstoppable', icon: '🔥' },
            divisionExpert: { id: 'divisionExpertTitle', name: 'Division Expert', description: 'Reach level 10 in division', type: 'achievement', requirement: 'divisionExpert', icon: '➗' },
            curriculumMaster: { id: 'curriculumMaster', name: 'Curriculum Master', description: 'Complete all grade curricula', type: 'achievement', requirement: 'grade1Scholar', icon: '📖' }
        };
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('mathArena_titles');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.titles = { ...this.titles, ...parsed };
            }
        } catch (e) {
            console.error('Failed to load titles:', e);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('mathArena_titles', JSON.stringify(this.titles));
        } catch (e) {
            console.error('Failed to save titles:', e);
        }
    }

    getCurrentTitle(level) {
        // Find the level-based title for current level
        for (const title of Object.values(this.titles)) {
            if (title.type === 'level' && level >= title.minLevel && level <= title.maxLevel) {
                return title;
            }
        }
        return this.titles.mathApprentice;
    }

    getUnlockedTitles() {
        const level = this.rpgManager.rpgData.level;
        const unlocked = [];

        for (const title of Object.values(this.titles)) {
            if (title.type === 'level') {
                if (level >= title.minLevel && level <= title.maxLevel) {
                    unlocked.push(title);
                }
            } else if (title.type === 'achievement') {
                // Check if achievement is unlocked
                const achievement = this.rpgManager.achievements[title.requirement];
                if (achievement && achievement.unlocked) {
                    unlocked.push(title);
                }
            }
        }

        return unlocked;
    }

    isTitleUnlocked(titleId) {
        const title = this.titles[titleId];
        if (!title) return false;

        if (title.type === 'level') {
            const level = this.rpgManager.rpgData.level;
            return level >= title.minLevel && level <= title.maxLevel;
        } else if (title.type === 'achievement') {
            const achievement = this.rpgManager.achievements[title.requirement];
            return achievement && achievement.unlocked;
        }
        return false;
    }

    getTitleById(titleId) {
        return this.titles[titleId];
    }
}

class QuestsManager {
    constructor(rpgManager) {
        this.rpgManager = rpgManager;
        this.questDefinitions = this.getQuestDefinitions();
        this.dailyQuests = [];
        this.questProgress = {};
        this.lastResetDate = null;
        this.loadFromStorage();
        this.checkDailyReset();
    }

    getQuestDefinitions() {
        return [
            // Correct answer quests
            { id: 'correctAdd10', type: 'correct', operation: 'add', target: 15, reward: 50, title: 'Add Master', description: 'Get 15 addition correct' },
            { id: 'correctSub10', type: 'correct', operation: 'sub', target: 15, reward: 50, title: 'Subtract Star', description: 'Get 15 subtraction correct' },
            { id: 'correctMult10', type: 'correct', operation: 'mult', target: 10, reward: 75, title: 'Multiply Might', description: 'Get 10 multiplication correct' },
            { id: 'correctDiv10', type: 'correct', operation: 'div', target: 10, reward: 75, title: 'Divide Dynamo', description: 'Get 10 division correct' },

            // Win quests
            { id: 'win3', type: 'win', target: 3, reward: 100, title: 'Triple Threat', description: 'Win 3 matches' },
            { id: 'win5', type: 'win', target: 5, reward: 150, title: 'Winner\'s Circle', description: 'Win 5 matches' },

            // Streak quests
            { id: 'streak3x2', type: 'streak', target: 2, streakLength: 3, reward: 75, title: 'On Fire!', description: 'Achieve 3-streak twice' },
            { id: 'streak5', type: 'streak', target: 1, streakLength: 5, reward: 80, title: 'Unstoppable', description: 'Achieve a 5-streak' },
            { id: 'streak10', type: 'streak', target: 1, streakLength: 10, reward: 100, title: 'Legendary Streak', description: 'Achieve a 10-streak' }
        ];
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('mathArena_quests');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.dailyQuests = parsed.dailyQuests || [];
                this.questProgress = parsed.questProgress || {};
                this.lastResetDate = parsed.lastResetDate;
            }
        } catch (e) {
            console.error('Failed to load quests:', e);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('mathArena_quests', JSON.stringify({
                dailyQuests: this.dailyQuests,
                questProgress: this.questProgress,
                lastResetDate: this.lastResetDate
            }));
        } catch (e) {
            console.error('Failed to save quests:', e);
        }
    }

    checkDailyReset() {
        const today = new Date().toDateString();
        if (this.lastResetDate !== today) {
            // Generate new daily quests
            this.generateDailyQuests();
            this.lastResetDate = today;
            this.questProgress = {};
            this.saveToStorage();
        }
    }

    generateDailyQuests() {
        // Shuffle and pick 3 random quests
        const shuffled = [...this.questDefinitions].sort(() => Math.random() - 0.5);
        this.dailyQuests = shuffled.slice(0, 3).map(q => ({ ...q, current: 0, completed: false }));
    }

    trackCorrectAnswer(operation) {
        for (const quest of this.dailyQuests) {
            if (quest.completed) continue;
            if (quest.type === 'correct' && quest.operation === operation) {
                quest.current = (quest.current || 0) + 1;
                if (quest.current >= quest.target) {
                    quest.completed = true;
                }
            }
        }
        this.saveToStorage();
        this.notifyQuestUpdate();
    }

    trackWin() {
        for (const quest of this.dailyQuests) {
            if (quest.completed) continue;
            if (quest.type === 'win') {
                quest.current = (quest.current || 0) + 1;
                if (quest.current >= quest.target) {
                    quest.completed = true;
                }
            }
        }
        this.saveToStorage();
        this.notifyQuestUpdate();
    }

    trackStreak(streakLength) {
        for (const quest of this.dailyQuests) {
            if (quest.completed) continue;
            if (quest.type === 'streak' && streakLength >= quest.streakLength) {
                quest.current = (quest.current || 0) + 1;
                if (quest.current >= quest.target) {
                    quest.completed = true;
                }
            }
        }
        this.saveToStorage();
        this.notifyQuestUpdate();
    }

    notifyQuestUpdate() {
        window.dispatchEvent(new CustomEvent('questUpdate', {
            detail: this.dailyQuests
        }));
    }

    claimRewards() {
        let totalXP = 0;
        for (const quest of this.dailyQuests) {
            if (quest.completed && !quest.claimed) {
                totalXP += quest.reward;
                quest.claimed = true;
            }
        }
        this.saveToStorage();
        return totalXP;
    }

    getAllCompleted() {
        return this.dailyQuests.every(q => q.completed);
    }

    getAllClaimed() {
        return this.dailyQuests.every(q => q.claimed);
    }

    getCompletedCount() {
        return this.dailyQuests.filter(q => q.completed).length;
    }

    getTimeUntilReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow - now;
    }

    getResetTimeString() {
        const ms = this.getTimeUntilReset();
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }
}

class ItemsManager {
    constructor(rpgManager) {
        this.rpgManager = rpgManager;
        this.itemDefinitions = this.getItemDefinitions();
        this.inventory = {};
        this.equippedItem = null;
        this.loadFromStorage();
    }

    getItemDefinitions() {
        return {
            timeFreeze: {
                id: 'timeFreeze',
                name: 'Time Freeze',
                description: 'Stop the timer for 3 seconds',
                icon: '⏸️',
                rarity: 'common',
                effect: 'timeFreeze',
                duration: 3000
            },
            luckyPencil: {
                id: 'luckyPencil',
                name: 'Lucky Pencil',
                description: 'Higher chance of easier problems',
                icon: '✏️',
                rarity: 'common',
                effect: 'easierProblems'
            },
            shield: {
                id: 'shield',
                name: 'Answer Shield',
                description: 'Block one wrong answer',
                icon: '🛡️',
                rarity: 'rare',
                effect: 'blockWrong'
            },
            calculator: {
                id: 'calculator',
                name: 'Time Extension',
                description: 'Extend timer by 5 seconds once',
                icon: '🧮',
                rarity: 'uncommon',
                effect: 'extendTime',
                bonus: 5000
            }
        };
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('mathArena_items');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.inventory = parsed.inventory || {};
                this.equippedItem = parsed.equippedItem || null;
            }
        } catch (e) {
            console.error('Failed to load items:', e);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('mathArena_items', JSON.stringify({
                inventory: this.inventory,
                equippedItem: this.equippedItem
            }));
        } catch (e) {
            console.error('Failed to save items:', e);
        }
    }

    addItem(itemId, quantity = 1) {
        if (!this.inventory[itemId]) {
            this.inventory[itemId] = 0;
        }
        this.inventory[itemId] += quantity;
        this.saveToStorage();
        this.notifyInventoryUpdate();
    }

    removeItem(itemId, quantity = 1) {
        if (this.inventory[itemId] && this.inventory[itemId] >= quantity) {
            this.inventory[itemId] -= quantity;
            if (this.inventory[itemId] <= 0) {
                delete this.inventory[itemId];
            }
            this.saveToStorage();
            this.notifyInventoryUpdate();
            return true;
        }
        return false;
    }

    getItemQuantity(itemId) {
        return this.inventory[itemId] || 0;
    }

    equipItem(itemId) {
        if (this.inventory[itemId] && this.inventory[itemId] > 0) {
            this.equippedItem = itemId;
            this.saveToStorage();
            this.notifyInventoryUpdate();
            return true;
        }
        return false;
    }

    unequipItem() {
        this.equippedItem = null;
        this.saveToStorage();
        this.notifyInventoryUpdate();
    }

    getEquippedItem() {
        if (!this.equippedItem) return null;
        return this.itemDefinitions[this.equippedItem];
    }

    useItem() {
        if (!this.equippedItem) return null;

        const item = this.getEquippedItem();
        if (!item) return null;

        // Consume one use
        this.removeItem(this.equippedItem, 1);

        // If no more left, unequip
        if (!this.inventory[this.equippedItem]) {
            this.unequipItem();
        }

        return item.effect;
    }

    notifyInventoryUpdate() {
        window.dispatchEvent(new CustomEvent('inventoryUpdate', {
            detail: {
                inventory: this.inventory,
                equippedItem: this.equippedItem
            }
        }));
    }

    giveItemAsReward(type = 'common') {
        const itemsByRarity = {
            common: ['timeFreeze', 'luckyPencil'],
            uncommon: ['calculator'],
            rare: ['shield']
        };

        const availableItems = itemsByRarity[type] || itemsByRarity.common;
        const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];

        this.addItem(randomItem, 1);
        return this.itemDefinitions[randomItem];
    }
}

// Classes will be initialized in index.html
