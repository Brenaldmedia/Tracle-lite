// FILE: commands/pair.js - FIXED VERSION
const fs = require('fs');
const path = require('path');

module.exports = {
    pattern: "pair",
    alias: ["link", "connect", "session", "web"],
    desc: "Get the web link to connect your WhatsApp to bot",
    react: "🔗",
    category: "utility",
    filename: __filename,

    execute: async (conn, mek, m, { from, args, q, reply, sessionId }) => {
        try {
            const userNumber = from.split('@')[0];
            const BOT_NAME = process.env.BOT_NAME || "TRACLE - LITE";
            const APP_URL = process.env.APP_URL || "https://tracle-57a788202c97.herokuapp.com/";
            const MENU_IMAGE_URL = process.env.MENU_IMAGE_URL || "https://files.catbox.moe/m3o9wj.jpg";
            
            // Check if user already has a session - FIXED: Get activeConnections from server properly
            const mainSessionPath = path.join(__dirname, '../sessions', userNumber);
            let isAlreadyConnected = false;
            
            try {
                // Try to get activeConnections from server module
                const serverModule = require('../server');
                if (serverModule && typeof serverModule === 'object') {
                    // Check if activeConnections exists as an export or in the module
                    const activeConnections = serverModule.activeConnections || 
                                               (serverModule.default && serverModule.default.activeConnections);
                    if (activeConnections && typeof activeConnections.has === 'function') {
                        isAlreadyConnected = activeConnections.has(userNumber);
                    }
                }
            } catch (error) {
                console.log('⚠️ Could not check active connections:', error.message);
                // Continue without checking active connections
            }
            
            // Also check if session folder exists
            const sessionExists = fs.existsSync(mainSessionPath);
            
            if (isAlreadyConnected || sessionExists) {
                const statusText = 
                    "┌ ❏ *⌜ ALREADY CONNECTED ⌟* ❏\n│\n" +
                    "├◆ ✅ Your WhatsApp is already connected\n" +
                    "├◆ 📱 Session: Active\n" +
                    "├◆ 🔗 Number: " + userNumber + "\n│\n" +
                    "├◆ 💡 Use .unpair to disconnect\n" +
                    "├◆ 🔗 Web Panel: " + APP_URL + "\n│\n" +
                    "└ ❏\n> 🎭 " + BOT_NAME + " 🎭";
                
                return await conn.sendMessage(from, {
                    text: statusText,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363401559573199@newsletter",
                            newsletterName: "BrenaldMedia",
                            serverMessageId: 200
                        },
                        externalAdReply: {
                            title: "✅ Already Connected",
                            body: "Active Session",
                            thumbnailUrl: MENU_IMAGE_URL,
                            sourceUrl: APP_URL,
                            mediaType: 1,
                            renderLargerThumbnail: false
                        }
                    }
                }, { quoted: mek });
            }
            
            // Show the web pairing instructions
            const pairText = 
                "┌ ❏ *⌜ CONNECT YOUR WHATSAPP ⌟* ❏\n│\n" +
                "├◆ 🌐 *WEB CONNECTION*\n│\n" +
                "├◆ 🔗 Visit this link:\n" +
                "├◆   " + APP_URL + "\n│\n" +
                "├◆ 📱 *Steps to Connect:*\n" +
                "├◆   1. Open the link above\n" +
                "├◆   2. Enter your WhatsApp number\n" +
                "├◆   3. Request pairing code\n" +
                "├◆   4. Start using the bot!\n│\n" +
                "├◆ ⚡ *Features After Connecting:*\n" +
                "├◆   • Auto view status\n" +
                "├◆   • All owner only available\n" +
                "├◆   • Opens view-once\n" +
                "├◆   • Anti-delete\n│\n" +
                "├◆ 💡 *Need Help?*\n" +
                "├◆   Contact: brenaldmedia@gmail.com\n│\n" +
                "└ ❏\n> 🎭 " + BOT_NAME + " 🎭";
            
            await conn.sendMessage(from, {
                text: pairText,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: 200
                    },
                    externalAdReply: {
                        title: "🔗 Connect via Web",
                        body: "Click to open Tracle-Lite",
                        thumbnailUrl: MENU_IMAGE_URL,
                        sourceUrl: APP_URL,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: mek });
            
            // Also send the link as a clickable button/link
            const linkMessage = 
                "📱 *Quick Access Link:*\n\n" +
                "🔗 " + APP_URL + "\n\n" +
                "💡 *Tip:* You can also visit this link:\n" +
                "👉 https://tracle-57a788202c97.herokuapp.com/\n\n" +
                "🎯 Once connected, use `.menu` to see all commands!";
            
            await conn.sendMessage(from, {
                text: linkMessage
            });
            
        } catch (error) {
            console.error('Error in pair command:', error);
            
            const APP_URL = process.env.APP_URL || "https://tracle-57a788202c97.herokuapp.com/";
            const BOT_NAME = process.env.BOT_NAME || "TRACLE - LITE";
            
            const errorText = 
                "┌ ❏ *⌜ CONNECTION ERROR ⌟* ❏\n│\n" +
                "├◆ ❌ Unable to process request\n" +
                "├◆ 💥 Error: " + error.message + "\n│\n" +
                "├◆ 💡 Direct Link:\n" +
                "├◆   " + APP_URL + "\n│\n" +
                "└ ❏\n> 🎭 " + BOT_NAME + " 🎭";
            
            await conn.sendMessage(from, {
                text: errorText,
                contextInfo: {
                    externalAdReply: {
                        title: "❌ Connection Error",
                        body: "Visit link manually",
                        thumbnailUrl: "https://files.catbox.moe/m3o9wj.jpg",
                        sourceUrl: APP_URL,
                        mediaType: 1
                    }
                }
            }, { quoted: mek });
        }
    }
};