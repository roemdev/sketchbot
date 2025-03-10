const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { handleOpenTicket } = require("./ticketHandler");
const assets = require("../../../../config/assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tickets")
    .setDescription("Envía la interfaz de tickets"),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const openTicketEmbed = createTicketEmbed(interaction);
      const buttonRow = createTicketButton();

      const sentMessage = await interaction.channel.send({
        embeds: [openTicketEmbed],
        components: [buttonRow],
      });

      await interaction.deleteReply();

      const collector = sentMessage.createMessageComponentCollector();
      collector.on("collect", async (interaction) => {
        if (interaction.customId === "tkOpen") {
          await handleOpenTicket(interaction);
        }
      });
    } catch (error) {
      console.error("❌ Error al ejecutar el comando tk:", error);
    }
  },
};

function createTicketEmbed(interaction) {
  return new EmbedBuilder()
    .setColor(assets.color.base)
    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
    .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
    .setTitle("Interfaz TicketMaster")
    .setDescription("Haz clic en 🎫 debajo para contactar al soporte.")
    .addFields(
      { name: `${assets.emoji.check} Abre ticket`, value: '* Hacer preguntas.\n* Reportar un miembro.\n* Solicitar ayuda.\n* Entre otros.', inline: true },
      { name: `${assets.emoji.deny} No abras ticket`, value: '* Pedir roles.\n* Perder tiempo.\n* Jugar con el sistema.\n* Trolear.', inline: true }
    );
}


function createTicketButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("tkOpen").setEmoji("🎫").setLabel("Crear ticket").setStyle(ButtonStyle.Primary)
  );
}
