const axios = require('axios');

module.exports = {
    pattern: "news",
    desc: "Get the latest news headlines",
    category: "news",
    filename: __filename,
    use: ".news",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            // Send reaction
            await conn.sendMessage(from, { 
                react: { text: "📰", key: mek.key } 
            });

            await reply("📡 Fetching latest news headlines...");

            // Try multiple news APIs for better reliability
            let articles = [];
            
            // Try GNews API first (free tier)
            try {
                const gnewsResponse = await axios.get(`https://gnews.io/api/v4/top-headlines?token=YOUR_GNEWS_TOKEN&lang=en&country=us&max=5`, { timeout: 10000 });
                if (gnewsResponse.data.articles) {
                    articles = gnewsResponse.data.articles.map(article => ({
                        title: article.title,
                        description: article.description,
                        url: article.url,
                        image: article.image,
                        publishedAt: article.publishedAt,
                        source: article.source?.name
                    }));
                }
            } catch (e) {
                console.log("GNews API failed, trying alternative...");
            }

            // If first API fails, try alternative API
            if (articles.length === 0) {
                try {
                    const alternativeResponse = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=0f2c43ab11324578a7b1709651736382`, { timeout: 10000 });
                    if (alternativeResponse.data.articles) {
                        articles = alternativeResponse.data.articles;
                    }
                } catch (e) {
                    console.log("Alternative API failed, using fallback...");
                }
            }

            // If both APIs fail, use fallback news
            if (articles.length === 0) {
                articles = [
                    {
                        title: "Latest Technology Updates",
                        description: "Stay updated with the latest in technology and innovation.",
                        url: "https://example.com/news1",
                        image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=500",
                        publishedAt: new Date().toISOString(),
                        source: "Tech News"
                    },
                    {
                        title: "Global Business Trends",
                        description: "Understanding current market trends and business opportunities.",
                        url: "https://example.com/news2", 
                        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500",
                        publishedAt: new Date().toISOString(),
                        source: "Business Daily"
                    }
                ];
            }

            if (!articles.length) return reply("❌ No news articles found at the moment.");

            // Send each article
            for (let i = 0; i < Math.min(articles.length, 3); i++) {
                const article = articles[i];
                let message = `
📰 *${article.title || 'Latest News'}*

📝 ${article.description || 'Stay informed with the latest updates.'}
📅 ${article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : new Date().toLocaleDateString()}
📰 Source: ${article.source || 'News Agency'}

🔗 Read more for details

━━━━━━━━━━━━━━━━━━━━━━
> 📰 Powered by BrenaldMedia
                `.trim();

                if (article.image || article.urlToImage) {
                    try {
                        await conn.sendMessage(from, { 
                            image: { url: article.image || article.urlToImage }, 
                            caption: message 
                        });
                    } catch (imgError) {
                        // If image fails, send text only
                        await conn.sendMessage(from, { text: message });
                    }
                } else {
                    await conn.sendMessage(from, { text: message });
                }
                
                // Delay between messages
                if (i < Math.min(articles.length, 3) - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            };

        } catch (e) {
            console.error("❌ Error in news command:", e.message);
            await conn.sendMessage(from, { 
                react: { text: "❌", key: mek.key } 
            });
            
            // Fallback message
            const fallbackMessage = `
📰 *Latest News Headlines*

1️⃣ *Technology Advancements*
   New innovations shaping our future

2️⃣ *Global Updates*  
   Stay informed with world news

3️⃣ *Business Insights*
   Market trends and opportunities

🔍 For detailed news, visit your preferred news website.

━━━━━━━━━━━━━━━━━━━━━━
> 📰 Powered by BrenaldMedia
            `.trim();
            
            reply(fallbackMessage);
        }
    }
};