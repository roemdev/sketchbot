const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  MessageFlags,
  Events,
} = require("discord.js");
const assets = require("../../../assets.json");
const ms = require("ms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sorteo")
    .setDescription("Inicia un nuevo sorteo")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    // Crear el modal
    const modal = new ModalBuilder()
      .setCustomId("gaModal")
      .setTitle("Nuevo Sorteo");

    const durationInput = new TextInputBuilder()
      .setCustomId("durationInput")
      .setLabel("Duración")
      .setPlaceholder("Ej: 1m, 2h, 3d")
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
      .setLabel("Descripción")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const durationInputRow = new ActionRowBuilder().addComponents(durationInput);
    const winnersInputRow = new ActionRowBuilder().addComponents(winnersInput);
    const prizeInputRow = new ActionRowBuilder().addComponents(prizeInput);
    const descriptionInputRow = new ActionRowBuilder().addComponents(
      descriptionInput
    );

    modal.addComponents(
      durationInputRow,
      winnersInputRow,
      prizeInputRow,
      descriptionInputRow
    );

    await interaction.showModal(modal);

    const client = interaction.client;

    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isModalSubmit()) return;
      if (interaction.customId === "gaModal") {
        const duration = ms(interaction.fields.getTextInputValue("durationInput"));
        const winners = interaction.fields.getTextInputValue("winnersInput");
        const prize = interaction.fields.getTextInputValue("prizeInput");
        const description = interaction.fields.getTextInputValue("descriptionInput");
        const hoster = interaction.user.id;
        const endDate = Math.floor((Date.now() + duration) / 1000);

        if (!endDate) {
          return interaction.reply({
            content: `${assets.emoji.warn} Duración inválida`,
            flags: MessageFlags.Ephemeral,
          });
        }

        // Guardar el sorteo en la base de datos
        try {
          const connection = interaction.client.dbConnection;

          // Insertar un valor temporal en message_id (por ejemplo, una cadena vacía)
          const [result] = await connection.query(
            `INSERT INTO giveaways
            (message_id, channel_id, guild_id, hoster_id, prize, description, winners_count, end_date) 
            VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
            ["", interaction.channel.id, interaction.guild.id, hoster, prize, description, winners, endDate]
          );

          const giveawayId = result.insertId;

          const gaEmbed = new EmbedBuilder()
            .setColor(assets.color.base)
            .setTitle(prize)
            .setDescription(
              `${description}\n\nFinaliza: <t:${endDate}:R> | (<t:${endDate}:D>)\nAfitrión: <@${hoster}>\nEntradas: 0\nGanadores: ${winners}`
            );

          const enterButton = new ButtonBuilder()
            .setCustomId(`enterButton_${giveawayId}`) // Usar el ID del sorteo en el customId
            .setLabel("Ingresar")
            .setEmoji("🎉")
            .setStyle(ButtonStyle.Primary);

          const enterButtonRow = new ActionRowBuilder().addComponents(enterButton);

          await interaction.reply({ content: "¡Éxito!", flags: MessageFlags.Ephemeral });
          const message = await interaction.channel.send({
            embeds: [gaEmbed],
            components: [enterButtonRow],
          });

          // Actualizar el message_id en la base de datos con el valor correcto
          await connection.query(
            `UPDATE giveaways SET message_id = ? WHERE id = ?`,
            [message.id, giveawayId]
          );

          // Programar la finalización del sorteo
          setTimeout(async () => {
            try {
              // Seleccionar ganadores aleatorios
              const [entries] = await connection.query(
                `SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?`,
                [giveawayId]
              );

              const [giveaway] = await connection.query(
                `SELECT winners_count, channel_id, message_id FROM giveaways WHERE id = ?`,
                [giveawayId]
              );

              const winnersCount = giveaway[0].winners_count;
              const selectedWinners = entries.sort(() => Math.random() - 0.5).slice(0, winnersCount);

              // Actualizar el estado del sorteo
              await connection.query(
                `UPDATE giveaways SET status = 'ended' WHERE id = ?`,
                [giveawayId]
              );

              // Anunciar a los ganadores
              const channel = await client.channels.fetch(giveaway[0].channel_id);
              const giveawayMessage = await channel.messages.fetch(giveaway[0].message_id);

              const winnersMention = selectedWinners.map((winner) => `<@${winner.user_id}>`).join(", ");
              await giveawayMessage.reply(`🎉 ¡El sorteo ha terminado! Ganadores: ${winnersMention}`);
            } catch (error) {
              console.error("Error al finalizar el sorteo:", error);
            }
          }, duration); // Usar la duración en milisegundos
        } catch (error) {
          console.error("Error al guardar el sorteo:", error);
          await interaction.reply({
            content: "Hubo un error al crear el sorteo.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    });
  },
};
