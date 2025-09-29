const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

const assets = require('../../../../config/assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trabajo')
    .setDescription('Trabaja para ganar monedas'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;

    // 1. Verificar cooldown de la tarea "work"
    const [cooldownResult] = await connection.execute(
      'SELECT work FROM cooldowns WHERE user_id = ?',
      [userId]
    );

    const lastWorkTime = cooldownResult[0]?.work;
    const now = new Date();

    if (lastWorkTime && new Date(lastWorkTime) > now) {
      return interaction.reply({
        content: `⏳ Aún estás cansado. Intenta de nuevo en <t:${Math.floor(new Date(lastWorkTime).getTime() / 1000)}:R>.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // 2. Obtener configuración de la tarea "work"
    const [workConfigResult] = await connection.execute(
      'SELECT cooldown, value1, value2 FROM task_config WHERE task = ?',
      ['work']
    );

    if (workConfigResult.length === 0) {
      return interaction.reply({
        content: '⚠️ No se encontró configuración para la tarea "work" en la base de datos.',
        flags: MessageFlags.Ephemeral
      });
    }

    const { cooldown, value1, value2 } = workConfigResult[0];
    const coins = Math.floor(Math.random() * (value2 - value1 + 1)) + value1;
    const xp = Math.floor(coins * 0.2);
    const cooldownMs = cooldown * 1000;
    const nextAvailable = new Date(now.getTime() + cooldownMs);

    // Detalles visuales de la tarea
    let remainingClicks = 10;
    const expirationTimestamp = Math.floor((Date.now() + 60_000) / 1000); // 60 seg

    const embed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setTitle('¡Presiona el botón!')
      .setDescription('🌱 ¡Riega la planta presionando el botón! Cada clic cuenta, y solo tú puedes completar esta tarea.'); // crear con db:task_desc_msg

    const button = new ButtonBuilder()
      .setCustomId('button')
      .setEmoji('💦') // crear con db:button_emoji
      .setLabel(String(remainingClicks))
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(button);

    interaction.reply({
      embeds: [embed],
      components: [row]
    }).then(async message => {
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000
      });

      collector.on('collect', async i => {
        if (i.user.id !== userId) {
          return i.reply({ content: 'Este botón no es para ti.', flags: MessageFlags.Ephemeral });
        }

        remainingClicks--;

        if (remainingClicks > 0) {
          const updatedButton = ButtonBuilder.from(button).setLabel(String(remainingClicks));
          const updatedRow = new ActionRowBuilder().addComponents(updatedButton);
          await i.update({ components: [updatedRow] });
        } else {
          collector.stop('completed');

          const disabledButton = ButtonBuilder.from(button)
            .setLabel('0')
            .setDisabled(true);
          const finalRow = new ActionRowBuilder().addComponents(disabledButton);
          await i.update({ components: [finalRow] });

          // 3. Insertar o actualizar al usuario
          await connection.execute(
            `INSERT INTO curr_users (id, balance, xp) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE balance = balance + ?, xp = COALESCE(xp, 0) + ?`,
            [userId, coins, xp, coins, xp]
          );

          // 4. Actualizar cooldown de "work"
          await connection.execute(
            `INSERT INTO cooldowns (user_id, work)
             VALUES (?, ?) ON DUPLICATE KEY UPDATE work = VALUES(work)`,
            [userId, nextAvailable]
          );

          await interaction.followUp({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.green)
                .setTitle('Trabajo completado con éxito')
                .setDescription(
                  '> ¡Maravilloso! Completaste la tarea como todo un jardinero experto y tu planta creció muchísimo 🪴.\n\n' + // crear con db:task_succ_msg
                  `¡Aquí tienes tu recompensa: **+${coins.toLocaleString()}**🪙 | **+${xp.toLocaleString()}**✨`
                )
            ]
          });
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason !== 'completed') {
          const disabledButton = ButtonBuilder.from(button)
            .setLabel(String(remainingClicks))
            .setDisabled(true);
          const finalRow = new ActionRowBuilder().addComponents(disabledButton);
          await interaction.editReply({ components: [finalRow] });

          await interaction.followUp({ content: '⏰ Tiempo agotado. No se completó el trabajo.' });
        }
      });
    });
  }
};
