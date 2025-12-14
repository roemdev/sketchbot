const { Events, ActivityType } = require('discord.js');
const chalk = require('chalk');
const { database, rcon } = require('../config.json');

const dbService = require('../services/dbService');
const rconService = require('../services/minecraftService');

async function testConnection(fn, label) {
  try {
    await fn();
    return true;
  } catch (err) {
    console.error(chalk.red(`${label} error:`), err.message);
    return false;
  }
}

function setPresence(client) {
  client.user.setPresence({
    activities: [{
      type: ActivityType.Custom,
      name: '🌐 arkania.ddns.net',
    }],
    status: 'online',
  });
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    const line = chalk.gray('='.repeat(50));
    const commandCount = client.commands?.size ?? 'N/A';

    const [dbOk, rconOk] = await Promise.all([
      testConnection(() => dbService.query('SELECT 1'), 'DB'),
      testConnection(() => rconService.sendCommand('list'), 'RCON'),
    ]);

    setPresence(client);

    // Rutas desde config.json
    const dbRoute = `${database.host}:${database.port || 3306}`;
    const rconRoute = `${rcon.host}:${rcon.port}`;

    console.log(`
${line}
${chalk.green.bold(`BOT INICIADO`)} | COMANDOS: ${commandCount}
${line}
Usuario: ${chalk.bold.blue(client.user.tag)} ${chalk.dim(`(${client.user.id})`)}
DB: ${dbOk ? chalk.bold.green('OK') : chalk.bold.red('FAIL')} ${chalk.dim(`(${dbRoute})`)}
RCON: ${rconOk ? chalk.bold.green('OK') : chalk.bold.red('FAIL')} ${chalk.dim(`(${rconRoute})`)}
${line}
`);
  },
};
