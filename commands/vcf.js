const fs = require('fs');
const path = require('path');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363401559573199@newsletter',
            newsletterName: 'TRACLE - LITE',
            serverMessageId: -1
        }
    }
};

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    pattern: "vcf",
    desc: "Save all group contacts to a VCF file (Owner only)",
    category: "group",
    react: "📞",
    filename: __filename,
    use: "<group message>",

    execute: async (conn, message, m, { from, sender }) => {
        try {
            // Check if it's a group
            const isGroup = from.endsWith('@g.us');
            if (!isGroup) {
                await conn.sendMessage(from, { 
                    text: '❌ This command is for groups only.',
                    ...channelInfo
                });
                return;
            }

            // Check if sender is owner
            const ownerNumbers = ["2348125101930", "2348150221529"];
            let isOwner = false;
            let senderNumber = sender.split('@')[0].replace(/\D/g, '');
            
            for (const ownerNum of ownerNumbers) {
                const cleanOwnerNum = ownerNum.replace(/\D/g, '');
                if (senderNumber.includes(cleanOwnerNum) || cleanOwnerNum.includes(senderNumber)) {
                    isOwner = true;
                    break;
                }
            }
            
            if (message.key?.fromMe) isOwner = true;
            
            if (!isOwner) {
                await conn.sendMessage(from, { 
                    text: '❌ This command can be used only by my owner!',
                    ...channelInfo
                });
                return;
            }

            // React to message
            if (module.exports.react) {
                try { 
                    await conn.sendMessage(from, { 
                        react: { text: module.exports.react, key: message.key } 
                    }); 
                } catch(e) {}
            }

            // Send processing message
            await conn.sendMessage(from, {
                text: `📞 Saving group contacts...`,
                ...channelInfo
            });

            // Get group metadata
            const groupMetadata = await conn.groupMetadata(from);
            const participants = groupMetadata.participants;
            
            if (!participants || participants.length === 0) {
                await conn.sendMessage(from, {
                    text: '❌ Unable to fetch group participants.',
                    ...channelInfo
                });
                return;
            }

            let vcard = '';
            let successfulContacts = 0;
            
            // FIRST, let's try to get ALL chat contacts to find real numbers
            console.log(`\n🔍 DEBUG: Processing ${participants.length} participants`);
            
            for (let participant of participants) {
                try {
                    console.log(`\n🔍 Processing: ${participant.id}`);
                    
                    let phoneNumber = '';
                    let contactName = '';
                    
                    // =============== METHOD 1: Extract from JID ===============
                    // WhatsApp JID formats:
                    // 1. 2348125101930@s.whatsapp.net (standard)
                    // 2. 2348125101930:0@s.whatsapp.net (with device)
                    // 3. XYZ123@lid (Linked Device ID)
                    
                    if (participant.id.includes('@s.whatsapp.net')) {
                        // Standard WhatsApp JID
                        let baseJid = participant.id.split('@')[0];
                        
                        // Handle device suffix (e.g., :0, :1, :2)
                        if (baseJid.includes(':')) {
                            phoneNumber = baseJid.split(':')[0];
                        } else {
                            phoneNumber = baseJid;
                        }
                        
                        console.log(`📱 Method 1: Standard JID -> ${phoneNumber}`);
                        
                    } else if (participant.id.includes('@lid')) {
                        // Linked Device ID - we need to resolve this
                        console.log(`🔗 Found LID: ${participant.id}`);
                        
                        // Try to get user info from the connection
                        try {
                            // First try to get business profile
                            const userInfo = await conn.getBusinessProfile(participant.id).catch(() => null);
                            if (userInfo?.business_name) {
                                contactName = userInfo.business_name;
                                console.log(`🏢 Business name: ${contactName}`);
                            }
                        } catch (e) {}
                        
                        // For LID, we can't get the phone number directly
                        // We'll skip these or mark them differently
                        phoneNumber = participant.id.split('@')[0];
                        console.log(`⚠️ LID detected, using ID as placeholder: ${phoneNumber}`);
                        
                    } else {
                        phoneNumber = participant.id;
                        console.log(`❓ Unknown JID format: ${participant.id}`);
                    }
                    
                    // Clean phone number
                    phoneNumber = phoneNumber.replace(/\D/g, '');
                    
                    // =============== METHOD 2: Try to resolve LID to real number ===============
                    if (phoneNumber.length > 15 || !/^[0-9]+$/.test(phoneNumber)) {
                        console.log(`⚠️ Invalid phone number format: ${phoneNumber}`);
                        
                        // Try to get contact info another way
                        try {
                            // Use conn.fetchBlocklist or conn.fetchStatus to get more info
                            const contactQuery = participant.id;
                            
                            // Try to get from presence
                            await conn.presenceSubscribe(participant.id).catch(() => {});
                            await sleep(500);
                            
                            // Try to get from profile
                            const profile = await conn.profilePictureUrl(participant.id, 'image').catch(() => null);
                            if (profile) {
                                console.log(`📸 Has profile picture`);
                            }
                            
                        } catch (e) {}
                        
                        // Skip invalid numbers
                        continue;
                    }
                    
                    // =============== FORMAT PHONE NUMBER ===============
                    let formattedPhone = phoneNumber;
                    
                    // Check if it looks like a WhatsApp number
                    // WhatsApp numbers are usually 10-15 digits
                    if (phoneNumber.length >= 10 && phoneNumber.length <= 15) {
                        
                        // Fix common issues:
                        // 1. Remove extra digits (like 212472602595384 -> should be 234...)
                        // 2. Ensure proper country code
                        
                        // If number is too long (>12 digits), it's probably wrong
                        if (phoneNumber.length > 12) {
                            // Try to extract the last 10-12 digits
                            formattedPhone = phoneNumber.slice(-12);
                            console.log(`✂️ Trimmed long number: ${phoneNumber} -> ${formattedPhone}`);
                        }
                        
                        // Ensure it starts with country code
                        if (!formattedPhone.startsWith('234') && formattedPhone.length === 10) {
                            // Assume Nigerian number starting with 0
                            if (formattedPhone.startsWith('0')) {
                                formattedPhone = '234' + formattedPhone.substring(1);
                                console.log(`🇳🇬 Added Nigeria code: ${formattedPhone}`);
                            }
                        }
                        
                        // Final validation
                        if (formattedPhone.startsWith('234') && formattedPhone.length >= 13) {
                            // Good Nigerian number
                            console.log(`✅ Valid Nigerian number: ${formattedPhone}`);
                        } else if (formattedPhone.startsWith('1') && formattedPhone.length >= 10) {
                            // US/Canada number
                            console.log(`🇺🇸 US/Canada number: ${formattedPhone}`);
                        } else {
                            console.log(`❓ Unusual number format: ${formattedPhone}`);
                        }
                        
                    } else {
                        console.log(`❌ Invalid length: ${phoneNumber} (${phoneNumber.length} digits)`);
                        continue;
                    }
                    
                    // =============== GET CONTACT NAME ===============
                    if (!contactName) {
                        // Try multiple sources for name
                        const nameSources = [
                            participant.name,
                            participant.notify,
                            participant.pushname,
                            participant.verifiedName
                        ];
                        
                        for (const source of nameSources) {
                            if (source && source.trim() !== '' && source !== phoneNumber) {
                                contactName = source;
                                break;
                            }
                        }
                        
                        // If still no name, create generic one
                        if (!contactName || contactName.trim() === '') {
                            contactName = `WhatsApp User ${successfulContacts + 1}`;
                        }
                    }
                    
                    // Clean name for VCF
                    contactName = contactName.trim();
                    
                    // =============== CREATE VCF ENTRY ===============
                    vcard += `BEGIN:VCARD\n`;
                    vcard += `VERSION:3.0\n`;
                    vcard += `FN:${contactName}\n`;
                    vcard += `TEL;TYPE=CELL:+${formattedPhone}\n`;
                    vcard += `NOTE:From ${groupMetadata.subject} WhatsApp Group\n`;
                    vcard += `END:VCARD\n\n`;
                    
                    successfulContacts++;
                    
                    console.log(`✅ Saved: ${contactName} - +${formattedPhone}`);
                    
                    // Small delay to avoid rate limiting
                    await sleep(100);
                    
                } catch (contactError) {
                    console.error('❌ Error with participant:', participant.id, contactError);
                }
            }
            
            // =============== CREATE AND SEND VCF FILE ===============
            if (successfulContacts === 0) {
                await conn.sendMessage(from, {
                    text: '❌ No valid contacts could be extracted from this group.',
                    ...channelInfo
                });
                return;
            }
            
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            // Create safe filename
            const groupName = groupMetadata.subject || 'WhatsApp_Group';
            const safeGroupName = groupName
                .replace(/[^\w\s\-]/g, '')
                .replace(/\s+/g, '_')
                .substring(0, 40);
            
            const timestamp = Date.now().toString().slice(-6);
            const fileName = `${safeGroupName}_${timestamp}.vcf`;
            const filePath = path.join(tempDir, fileName);
            
            // Write VCF file
            fs.writeFileSync(filePath, vcard.trim());
            
            console.log(`\n📊 SUMMARY:`);
            console.log(`✅ Group: ${groupMetadata.subject}`);
            console.log(`✅ Participants: ${participants.length}`);
            console.log(`✅ Contacts saved: ${successfulContacts}`);
            console.log(`✅ File: ${fileName}`);
            
            // Send the VCF file
            await conn.sendMessage(from, {
                document: fs.readFileSync(filePath), 
                mimetype: 'text/vcard', 
                fileName: fileName, 
                caption: `✅ *WhatsApp Group Contacts*\n\n` +
                        `📱 *Group:* ${groupMetadata.subject}\n` +
                        `👥 *Total members:* ${participants.length}\n` +
                        `📞 *Contacts saved:* ${successfulContacts}\n` +
                        `📁 *File:* ${fileName}\n\n` +
                        `> © Saved by *TRACLE - LITE* 💜\n` +
                        `> Import to your phone contacts`,
                ...channelInfo
            }, { 
                quoted: message 
            });

            // Cleanup
            if (fs.existsSync(filePath)) {
                setTimeout(() => fs.unlinkSync(filePath), 5000);
            }

        } catch (error) {
            console.error('❌ Savecontact error:', error);
            await conn.sendMessage(from, {
                text: `❌ Error: ${error.message}\n\nPlease try again or contact support.`,
                ...channelInfo
            });
        }
    }
};