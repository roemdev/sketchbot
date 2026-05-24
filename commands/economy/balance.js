const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");

const COIN = config.emojis.coin || "🪙";

module.exports = {
  data: new SlashCommandBuilder()
      .setName("balance")
      .setDescription("Muestra tu balance de monedas o el de otro usuario")
      .addUserOption(o =>
          o.setName("usuario")
              .setDescription("El usuario a consultar")
              .setRequired(false)
      ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario") || interaction.user;
    
    // Asegurar que el usuario tenga un perfil en la base de datos
    const dbUser = await userService.createUser(targetUser.id, targetUser.username);

    const bankBalance = await userService.getBankBalance(targetUser.id);
    const total = dbUser.balance + bankBalance;
    const avatarUrl = targetUser.displayAvatarURL({ extension: "png", size: 128 });

    const container = new ContainerBuilder()
      .setAccentColor(0x2ECC71) // Verde esmeralda premium para dinero
      .addTextDisplayComponents(t => 
        t.setContent(`## Balance de ${targetUser.username}`)
      )
      .addSeparatorComponents(s => s)
      .addSectionComponents(section =>
          section
              .addTextDisplayComponents(t =>
                  t.setContent(
                      `**💰 Balance desglosado:**\n` +
                      `- **👛 Cartera:** ${COIN}**${dbUser.balance.toLocaleString("es-DO")}**\n` +
                      `- **🏦 Banco:** ${COIN}**${bankBalance.toLocaleString("es-DO")}** / **${(2000000).toLocaleString("es-DO")}**\n\n` +
                      `- **💼 Total:** ${COIN}**${total.toLocaleString("es-DO")}**`
                  )
              )
              .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
      );

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
