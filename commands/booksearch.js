const axios = require("axios");

module.exports = {
    pattern: "booksearch",
    alias: ["searchbook", "findbook"],
    category: "education",
    description: "Search books for educational content",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📚 *Book Search*\n\nUsage: .booksearch [book title or author]\nExample: .booksearch Things Fall Apart\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "📚", key: mek.key } });
            await reply(`🔍 Searching for books: *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/education/book?title=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ No books found for "${q}".\n> Powered by Tracle-Lite`);
            }

            const books = response.data.result || [];
            
            let message = `📚 *BOOK SEARCH RESULTS* 📚\n🔍 *Query:* ${q}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            books.slice(0, 10).forEach((book, index) => {
                message += `${index + 1}. *${book.title || book.name}*\n`;
                if (book.author) message += `   ✍️ Author: ${book.author}\n`;
                if (book.year) message += `   📅 Year: ${book.year}\n`;
                if (book.id) message += `   🆔 ID: ${book.id}\n`;
                message += `\n`;
            });
            
            message += `━━━━━━━━━━━━━━━━━━━━\n💡 Use .bookid [ID] to get full book content\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("BookSearch error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};