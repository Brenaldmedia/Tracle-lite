// lib/isAdmin.js
async function isAdmin(conn, groupId, userId) {
    try {
        const metadata = await conn.groupMetadata(groupId);
        const participant = metadata.participants.find(p => p.id === userId);
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

module.exports = isAdmin;