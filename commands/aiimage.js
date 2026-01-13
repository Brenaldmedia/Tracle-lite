const axios = require("axios");

module.exports = {
    pattern: "aiimage",
    desc: "Generate AI image using multiple models",
    category: "ai",
    react: "🤖",
    filename: __filename,
    use: "<model> <prompt>",

    execute: async (conn, message, m, { from, reply, args }) => {
        try {
            if (args.length < 2) {
                return reply(`🤖 *AI Image Generator*\n\nAvailable Models:\n• ${PREFIX}aiimage flux <prompt>\n• ${PREFIX}aiimage sd <prompt>\n\nExample: ${PREFIX}aiimage flux cyberpunk city`);
            }
            
            const model = args[0].toLowerCase();
            const prompt = args.slice(1).join(" ");
            
            await reply(`🤖 *Generating ${model.toUpperCase()} image...*\n\nPrompt: "${prompt}"`);
            
            let apiUrl = '';
            let modelName = '';
            
            switch (model) {
                case 'flux':
                    apiUrl = `https://api.bk9.dev/ai/fluximg?q=${encodeURIComponent(prompt)}`;
                    modelName = 'Flux AI';
                    break;
                    
                case 'sd':
                    apiUrl = `https://api.giftedtech.co.ke/api/ai/sd?apikey=gifted&prompt=${encodeURIComponent(prompt)}`;
                    modelName = 'Stable Diffusion';
                    break;
                    
                default:
                    return reply(`❌ *Invalid model!*\n\nAvailable models: flux, sd\n\nUsage: ${PREFIX}aiimage <model> <prompt>`);
            }
            
            const response = await axios.get(apiUrl, { timeout: 30000 });
            
            let imageUrl = null;
            
            if (model === 'flux') {
                if (response.data.status && response.data.result) {
                    imageUrl = response.data.result;
                }
            } else if (model === 'sd') {
                if (response.data.success && response.data.result) {
                    imageUrl = response.data.result;
                }
            }
            
            if (imageUrl) {
                // Send reaction
                await conn.sendMessage(from, {
                    react: { text: "✅", key: message.key }
                }).catch(() => {});
                
                // Send image
                await conn.sendMessage(
                    from,
                    { 
                        image: { url: imageUrl }, 
                        caption: `🤖 *${modelName.toUpperCase()} IMAGE*\n\n✨ *Prompt:* ${prompt}\n🔧 *Model:* ${modelName}\n📱 *Bot:* Tracle-Lite` 
                    },
                    { quoted: message }
                );
            } else {
                await reply(`❌ *Failed to generate ${modelName} image!*\n\nResponse: ${JSON.stringify(response.data, null, 2)}`);
                
                // React with error emoji
                await conn.sendMessage(from, {
                    react: { text: "❌", key: message.key }
                }).catch(() => {});
            }
            
        } catch (error) {
            console.error("AI Image error:", error);
            await reply(`❌ *Error generating image!*\n\nError: ${error.message}`);
            
            // React with error emoji
            await conn.sendMessage(from, {
                react: { text: "❌", key: message.key }
            }).catch(() => {});
        }
    }
};