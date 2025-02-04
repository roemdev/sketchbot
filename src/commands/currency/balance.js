const { SlashCommandSubcommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const assets = require("../../../assets.json");
const { getUserBalance } = require("./utils/getUserBalance");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("balance")
    .setDescription("Muestra tu balance actual de créditos")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Opcional: Ver el balance de otro usuario.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const targetUser =
      interaction.options.getUser("usuario") || interaction.user;
    const userId = targetUser.id;

    try {
      const balance = await getUserBalance(connection, userId);

      if (balance === 0) {
        const embedNoData = new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} Sin balance`)
          .setDescription(
            `${targetUser} todavía no tiene créditos.`
          );

        return interaction.reply({ embeds: [embedNoData], flags: MessageFlags.Ephemeral });
      }

      // Si el usuario tiene balance
      const author = {
        name: targetUser.displayName,
        iconURL: targetUser.displayAvatarURL({ dynamic: true }),
      };
      const embed = new EmbedBuilder()
        .setAuthor(author)
        .setColor(assets.color.base)
        .setDescription(
          `${targetUser} tiene ⏣${balance.toLocaleString()} créditos.`
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error al consultar el balance:", error);
      return interaction.reply({
        content: "Hubo un error al consultar el balance. Por favor, intenta más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
