const {
  SlashCommandSubcommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");
const assets = require("../../../../assets.json");
const ms = require("ms");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("crear")
    .setDescription("Inicia un nuevo sorteo"),

  async execute(interaction) {
    // Crear el formulario modal
    const modal = new ModalBuilder().setCustomId("gaModal").setTitle("Nuevo Sorteo");

    const durationInput = new TextInputBuilder()
      .setCustomId("durationInput")
      .setLabel("Duración (Ej: 1m, 2h, 3d)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const winnersInput = new TextInputBuilder()
      .setCustomId("winnersInput")
      .setLabel("Número de ganadores")
      .setValue("1")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const prizeInput = new TextInputBuilder()
      .setCustomId("prizeInput")
      .setLabel("Premio")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId("descriptionInput")
      .setLabel("Descripción (opcional)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(durationInput),
      new ActionRowBuilder().addComponents(winnersInput),
      new ActionRowBuilder().addComponents(prizeInput),
      new ActionRowBuilder().addComponents(descriptionInput)
    );

    await interaction.showModal(modal);

    // Esperar la respuesta del modal
    const filter = (i) => i.customId === "gaModal" && i.user.id === interaction.user.id;
    const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 });

    const duration = ms(modalInteraction.fields.getTextInputValue("durationInput"));
    const winners = modalInteraction.fields.getTextInputValue("winnersInput");
    const prize = modalInteraction.fields.getTextInputValue("prizeInput");
    const description = modalInteraction.fields.getTextInputValue("descriptionInput");
    const hoster = modalInteraction.user.id;
    const endDate = Math.floor((Date.now() + duration) / 1000);

    if (!endDate) {
      return modalInteraction.reply({ content: `${assets.emoji.warn} Duración inválida`, flags: MessageFlags.Ephemeral });
    }

    try {
      const connection = interaction.client.dbConnection;

      // Insertar sorteo en la base de datos con un ID de mensaje temporal
      const [result] = await connection.query(
        `INSERT INTO giveaways (message_id, channel_id, guild_id, hoster_id, prize, description, winners_count, end_date) 
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
        ["", interaction.channel.id, interaction.guild.id, hoster, prize, description, winners, endDate]
      );

      const giveawayId = result.insertId;

      const gaEmbed = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setColor(assets.color.base)
        .setTitle(prize)
        .setDescription(
          `${description}\n\nFinaliza: <t:${endDate}:R> | (<t:${endDate}:D>)\nAnfitrión: <@${hoster}>\nEntradas: **0**\nGanadores: **${winners}**`
        );

      const enterButton = new ButtonBuilder()
        .setCustomId(`enterButton_${giveawayId}`)
        .setLabel(" ")
        .setEmoji("🎉")
        .setStyle(ButtonStyle.Primary);

      const enterButtonRow = new ActionRowBuilder().addComponents(enterButton);

      await modalInteraction.reply({ content: "Sorteo creado con éxito", flags: MessageFlags.Ephemeral });

      // Enviar el mensaje del sorteo y actualizar su ID en la base de datos
      const message = await interaction.channel.send({ embeds: [gaEmbed], components: [enterButtonRow] });

      await connection.query(`UPDATE giveaways SET message_id = ? WHERE id = ?`, [message.id, giveawayId]);

      // Programar la finalización del sorteo
      setTimeout(async () => {
        try {
          const [entries] = await connection.query(
            `SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?`,
            [giveawayId]
          );

          const [giveaway] = await connection.query(
            `SELECT winners_count, channel_id, message_id FROM giveaways WHERE id = ?`,
            [giveawayId]
          );

          if (!giveaway.length) return;

          const winnersCount = giveaway[0].winners_count;
          const selectedWinners = entries
            .sort(() => Math.random() - 0.5) // Mezclar la lista
            .slice(0, winnersCount); // Seleccionar ganadores

          // Actualizar el estado del sorteo a "ended"
          await connection.query(`UPDATE giveaways SET status = 'ended' WHERE id = ?`, [giveawayId]);

          // Obtener el mensaje original del sorteo
          const channel = await interaction.client.channels.fetch(giveaway[0].channel_id);
          const message = await channel.messages.fetch(giveaway[0].message_id);

          // Clonar el embed original
          const embed = EmbedBuilder.from(message.embeds[0]);

          // Generar la lista de ganadores
          const winnersMention = selectedWinners.length > 0
            ? selectedWinners.map((winner) => `<@${winner.user_id}>`).join(", ")
            : "Nadie participó 😢";

          // Actualizar la parte de ganadores en el embed
          let description = embed.data.description || "";
          description = description.replace(/Ganadores: \*\*.*\*\*/, `Ganadores: **${winnersMention}**`);
          embed.setDescription(description);

          // Obtener el botón actual y deshabilitarlo
          const oldActionRow = message.components[0];
          if (oldActionRow) {
            const disabledButton = ButtonBuilder.from(oldActionRow.components[0]).setDisabled(true);
            const newActionRow = new ActionRowBuilder().addComponents(disabledButton);

            // Editar el mensaje con el embed actualizado y botón deshabilitado
            await message.edit({ embeds: [embed], components: [newActionRow] });
          } else {
            // Si por alguna razón no hay botones, solo edita el embed
            await message.edit({ embeds: [embed] });
          }

          // Anunciar a los ganadores
          await channel.send(`🎉 ¡El sorteo ha terminado! Ganadores: ${winnersMention}`);
        } catch (error) {
          console.error("Error al finalizar el sorteo:", error);
        }
      }, duration);

    } catch (error) {
      console.error("Error al guardar el sorteo:", error);
      await modalInteraction.reply({ content: "Hubo un error al crear el sorteo.", flags: MessageFlags.Ephemeral });
    }
  },
};
