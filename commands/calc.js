const axios = require("axios");

module.exports = {
  pattern: "calc",
  alias: ["calculate", "math", "converter", "convert"],
  desc: "Calculator and unit converter",
  category: "tools",
  react: "🧮",
  filename: __filename,
  use: "<expression> or convert <value> <from> to <to>",

  execute: async (conn, message, m, { from, reply, args, PREFIX, userSettings, BOT_NAME, MENU_IMAGE_URL, REPO_LINK }) => {
    try {
      const input = args.join(" ");
      if (!input) {
        const helpText = `🧮 *Calculator & Unit Converter*

📝 *Calculator Usage:*
${PREFIX}calc 25 * 48
${PREFIX}calc (10 + 5) * 2
${PREFIX}calc sqrt(144)
${PREFIX}calc 2^10

📏 *Unit Converter Usage:*
${PREFIX}calc convert 10 km to miles
${PREFIX}calc convert 100 USD to EUR
${PREFIX}calc convert 5 kg to lbs
${PREFIX}calc convert 30°C to °F

💡 *Supported Units:*
Length: km, m, cm, mm, mile, yard, ft, in
Weight: kg, g, mg, lb, oz
Temperature: °C, °F, K
Currency: USD, EUR, GBP, JPY, NGN, CAD, AUD, etc.

⚡ Powered by Tracle-Lite`;

        return await conn.sendMessage(from, {
          text: helpText,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363401559573199@newsletter",
              newsletterName: "BrenaldMedia",
              serverMessageId: -1,
            },
            externalAdReply: {
              title: `${userSettings?.botName || BOT_NAME} Calculator`,
              body: "Math & Unit Converter",
              thumbnailUrl: userSettings?.botImage || MENU_IMAGE_URL,
              sourceUrl: REPO_LINK,
              mediaType: 1
            }
          }
        }, { quoted: message });
      }

      await m.react('⏳');

      // Check if it's a conversion command
      if (input.toLowerCase().startsWith("convert ")) {
        const convertQuery = input.slice(8).trim();
        
        // Parse conversion: "10 km to miles" or "100 USD to EUR"
        const toIndex = convertQuery.indexOf(" to ");
        if (toIndex === -1) {
          return reply(`❌ Invalid format. Use: ${PREFIX}calc convert [value] [from] to [to]\n\nExample: ${PREFIX}calc convert 10 km to miles`);
        }

        const fromPart = convertQuery.slice(0, toIndex);
        const toUnit = convertQuery.slice(toIndex + 4);
        
        const fromParts = fromPart.trim().split(/\s+/);
        if (fromParts.length < 2) {
          return reply(`❌ Invalid format. Use: ${PREFIX}calc convert [value] [from] to [to]`);
        }

        const value = parseFloat(fromParts[0]);
        const fromUnit = fromParts[1].toLowerCase();
        
        if (isNaN(value)) {
          return reply(`❌ Invalid number: "${fromParts[0]}"`);
        }

        await reply(`🔄 *Converting ${value} ${fromUnit} to ${toUnit}...*`);

        // Try multiple APIs for conversion
        let result = null;
        let apiUsed = null;

        // API 1: ExchangeRate-API (for currency)
        const currencies = ['usd', 'eur', 'gbp', 'jpy', 'ngn', 'cad', 'aud', 'chf', 'cny', 'inr', 'try', 'rub', 'brl', 'mxn', 'sgd', 'hkd', 'nzd', 'sek', 'nok', 'dkk', 'pln', 'thb', 'idr', 'myr', 'php', 'vnd'];
        
        if (currencies.includes(fromUnit) && currencies.includes(toUnit)) {
          try {
            const currencyApi = `https://api.exchangerate-api.com/v4/latest/${fromUnit.toUpperCase()}`;
            const currencyRes = await axios.get(currencyApi, { timeout: 10000 });
            const rate = currencyRes.data.rates[toUnit.toUpperCase()];
            if (rate) {
              result = value * rate;
              apiUsed = "ExchangeRate-API";
            }
          } catch (err) {
            console.log("ExchangeRate-API failed, trying fallback...");
          }
        }

        // API 2: Frankfurter (another currency API)
        if (!result && currencies.includes(fromUnit) && currencies.includes(toUnit)) {
          try {
            const currencyApi = `https://api.frankfurter.app/latest?from=${fromUnit.toUpperCase()}&to=${toUnit.toUpperCase()}`;
            const currencyRes = await axios.get(currencyApi, { timeout: 10000 });
            const rate = currencyRes.data.rates[toUnit.toUpperCase()];
            if (rate) {
              result = value * rate;
              apiUsed = "Frankfurter API";
            }
          } catch (err) {
            console.log("Frankfurter API failed");
          }
        }

        // API 3: Unit Conversion API (for length, weight, etc.)
        if (!result) {
          try {
            const apiUrl = `https://api.unitconvert.io/v1/convert?value=${value}&from=${encodeURIComponent(fromUnit)}&to=${encodeURIComponent(toUnit)}`;
            const response = await axios.get(apiUrl, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (response.data && response.data.result) {
              result = response.data.result;
              apiUsed = "UnitConvert API";
            }
          } catch (err) {
            console.log("UnitConvert API failed");
          }
        }

        // Local conversions (fallback)
        if (!result) {
          // Temperature conversion
          if ((fromUnit === '°c' || fromUnit === 'c' || fromUnit === 'celsius') && 
              (toUnit === '°f' || toUnit === 'f' || toUnit === 'fahrenheit')) {
            result = (value * 9/5) + 32;
            apiUsed = "Local (Formula)";
          } else if ((fromUnit === '°f' || fromUnit === 'f' || fromUnit === 'fahrenheit') && 
                     (toUnit === '°c' || toUnit === 'c' || toUnit === 'celsius')) {
            result = (value - 32) * 5/9;
            apiUsed = "Local (Formula)";
          } else {
            // Length conversions
            const lengthUnits = {
              km: 1000, m: 1, cm: 0.01, mm: 0.001, mile: 1609.344, yard: 0.9144, ft: 0.3048, in: 0.0254
            };
            // Weight conversions
            const weightUnits = {
              kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495
            };
            
            if (lengthUnits[fromUnit] && lengthUnits[toUnit]) {
              const inMeters = value * lengthUnits[fromUnit];
              result = inMeters / lengthUnits[toUnit];
              apiUsed = "Local (Length)";
            } else if (weightUnits[fromUnit] && weightUnits[toUnit]) {
              const inKg = value * weightUnits[fromUnit];
              result = inKg / weightUnits[toUnit];
              apiUsed = "Local (Weight)";
            }
          }
        }

        if (result !== null && !isNaN(result)) {
          const resultText = `🧮 *CONVERSION RESULT*\n\n` +
            `📊 *${value} ${fromUnit.toUpperCase()}* = *${result.toFixed(4)} ${toUnit.toUpperCase()}*\n` +
            `🔧 *API:* ${apiUsed || 'Tracle-Lite Engine'}\n\n` +
            `⚡ Powered by Tracle-Lite`;

          await conn.sendMessage(from, {
            text: resultText,
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363401559573199@newsletter",
                newsletterName: "BrenaldMedia",
                serverMessageId: -1,
              },
              externalAdReply: {
                title: `${userSettings?.botName || BOT_NAME} Converter`,
                body: `${value} ${fromUnit.toUpperCase()} → ${toUnit.toUpperCase()}`,
                thumbnailUrl: userSettings?.botImage || MENU_IMAGE_URL,
                sourceUrl: REPO_LINK,
                mediaType: 1
              }
            }
          }, { quoted: message });
          
          await m.react('✅');
          return;
        }

        await conn.sendMessage(from, {
          text: `❌ *Conversion not supported*\n\n📊 *${value} ${fromUnit}* to *${toUnit}*\n\n💡 Supported conversions:\n• Currency: USD, EUR, GBP, JPY, NGN, CAD, AUD, etc.\n• Length: km, m, cm, mm, mile, yard, ft, in\n• Weight: kg, g, mg, lb, oz\n• Temperature: °C, °F\n\n⚡ Powered by Tracle-Lite`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363401559573199@newsletter",
              newsletterName: "BrenaldMedia",
              serverMessageId: -1,
            }
          }
        }, { quoted: message });
        
        await m.react('❌');
        return;
      }

      // Regular math calculation
      let expression = input;
      
      // Replace ^ with ** for exponentiation
      expression = expression.replace(/\^/g, '**');
      
      // Replace common math functions
      expression = expression.replace(/sqrt/g, 'Math.sqrt');
      expression = expression.replace(/cbrt/g, 'Math.cbrt');
      expression = expression.replace(/abs/g, 'Math.abs');
      expression = expression.replace(/floor/g, 'Math.floor');
      expression = expression.replace(/ceil/g, 'Math.ceil');
      expression = expression.replace(/round/g, 'Math.round');
      expression = expression.replace(/sin/g, 'Math.sin');
      expression = expression.replace(/cos/g, 'Math.cos');
      expression = expression.replace(/tan/g, 'Math.tan');
      expression = expression.replace(/log/g, 'Math.log10');
      expression = expression.replace(/ln/g, 'Math.log');
      expression = expression.replace(/pi/g, 'Math.PI');
      expression = expression.replace(/π/g, 'Math.PI');
      
      // Handle percentage
      expression = expression.replace(/(\d+)%\s+of\s+(\d+)/g, '($1/100)*$2');
      
      // Evaluate the expression
      let result;
      try {
        result = eval(expression);
      } catch (evalError) {
        return await conn.sendMessage(from, {
          text: `❌ *Invalid expression*\n\n📝 "${input}"\n\n💡 Use proper math syntax.\nExample: ${PREFIX}calc (10 + 5) * 2\n\n⚡ Powered by Tracle-Lite`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363401559573199@newsletter",
              newsletterName: "BrenaldMedia",
              serverMessageId: -1,
            }
          }
        }, { quoted: message });
      }
      
      // Format result
      if (typeof result === 'number') {
        if (Number.isInteger(result)) {
          result = result.toString();
        } else {
          result = result.toFixed(6).replace(/\.?0+$/, '');
        }
      }
      
      const resultText = `🧮 *CALCULATOR*\n\n` +
        `📝 *Expression:* ${input}\n` +
        `✅ *Result:* ${result}\n\n` +
        `⚡ Powered by Tracle-Lite`;
      
      await conn.sendMessage(from, {
        text: resultText,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1,
          },
          externalAdReply: {
            title: `${userSettings?.botName || BOT_NAME} Calculator`,
            body: `${input} = ${result}`,
            thumbnailUrl: userSettings?.botImage || MENU_IMAGE_URL,
            sourceUrl: REPO_LINK,
            mediaType: 1
          }
        }
      }, { quoted: message });
      
      await m.react('✅');

    } catch (error) {
      console.error("❌ Calculator Error:", error.message);
      
      await conn.sendMessage(from, {
        text: `❌ *Calculation Error*\n\n⚠️ ${error.message}\n\n💡 Check your expression and try again.\n\n⚡ Powered by Tracle-Lite`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1,
          }
        }
      }, { quoted: message });
      
      await conn.sendMessage(from, {
        react: { text: "❌", key: message.key }
      }).catch(() => {});
    }
  }
};