const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../core.json");

const COIN = config.emojis.coin;

function buildProfileContainer(user, dbUser) {
  const level = dbUser.level || 1;
  const xp = dbUser.xp || 0;
  const nextLevelXp = level * 100;
  
  return new ContainerBuilder()
    .setAccentColor(0x3498DB) // Un azul bonito
    .addTextDisplayComponents(t => 
      t.setContent(`## Perfil de ${user.username}`)
    )
    .addSeparatorComponents(s => s)
    .addTextDisplayComponents(t =>
      t.setContent(`**💰 Balance:** ${COIN} ${dbUser.balance.toLocaleString("es-DO")}\n**🌟 Nivel:** ${level}\n**✨ Experiencia:** ${xp} / ${nextLevelXp} XP`)
    );
}

module.exports = {
  data: new SlashCommandBuilder()
      .setName("perfil")
      .setDescription("Muestra tu perfil o el de otros usuarios (nivel, XP y balance)")
      .addSubcommand(sub => sub.setName("mío").setDescription("Muestra tu propio perfil"))
      .addSubcommand(sub =>
          sub.setName("usuario").setDescription("Muestra el perfil de otro usuario")
              .addUserOption(o => o.setName("usuario").setDescription("Usuario a consultar").setRequired(true))
      )
      .addSubcommand(sub => sub.setName("top-10").setDescription("Los 10 usuarios con más monedas del servidor")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "mío") {
      const dbUser = await userService.createUser(interaction.user.id, interaction.user.username);
      const container = buildProfileContainer(interaction.user, dbUser);
      
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (sub === "usuario") {
      const target = interaction.options.getUser("usuario");
      const dbUser = await userService.createUser(target.id, target.username);
      const container = buildProfileContainer(target, dbUser);
      
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (sub === "top-10") {
      const topUsers = await userService.getTopUsers(10);
      if (!topUsers.length) {
        return interaction.reply({ content: "Nadie tiene stats todavía. ¡Sean los primeros!", flags: MessageFlags.Ephemeral });
      }

      const lines = topUsers.map((u, index) =>
          `**${index + 1}.** \`${u.username}\` — **${COIN}${u.balance.toLocaleString()}** | Nvl: ${u.level || 1}`
      ).join("\n");

      const container = new ContainerBuilder()
        .setAccentColor(0xF1C40F) // Dorado para el top
        .addTextDisplayComponents(t => t.setContent(`### 🏆 Los 10 más ricos del servidor\n\n${lines}`));

      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
