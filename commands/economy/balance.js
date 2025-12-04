const { SlashCommandBuilder } = require("discord.js");
const { makeEmbed } = require("../../utils/embedFactory");
const userService = require("../../services/userService");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Muestra balances de usuarios")

    // Subcomando: propio balance
    .addSubcommand(sub =>
      sub
        .setName("mío")
        .setDescription("Muestra tu propio balance")
    )

    // Subcomando: balance de un usuario específico
    .addSubcommand(sub =>
      sub
        .setName("usuario")
        .setDescription("Muestra el balance de un usuario específico")
        .addUserOption(option =>
          option
            .setName("usuario")
            .setDescription("Usuario a consultar")
            .setRequired(true)
        )
    )

    // Subcomando: leaderboard
    .addSubcommand(sub =>
      sub
        .setName("top-10")
        .setDescription("Muestra el leaderboard con los top usuarios")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "mío") {
      const dbUser = await userService.createUser(interaction.user.id, interaction.user.username);
      const formatted = dbUser.balance.toLocaleString("es-DO");

      const embed = makeEmbed(
        "base",
        "Balance",
        `Tu balance es: **${config.emojis.coin}${formatted}**`
      );

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === "usuario") {
      const target = interaction.options.getUser("usuario");
      const dbUser = await userService.createUser(target.id, target.username);
      const formatted = dbUser.balance.toLocaleString("es-DO");

      const embed = makeEmbed(
        "base",
        "Balance",
        `El balance de \`${target.username}\` (<@${target.id}>) es: **${config.emojis.coin}${formatted}**`
      );

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === "top-10") {
      const topUsers = await userService.getTopUsers(10);
      if (!topUsers.length) {
        const embed = makeEmbed("info", "Leaderboard", "No hay usuarios registrados aún.");
        return interaction.reply({ embeds: [embed] });
      }

      const lines = topUsers.map((user, index) =>
        `${index + 1}. \`${user.username}\` - **${config.emojis.coin}${user.balance.toLocaleString()}**`
      );

      const embed = makeEmbed(
        "base",
        "🏦 Top 10 más ricos de Arkania",
        lines.join("\n")
      );

      return interaction.reply({ embeds: [embed] });
    }
  }
};
