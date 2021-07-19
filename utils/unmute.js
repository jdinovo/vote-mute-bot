
module.exports = {
    all() { 
        // get muted role

        global.bot.guilds.cache.forEach(guild => {
            let muted = guild.roles.cache.find(r => r.name === "muted");
            // get all members who currently have the role
            let roleMembers = muted.members;

            // remove role from anyone who currently has it 
            roleMembers.each(member => {
                member.roles.remove(muted);
            });
            console.log(guild);
        });

        
    }
}