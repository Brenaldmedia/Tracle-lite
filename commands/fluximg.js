const axios = require("axios");

module.exports = {
    pattern: "fluximg",
    desc: "Generate image using Flux model",
    category: "ai",
    react: "🎇",
    filename: __filename,
    use: "<prompt>",

    execute: async (conn, message, m, { from, reply, q }) => {
        try {
            if (!q) {
                return reply(`🎇 *Flux Image Generator*\n\nUsage: ${PREFIX}fluximg <prompt>\n\nExample: ${PREFIX}fluximg modern city architecture`);
            }
            
            await reply(`🎇 *Generating Flux image...*\n\nPrompt: "${q}"`);
            
            // Using the working API
            const response = await axios.get(`https://api.bk9.dev/ai/fluximg?q=${encodeURIComponent(q)}`, {
                timeout: 30000
            });
            
            if (response.data.status && response.data.result) {
                // Send reaction
                await conn.sendMessage(from, {
                    react: { text: "🎨", key: message.key }
                }).catch(() => {});
                
                // Send image
                await conn.sendMessage(
                    from,
                    { 
                        image: { url: response.data.result }, 
                        caption: `🎇 *Flux Image Generated*\n\n✨ *Prompt:* ${q}\n\n🔧 *Model:* Flux AI\n📱 *Bot:* Tracle-Lite` 
                    },
                    { quoted: message }
                );
                
            } else {
                await reply(`❌ *Couldn't generate flux image!*\n\nResponse: ${JSON.stringify(response.data, null, 2)}`);
                
                // React with error emoji
                await conn.sendMessage(from, {
                    react: { text: "❌", key: message.key }
                }).catch(() => {});
            }
            
        } catch (error) {
            console.error("[fluximg.js]", error);
            
            let errMsg = "❌ *Error generating flux image!*\n\n";
            if (error.response?.data) {
                errMsg += `📝 *API Response:* ${JSON.stringify(error.response.data, null, 2)}`;
            } else if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
                errMsg += "🌐 *Connection error. API might be down.*";
            } else {
                errMsg += `🔧 *Error:* ${error.message}`;
            }
            
            await reply(errMsg);
            
            // React with error emoji
            await conn.sendMessage(from, {
                react: { text: "❌", key: message.key }
            }).catch(() => {});
        }
    }
};