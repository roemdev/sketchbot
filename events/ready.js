const { Events, ActivityType } = require('discord.js');
const chalk = require('chalk');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    client.user.setPresence({
      activities: [{ type: ActivityType.Custom, name: 'ARKANIA 💖' }],
      status: 'online',
    });

    console.log(chalk.green(`✅ [ONLINE] Bot conectado como ${chalk.bold(client.user.tag)}`));
  },
};