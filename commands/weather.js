const axios = require('axios');

module.exports = {
    pattern: "weather",
    desc: "🌤 Get weather information for a location",
    react: "🌤",
    category: "other",
    filename: __filename,
    use: ".weather [city name]",

    execute: async (conn, message, m, { from, q, reply, sender }) => {
        // Helper function to send messages with contextInfo
        const sendMessageWithContext = async (text, quoted = message) => {
            return await conn.sendMessage(from, {
                text: text,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: 200
                    }
                }
            }, { quoted: quoted });
        };

        try {
            if (!q) return await sendMessageWithContext("❗ Please provide a city name. Usage: .weather [city name]");
            
            // React 🌤
            if (module.exports.react) {
                await conn.sendMessage(from, { react: { text: module.exports.react, key: message.key } });
            }

            const apiKey = '2d61a72574c11c4f36173b627f8cb177'; 
            const city = q;
            const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
            const response = await axios.get(url);
            const data = response.data;
            
            const weather = `
🌍 *Weather Information for ${data.name}, ${data.sys.country}* 🌍
🌡️ *Temperature*: ${data.main.temp}°C
🌡️ *Feels Like*: ${data.main.feels_like}°C
🌡️ *Min Temp*: ${data.main.temp_min}°C
🌡️ *Max Temp*: ${data.main.temp_max}°C
💧 *Humidity*: ${data.main.humidity}%
☁️ *Weather*: ${data.weather[0].main}
🌫️ *Description*: ${data.weather[0].description}
💨 *Wind Speed*: ${data.wind.speed} m/s
🔽 *Pressure*: ${data.main.pressure} hPa

*© Powered By BrenaldMedia*
`;
            return await sendMessageWithContext(weather);
        } catch (e) {
            console.log(e);
            if (e.response && e.response.status === 404) {
                return await sendMessageWithContext("🚫 City not found. Please check the spelling and try again.");
            }
            return await sendMessageWithContext("⚠️ An error occurred while fetching the weather information. Please try again later.");
        }
    }
};