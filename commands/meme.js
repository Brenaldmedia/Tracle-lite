module.exports = {
    pattern: "meme",
    desc: "Get random memes from the internet",
    category: "fun",
    react: "🤣",
    filename: __filename,
    use: ".meme",

    execute: async (conn, message, m, { from }) => {
        try {
            // Use global fetch (available in Node.js 18+)
            const response = await fetch('https://shizoapi.onrender.com/api/memes/cheems?apikey=shizo');
            
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }
            
            // Check if response is an image
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('image')) {
                const arrayBuffer = await response.arrayBuffer();
                const imageBuffer = Buffer.from(arrayBuffer);
                
                const buttons = [
                    { buttonId: '.meme', buttonText: { displayText: '🎭 Another Meme' }, type: 1 },
                    { buttonId: '.joke', buttonText: { displayText: '😄 Joke' }, type: 1 }
                ];

                await conn.sendMessage(from, { 
                    image: imageBuffer,
                    caption: "> HERE YOU GO ENJOY! 🐕",
                    buttons: buttons,
                    headerType: 1
                }, { quoted: message });
            } else {
                throw new Error('Invalid response type from API');
            }
        } catch (error) {
            console.error('Error in meme command:', error);
            await conn.sendMessage(from, { 
                text: '❌ Failed to fetch meme. Please try again later.'
            });
        }
    }
};