const Discord = require("discord.js");

module.exports = {
    name: 'votemute',
    description: 'Call a vote to mute a given user.',
    aliases: ['votemute', 'vm'],
    cooldown: 10,
    args: true,
    usage: '<userToMute>',
    async execute(message, args) {

        let userId = args[0].replace(/\D/g, '');
        let userToMute = message.mentions.members.first();
        let muteRole = message.guild.roles.cache.find(r => r.name === "muted");

        if (userToMute.user.bot) {
            message.channel.send('no.');
            return;
        }

        if (userToMute.roles.cache.has(muteRole.id)) {
            message.channel.send(new Discord.MessageEmbed().setColor('#FA1111').setTitle('Muted').setDescription(`<@${userId}> is already muted.`));
            return;
        }


        const embed = new Discord.MessageEmbed().setColor('#AAAA11').setTitle('Vote to Mute').setDescription(`Should <@${userId}> be muted?`);

        let rMessage = await message.channel.send(embed);

        rMessage.react('👍').then(() => rMessage.react('👎'));

        const filter = (reaction, user) => {
            return ['👍', '👎'].includes(reaction.emoji.name) && user.id !== userToMute.id;
        };

        const collector = rMessage.createReactionCollector(filter, { time: 10000 });


        collector.on('collect', (reaction, user) => {
            console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
        });

        collector.on('end', collected => {
            const upvote = collected.get('👍');
            const downvote = collected.get('👎');

            const upvotes = upvote ? upvote.count - 1 : 0;
            const downvotes = downvote ? downvote.count - 1 : 0;

            console.log(upvote);

            if (upvotes > downvotes && ((upvotes + downvotes) > 2)) {
                console.log('VOTE PASSED');

                rMessage.edit(new Discord.MessageEmbed().setColor('#11FA11').setTitle('Vote Passed').setDescription(`<@${userId}> has been muted for 5 minutes!`));

                userToMute.roles.add(muteRole).catch(console.error);

                setTimeout(function() {
                    userToMute.roles.remove(muteRole).catch(console.error);
                    console.log('USER UNMUTED');
                }, (5 * 60000));
            } else {
                console.log('VOTE FAILED');
                rMessage.edit(new Discord.MessageEmbed().setColor('#FA1111').setTitle('Vote Failed').setDescription(`<@${userId}> has not been muted.`));
            }

            rMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));

        });

        

    },
};