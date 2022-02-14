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

        if (userId === '' || !userToMute) {
            message.channel.send({content:'Invalid user given.'});
            return;
        }
        if (userToMute.user.bot) {
            message.channel.send({content:'You can\'t mute bots.'});
            return;
        }
        if (userToMute.isCommunicationDisabled()) {
            message.channel.send({embeds:[new Discord.MessageEmbed().setColor('#FA1111').setTitle('Muted').setDescription(`<@${userId}> is already muted.`)]});
            return;
        }

        const embed = new Discord.MessageEmbed().setColor('#DDDD22').setTitle('Vote to Mute').setDescription(`Should <@${userId}> be muted?`) //.addField('Results', `Yes: ${upvotes} No: ${downvotes}`);

        const row = new Discord.MessageActionRow()
			.addComponents(
				new Discord.MessageButton()
					.setCustomId('yes')
					.setLabel('Yes')
					.setStyle('SUCCESS'),
                new Discord.MessageButton()
                    .setCustomId('no')
                    .setLabel('No')
                    .setStyle('DANGER')
			);

        let rMessage = await message.channel.send({ embeds: [embed], components: [row] });

        const filter = i => i.customId === 'yes' || i.customId === 'no';

        const collector = rMessage.createMessageComponentCollector({ filter, time: 25000 });

        let upvotes = 0;
        let downvotes = 0;
        let votedIds = {};

        collector.on('collect', async i => {
            
            switch(i.customId) {
                case 'yes':
                    if(!votedIds.hasOwnProperty(i.user.id)) {
                        upvotes++;
                    } else if (votedIds.hasOwnProperty(i.user.id) && votedIds[i.user.id] === 'no') {
                        downvotes--;
                        upvotes++;
                    }
                    break;
                case 'no':
                    if(!votedIds.hasOwnProperty(i.user.id)) {
                        downvotes++;
                    } else if (votedIds.hasOwnProperty(i.user.id) && votedIds[i.user.id] === 'yes') {
                        upvotes--;
                        downvotes++;
                    }
                    break;
                default:
                    break;
            }
            votedIds[i.user.id] = i.customId;
            let updatedEmbed = new Discord.MessageEmbed().setColor('#DDDD22').setTitle('Vote to Mute').setDescription(`Should <@${userId}> be muted?`).addField('Tally', `Yes: ${upvotes} No: ${downvotes}`);
            i.update({ embeds: [updatedEmbed], components: [row] });
        });

        collector.on('end', collected => {

            const minVoteRequirement = ((upvotes + downvotes) >= minVotesRequired);

            console.log('Up: ', upvotes);
            console.log('Down: ', downvotes);

            if (upvotes > downvotes && minVoteRequirement) {
                console.log('VOTE PASSED');
                // 30 min max
                const maxTime = 30 * 60;
                let muteTime = (upvotes >= activeUsers.size && downvotes < 1) ? maxTime : (maxTime * Math.pow((upvotes/(upvotes + downvotes)), 2));
                console.log(`MUTING USER ${userId} : YES (${upvotes}) NO (${downvotes}) Active Users (${activeUsers.size})`);

                // cap at max
                muteTime = (muteTime > maxTime) ? maxTime : muteTime;

                rMessage.edit({embeds: [new Discord.MessageEmbed().setColor('#11FA11').setTitle('Vote Passed')
                                .setDescription(`<@${userId}> has been muted for ${muteTime > 60 ? Math.floor(muteTime / 60) + ' minute(s)' : muteTime + ' seconds(s)'}!`)
                                .addField('Results', `Yes: ${upvotes} No: ${downvotes}`)], components: []});

                userToMute.timeout(muteTime * 1000, `Vote Muted. Yes: ${upvotes} No: ${downvotes}`)
                .then(() => {
                    console.log('USER IN TIMEOUT')

                })
                .catch(() => {
                    console.error
                    message.channel.send({content: "Failed to mute user! Please ensure bot has `Timeout Members` permission."});
                });

            } else {
                console.log('VOTE FAILED');
                const failEmbed = new Discord.MessageEmbed().setColor('#FA1111').setTitle('Vote Failed').setDescription(`<@${userId}> has not been muted.`);
                if (!minVoteRequirement) {
                    failEmbed.addField('Reason', `Not enough votes. (min. ${minVotesRequired})`);
                } else {
                    failEmbed.addField('Results', `Yes: ${upvotes} No: ${downvotes}`);
                }

                rMessage.edit({embeds: [failEmbed], components: []});
            }

        });

    },
};