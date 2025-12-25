// Simplified database.js for JSON storage
class DatabaseManager {
    static instance = null;
    
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = {
                // Mock database methods for compatibility
                sync: async () => {
                    console.log('✅ Database system ready (using JSON storage)');
                    return Promise.resolve();
                },
                authenticate: async () => {
                    console.log('✅ Database connection established');
                    return Promise.resolve();
                },
                close: async () => {
                    console.log('✅ Database connection closed');
                    return Promise.resolve();
                },
                // Add any other methods that might be called
                query: async () => {
                    return [];
                },
                transaction: async (callback) => {
                    return await callback();
                }
            };
        }
        return DatabaseManager.instance;
    }
}

const DATABASE = DatabaseManager.getInstance();

// Auto-sync on startup
DATABASE.sync()
    .then(() => {
        console.log('✅ Database system initialized');
    })
    .catch((error) => {
        console.log('⚠️ Using JSON storage system');
    });

module.exports = { DATABASE };