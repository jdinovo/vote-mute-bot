const Discord = require("discord.js");

module.exports = {
    name: 'votemute',
    description: 'Call a vote to mute a given user.',
    aliases: ['votemute', 'vm'],
    cooldown: 20,
    args: true,
    usage: '<userToMute>',
    async execute(message, args) {

        let activeUsers = activeServers[message.guild.id];
        const minVotesRequired = Math.ceil(activeUsers.size * 0.6);

        let userId = args[0].replace(/\D/g, '');
        let userToMute = await message.guild.members.fetch(userId).catch(console.error);
        let muteRole = message.guild.roles.cache.find(r => r.name === "muted");

        if (userId === '' || !userToMute) {
            message.channel.send('Invalid user given.');
            return;
        }
        if (userToMute.user.bot) {
            message.channel.send('You can\'t mute bots.');
            return;
        }
        if (!muteRole) {
            message.channel.send('Please create a `muted` role. ' +
            'Ensure this role does not have `send messages` permissions in any channel.');
            return;
        }
        if (userToMute.roles.cache.has(muteRole.id)) {
            message.channel.send(new Discord.MessageEmbed().setColor('#FA1111').setTitle('Muted').setDescription(`<@${userId}> is already muted.`));
            return;
        }

        const embed = new Discord.MessageEmbed().setColor('#DDDD22').setTitle('Vote to Mute').setDescription(`Should <@${userId}> be muted?`);

        let rMessage = await message.channel.send(embed);

        rMessage.react('👍').then(() => rMessage.react('👎'));

        const filter = (reaction, user) => {
            return ['👍', '👎'].includes(reaction.emoji.name) && !user.bot;
        };

        const collector = rMessage.createReactionCollector(filter, { dispose: true, time: 25000 });

        let upvotes = 0;
        let downvotes = 0;

        collector.on('collect', (reaction, user) => {
            switch(reaction.emoji.name) {
                case '👍':
                    upvotes++;
                    break;
                case '👎':
                    downvotes++;
                    break;
                default:
                    break;
            }

            console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
        });

        collector.on('remove', (reaction, user) => {
            switch(reaction.emoji.name) {
                case '👍':
                    if(upvotes > 0)
                        upvotes--;
                    break;
                case '👎':
                    if (downvotes > 0)
                        downvotes--;
                    break;
                default:
                    break;
            }

            console.log(`Removed ${reaction.emoji.name} from ${user.tag}`);
        });

        collector.on('end', collected => {

            const minVoteRequirement = ((upvotes + downvotes) >= minVotesRequired);

            console.log('Up: ', upvotes);
            console.log('Down: ', downvotes);

            if (upvotes > downvotes && minVoteRequirement) {
                console.log('VOTE PASSED');
                // 30 min max
                const maxTime = 30 * 60;
                let muteTime = (upvotes >= activeUsers.size && downvotes < 1) ? maxTime : (maxTime * Math.pow((Math.abs(upvote - downvotes)/activeUsers.size), 2));

                // cap at max
                muteTime = (muteTime > maxTime) ? maxTime : muteTime;

                rMessage.edit(new Discord.MessageEmbed().setColor('#11FA11').setTitle('Vote Passed')
                                .setDescription(`<@${userId}> has been muted for ${muteTime > 60 ? Math.floor(muteTime / 60) + ' minute(s)' : muteTime + ' seconds(s)'}!`)
                                .addField('Results', `Yes: ${upvotes} No: ${downvotes}`));

                userToMute.roles.add(muteRole).catch(console.error);

                setTimeout(function() {
                    userToMute.roles.remove(muteRole).catch(console.error);
                    console.log('USER UNMUTED');
                }, muteTime * 1000);
            } else {
                console.log('VOTE FAILED');
                const failEmbed = new Discord.MessageEmbed().setColor('#FA1111').setTitle('Vote Failed').setDescription(`<@${userId}> has not been muted.`);
                if (!minVoteRequirement) {
                    failEmbed.addField('Reason', `Not enough votes. (min. ${minVotesRequired})`);
                } else {
                    failEmbed.addField('Reason', `Yes: ${upvotes} No: ${downvotes}`);
                }

                rMessage.edit(failEmbed);
            }

            rMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));

        });

        

    },
};