// Math Arena - RPG System (XP, Levels, Avatar Unlocks, Achievements, Stats)

class RPGManager {
    constructor() {
        this.rpgData = this.getDefaultData();
        this.achievements = this.getAchievementDefinitions();
        this.loadFromStorage();
    }

    getDefaultData() {
        return {
            xp: 0,
            level: 1,
            totalCorrect: 0,
            totalMatches: 0,
            totalWins: 0,
            bestStreak: 0,
            currentStreak: 0,
            totalSpeedBonuses: 0,
            operationStats: {
                add: { correct: 0, xp: 0, level: 1 },
                sub: { correct: 0, xp: 0, level: 1 },
                mult: { correct: 0, xp: 0, level: 1 },
                div: { correct: 0, xp: 0, level: 1 }
            },
            unlockedAvatars: ['🦊', '🐱', '🐶', '🦄'], // Starter avatars
            achievements: {},
            matchHistory: []
        };
    }

    getAchievementDefinitions() {
        return {
            // Speed achievements
            lightning: { id: 'lightning', name: 'Lightning', description: 'Answer in <1s (10 times)', category: 'speed', target: 10, progress: 0, unlocked: false },
            swift: { id: 'swift', name: 'Swift', description: 'Answer in <2s (50 times)', category: 'speed', target: 50, progress: 0, unlocked: false },
            quickDraw: { id: 'quickDraw', name: 'Quick Draw', description: 'Answer first in 80% of matches (20+ matches)', category: 'speed', target: 80, progress: 0, unlocked: false, requires: 'matches20' },

            // Accuracy achievements
            precision: { id: 'precision', name: 'Precision', description: '100% correct in a match', category: 'accuracy', target: 1, progress: 0, unlocked: false },
            steady: { id: 'steady', name: 'Steady', description: '90% accuracy over 10 matches', category: 'accuracy', target: 10, progress: 0, unlocked: false },
            calculator: { id: 'calculator', name: 'Calculator', description: '1000 total correct answers', category: 'accuracy', target: 1000, progress: 0, unlocked: false },

            // Streak achievements
            warm: { id: 'warm', name: 'Warm', description: '3 streak (10 times)', category: 'streak', target: 10, progress: 0, unlocked: false },
            onFire: { id: 'onFire', name: 'On Fire', description: '5 streak (5 times)', category: 'streak', target: 5, progress: 0, unlocked: false },
            unstoppable: { id: 'unstoppable', name: 'Unstoppable', description: '10 streak', category: 'streak', target: 1, progress: 0, unlocked: false },
            godlike: { id: 'godlike', name: 'Godlike', description: '20 streak', category: 'streak', target: 1, progress: 0, unlocked: false },

            // Curriculum achievements
            grade1Scholar: { id: 'grade1Scholar', name: 'Grade 1 Scholar', description: 'Complete 50 questions at Grade 1-2 difficulty', category: 'curriculum', target: 50, progress: 0, unlocked: false },
            divisionExpert: { id: 'divisionExpert', name: 'Division Expert', description: '500 correct division answers', category: 'curriculum', target: 500, progress: 0, unlocked: false },
            multiplicationMaster: { id: 'multiplicationMaster', name: 'Multiplication Master', description: 'Level 10 in multiplication', category: 'curriculum', target: 10, progress: 0, unlocked: false },

            // Win achievements
            competitor: { id: 'competitor', name: 'Competitor', description: 'Play 10 matches', category: 'win', target: 10, progress: 0, unlocked: false },
            challenger: { id: 'challenger', name: 'Challenger', description: 'Play 50 matches', category: 'win', target: 50, progress: 0, unlocked: false },
            victor: { id: 'victor', name: 'Victor', description: 'Win 25 matches', category: 'win', target: 25, progress: 0, unlocked: false },
            champion: { id: 'champion', name: 'Champion', description: 'Win 100 matches', category: 'win', target: 100, progress: 0, unlocked: false }
        };
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('mathArena_rpg');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with default to handle any new fields
                this.rpgData = { ...this.getDefaultData(), ...parsed };

                // Ensure operationStats has all operations
                ['add', 'sub', 'mult', 'div'].forEach(op => {
                    if (!this.rpgData.operationStats[op]) {
                        this.rpgData.operationStats[op] = { correct: 0, xp: 0, level: 1 };
                    }
                });

                // Restore achievement progress
                if (parsed.achievements) {
                    Object.keys(parsed.achievements).forEach(id => {
                        if (this.achievements[id]) {
                            this.achievements[id] = { ...this.achievements[id], ...parsed.achievements[id] };
                        }
                    });
                }
            }
        } catch (e) {
            console.error('Failed to load RPG data:', e);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('mathArena_rpg', JSON.stringify(this.rpgData));
            localStorage.setItem('mathArena_achievements', JSON.stringify(this.achievements));
        } catch (e) {
            console.error('Failed to save RPG data:', e);
        }
    }

    // XP and Leveling
    getXPForLevel(level) {
        if (level === 1) return 0;
        if (level <= 9) {
            // Cumulative XP for levels 2-9
            const thresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600];
            return thresholds[level - 1];
        }
        // Level 10+: Level * 400 + cumulative
        return 3600 + (level - 9) * 400;
    }

    getXPUntilNextLevel() {
        const nextLevelXP = this.getXPForLevel(this.rpgData.level + 1);
        return nextLevelXP - this.rpgData.xp;
    }

    getProgressToNextLevel() {
        const currentLevelXP = this.getXPForLevel(this.rpgData.level);
        const nextLevelXP = this.getXPForLevel(this.rpgData.level + 1);
        const progress = (this.rpgData.xp - currentLevelXP) / (nextLevelXP - currentLevelXP);
        return Math.min(100, Math.max(0, progress * 100));
    }

    addXP(amount, operation = null) {
        const oldLevel = this.rpgData.level;
        this.rpgData.xp += amount;

        // Check for level up
        let leveledUp = false;
        while (this.rpgData.xp >= this.getXPForLevel(this.rpgData.level + 1)) {
            this.rpgData.level++;
            leveledUp = true;
            this.checkAvatarUnlocks();
        }

        // Add operation-specific XP
        if (operation && this.rpgData.operationStats[operation]) {
            this.rpgData.operationStats[operation].xp += amount;

            // Check operation level up
            const opLevel = this.rpgData.operationStats[operation].level;
            const opXP = this.rpgData.operationStats[operation].xp;
            while (opXP >= this.getXPForLevel(opLevel + 1)) {
                this.rpgData.operationStats[operation].level++;
            }
        }

        this.saveToStorage();
        return { leveledUp, newLevel: this.rpgData.level, oldLevel };
    }

    // Avatar Unlocks
    checkAvatarUnlocks() {
        const level = this.rpgData.level;
        const newUnlocks = [];

        const avatarUnlocks = {
            3: ['🐸', '🦋', '🐯', '🐙'],
            5: ['🦈', '🦖', '🐉', '🦁'],
            7: ['🚀', '🌟', '💎', '🔮'],
            10: ['👑', '🏆', '🎯', '⚡']
        };

        Object.entries(avatarUnlocks).forEach(([unlockLevel, avatars]) => {
            if (level >= parseInt(unlockLevel)) {
                avatars.forEach(avatar => {
                    if (!this.rpgData.unlockedAvatars.includes(avatar)) {
                        this.rpgData.unlockedAvatars.push(avatar);
                        newUnlocks.push(avatar);
                    }
                });
            }
        });

        return newUnlocks;
    }

    getUnlockedAvatars() {
        return this.rpgData.unlockedAvatars;
    }

    isAvatarUnlocked(avatar) {
        return this.rpgData.unlockedAvatars.includes(avatar);
    }

    // Achievement Tracking
    trackAnswer(data) {
        const { isCorrect, timeToAnswer, operation, difficulty } = data;

        if (!isCorrect) return;

        this.rpgData.totalCorrect++;
        this.rpgData.currentStreak++;

        if (this.rpgData.currentStreak > this.rpgData.bestStreak) {
            this.rpgData.bestStreak = this.rpgData.currentStreak;
        }

        // Track operation stats
        if (operation && this.rpgData.operationStats[operation]) {
            this.rpgData.operationStats[operation].correct++;
        }

        // Track speed achievements
        if (timeToAnswer < 1) {
            this.achievements.lightning.progress++;
            this.checkAchievement('lightning');
            this.rpgData.totalSpeedBonuses++;
        }
        if (timeToAnswer < 2) {
            this.achievements.swift.progress++;
            this.checkAchievement('swift');
        }

        // Track curriculum achievements
        if (difficulty <= 2) {
            this.achievements.grade1Scholar.progress++;
            this.checkAchievement('grade1Scholar');
        }

        // Track operation-specific achievements
        if (operation === 'div') {
            this.achievements.divisionExpert.progress++;
            this.checkAchievement('divisionExpert');
        }
        if (operation === 'mult') {
            const multLevel = this.rpgData.operationStats.mult.level;
            this.achievements.multiplicationMaster.progress = multLevel;
            if (multLevel >= 10) {
                this.checkAchievement('multiplicationMaster');
            }
        }

        // Track total correct achievement
        this.achievements.calculator.progress = this.rpgData.totalCorrect;
        this.checkAchievement('calculator');

        this.saveToStorage();
    }

    trackStreak(streakCount) {
        if (streakCount >= 3) {
            this.achievements.warm.progress++;
            this.checkAchievement('warm');
        }
        if (streakCount >= 5) {
            this.achievements.onFire.progress++;
            this.checkAchievement('onFire');
        }
        if (streakCount >= 10) {
            this.achievements.unstoppable.progress = 1;
            this.checkAchievement('unstoppable');
        }
        if (streakCount >= 20) {
            this.achievements.godlike.progress = 1;
            this.checkAchievement('godlike');
        }
    }

    trackMatch(result, accuracy, wasFirst) {
        this.rpgData.totalMatches++;

        // Track match-based achievements
        this.achievements.competitor.progress = Math.min(this.achievements.competitor.target, this.rpgData.totalMatches);
        this.checkAchievement('competitor');

        this.achievements.challenger.progress = Math.min(this.achievements.challenger.target, this.rpgData.totalMatches);
        this.checkAchievement('challenger');

        // Track win achievements
        if (result === 'win') {
            this.rpgData.totalWins++;
            this.achievements.victor.progress = Math.min(this.achievements.victor.target, this.rpgData.totalWins);
            this.checkAchievement('victor');

            this.achievements.champion.progress = Math.min(this.achievements.champion.target, this.rpgData.totalWins);
            this.checkAchievement('champion');
        }

        // Track accuracy achievements
        if (accuracy === 100) {
            this.achievements.precision.progress++;
            this.checkAchievement('precision');
        }

        // Add to match history
        this.rpgData.matchHistory.push({
            date: new Date().toISOString(),
            result,
            accuracy,
            wasFirst
        });

        // Keep only last 50 matches
        if (this.rpgData.matchHistory.length > 50) {
            this.rpgData.matchHistory = this.rpgData.matchHistory.slice(-50);
        }

        // Reset current streak
        this.rpgData.currentStreak = 0;

        this.saveToStorage();
    }

    checkAchievement(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement || achievement.unlocked) return false;

        if (achievement.progress >= achievement.target) {
            achievement.unlocked = true;
            this.rpgData.achievements[achievementId] = achievement;

            // Dispatch event for achievement unlock
            window.dispatchEvent(new CustomEvent('achievementUnlocked', {
                detail: achievement
            }));

            // Check for hidden avatar unlocks
            const newAvatars = this.checkHiddenAchievements();
            if (newAvatars.length > 0) {
                window.dispatchEvent(new CustomEvent('avatarsUnlocked', {
                    detail: newAvatars
                }));
            }

            this.saveToStorage();
            return true;
        }
        return false;
    }

    checkHiddenAchievements() {
        const newUnlocks = [];

        // 🎪 - 50 matches
        if (this.rpgData.totalMatches >= 50 && !this.rpgData.unlockedAvatars.includes('🎪')) {
            this.rpgData.unlockedAvatars.push('🎪');
            newUnlocks.push('🎪');
        }

        // 🌈 - 100 streak total (cumulative)
        const totalStreakAchievements = this.achievements.warm.progress +
                                       this.achievements.onFire.progress * 2;
        if (totalStreakAchievements >= 100 && !this.rpgData.unlockedAvatars.includes('🌈')) {
            this.rpgData.unlockedAvatars.push('🌈');
            newUnlocks.push('🌈');
        }

        // 🎨 - All operations level 5+
        const allOpsLevel5 = ['add', 'sub', 'mult', 'div'].every(op =>
            this.rpgData.operationStats[op].level >= 5
        );
        if (allOpsLevel5 && !this.rpgData.unlockedAvatars.includes('🎨')) {
            this.rpgData.unlockedAvatars.push('🎨');
            newUnlocks.push('🎨');
        }

        return newUnlocks;
    }

    getUnlockedAchievements() {
        return Object.values(this.achievements).filter(a => a.unlocked);
    }

    getAchievementsByCategory(category) {
        return Object.values(this.achievements).filter(a => a.category === category);
    }

    // Stats
    getStats() {
        const winRate = this.rpgData.totalMatches > 0
            ? Math.round((this.rpgData.totalWins / this.rpgData.totalMatches) * 100)
            : 0;

        const avgAccuracy = this.rpgData.matchHistory.length > 0
            ? Math.round(this.rpgData.matchHistory.reduce((sum, m) => sum + m.accuracy, 0) / this.rpgData.matchHistory.length)
            : 0;

        return {
            level: this.rpgData.level,
            xp: this.rpgData.xp,
            xpToNext: this.getXPUntilNextLevel(),
            progress: this.getProgressToNextLevel(),
            totalMatches: this.rpgData.totalMatches,
            totalWins: this.rpgData.totalWins,
            totalCorrect: this.rpgData.totalCorrect,
            winRate,
            bestStreak: this.rpgData.bestStreak,
            avgAccuracy,
            operationStats: this.rpgData.operationStats,
            unlockedAvatars: this.rpgData.unlockedAvatars.length,
            totalAvatars: 32,
            achievementsUnlocked: this.getUnlockedAchievements().length,
            totalAchievements: Object.keys(this.achievements).length
        };
    }

    getRecentMatches(count = 10) {
        return this.rpgData.matchHistory.slice(-count).reverse();
    }

    // Reset (for testing)
    reset() {
        this.rpgData = this.getDefaultData();
        Object.keys(this.achievements).forEach(key => {
            this.achievements[key].progress = 0;
            this.achievements[key].unlocked = false;
        });
        this.saveToStorage();
    }
}

// RPGManager class will be initialized in index.html
