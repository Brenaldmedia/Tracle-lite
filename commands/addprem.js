const fs = require('fs');
const path = require('path');

module.exports = {
    pattern: "addprem",
    desc: "Add user to premium (Owner only)",
    category: "owner",
    react: "⭐",
    filename: __filename,
    use: "<number>",
    ownerOnly: true,

    execute: async (conn, message, m, { reply, q }) => {
        try {
            const number = q.replace(/\D/g, '');
            
            if (!number || number.length < 10) {
                return reply("❌ Please provide a valid number.\nExample: .addprem 234xxxxx");
            }

            const premiumPath = path.join(__dirname, '../data/premium.json');
            let data = { users: [] };

            if (fs.existsSync(premiumPath)) {
                data = JSON.parse(fs.readFileSync(premiumPath, 'utf8'));
            }

            if (!data.users.includes(number)) {
                data.users.push(number);
                fs.writeFileSync(premiumPath, JSON.stringify(data, null, 2));
                console.log(`✅ Premium added: ${number}`);

                await reply(`✅ *${number}* has been added to premium!`);
                await conn.sendMessage(message.key.remoteJid, { react: { text: "⭐", key: message.key } });
            } else {
                await reply(`✅ ${number} is already premium.`);
            }

        } catch (error) {
            console.error("❌ addprem error:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};