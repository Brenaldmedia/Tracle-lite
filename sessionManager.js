//sessionManager.js
const fs = require('fs-extra');
const path = require('path');

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.userConfigs = new Map();
    }

    getSession(userId) {
        return this.sessions.get(userId);
    }

    setSession(userId, session) {
        this.sessions.set(userId, session);
    }

    deleteSession(userId) {
        this.sessions.delete(userId);
        this.userConfigs.delete(userId);
    }

    getAllSessions() {
        return Array.from(this.sessions.entries());
    }

    async getUserConfig(userId) {
        if (this.userConfigs.has(userId)) {
            return this.userConfigs.get(userId);
        }

        const configPath = path.join(__dirname, 'sessions', userId, 'config.json');
        let config = {};
        
        try {
            if (await fs.pathExists(configPath)) {
                config = await fs.readJson(configPath);
            }
        } catch (error) {
            console.log('Creating new config for user:', userId);
        }
        
        // Set default values from environment
        config.prefix = config.prefix || process.env.PREFIX;
        config.botName = config.botName || process.env.BOT_NAME;
        config.startTime = config.startTime || Date.now();
        
        this.userConfigs.set(userId, config);
        return config;
    }

    async saveUserConfig(userId, config) {
        const configPath = path.join(__dirname, 'sessions', userId, 'config.json');
        await fs.ensureDir(path.dirname(configPath));
        await fs.writeJson(configPath, config, { spaces: 2 });
        this.userConfigs.set(userId, config);
    }

    getActiveSessionsCount() {
        return this.sessions.size;
    }
}

module.exports = SessionManager;