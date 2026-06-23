// Math Arena - Local Analytics System

class AnalyticsManager {
    constructor() {
        this.events = [];
        this.sessionId = this.generateSessionId();
        this.enabled = settingsManager ? settingsManager.get('analyticsEnabled') : false;

        this.loadEvents();
    }

    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    loadEvents() {
        try {
            const saved = localStorage.getItem('mathArena_analytics');
            if (saved) {
                this.events = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load analytics:', e);
        }
    }

    saveEvents() {
        try {
            // Keep only last 1000 events to prevent storage bloat
            const eventsToSave = this.events.slice(-1000);
            localStorage.setItem('mathArena_analytics', JSON.stringify(eventsToSave));
        } catch (e) {
            console.error('Failed to save analytics:', e);
        }
    }

    track(eventName, data = {}) {
        if (!this.enabled) return;

        const event = {
            id: this.generateEventId(),
            sessionId: this.sessionId,
            eventName,
            timestamp: new Date().toISOString(),
            ...data
        };

        this.events.push(event);
        this.saveEvents();

        console.log('[Analytics]', eventName, data);
    }

    generateEventId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getEvents() {
        return [...this.events];
    }

    clearEvents() {
        this.events = [];
        this.saveEvents();
    }

    getSummary() {
        const summary = {
            totalEvents: this.events.length,
            byType: {},
            dateRange: null
        };

        if (this.events.length === 0) return summary;

        // Count by event type
        this.events.forEach(event => {
            summary.byType[event.eventName] = (summary.byType[event.eventName] || 0) + 1;
        });

        // Date range
        const timestamps = this.events.map(e => new Date(e.timestamp).getTime());
        summary.dateRange = {
            start: new Date(Math.min(...timestamps)).toISOString(),
            end: new Date(Math.max(...timestamps)).toISOString()
        };

        return summary;
    }

    // Convenience methods for specific events
    trackMatchStarted(mode) {
        this.track('matchStarted', { mode });
        if (settingsManager) {
            settingsManager.updateStats('matchStarted');
        }
    }

    trackMatchEnded(result, myScore, opponentScore) {
        this.track('matchEnded', {
            result, // 'win', 'lose', 'tie'
            myScore,
            opponentScore,
            duration: this.getMatchDuration()
        });
    }

    trackQuestionAnswered(questionData) {
        this.track('questionAnswered', {
            difficulty: questionData.difficulty,
            isCorrect: questionData.isCorrect,
            timeToAnswer: questionData.timeToAnswer,
            operation: questionData.operation
        });

        if (settingsManager) {
            if (questionData.isCorrect) {
                settingsManager.updateStats('answerCorrect');
            } else {
                settingsManager.updateStats('answerWrong');
            }
        }
    }

    trackConnectionAttempt(role) {
        this.track('connectionAttempt', { role }); // 'host' or 'join'
    }

    trackConnectionSuccess(role, durationMs) {
        this.track('connectionSuccess', { role, durationMs });
    }

    trackConnectionFailure(role, error) {
        this.track('connectionFailure', { role, error });
    }

    trackSettingsChanged(changedSettings) {
        this.track('settingsChanged', changedSettings);
    }

    trackAvatarChanged(newAvatar) {
        this.track('avatarChanged', { newAvatar });
    }

    trackHelpViewed() {
        this.track('helpViewed');
    }

    // Private helper for match duration
    matchStartTime = null;

    startMatchTimer() {
        this.matchStartTime = Date.now();
    }

    getMatchDuration() {
        if (!this.matchStartTime) return null;
        return Date.now() - this.matchStartTime;
    }
}

// Initialize analytics manager
const analyticsManager = new AnalyticsManager();
