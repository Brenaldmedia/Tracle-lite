const crypto = require("crypto");

module.exports = {
    pattern: "password",
    desc: "Generate a strong password",
    category: "utility",
    filename: __filename,
    use: ".password [length]",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            // Send reaction
            await conn.sendMessage(from, { 
                react: { text: "🔐", key: mek.key } 
            });

            // Password length specified by the user, defaults to 12 if not provided
            const passwordLength = args[0] ? parseInt(args[0]) : 12;

            // Validate the password length
            if (isNaN(passwordLength) || passwordLength < 8) {
                return reply("❌ Please provide a valid length for the password (Minimum 8 Characters).");
            }

            // Password generation function
            const generatePassword = (length) => {
                const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+[]{}|;:,.<>?';
                let password = '';
                for (let i = 0; i < length; i++) {
                    const randomIndex = crypto.randomInt(0, chars.length);
                    password += chars[randomIndex];
                }
                return password;
            };

            // Generate the password
            const generatedPassword = generatePassword(passwordLength);

            // Send the message with the generated password
            await conn.sendMessage(from, {
                text: `🔐 *Your Strong Password* 🔐

📏 *Length:* ${passwordLength} characters
🔒 *Password:* \`${generatedPassword}\`

💡 *Tip:* Copy and save this password securely!

> Powered By BrenaldMedia`
            }, { quoted: mek });

        } catch (error) {
            console.error("❌ Password command error:", error);
            await conn.sendMessage(from, { 
                react: { text: "❌", key: mek.key } 
            });
            reply("❌ Error generating password: " + error.message);
        }
    }
};