// Simple database mock for antilink testing
class DatabaseManager {
    static instance = null;
    
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = {
                sync: async () => {
                    console.log('✅ Using JSON storage instead of database');
                    return Promise.resolve();
                }
            };
        }
        return DatabaseManager.instance;
    }
}

const DATABASE = DatabaseManager.getInstance();

module.exports = { DATABASE };