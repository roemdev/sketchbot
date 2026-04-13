const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../core.json");

const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("balance")
      .setDescription("Muestra balances de usuarios")
      .addSubcommand(sub => sub.setName("mío").setDescription("Muestra tu propio balance"))
      .addSubcommand(sub =>
          sub.setName("usuario").setDescription("Muestra el balance de otro usuario")
              .addUserOption(o => o.setName("usuario").setDescription("Usuario a consultar").setRequired(true))
      )
      .addSubcommand(sub => sub.setName("top-10").setDescription("Los 10 más ricos del servidor")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "mío") {
      const dbUser = await userService.createUser(interaction.user.id, interaction.user.username);
      return interaction.reply({
        content: `Tienes **${COIN}${dbUser.balance.toLocaleString("es-DO")}** en tu bolsillo.`,
      });
    }

    if (sub === "usuario") {
      const target = interaction.options.getUser("usuario");
      const dbUser = await userService.createUser(target.id, target.username);
      return interaction.reply({
        content: `**${target.username}** tiene **${COIN}${dbUser.balance.toLocaleString("es-DO")}**.`,
      });
    }

    if (sub === "top-10") {
      const topUsers = await userService.getTopUsers(10);
      if (!topUsers.length) {
        return interaction.reply({ content: "Nadie tiene monedas todavía. Sean los primeros." });
      }

      const lines = topUsers.map((user, index) =>
          `**${index + 1}.** \`${user.username}\` — **${COIN}${user.balance.toLocaleString()}**`
      ).join("\n");

      return interaction.reply({ content: `🏆 **Los 10 más ricos del servidor**\n\n${lines}` });
    }
  }
};