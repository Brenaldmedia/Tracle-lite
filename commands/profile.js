module.exports = {
    pattern: "profile",
    desc: "Get complete user profile information",
    category: "utility",
    filename: __filename,
    use: ".profile [@tag or reply]",

    execute: async (conn, mek, m, { from, sender, isGroup, reply, quoted, participants }) => {
        try {
            // Send loading reaction
            await conn.sendMessage(from, { 
                react: { text: "👤", key: mek.key } 
            });

            // 1. DETERMINE TARGET USER - FIXED REPLY DETECTION
            let userJid = sender; // Default to sender
            
            // Check if message is a reply - FIXED
            if (mek.message?.extendedTextMessage?.contextInfo?.participant) {
                userJid = mek.message.extendedTextMessage.contextInfo.participant;
            } else if (quoted?.sender) {
                userJid = quoted.sender;
            }
            
            // Check if message mentions someone
            if (mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                userJid = mek.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }

            // 2. GET PROFILE PICTURE
            let ppUrl;
            try {
                ppUrl = await conn.profilePictureUrl(userJid, 'image');
            } catch {
                ppUrl = 'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png';
            }

            // 3. GET USER PUSHNAME - FIXED
            let userName = "Unknown";
            let userNumber = userJid.split('@')[0];
            
            try {
                // Get contact info - this should give pushname
                const contact = await conn.contactDB?.get(userJid).catch(() => null);
                if (contact?.name) {
                    userName = contact.name;
                } else {
                    // Try to load the contact directly
                    try {
                        const contactInfo = await conn.getContact(userJid);
                        userName = contactInfo?.pushname || contactInfo?.name || userNumber;
                    } catch {
                        userName = userNumber;
                    }
                }
                
                // If in group, try to get participant notify name
                if (isGroup && participants) {
                    const member = participants.find(p => p.id === userJid);
                    if (member?.notify) {
                        userName = member.notify;
                    }
                }
            } catch (e) {
                console.log("Name fetch error:", e);
                userName = userNumber;
            }

            // 4. GET GROUP ROLE - FIXED
            let groupRole = "";
            if (isGroup && participants) {
                const participant = participants.find(p => p.id === userJid);
                if (participant) {
                    groupRole = participant.admin ? "👑 Admin" : "👥 Member";
                }
            }

            // 5. GET BIO/ABOUT
            let bioText = "No bio available";
            try {
                const statusData = await conn.fetchStatus(userJid).catch(() => null);
                if (statusData?.status) {
                    bioText = statusData.status;
                } else {
                    const businessProfile = await conn.getBusinessProfile(userJid).catch(() => null);
                    if (businessProfile?.description) {
                        bioText = businessProfile.description;
                    }
                }
            } catch (e) {
                console.log("Bio fetch error:", e);
            }

            // 6. FORMAT OUTPUT
            const userInfo = `
*👤 USER PROFILE INFORMATION*

📛 *Name:* ${userName}
🔢 *Number:* ${userNumber}
${groupRole ? `🎭 *Group Role:* ${groupRole}` : ''}

*📝 About:*
${bioText}

━━━━━━━━━━━━━━━━━━━━━━
> 🔍 Powered by BrenaldMedia
            `.trim();

            // 7. SEND RESULT
            await conn.sendMessage(from, {
                image: { url: ppUrl },
                caption: userInfo,
                mentions: [userJid]
            }, { quoted: mek });

        } catch (e) {
            console.error("❌ Profile command error:", e);
            await conn.sendMessage(from, { 
                react: { text: "❌", key: mek.key } 
            });
            reply(`❌ Error: ${e.message || "Failed to fetch profile"}`);
        }
    }
};