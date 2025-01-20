const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');

const userCooldown = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Intenta robar a otro usuario.')
    .addUserOption(option =>
      option
        .setName('objetivo')
        .setDescription('El usuario al que deseas robar.')
        .setRequired(true)
    ),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const targetUser = interaction.options.getUser('objetivo');
    const cooldownDuration = 14400000; // 4 horas
    const currentTime = Date.now();

    // Verificar cooldown
    const lastRobTime = userCooldown.get(userId);
    if (lastRobTime && currentTime - lastRobTime < cooldownDuration) {
      const nextRobTime = Math.floor((lastRobTime + cooldownDuration) / 1000);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setDescription(`${assets.emoji.deny} Todavía no puedes robar. Podrás intentarlo de nuevo: <t:${nextRobTime}:R>.`)
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    if (!targetUser || targetUser.bot) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setDescription(`${assets.emoji.deny} No puedes robar a un bot.`)
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    const targetId = targetUser.id;

    try {
      // Obtener las tasas de fallo y monto
      const [taskRows] = await connection.query(
        'SELECT value_min, value_max FROM currency_tasks WHERE type = "rob" LIMIT 1'
      );

      if (taskRows.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(`${assets.emoji.deny} Este comando no está configurado correctamente. Contacta a un administrador.`)
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      const { value_min: failRate, value_max: robPercentage } = taskRows[0];
      const failChance = failRate / 100; // Convertir tasa de fallo a porcentaje
      const robPercent = robPercentage / 100; // Convertir porcentaje de robo

      // Verificar el balance del objetivo
      const [targetRows] = await connection.query(
        'SELECT balance FROM currency_users WHERE user_id = ?',
        [targetId]
      );

      if (targetRows.length === 0 || targetRows[0].balance <= 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(`${assets.emoji.deny} El objetivo no tiene créditos para ser robado.`)
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      const targetBalance = targetRows[0].balance;
      const success = Math.random() > failChance;

      if (success) {
        // Monto a robar basado en porcentaje del balance del objetivo
        const stolenAmount = Math.floor(targetBalance * robPercent);

        if (stolenAmount <= 0) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setDescription(`${assets.emoji.deny} El objetivo no tiene suficiente balance para que valga la pena robar.`)
            ],
            flags: MessageFlags.Ephemeral
          });
        }

        // Actualizar balances
        await connection.query('UPDATE currency_users SET balance = balance + ? WHERE user_id = ?', [stolenAmount, userId]);
        await connection.query('UPDATE currency_users SET balance = balance - ? WHERE user_id = ?', [stolenAmount, targetId]);

        // Actualizar cooldown
        userCooldown.set(userId, currentTime);

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.green)
              .setDescription(`${assets.emoji.check} Has robado con éxito **🔸${stolenAmount}** (${robPercentage}% del balance) a ${targetUser.tag}.`)
          ]
        });
      } else {
        // Penalidad basada en porcentaje del balance del ladrón
        const [userRows] = await connection.query(
          'SELECT balance FROM currency_users WHERE user_id = ?',
          [userId]
        );

        if (userRows.length === 0 || userRows[0].balance <= 0) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setDescription(`${assets.emoji.deny} Fallaste al intentar robar, pero no tienes suficiente balance para recibir una penalidad.`)
            ],
            flags: MessageFlags.Ephemeral
          });
        }

        const userBalance = userRows[0].balance;
        const penaltyAmount = Math.floor(userBalance * robPercent);

        // Actualizar balance del ladrón con penalidad
        await connection.query('UPDATE currency_users SET balance = balance - ? WHERE user_id = ?', [penaltyAmount, userId]);

        // Actualizar cooldown
        userCooldown.set(userId, currentTime);

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(`${assets.emoji.deny} Fallaste al intentar robar a ${targetUser.tag} y perdiste **🔸${penaltyAmount}** (${robPercentage}% de tu balance).`)
          ]
        });
      }
    } catch (error) {
      console.error('Error al procesar el comando rob:', error);
      return interaction.reply({
        content: 'Hubo un problema al intentar robar. Por favor, intenta de nuevo más tarde.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
