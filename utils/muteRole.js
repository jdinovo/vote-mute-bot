guild.roles.create({ data: { name: 'muted', permissions: [] } });

channel.updateOverwrite(channel.guild.roles.everyone, { VIEW_CHANNEL: false });