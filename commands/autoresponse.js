module.exports = {
    pattern: "autoresponse",
    desc: "Set auto-response messages",
    category: "utility",
    react: "🤖",
    filename: __filename,
    use: "add/list/remove",
    
    execute: async (conn, message, m, { from, reply, args, sessionId }) => {
        const subcmd = args[0]?.toLowerCase();
        const responses = global.autoResponses || new Map();
        
        if (!subcmd) {
            return reply(`🤖 *Auto-Response System*\n\nCommands:\n• ${PREFIX}autoresponse add [trigger] [response]\n• ${PREFIX}autoresponse list\n• ${PREFIX}autoresponse remove [trigger]\n\nExample: ${PREFIX}autoresponse add hello Hi there!`);
        }
        
        if (subcmd === 'add') {
            const trigger = args[1];
            const response = args.slice(2).join(' ');
            
            if (!trigger || !response) {
                return reply(`❌ Usage: ${PREFIX}autoresponse add [trigger] [response]`);
            }
            
            if (!responses.has(sessionId)) {
                responses.set(sessionId, new Map());
            }
            
            responses.get(sessionId).set(trigger.toLowerCase(), response);
            global.autoResponses = responses;
            
            await reply(`✅ Auto-response added!\n\nTrigger: "${trigger}"\nResponse: "${response}"`);
            
        } else if (subcmd === 'list') {
            const userResponses = responses.get(sessionId);
            
            if (!userResponses || userResponses.size === 0) {
                return reply(`📝 No auto-responses set.\nUse ${PREFIX}autoresponse add to create one.`);
            }
            
            let list = '📝 *Your Auto-Responses:*\n\n';
            let count = 1;
            
            for (const [trigger, response] of userResponses.entries()) {
                list += `${count}. *${trigger}* → "${response}"\n`;
                count++;
            }
            
            await reply(list);
            
        } else if (subcmd === 'remove') {
            const trigger = args[1];
            
            if (!trigger) {
                return reply(`❌ Usage: ${PREFIX}autoresponse remove [trigger]`);
            }
            
            const userResponses = responses.get(sessionId);
            
            if (!userResponses || !userResponses.has(trigger.toLowerCase())) {
                return reply(`❌ No auto-response found for "${trigger}"`);
            }
            
            userResponses.delete(trigger.toLowerCase());
            await reply(`✅ Removed auto-response for "${trigger}"`);
        }
    }
};