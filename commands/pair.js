// commands/pair.js - DIRECT APPROACH
module.exports = {
    name: 'pair',
    category: 'WhatsApp',
    description: 'Generate pairing code (may log out current session)',
    ownerOnly: true,
    
    async execute(conn, message, m, context) {
        try {
            const { args, reply } = context;
            
            if (args.length === 0) {
                return reply('🔐 Usage: .pair [number]\nExample: .pair 2348150221529');
            }
            
            const phoneNumber = args.join('').replace(/\D/g, '');
            
            if (phoneNumber.length < 8) {
                return reply('❌ Invalid number');
            }
            
            // Mask number
            const maskNum = (num) => {
                if (num.length <= 6) return num;
                return num.substring(0, 3) + 'xxx' + num.substring(num.length - 3);
            };
            
            const masked = maskNum(phoneNumber);
            
            // Check if already connected
            const activeConnections = global.activeConnections || new Map();
            let isConnected = false;
            
            for (const [sessionNum, connectionData] of activeConnections.entries()) {
                if (!connectionData.conn || !connectionData.conn.user) continue;
                
                const jid = connectionData.conn.user.id;
                let num = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
                
                if (num === phoneNumber) {
                    isConnected = true;
                    break;
                }
            }
            
            if (isConnected) {
                return reply(`❌ ${masked} - Already connected`);
            }
            
            // WARNING: This may log out current session
            await reply(`⚠️ *WARNING:* Generating pairing code may log out this bot session!\n\nGenerating code for ${masked}...`);
            
            try {
                // Try to generate pairing code
                const pairingCode = await conn.requestPairingCode(phoneNumber);
                
                if (pairingCode) {
                    await reply(`✅ *SUCCESS!*\n\n📱 Number: ${masked}\n🔢 Code: *${pairingCode}*\n\n⚠️ *This bot session may log out now!*\n\nEnter code in WhatsApp → Settings → Linked Devices`);
                } else {
                    await reply(`❌ Failed to generate code for ${masked}`);
                }
                
            } catch (error) {
                console.error('Pairing error:', error);
                
                if (error.message.includes('logged out') || error.message.includes('401')) {
                    await reply(`⚠️ *SESSION LOGGED OUT*\n\nPairing code generation logged out this session.\n\nCode was generated but bot needs to reconnect.\n\n📱 Number: ${masked}\n🔢 Check logs for generated code`);
                } else {
                    await reply(`❌ Error: ${error.message}`);
                }
            }
            
        } catch (error) {
            console.error('Pair command error:', error);
            await context.reply('❌ Failed to generate pairing code');
        }
    }
};