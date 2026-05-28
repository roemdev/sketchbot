const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");

const COIN = config.emojis.coin || "🪙";
const XP = config.emojis.xp || "✨";

module.exports = {
  data: new SlashCommandBuilder()
      .setName("clasificacion")
      .setDescription("Muestra el top 10 de usuarios del servidor")
      .addSubcommand(sub =>
          sub.setName("balance")
              .setDescription("Los 10 usuarios más ricos del servidor")
      )
      .addSubcommand(sub =>
          sub.setName("nivel")
              .setDescription("Los 10 usuarios con más nivel del servidor")
      ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "balance") {
      const topUsers = await userService.getTopUsers(10, "balance");
      if (!topUsers.length) {
        return interaction.reply({ content: "Nadie tiene monedas todavía. ¡Sean los primeros!", flags: MessageFlags.Ephemeral });
      }

      const lines = topUsers.map((u, index) =>
          `**${index + 1}.** \`${u.username}\` — **${COIN}${u.balance.toLocaleString()}**`
      ).join("\n");

      const container = new ContainerBuilder()
        .setAccentColor(0x2F3136) // NotQuiteBlack
        .addTextDisplayComponents(t => t.setContent(`### 🏆 Clasificación por Monedas\n\n${lines}`));

      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (subcommand === "nivel") {
      const topUsers = await userService.getTopUsers(10, "level");
      if (!topUsers.length) {
        return interaction.reply({ content: "Nadie tiene experiencia todavía. ¡Sean los primeros!", flags: MessageFlags.Ephemeral });
      }

      const lines = topUsers.map((u, index) =>
          `**${index + 1}.** \`${u.username}\` — **${XP} Nvl: ${u.level || 1}** (${u.xp.toLocaleString()} XP)`
      ).join("\n");

      const container = new ContainerBuilder()
        .setAccentColor(0x2F3136) // NotQuiteBlack
        .addTextDisplayComponents(t => t.setContent(`### 🎖️ Clasificación por Nivel\n\n${lines}`));

      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
