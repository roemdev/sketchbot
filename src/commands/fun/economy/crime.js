const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUserBalance, updateUserBalance } = require('./utils/userBalanceUtils');
const assets = require('../../../../config/assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crimenes')
    .setDescription('Comete un crimen y prueba tu suerte')
    .addStringOption((option) =>
      option
        .setName('crimen')
        .setDescription('Elige el crimen que vas a cometer')
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName('usuario')
        .setDescription('El usuario contra el que deseas cometer el crimen')
        .setRequired(false)
    ),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;
    const connection = interaction.client.dbConnection;

    try {
      const [rows] = await connection.query(
        'SELECT name, is_active, failrate FROM curr_crime_config WHERE is_active = 1 ORDER BY failrate'
      );
      const choices = rows.map((row) => ({ name: row.name, value: row.name }));
      await interaction.respond(choices);
    } catch (error) {
      console.error('Error en el autocompletado de /crimenes:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const crimeName = interaction.options.getString('crimen');
    const target = interaction.options.getUser('usuario');

    try {
      const [crimes] = await connection.query(
        'SELECT name, emoji, failrate, profit, fine, req_user, success_msg, fail_msg, is_active FROM curr_crime_config WHERE name = ?',
        [crimeName]
      );

      if (crimes.length === 0 || !crimes[0].is_active) {
        return interaction.reply({ content: 'Crimen inválido o desactivado.', flags: MessageFlags.Ephemeral });
      }

      const crime = crimes[0];
      const userBalance = await getUserBalance(connection, userId);

      if (userBalance <= 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.yellow)
              .setTitle(`${assets.emoji.warn} Sin balance`)
              .setDescription('Debes tener balance para cometer crímenes.')
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!target && crime.req_user == 1) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.yellow)
              .setTitle(`${assets.emoji.warn} Falta el usuario objetivo`)
              .setDescription('Debes especificar un usuario objetivo para este crimen.')
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      // Determinar si el crimen es exitoso o falla
      const success = Math.random() * 100 >= crime.failrate;
      const profit = Math.floor((crime.profit / 100) * userBalance);
      const fine = Math.floor((crime.fine / 100) * userBalance);

      if (success) {
        await updateUserBalance(connection, userId, profit);
        if (target) await updateUserBalance(connection, target.id, -profit);

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.green)
              .setTitle(`${crime.emoji} ${crimeName} exitoso`)
              .setDescription(
                target
                  ? crime.success_msg.replace('{user}', `<@${target.id}>`).replace('{profit}', `**⏣${profit.toLocaleString()}**`)
                  : crime.success_msg.replace('{profit}', `**⏣${profit.toLocaleString()}**`)
              )
          ]
        });
      } else {
        await updateUserBalance(connection, userId, -fine);

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setTitle(`${crime.emoji} ${crimeName} fallado`)
              .setDescription(
                target
                  ? crime.fail_msg.replace('{user}', `<@${target.id}>`).replace('{fine}', `**⏣${fine.toLocaleString()}**`)
                  : crime.fail_msg.replace('{fine}', `**⏣${fine.toLocaleString()}**`)
              )
          ]
        });
      }
    } catch (error) {
      console.error('Error al ejecutar /crimenes:', error);
      return interaction.reply({
        content: 'Hubo un problema al realizar el crimen. Por favor, reporta este error.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
