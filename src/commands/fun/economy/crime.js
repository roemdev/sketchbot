const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
  
const assets = require('../../../../config/assets.json');
  
module.exports = {
  data: new SlashCommandBuilder()
    .setName('crimen')
    .setDescription('Arriesga y gana monedas con Hackeo o Robo.'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;

    // Verificar cooldown de crime
    const [cooldownResult] = await connection.execute(
      'SELECT crime FROM cooldowns WHERE user_id = ?',
      [userId]
    );

    const lastCrimeTime = cooldownResult[0]?.crime;
    const now = new Date();

    if (lastCrimeTime && new Date(lastCrimeTime) > now) {
      return interaction.reply({
        content: `⏳ Aún estás bajo vigilancia. Intenta de nuevo en <t:${Math.floor(new Date(lastCrimeTime).getTime() / 1000)}:R>.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Obtener config task_config para crime
    const [crimeConfigResult] = await connection.execute(
      'SELECT cooldown, value1, value2 FROM task_config WHERE task = ?',
      ['crime']
    );

    if (crimeConfigResult.length === 0) {
      return interaction.reply({
        content: '⚠️ No se encontró configuración para la tarea "crime" en la base de datos.',
        flags: MessageFlags.Ephemeral
      });
    }

    const { cooldown, value1: failRate, value2: percent } = crimeConfigResult[0];

    // Crear botones Hackeo y Robo
    const hackeoButton = new ButtonBuilder()
      .setCustomId('hackeo')
      .setLabel('🖥️ Hackeo')
      .setStyle(ButtonStyle.Secondary);

    const roboButton = new ButtonBuilder()
      .setCustomId('robo')
      .setLabel('🔫 Robo')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(hackeoButton, roboButton);

    await interaction.reply({
      content: 'Elige tu acción: **Hackeo** o **Robo**. Tienes 30 segundos.',
      embeds: [
        new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle('¿Qué crimen deseas cometer?')
        .setDescription('Elige una de las opciones a continuación; podrás ganar :coin: si tu crimen tiene éxito, si no, tendrás que pagar una multa. Pero tranquilo, ¡el que no arrigas no gana!')
      ],
      components: [row]
    });

    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30_000,
      filter: i => i.user.id === userId
    });

    collector.on('collect', async i => {
      collector.stop();

      // Leer balance del usuario actual
      const [userResult] = await connection.execute(
        'SELECT balance FROM curr_users WHERE id = ?',
        [userId]
      );

      if (userResult.length === 0 || userResult[0].balance <= 0) {
        return i.update({
          content: '❌ No tienes monedas para realizar esta acción.',
          components: [],
          embeds: []
        });
      }

      const userBalance = userResult[0].balance;

      // Probabilidad de fallo
      const failChance = Math.random() * 100 < failRate;

      // Cantidad a afectar en monedas (redondeado)
      const amount = Math.max(1, Math.floor(userBalance * (percent / 100)));

      // Desactivar botones y marcar el seleccionado
      const selectedButtonId = i.customId;
      const newHackeoButton = ButtonBuilder.from(hackeoButton)
        .setDisabled(true)
        .setStyle(selectedButtonId === 'hackeo' ? ButtonStyle.Success : ButtonStyle.Secondary);
      
      const newRoboButton = ButtonBuilder.from(roboButton)
        .setDisabled(true)
        .setStyle(selectedButtonId === 'robo' ? ButtonStyle.Success : ButtonStyle.Secondary);

      const disabledRow = new ActionRowBuilder().addComponents(newHackeoButton, newRoboButton);

      if (selectedButtonId === 'hackeo') {
        if (failChance) {
          // Falla: pierde amount
          const lost = Math.min(amount, userBalance);
          await connection.execute(
            'UPDATE curr_users SET balance = balance - ? WHERE id = ?',
            [lost, userId]
          );

          const embedFail = new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle('💰 Resultado')
            .setDescription(`¡Oh no! Fuiste multado con **${lost.toLocaleString()}** 🪙.`)
            .addFields(
              { name: 'Crimen cometido', value: '🖥️ Hackeo', inline: true },
              { name: 'Monedas perdidas', value: `${lost.toLocaleString()} 🪙`, inline: true }
            )

          await i.update({ content: '', components: [disabledRow], embeds: [embedFail] });
        } else {
          // Éxito: gana amount
          await connection.execute(
            'UPDATE curr_users SET balance = balance + ? WHERE id = ?',
            [amount, userId]
          );

          const embedSuccess = new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle('💰 Resultado')
            .setDescription(`¡Lograste burlar la ciberseguridad del banco de Arkania!`)
            .addFields(
              { name: 'Crimen cometido', value: '🖥️ Hackeo', inline: true },
              { name: 'Monedas ganadas', value: `${amount.toLocaleString()} 🪙`, inline: true }
            );

          await i.update({ content: '', components: [disabledRow], embeds: [embedSuccess] });
        }
      } else if (selectedButtonId === 'robo') {
        // Robo: roba a otro usuario aleatorio

        // Obtener usuarios candidatos (excluyendo al actual, balance > 0)
        const [victims] = await connection.execute(
          'SELECT id, balance FROM curr_users WHERE id != ? AND balance > 0',
          [userId]
        );

        if (victims.length === 0) {
          return i.update({
            content: '❌ No hay usuarios con monedas para robar.',
            components: [disabledRow],
            embeds: []
          });
        }

        // Escoger víctima aleatoria
        const victim = victims[Math.floor(Math.random() * victims.length)];
        const victimBalance = victim.balance;

        const victimAmount = Math.max(1, Math.floor(victimBalance * (percent / 100)));

        if (failChance) {
          // Falla: ladrón pierde amount (como hackeo)
          const lost = Math.min(amount, userBalance);
          await connection.execute(
            'UPDATE curr_users SET balance = balance - ? WHERE id = ?',
            [lost, userId]
          );

          const embedFail = new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle('💰 Resultado')
            .setDescription(`¡Oh no! Te atraparon intentado robarle a <@${victim.id}>.`)
            .addFields(
              { name: 'Crimen cometido', value: '🔫 Robo', inline: true },
              { name: 'Monedas perdidas', value: `${lost.toLocaleString()} 🪙`, inline: true }
            )

          await i.update({ content: '', components: [disabledRow], embeds: [embedFail] });
        } else {
          // Éxito: resta al victim y suma al ladrón
          const stealAmount = Math.min(victimAmount, victimBalance);

          await connection.execute(
            'UPDATE curr_users SET balance = balance - ? WHERE id = ?',
            [stealAmount, victim.id]
          );
          await connection.execute(
            'UPDATE curr_users SET balance = balance + ? WHERE id = ?',
            [stealAmount, userId]
          );

          const embedSuccess = new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle('💰 Resultado')
            .setDescription(`¡Te saliste con la tuya robándole a <@${victim.id}>.`)
            .addFields(
              { name: 'Crimen cometido', value: '🔫 Robo', inline: true },
              { name: 'Monedas robadas', value: `${stealAmount.toLocaleString()} 🪙`, inline: true }
            );

          await i.update({ content: '', components: [disabledRow], embeds: [embedSuccess] });
        }
      }

      // Actualizar cooldown
      const nextAvailable = new Date(Date.now() + cooldown * 1000);
      await connection.execute(
        `INSERT INTO cooldowns (user_id, crime)
         VALUES (?, ?) ON DUPLICATE KEY UPDATE crime = VALUES(crime)`,
        [userId, nextAvailable]
      );
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await interaction.editReply({ content: '⏰ Tiempo agotado. No realizaste ninguna acción.', components: [] });
      }
    });
  }
};