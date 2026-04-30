const axios = require("axios");

module.exports = {
    pattern: "aiimage",
    alias: ["img", "generate", "draw", "imagine", "image"],
    desc: "Generate AI image from text prompt using Silvatech API",
    category: "ai",
    react: "🎨",
    filename: __filename,
    use: "<prompt>",

    execute: async (conn, message, m, { from, reply, args }) => {
        let prompt; // Declare prompt at function scope
        try {
            prompt = args.join(" ");
            if (!prompt) {
                return reply(`🎨 *AI Image Generator*\n\nGenerate stunning images from your imagination!\n\n📝 *Usage:*\n.aiimage a majestic dragon flying over mountains\n.aiimage futuristic cyberpunk city\n.aiimage cute cat wearing sunglasses\n\n💡 *Tips:*\n• Be descriptive for better results\n• Include style, colors, mood\n• Try: realistic, anime, painting, 3D render`);
            }
            
            await reply(`🎨 *Generating your image...*\n\n📝 *Prompt:* ${prompt}\n⏳ Processing, please wait...`);
            
            // Using the working Silvatech imagine API
            const apiUrl = `https://api.silvatech.co.ke/ai/imagine?q=${encodeURIComponent(prompt)}&width=1280&height=720`;
            
            console.log(`📡 Calling Silvatech Image API: ${apiUrl}`);
            
            const response = await axios.get(apiUrl, { 
                timeout: 90000,
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            });
            
            console.log(`📦 API Response status: ${response.status}`);
            console.log(`📦 Content-Type: ${response.headers['content-type']}`);
            
            let imageUrl = null;
            
            // Check if response has the image_url in result
            if (response.data && response.data.status === true) {
                if (response.data.result && response.data.result.image_url) {
                    imageUrl = response.data.result.image_url;
                    console.log(`✅ Found image URL: ${imageUrl}`);
                } else if (response.data.image_url) {
                    imageUrl = response.data.image_url;
                } else if (response.data.url) {
                    imageUrl = response.data.url;
                }
            }
            
            // If we have an image URL
            if (imageUrl) {
                console.log(`📥 Fetching image from URL: ${imageUrl}`);
                
                // Fetch the actual image
                const imageResponse = await axios.get(imageUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                
                // Send success reaction
                await conn.sendMessage(from, {
                    react: { text: "✅", key: message.key }
                }).catch(() => {});
                
                // Send the generated image
                await conn.sendMessage(
                    from,
                    { 
                        image: imageResponse.data, 
                        caption: `🎨 *AI GENERATED IMAGE*\n\n✨ *Prompt:* ${prompt}\n🤖 *Engine:* Silvatech Imagine AI\n📐 *Size:* 1280x720\n📱 *Bot:* Tracle-Lite\n\n💡 Try different prompts for varied results!` 
                    },
                    { quoted: message }
                );
                
                console.log(`✅ Image generated successfully: ${prompt.substring(0, 50)}`);
            } else {
                console.error(`❌ No image URL found in response`);
                console.log(`Response data:`, JSON.stringify(response.data, null, 2));
                
                await reply(`❌ *Failed to generate image!*\n\n📝 *Prompt:* ${prompt}\n⚠️ *Error:* Could not get image URL from API\n\n💡 Try:\n• A different prompt\n• Shorter description\n• .aiimage a beautiful sunset`);
                
                await conn.sendMessage(from, {
                    react: { text: "❌", key: message.key }
                }).catch(() => {});
            }
            
        } catch (error) {
            console.error("❌ AI Image error:", error.message);
            
            let errorMsg = error.message;
            if (error.code === 'ECONNABORTED') {
                errorMsg = 'Request timed out. Try a simpler prompt.';
            } else if (error.response?.status === 404) {
                errorMsg = 'API endpoint not found. Please try again.';
            } else if (error.response?.status === 429) {
                errorMsg = 'Too many requests. Please wait a moment.';
            }
            
            // Use the prompt variable safely (it might not exist if error happened before assignment)
            const errorPrompt = prompt || args.join(" ") || "unknown";
            
            await reply(`❌ *Error generating image!*\n\n📝 *Prompt:* ${errorPrompt}\n⚠️ *Error:* ${errorMsg}\n\n💡 Try:\n• A different prompt\n• Shorter description\n• .aiimage a beautiful sunset\n\nOr try the text AI: .ai ${errorPrompt.substring(0, 50)}`);
            
            await conn.sendMessage(from, {
                react: { text: "❌", key: message.key }
            }).catch(() => {});
        }
    }
};