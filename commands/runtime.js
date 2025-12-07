const os = require('os');
const process = require('process');
const fs = require('fs-extra');
const path = require('path');

// Store start time
const startTime = Date.now();

function formatUptime() {
    const uptime = Date.now() - startTime;
    const seconds = Math.floor(uptime / 1000);
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

function getMemoryUsage() {
    const used = process.memoryUsage();
    return {
        rss: Math.round(used.rss / 1024 / 1024),
        heapTotal: Math.round(used.heapTotal / 1024 / 1024),
        heapUsed: Math.round(used.heapUsed / 1024 / 1024),
        external: Math.round(used.external / 1024 / 1024)
    };
}

function getSystemInfo() {
    return {
        platform: os.platform(),
        arch: os.arch(),
        cpu: os.cpus()[0]?.model || 'Unknown',
        cores: os.cpus().length,
        totalMem: Math.round(os.totalmem() / 1024 / 1024 / 1024),
        freeMem: Math.round(os.freemem() / 1024 / 1024 / 1024)
    };
}

function getSessionCount() {
    try {
        const sessionsPath = path.join(__dirname, '..', 'sessions');
        if (fs.existsSync(sessionsPath)) {
            const folders = fs.readdirSync(sessionsPath);
            return folders.length;
        }
        return 0;
    } catch (error) {
        return 0;
    }
}

function getCommandCount() {
    try {
        const commandsPath = path.join(__dirname);
        const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        return files.length;
    } catch (error) {
        return 0;
    }
}

function getBotInfo() {
    try {
        // Try to get from env first
        const botName = process.env.BOT_NAME || "TRACLE - LITE";
        const ownerName = process.env.OWNER_NAME || "Brenaldmedia";
        
        // Try to get from server module if available
        try {
            const server = require('../server');
            return {
                botName: server.BOT_NAME || botName,
                ownerName: server.OWNER_NAME || ownerName,
                prefix: server.PREFIX || ".",
                sessions: server.sessions ? server.sessions.size : getSessionCount()
            };
        } catch (error) {
            return {
                botName: botName,
                ownerName: ownerName,
                prefix: process.env.PREFIX || ".",
                sessions: getSessionCount()
            };
        }
    } catch (error) {
        return {
            botName: "TRACLE - LITE",
            ownerName: "Brenaldmedia",
            prefix: ".",
            sessions: 0
        };
    }
}

function getProcessInfo() {
    return {
        nodeVersion: process.version,
        pid: process.pid,
        uptime: process.uptime(),
        platform: process.platform,
        cwd: process.cwd()
    };
}

// Get server load average (if available)
function getLoadAverage() {
    const load = os.loadavg();
    return {
        '1min': load[0].toFixed(2),
        '5min': load[1].toFixed(2),
        '15min': load[2].toFixed(2)
    };
}

module.exports = {
    pattern: "runtime",
    desc: "Show bot runtime statistics and system info",
    category: "utility",
    use: ".runtime",
    filename: __filename,

    execute: async (conn, message, m, { reply, from, sessionId }) => {
        try {
            // Add loading reaction
            try {
                await conn.sendMessage(from, { react: { text: "⏳", key: message.key } });
            } catch (error) {}

            // Get all stats
            const uptime = formatUptime();
            const memory = getMemoryUsage();
            const system = getSystemInfo();
            const botInfo = getBotInfo();
            const processInfo = getProcessInfo();
            const load = getLoadAverage();
            const commandCount = getCommandCount();

            // Get user settings if available
            let userSettings = {};
            try {
                const server = require('../server');
                if (typeof server.getUserSettings === 'function') {
                    userSettings = server.getUserSettings(sessionId) || {};
                }
            } catch (error) {}

            // Format the statistics message with fancy ASCII
            const statsMessage = `
${'═'.repeat(35)}
🤖 *${botInfo.botName} RUNTIME STATISTICS* 🤖
${'═'.repeat(35)}

📊 *SYSTEM INFORMATION*
${'─'.repeat(35)}
🔸 *Uptime:* ${uptime}
🔸 *Sessions:* ${botInfo.sessions} active
🔸 *Commands:* ${commandCount} loaded
🔸 *Node.js:* ${processInfo.nodeVersion}
🔸 *Process ID:* ${processInfo.pid}

💾 *MEMORY USAGE*
${'─'.repeat(35)}
📦 *RSS:* ${memory.rss} MB
🧠 *Heap Total:* ${memory.heapTotal} MB
⚡ *Heap Used:* ${memory.heapUsed} MB
🔗 *External:* ${memory.external} MB

🖥️ *SYSTEM RESOURCES*
${'─'.repeat(35)}
🖥️ *Platform:* ${system.platform} (${system.arch})
⚙️ *CPU:* ${system.cpu}
🎯 *Cores:* ${system.cores}
💿 *Total RAM:* ${system.totalMem} GB
📈 *Free RAM:* ${system.freeMem} GB
📊 *Load Avg:* ${load['1min']} (1min) / ${load['5min']} (5min) / ${load['15min']} (15min)

👤 *BOT INFORMATION*
${'─'.repeat(35)}
👑 *Owner:* ${userSettings.ownerName || botInfo.ownerName}
🔧 *Prefix:* ${userSettings.prefix || botInfo.prefix || "."}
🔒 *Mode:* ${userSettings.botMode || "public"}
💬 *Session:* ${sessionId || "Unknown"}

${'═'.repeat(35)}
*🤖 Bot is running smoothly!* 🚀
${'═'.repeat(35)}`;

            // Send the message
            await reply(statsMessage);

            // Update reaction to success
            try {
                await conn.sendMessage(from, { react: { text: "✅", key: message.key } });
            } catch (error) {}

        } catch (error) {
            console.error('Error in runtime command:', error);
            
            // Send error message
            const errorMessage = `❌ *Error fetching runtime statistics*

⚠️ *Error:* ${error.message}

📊 *Basic Info:*
• Uptime: ${formatUptime()}
• Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB
• Platform: ${os.platform()}
• Status: ⚠️ Partial data available

Try again in a moment!`;

            try {
                await reply(errorMessage);
                await conn.sendMessage(from, { react: { text: "❌", key: message.key } });
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    },

    // Export helper functions for other modules
    formatUptime,
    getMemoryUsage,
    getSystemInfo,
    getSessionCount,
    getCommandCount,
    getBotInfo,
    getProcessInfo,
    getLoadAverage
};