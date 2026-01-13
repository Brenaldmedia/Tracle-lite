const axios = require("axios");

module.exports = {
    pattern: "fluxai",
    desc: "Generate image using Flux AI",
    category: "ai",
    react: "🎯",
    filename: __filename,
    use: "<prompt>",

    execute: async (conn, message, m, { from, reply, q }) => {
        try {
            if (!q) {
                return reply(`🎯 *Flux AI Image Generator*\n\nUsage: ${PREFIX}fluxai <prompt>\n\nExample: ${PREFIX}fluxai fantasy dragon in mountains`);
            }
            
            await reply(`🎯 *Creating Flux AI image...*\n\nPrompt: "${q}"`);
            
            // Using the working API
            const response = await axios.get(`https://api.bk9.dev/ai/fluximg?q=${encodeURIComponent(q)}`, {
                timeout: 30000
            });
            
            if (response.data.status && response.data.result) {
                // Send reaction
                await conn.sendMessage(from, {
                    react: { text: "✨", key: message.key }
                }).catch(() => {});
                
                // Send image back
                await conn.sendMessage(
                    from,
                    {
                        image: { url: response.data.result },
                        caption: `🎯 *Flux AI Generated*\n\n✨ *Prompt:* ${q}\n\n💸 *Powered by Brenadmedia*\n📱 *Generated via Tracle-Lite*`
                    },
                    { quoted: message }
                );
                
            } else {
                await reply(`❌ *Couldn't generate image!*\n\nAPI Response: ${JSON.stringify(response.data, null, 2)}`);
                
                // React with error emoji
                await conn.sendMessage(from, {
                    react: { text: "❌", key: message.key }
                }).catch(() => {});
            }
            
        } catch (error) {
            console.error("[FluxAI Error]", error);
            
            let errMsg = "❌ *An error occurred while generating the image!*\n\n";
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