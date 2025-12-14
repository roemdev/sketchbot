const { Events, ActivityType } = require('discord.js');
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
    await rconService.sendCommand('list');
    return true;
  } catch (error) {
    console.error(chalk.red('Error RCON:'), error.message);
    return false;
  }
}

// 🔁 Función para actualizar el estado con miembros
function updatePresence(client) {
  const guild = client.guilds.cache.first();
  const memberCount = guild?.memberCount ?? 0;

  client.user.setPresence({
    activities: [{
      type: ActivityType.Custom,
      name: 'Custom Status',
      state: `¡👥 Somos ${memberCount} miembros!`,
    }],
    status: 'online',
  });
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

    // Estado inicial
    try {
      updatePresence(client);
    } catch (error) {
      console.error(chalk.red('Error al establecer la presencia:'), error);
    }

    // 🔔 Cuando entra alguien
    client.on(Events.GuildMemberAdd, () => {
      updatePresence(client);
    });

    // 🔕 Cuando sale alguien
    client.on(Events.GuildMemberRemove, () => {
      updatePresence(client);
    });

    // Logs de inicio
    console.log(
      '\n' +
      line + '\n' +
      chalk.green.bold('🤖 BOT INICIADO CORRECTAMENTE') + '\n\n' +

      chalk.cyan('📛 Usuario: ') +
      chalk.white.bold(client.user.tag) + '\n' +

      chalk.cyan('🆔 ID: ') +
      chalk.white(client.user.id) + '\n' +

      chalk.cyan('📡 Servidores: ') +
      chalk.white(client.guilds.cache.size) + '\n' +

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
