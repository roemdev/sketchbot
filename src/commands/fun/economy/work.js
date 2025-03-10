// Archivo principal del comando
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUserBalance, updateUserBalance } = require('../../utilities/userBalanceUtils');
const { checkCooldown, updateCooldown } = require('../../utilities/cooldownUtils');
const assets = require('../../../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trabajos')
    .setDescription('Realiza trabajos para ganar monedas')
    .addStringOption((option) =>
      option
        .setName('trabajo')
        .setDescription('Elige el trabajo que deseas realizar')
        .setAutocomplete(true)
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;
    const connection = interaction.client.dbConnection;

    try {
      const [rows] = await connection.query(
        'SELECT name FROM curr_work_config WHERE status = 1 ORDER BY name'
      );
      const choices = rows.map((row) => ({ name: row.name, value: row.name }));
      await interaction.respond(choices);
    } catch (error) {
      console.error('Error en el autocompletado de /trabajos:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const workName = interaction.options.getString('trabajo');

    try {
      const [works] = await connection.query(
        'SELECT id, name, emoji, min, max, message, status, cooldown FROM curr_work_config WHERE name = ?',
        [workName]
      );

      if (works.length === 0 || !works[0].status) {
        return interaction.reply({ content: 'Trabajo inválido o desactivado.', flags: MessageFlags.Ephemeral });
      }

      const work = works[0];
      const actionId = work.id;
      const actionType = 'job';
      const cooldownDuration = work.cooldown * 1000;

      // Verificar cooldown
      const { onCooldown, remainingTime, timestamp, currentTimeUTC } = await checkCooldown(
        connection,
        userId,
        actionId,
        actionType,
        cooldownDuration
      );

      if (onCooldown) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.yellow)
              .setTitle(`${assets.emoji.timeleft} Cooldown activo`)
              .setDescription(`Debes esperar <t:${timestamp}:R> antes de volver a realizar este trabajo.`),
          ],
        });
      }

      const profit = Math.floor(Math.random() * (work.max - work.min + 1)) + work.min;
      await updateUserBalance(connection, userId, profit);

      // Actualizar o insertar cooldown
      await updateCooldown(connection, userId, actionId, actionType, currentTimeUTC);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle(`${work.emoji} Jornada completada`)
            .setDescription(work.message.replace('{profit}', `**⏣${profit.toLocaleString()}**`).replace('{job}', `**${work.name}**`))
        ]
      });
    } catch (error) {
      console.error('Error al ejecutar /trabajos:', error);
      return interaction.reply({
        content: 'Hubo un problema al realizar el trabajo. Por favor, reporta este error.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
