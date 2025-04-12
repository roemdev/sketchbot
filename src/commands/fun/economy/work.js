const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUserBalance, updateUserBalance } = require('./utils/userBalanceUtils');
const { checkCooldown, updateCooldown } = require('./utils/cooldownUtils');
const assets = require('../../../../config/assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trabajo')
    .setDescription('Realiza trabajos para ganar monedas'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;

    try {
      const [jobs] = await connection.query(
        'SELECT id, name, min_coins, max_coins, cooldown, description FROM curr_jobs WHERE id = 7'
      );

      if (jobs.length === 0) {
        return interaction.reply({ content: 'Trabajo no disponible.', flags: MessageFlags.Ephemeral });
      }

      const job = jobs[0];
      const actionId = job.id;
      const actionType = 'job';
      const cooldownDuration = job.cooldown * 1000;

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
              .setDescription(`Podrás volver a trabajar <t:${timestamp}:R>.`),
          ],
        });
      }

      const profit = Math.floor(Math.random() * (job.max_coins - job.min_coins + 1)) + job.min_coins;
      await updateUserBalance(connection, userId, profit);
      await updateCooldown(connection, userId, actionId, actionType, currentTimeUTC);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setDescription(job.description.replace('{profit}', `${profit.toLocaleString()}`)),
        ],
      });
    } catch (error) {
      console.error('Error al ejecutar /trabajos:', error);
      return interaction.reply({
        content: 'Hubo un problema al realizar el trabajo. Por favor, reporta este error.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
