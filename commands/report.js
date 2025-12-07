const nodemailer = require("nodemailer");

module.exports = {
    pattern: "report",
    desc: "Report a bug or request a feature",
    category: "utility",
    filename: __filename,
    use: ".report <message>",

    execute: async (conn, mek, m, { from, args, q, reply }) => {
        try {
            const message = q || args.join(" ");
            if (!message) {
                return reply("Example: .report Play command is not working");
            }

            // Use mek.key.id instead of m.key.id
            const reportedMessages = {};
            const messageId = mek.key.id;

            if (reportedMessages[messageId]) {
                return reply("⚠️ This report has already been sent. Please wait for a response.");
            }
            reportedMessages[messageId] = true;

            // Prepare report text
            const reportText = `
*| REQUEST / BUG REPORT |*

👤 User: @${m.sender.split("@")[0]}
💬 Message: ${message}
            `;

            // === Email Transporter (TRACLE) ===
            let transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "brenaldmedia@gmail.com", 
                    pass: "kfms ptdp zpes hsdg "  
                }
            });

            // === Send Email ===
            await transporter.sendMail({
                from: `"TRACLE Bot" <brenaldmedia@gmail.com>`,
                to: "brenaldmedia@gmail.com",
                subject: "New Bug Report / Feature Request - TRACLE",
                text: reportText
            });

            // Confirmation to user - use m.pushName which should work
            const userName = m.pushName || "User";
            reply(`✅ Hi ${userName}, your report has been sent to the developer's email. Please wait for a response.`);

        } catch (error) {
            console.error(error);
            reply("❌ An error occurred while processing your report.");
        }
    }
};