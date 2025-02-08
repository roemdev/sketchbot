const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, MessageFlags } = require("discord.js");
const assets = require("../../assets.json");

const ROLE_SUPPORT_ID = "1330908926459514880"; // ID del rol de soporte
const TICKET_CATEGORY_ID = "1337590734924283955"; // Opcional: Reemplaza con la ID de la categoría donde irán los tickets

module.exports = {
  name: "tk",
  description: "Envía la interfaz de tickets",

  async execute(message) {
    try {
      const openTicketEmbed = createTicketEmbed(message.guild);
      const buttonRow = createTicketButtons();

      // Enviamos el mensaje con los botones
      const sentMessage = await message.channel.send({ embeds: [openTicketEmbed], components: [buttonRow] });

      // Eliminamos el mensaje original del usuario
      message.delete().catch(() => { });

      // Manejador de interacción para los botones
      const collector = sentMessage.createMessageComponentCollector();

      collector.on("collect", async (interaction) => {
        try {
          if (interaction.customId === "openTicket") {
            await handleOpenTicket(interaction);
          } else if (interaction.customId === "claimPrize") {
            await interaction.reply({ content: "🎁 Has solicitado reclamar un premio. Un administrador revisará tu solicitud." });
          }
        } catch (error) {
          console.error("❌ Error en la interacción:", error);
          await interaction.reply({ content: "⚠️ Ocurrió un error, intenta nuevamente.", flags: MessageFlags.Ephemeral }).catch(() => { });
        }
      });
    } catch (error) {
      console.error("❌ Error al ejecutar el comando tk:", error);
    }
  },
};

/**
 * Crea el embed para la interfaz de tickets.
 */
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

/**
 * Crea los botones de la interfaz de tickets.
 */
function createTicketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("openTicket").setEmoji("🎫").setLabel("Abrir ticket").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("claimPrize").setEmoji("🎁").setLabel("Reclamar premio").setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Maneja la creación de un ticket cuando un usuario presiona el botón.
 */
async function handleOpenTicket(interaction) {
  const { guild, user } = interaction;

  // Verificar si el usuario ya tiene un ticket abierto
  const existingTicket = guild.channels.cache.find(
    (channel) => channel.name === `ticket-${user.username.toLowerCase()}`
  );

  if (existingTicket) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} Ya tienes un ticket abierto`)
          .setDescription(`> ${existingTicket}`)
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Crear el canal del ticket
  const ticketChannel = await guild.channels.create({
    name: `ticket-${user.username}`,
    type: 0, // 0 = canal de texto
    parent: TICKET_CATEGORY_ID || null, // Asigna categoría si está configurada
    permissionOverwrites: getTicketPermissions(guild, user),
  });

  // Confirmar al usuario
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(assets.color.green)
        .setTitle(`${assets.emoji.check} Se ha creado tu ticket`)
        .setDescription(`Un miembro del soporte te atenderá pronto.\n> ${ticketChannel}`)
    ],
    flags: MessageFlags.Ephemeral,
  });

  // Crear el botón "Cerrar ticket"
  const closeButtonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("closeTicket")
      .setLabel("Cerrar ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

  // Enviar mensaje en el canal del ticket con el botón "Cerrar ticket"
  const ticketEmbed = new EmbedBuilder()
    .setColor(assets.color.base)
    .setTitle('Bienvenido al Soporte')
    .setDescription(`¡Hola ${user}! ¿Cómo podemos ayudarte hoy?`);

  await ticketChannel.send({
    content: `${user} | <@&${ROLE_SUPPORT_ID}>!`,
    embeds: [ticketEmbed],
    components: [closeButtonRow]
  });

  // Manejador de interacción para el botón "Cerrar ticket"
  const closeCollector = ticketChannel.createMessageComponentCollector();

  closeCollector.on("collect", async (closeInteraction) => {
    if (closeInteraction.customId === "closeTicket") {
      await handleCloseTicket(closeInteraction, ticketChannel);
    }
  });
}

/**
 * Devuelve los permisos para el canal del ticket.
 */
function getTicketPermissions(guild, user) {
  return [
    {
      id: guild.id, // Todos los miembros
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: user.id, // Usuario que abrió el ticket
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    },
    {
      id: guild.client.user.id, // Bot
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    },
    {
      id: ROLE_SUPPORT_ID, // Rol de soporte
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    },
  ];
}

async function handleCloseTicket(interaction, ticketChannel) {
  await ticketChannel.delete();
}