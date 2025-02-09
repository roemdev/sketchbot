const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, MessageFlags } = require("discord.js");
const assets = require("../../assets.json");

const ROLE_SUPPORT_ID = "1251292331852697623";
const TICKET_CATEGORY_ID = "1338007081760063568";

module.exports = {
  name: "tk",
  description: "Envía la interfaz de tickets",

  async execute(message) {
    try {
      const openTicketEmbed = createTicketEmbed(message.guild);
      const buttonRow = createTicketButton();

      const sentMessage = await message.channel.send({ embeds: [openTicketEmbed], components: [buttonRow] });
      message.delete().catch(() => { });

      const collector = sentMessage.createMessageComponentCollector();

      collector.on("collect", async (interaction) => {
        if (interaction.customId === "openTicket") {
          await handleOpenTicket(interaction);
        }
      });
    } catch (error) {
      console.error("❌ Error al ejecutar el comando tk:", error);
    }
  },
};

function createTicketEmbed(guild) {
  return new EmbedBuilder()
    .setColor(assets.color.base)
    .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
    .setTitle("Contactar al Soporte")
    .setDescription("Haz clic en el botón debajo para contactar al soporte.")
    .addFields(
      { name: "Abre un ticket para", value: "* Hacer preguntas.\n* Reportar un miembro.\n* Solicitar ayuda.", inline: true },
      { name: "Evita abrir un ticket para", value: "* Pedir rangos.\n* Perder tiempo.\n* Jugar con el sistema.", inline: true },
      { name: "En resumen", value: "No hagas mal uso del sistema de tickets, crea tickets solo cuando sea realmente necesario y no lo utilices para cosas que no sean de utilidad." }
    );
}

function createTicketButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("openTicket").setEmoji("🎫").setLabel("Abrir ticket").setStyle(ButtonStyle.Primary)
  );
}

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
          .setDescription(`> ${existingTicket}`),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const ticketChannel = await guild.channels.create({
    name: `ticket-${user.username}`,
    type: 0,
    parent: TICKET_CATEGORY_ID || null,
    permissionOverwrites: getTicketPermissions(guild, user),
  });

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(assets.color.green)
        .setTitle(`${assets.emoji.check} Se ha creado tu ticket`)
        .setDescription(`Un miembro del soporte te atenderá pronto.\n> ${ticketChannel}`),
    ],
    flags: MessageFlags.Ephemeral,
  });

  const closeButtonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("closeTicket")
      .setLabel("Cerrar ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

  const ticketEmbed = new EmbedBuilder()
    .setColor(assets.color.base)
    .setTitle("Bienvenido al Soporte")
    .setDescription(`¡Hola ${user}! ¿Cómo podemos ayudarte hoy?`);

  await ticketChannel.send({
    content: `${user} | <@&${ROLE_SUPPORT_ID}>`,
    embeds: [ticketEmbed],
    components: [closeButtonRow],
  });

  const closeCollector = ticketChannel.createMessageComponentCollector();

  closeCollector.on("collect", async (closeInteraction) => {
    if (closeInteraction.customId === "closeTicket") {
      await handleCloseTicket(closeInteraction, ticketChannel);
    }
  });
}

function getTicketPermissions(guild, user) {
  return [
    {
      id: guild.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    },
    {
      id: guild.client.user.id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    },
    {
      id: ROLE_SUPPORT_ID,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    },
  ];
}

async function handleCloseTicket(interaction, ticketChannel) {
  const member = interaction.member;

  if (!member.roles.cache.has(ROLE_SUPPORT_ID)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} Sin permisos`)
          .setDescription("No tienes permitido realizar esta acción."),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  await ticketChannel.delete().catch(console.error);
}
