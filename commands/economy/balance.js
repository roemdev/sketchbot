const { SlashCommandBuilder } = require("discord.js");
const { makeContainer, CV2 } = require("../../utils/ui");
const userService = require("../../services/userService");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Muestra balances de usuarios")
    .addSubcommand((sub) =>
      sub.setName("mío").setDescription("Muestra tu propio balance")
    )
    .addSubcommand((sub) =>
      sub
        .setName("usuario")
        .setDescription("Muestra el balance de un usuario específico")
        .addUserOption((opt) =>
          opt.setName("usuario").setDescription("Usuario a consultar").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("top-10").setDescription("Muestra el leaderboard con los top usuarios")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const coin = config.emojis.coin;

    if (sub === "mío") {
      const user = await userService.createUser(interaction.user.id, interaction.user.username);
      return interaction.reply({
        components: [makeContainer("base", "Balance", `Tu balance: **${coin}${user.balance.toLocaleString("es-DO")}**`)],
        flags: CV2,
      });
    }

    if (sub === "usuario") {
      const target = interaction.options.getUser("usuario");
      const user = await userService.createUser(target.id, target.username);
      return interaction.reply({
        components: [
          makeContainer(
            "base",
            "Balance",
            `Balance de \`${target.username}\` (<@${target.id}>): **${coin}${user.balance.toLocaleString("es-DO")}**`
          ),
        ],
        flags: CV2,
      });
    }

    if (sub === "top-10") {
      const topUsers = await userService.getTopUsers(10);

      if (!topUsers.length) {
        return interaction.reply({
          components: [makeContainer("info", "Leaderboard", "No hay usuarios registrados aún.")],
          flags: CV2,
        });
      }

      const lines = topUsers.map(
        (user, i) => `${i + 1}. \`${user.username}\` — **${coin}${user.balance.toLocaleString()}**`
      );

      return interaction.reply({
        components: [makeContainer("base", "🏦 Top 10 más ricos de Arkania", lines.join("\n"))],
        flags: CV2,
      });
    }
  },
};
