// File: commands/status.js
module.exports = {
    name: 'status',
    description: 'Check bot system status',
    category: 'General',
    
    async execute(sock, message, m, context) {
        const userSettings = context.userSettings || {};
        
        // Get system information
        const os = require('os');
        const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        const totalMemory = os.totalmem() / 1024 / 1024;
        const freeMemory = os.freemem() / 1024 / 1024;
        const cpuCount = os.cpus().length;
        
        const activeSessions = Array.from(context.activeConnections?.values() || []).filter(c => c.isConnected).length;
        const totalSessions = context.activeConnections?.size || 0;
        
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const text = `🤖 *SYSTEM STATUS*\n\n` +
                    `⚡ *Bot:* ${userSettings.botName || context.BOT_NAME}\n` +
                    `👑 *Owner:* ${userSettings.ownerName || context.OWNER_NAME}\n` +
                    `📌 *Prefix:* ${context.userPrefix || context.PREFIX}\n` +
                    `🔧 *Commands:* ${context.commands?.size || 0}\n\n` +
                    `📊 *Sessions:*\n` +
                    `• Active: ${activeSessions}\n` +
                    `• Total: ${totalSessions}\n\n` +
                    `💾 *Memory:*\n` +
                    `• Used: ${usedMemory.toFixed(2)} MB\n` +
                    `• Free: ${freeMemory.toFixed(2)} MB\n` +
                    `• Total: ${totalMemory.toFixed(2)} MB\n\n` +
                    `🖥️ *System:*\n` +
                    `• CPU Cores: ${cpuCount}\n` +
                    `• Platform: ${os.platform()} ${os.arch()}\n\n` +
                    `⏰ *Uptime:*\n` +
                    `${days}d ${hours}h ${minutes}m ${seconds}s\n\n` +
                    `✅ All systems operational`;
        
        if (context.sendMessageWithContext) {
            await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message,
                externalAdReply: {
                    title: "System Status",
                    body: `Active: ${activeSessions} | Uptime: ${days}d ${hours}h`,
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        } else {
            await sock.sendMessage(message.key.remoteJid, { text }, { quoted: message });
        }
    }
};