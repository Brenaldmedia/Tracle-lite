// === question.js (questions only) ===
const axios = require("axios");

module.exports = {
    pattern: "question",
    alias: ["trivia", "quiz", "q"],
    desc: "Get a random trivia question",
    category: "fun",
    react: "🧠",
    filename: __filename,
    use: ".question",

    execute: async (conn, mek, m, { from, reply, sessionId }) => {
        try {
            // React 🧠
            if (module.exports.react) {
                await conn.sendMessage(from, { react: { text: module.exports.react, key: mek.key } });
            }

            // Using Keith Question API
            const apiUrl = `https://apis-keith.vercel.app/fun/question`;
            
            console.log(`🧠 Trivia Question API request`);

            const { data } = await axios.get(apiUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // Validate API response
            if (!data || data.status !== true || !data.result) {
                return await reply("❌ Failed to get question. Try again!");
            }

            const questionData = data.result;
            const category = data.category || "General Knowledge";
            const difficulty = data.difficulty || "medium";
            const question = questionData.question || "No question available";
            const correctAnswer = questionData.correctAnswer || "No correct answer";
            const incorrectAnswers = questionData.incorrectAnswers || [];

            // Combine and shuffle answers
            const allAnswers = [correctAnswer, ...incorrectAnswers]
                .sort(() => Math.random() - 0.5);

            // Simple question format
            let message = 
`🧠 *Trivia Question* 🧠

📚 Category: ${category.replace(/&amp;/g, '&')}
🎯 Difficulty: ${difficulty.toUpperCase()}

❓ ${question.replace(/&amp;/g, '&').replace(/&deg;/g, '°')}

📋 Options:
${allAnswers.map((answer, index) => 
    `${String.fromCharCode(65 + index)}. ${answer.replace(/&amp;/g, '&').replace(/&deg;/g, '°')}`
).join('\n')}

💡 Think you know the answer? Discuss with friends!`;

            // Send the question
            await reply(message);

        } catch (error) {
            console.error("[question.js] Error:", error.message);
            await reply("❌ Failed to get question. Try .question again!");
        }
    }
};