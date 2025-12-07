module.exports = {
    pattern: 'stop',
    description: 'Stop all active attacks',
    category: 'bug',
    execute: async (conn, message, m, { reply, sender }) => {
        try {
            let stoppedCount = 0;
            
            // Stop freeze attacks
            if (conn.freezeAttacks && conn.freezeAttacks.size > 0) {
                for (let [target, attack] of conn.freezeAttacks.entries()) {
                    if (attack.sender === sender) {
                        clearInterval(attack.interval);
                        conn.freezeAttacks.delete(target);
                        stoppedCount++;
                        console.log(`Stopped freeze attack on ${target}`);
                    }
                }
            }
            
            // Stop user attacks (from the attack command)
            if (conn.attacks && conn.attacks.size > 0) {
                for (let [target, attack] of conn.attacks.entries()) {
                    if (attack.sender === sender) {
                        clearInterval(attack.interval);
                        conn.attacks.delete(target);
                        stoppedCount++;
                        console.log(`Stopped attack on ${target}`);
                    }
                }
            }

            // Stop any other potential attack types
            if (conn.spamAttacks && conn.spamAttacks.size > 0) {
                for (let [target, attack] of conn.spamAttacks.entries()) {
                    if (attack.sender === sender) {
                        clearInterval(attack.interval);
                        conn.spamAttacks.delete(target);
                        stoppedCount++;
                        console.log(`Stopped spam attack on ${target}`);
                    }
                }
            }

            if (stoppedCount > 0) {
                await reply(`✅ Stopped ${stoppedCount} active attack(s)`);
            } else {
                await reply('❌ No active attacks found that were started by you');
            }
            
        } catch (error) {
            console.error('Error in stop command:', error);
            await reply('❌ Error stopping attacks');
        }
    },
    alias: ['cancel', 'endattack']
};