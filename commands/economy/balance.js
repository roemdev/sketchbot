const { SlashCommandBuilder } = require("discord.js");
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
        content: `Cuentas con **${user.balance.toLocaleString("es-DO")}** ${coin} monedas en el bolsillo. Nada mal. 👀`,
      });
    }

    if (sub === "usuario") {
      const target = interaction.options.getUser("usuario");
      const user = await userService.createUser(target.id, target.username);
      return interaction.reply({
        content: `A ver, a ver... \`${target.username}\` (<@${target.id}>) tiene **${user.balance.toLocaleString("es-DO")}** ${coin} monedas. ¡Uy, mira quién tiene plata!`,
      });
    }

    if (sub === "top-10") {
      const topUsers = await userService.getTopUsers(10);

      if (!topUsers.length) {
        return interaction.reply({
          content: "Vaya, parece que estamos en crisis. No hay usuarios registrados aún en el Top.",
        });
      }

      const lines = topUsers.map(
        (user, i) => `**${i + 1}.** \`${user.username}\` — **${user.balance.toLocaleString()}** ${coin}`
      );

      return interaction.reply({
        content: `### 🏦 Top 10 más ricos de Arkania\nLos verdaderos magnates del servidor:\n\n${lines.join("\n")}`,
      });
    }
  },
};
