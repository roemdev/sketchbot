const { Events } = require('discord.js');
const chalk = require('chalk');

const dbService = require('../services/dbService');
const rconService = require('../services/minecraftService');

async function testDbConnection() {
  try {
    await dbService.query('SELECT 1 + 1 AS solution');
    return true;
  } catch (error) {
    console.error(chalk.red('Error DB:'), error.message);
    return false;
  }
}

async function testRconConnection() {
  try {
    const response = await rconService.sendCommand('list');
    return true;
  } catch (error) {
    console.error(chalk.red('Error RCON:'), error.message);
    return false;
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    const line = chalk.gray('─'.repeat(50));

    const commandCount = client.commands ? client.commands.size : 'No disponible';

    const [dbSuccess, rconSuccess] = await Promise.all([
      testDbConnection(),
      testRconConnection()
    ]);

    const dbStatus = dbSuccess ? '✅ Éxito' : '❌ Fallida';
    const rconStatus = rconSuccess ? '✅ Éxito' : '❌ Fallida';

    console.log(
      '\n' +
      line + '\n' +
      chalk.green.bold('🤖 BOT INICIADO CORRECTAMENTE') + '\n\n' +

      chalk.cyan('📛 Usuario: ') +
      chalk.white.bold(client.user.tag) + '\n' +

      chalk.cyan('🆔 ID: ') +
      chalk.white(client.user.id) + '\n' +

      chalk.cyan('💻 Comandos: ') +
      chalk.white(commandCount) + '\n' +

      chalk.yellow('💾 Conexión DB: ') +
      (dbSuccess ? chalk.green.bold(dbStatus) : chalk.red.bold(dbStatus)) + '\n' +

      chalk.magenta('🎮 Conexión RCON: ') +
      (rconSuccess ? chalk.green.bold(rconStatus) : chalk.red.bold(rconStatus)) + '\n' +

      line + '\n'
    );
  },
};