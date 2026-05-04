const fs = require('fs');
const path = require('path');

module.exports = {
    pattern: "delprem",
    desc: "Remove user from premium (Owner only)",
    category: "owner",
    react: "❌",
    filename: __filename,
    use: "<number>",
    ownerOnly: true,

    execute: async (conn, message, m, { reply, q }) => {
        try {
            const number = q.replace(/\D/g, '');
            
            if (!number || number.length < 10) {
                return reply("❌ Please provide a valid number.\nExample: .delprem 234xxxx");
            }

            const premiumPath = path.join(__dirname, '../data/premium.json');
            
            if (!fs.existsSync(premiumPath)) {
                return reply("No premium users found.");
            }

            let data = JSON.parse(fs.readFileSync(premiumPath, 'utf8'));
            
            if (data.users.includes(number)) {
                data.users = data.users.filter(num => num !== number);
                fs.writeFileSync(premiumPath, JSON.stringify(data, null, 2));
                console.log(`✅ Premium removed: ${number}`);

                await reply(`✅ *${number}* has been removed from premium.`);
                await conn.sendMessage(message.key.remoteJid, { react: { text: "❌", key: message.key } });
            } else {
                await reply(`❌ ${number} is not a premium user.`);
            }

        } catch (error) {
            console.error("❌ delprem error:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};