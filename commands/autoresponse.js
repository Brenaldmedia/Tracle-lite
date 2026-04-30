module.exports = {
    pattern: "autoresponse",
    alias: ["autoreply", "automsg", "auto"],
    desc: "Set auto-response messages (stored per user)",
    category: "utility",
    react: "🤖",
    filename: __filename,
    use: "add/list/remove",
    
    execute: async (conn, message, m, { from, reply, args, sessionId, PREFIX, getUserSettings, updateUserSettings }) => {
        const subcmd = args[0]?.toLowerCase();
        
        // Get current user settings or initialize
        let userSettings = getUserSettings(sessionId);
        
        // Initialize autoResponses if not exists
        if (!userSettings.autoResponses) {
            userSettings.autoResponses = {};
        }
        
        if (!subcmd) {
            return reply(`🤖 *Auto-Response System*\n\n*Commands:*\n• ${PREFIX}autoresponse add [trigger] [response]\n• ${PREFIX}autoresponse list\n• ${PREFIX}autoresponse remove [trigger]\n• ${PREFIX}autoresponse clear\n\n*Examples:*\n• ${PREFIX}autoresponse add hello Hi there! How can I help?\n• ${PREFIX}autoresponse add bye Goodbye! See you later.\n\n*Note:* Responses are saved per user and persist across restarts.`);
        }
        
        if (subcmd === 'add') {
            const trigger = args[1]?.toLowerCase();
            const response = args.slice(2).join(' ');
            
            if (!trigger || !response) {
                return reply(`❌ *Usage:* ${PREFIX}autoresponse add [trigger] [response]\n\n*Example:* ${PREFIX}autoresponse add hello Hi there!`);
            }
            
            // Add or update auto-response
            userSettings.autoResponses[trigger] = response;
            updateUserSettings(sessionId, { autoResponses: userSettings.autoResponses });
            
            await reply(`✅ *Auto-response added!*\n\n📝 *Trigger:* "${trigger}"\n💬 *Response:* "${response}"\n\nTotal auto-responses: ${Object.keys(userSettings.autoResponses).length}`);
            
        } else if (subcmd === 'list') {
            const responses = userSettings.autoResponses;
            const keys = Object.keys(responses);
            
            if (keys.length === 0) {
                return reply(`📝 *No auto-responses set.*\n\nUse ${PREFIX}autoresponse add to create one.\n\n*Example:* ${PREFIX}autoresponse add hello Hi there!`);
            }
            
            let list = `📝 *YOUR AUTO-RESPONSES*\n\n`;
            list += `📊 *Total:* ${keys.length}\n`;
            list += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            let count = 1;
            for (const [trigger, response] of Object.entries(responses)) {
                list += `${count}. 🔑 *${trigger}*\n`;
                list += `   💬 → "${response.length > 50 ? response.substring(0, 50) + '...' : response}"\n\n`;
                count++;
            }
            
            list += `━━━━━━━━━━━━━━━━━━━━━━\n`;
            list += `💡 Use ${PREFIX}autoresponse remove [trigger] to delete.\n`;
            list += `⚡ Powered by Tracle-Lite`;
            
            await reply(list);
            
        } else if (subcmd === 'remove') {
            const trigger = args[1]?.toLowerCase();
            
            if (!trigger) {
                return reply(`❌ *Usage:* ${PREFIX}autoresponse remove [trigger]\n\n*Example:* ${PREFIX}autoresponse remove hello`);
            }
            
            if (!userSettings.autoResponses[trigger]) {
                return reply(`❌ No auto-response found for "${trigger}"\n\nUse ${PREFIX}autoresponse list to see all.`);
            }
            
            const deletedResponse = userSettings.autoResponses[trigger];
            delete userSettings.autoResponses[trigger];
            updateUserSettings(sessionId, { autoResponses: userSettings.autoResponses });
            
            await reply(`✅ *Removed auto-response!*\n\n🔑 *Trigger:* "${trigger}"\n💬 *Old response:* "${deletedResponse}"`);
            
        } else if (subcmd === 'clear') {
            const count = Object.keys(userSettings.autoResponses).length;
            
            if (count === 0) {
                return reply(`📝 No auto-responses to clear.`);
            }
            
            userSettings.autoResponses = {};
            updateUserSettings(sessionId, { autoResponses: userSettings.autoResponses });
            
            await reply(`✅ *Cleared all auto-responses!*\n\n🗑️ Removed ${count} auto-response(s).`);
            
        } else {
            return reply(`❌ *Unknown command:* ${subcmd}\n\n*Available:* add, list, remove, clear\n\n*Example:* ${PREFIX}autoresponse add hello Hi there!`);
        }
    }
};