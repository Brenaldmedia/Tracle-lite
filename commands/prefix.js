module.exports = {
    pattern: "prefix",
    name: "prefix",
    description: "Show current prefix",
    tags: ["settings"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { PREFIX, userPrefixes } = require('../server');
            const userPrefix = userPrefixes.get(sessionId) || PREFIX;
            await reply(`📌 Current prefix: ${userPrefix}`);
        } catch (error) {
            console.error("Error in prefix command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};