const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags } = require("discord.js");
const { getTicketPermissions, ROLE_SUPPORT_ID, TICKET_CATEGORY_ID } = require("./ticketUtils");
const assets = require('../../../../assets.json')

async function handleOpenTicket(interaction) {
  const { guild, user } = interaction;

  const existingTicket = guild.channels.cache.find(
    (channel) => channel.name === `ticket-${user.username.toLowerCase()}`
  );

  if (existingTicket) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} Ya tienes un ticket abierto`)
          .setDescription(`> Tu ticket ya está abierto. Presiona el botón debajo para ir a él.`)
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Ir al Ticket")
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/channels/${interaction.guild.id}/${existingTicket.id}`)
        )
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const ticketChannel = await guild.channels.create({
    name: `ticket-${user.username}`,
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID || null,
    permissionOverwrites: getTicketPermissions(guild, user),
  });

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(assets.color.green)
        .setTitle(`${assets.emoji.check} Se ha creado tu ticket`)
        .setDescription(`Un miembro del soporte te atenderá pronto. Has clic debajo para ir al ticket.`),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Ir al Ticket")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${interaction.guild.id}/${ticketChannel.id}`)
      )
    ],
    flags: MessageFlags.Ephemeral,
  });

  const closeButtonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("CloseTicket")
      .setLabel("Cerrar ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

  const ticketEmbed = new EmbedBuilder()
    .setColor(assets.color.base)
    .setTitle("Bienvenido al Soporte")
    .setDescription(`¡Hola ${user}! Explícanos cómo podemos ayudarte`);

  await ticketChannel.send({
    content: `<@&${ROLE_SUPPORT_ID}> | ${user} creó un nuevo ticket.`,
    embeds: [ticketEmbed],
    components: [closeButtonRow],
  });

  const closeCollector = ticketChannel.createMessageComponentCollector();
  closeCollector.on("collect", async (closeInteraction) => {
    if (closeInteraction.customId === "CloseTicket") {
      await closeInteraction.deferReply({ flags: MessageFlags.Ephemeral });
      await closeInteraction.deleteReply();
      await askForCloseConfirmation(closeInteraction, ticketChannel, user);
    }
  });
}

async function handleCloseTicket(interaction, ticketChannel) {
  const member = interaction.member;

  if (!member.roles.cache.has(ROLE_SUPPORT_ID)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} Sin permisos`)
          .setDescription("Espera a que el soporte cierre el ticket"),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  await ticketChannel.delete().catch(console.error);
}

async function askForCloseConfirmation(interaction, ticketChannel, user) {
  const { member } = interaction;
  const isSupport = member.roles.cache.has(ROLE_SUPPORT_ID);
  const confirmationEmbed = new EmbedBuilder()
    .setColor(assets.color.base)
    .setTitle("Confirmación")
    .setDescription(
      isSupport
        ? `¿Estás seguro de que quieres cerrar el ticket de ${user}?`
        : `Solicitud enviada. Espera a que el soporte cierre el ticket.`
    );

  const confirmCancelRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ConfirmClose")
      .setLabel(" ")
      .setStyle(ButtonStyle.Success)
      .setEmoji(assets.emoji.whitecheck),
    new ButtonBuilder()
      .setCustomId("CancelClose")
      .setLabel(" ")
      .setStyle(ButtonStyle.Danger)
      .setEmoji(assets.emoji.whitedeny)
  );

  const confirmationMessage = await ticketChannel.send({
    embeds: [confirmationEmbed],
    components: [confirmCancelRow],
  });

  const confirmationCollector = confirmationMessage.createMessageComponentCollector();

  confirmationCollector.on("collect", async (closeInteraction) => {
    if (closeInteraction.customId === "ConfirmClose") {
      await handleCloseTicket(closeInteraction, ticketChannel);
    } else if (closeInteraction.customId === "CancelClose") {
      await confirmationMessage.delete();
    }
  });
}

module.exports = { handleOpenTicket };