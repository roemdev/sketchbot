const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription(
      "Agrega o quita un rol a un usuario o a todos los miembros."
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption((option) =>
      option
        .setName("acción")
        .setDescription("Acción a realizar: agregar o quitar el rol.")
        .setRequired(true)
        .addChoices(
          { name: "agregar", value: "add" },
          { name: "quitar", value: "remove" }
        )
    )
    .addRoleOption((option) =>
      option
        .setName("rol")
        .setDescription("El rol que deseas agregar o quitar.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("opción")
        .setDescription("Aplica el cambio a un usuario o a todos los miembros.")
        .setRequired(true)
        .addChoices(
          { name: "Usuario", value: "usuario" },
          { name: "Todos", value: "all" }
        )
    )
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription(
          "Usuario al que deseas aplicar el cambio (solo si elegiste 'usuario')."
        )
    ),

  async execute(interaction) {
    const { options, guild, member } = interaction;

    const action = options.getString("acción");
    const role = options.getRole("rol");
    const option = options.getString("opción");
    const user = options.getUser("usuario");

    // Verificar permisos y jerarquía
    if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const warnEmbed = new EmbedBuilder()
        .setColor(assets.color.red)
        .setDescription(
          `${assets.emoji.deny} <@${interaction.user.id}>: No tienes permisos para gestionar roles.`
        );
      return interaction.reply({
        embeds: [warnEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (role.position >= guild.members.me.roles.highest.position) {
      const hierarchyEmbed = new EmbedBuilder()
        .setColor(assets.color.red)
        .setDescription(
          `${assets.emoji.deny} <@${interaction.user.id}>: No puedo gestionar este rol debido a su jerarquía.`
        );
      return interaction.reply({
        embeds: [hierarchyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (option === "usuario") {
      if (!user) {
        const userEmbed = new EmbedBuilder()
          .setColor(assets.color.yellow)
          .setDescription(
            `${assets.emoji.warn} <@${interaction.user.id}>: Debes seleccionar un usuario para esta opción.`
          );
        return interaction.reply({
          embeds: [userEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }

      const targetMember = guild.members.cache.get(user.id);
      if (!targetMember) {
        const notFoundEmbed = new EmbedBuilder()
          .setColor(assets.color.yellow)
          .setDescription(
            `${assets.emoji.warn} <@${interaction.user.id}>: No se encontró al usuario en este servidor.`
          );
        return interaction.reply({
          embeds: [notFoundEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (targetMember.user.bot) {
        const botEmbed = new EmbedBuilder()
          .setColor(assets.color.yellow)
          .setDescription(
            `${assets.emoji.warn} <@${interaction.user.id}>: No puedes gestionar roles de los bots.`
          );
        return interaction.reply({
          embeds: [botEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }

      const hasRole = targetMember.roles.cache.has(role.id);
      const embed = new EmbedBuilder();

      if ((action === "add" && hasRole) || (action === "remove" && !hasRole)) {
        embed
          .setColor(assets.color.yellow)
          .setDescription(
            `${assets.emoji.warn} <@${interaction.user.id}>: El usuario <@${
              user.id
            }> ${hasRole ? "ya tiene" : "no tiene"} el rol <@&${role.id}>.`
          );
      } else {
        await (action === "add"
          ? targetMember.roles.add(role)
          : targetMember.roles.remove(role));
        embed
          .setColor(assets.color.green)
          .setDescription(
            `${assets.emoji.check} <@${interaction.user.id}>: Se ${
              action === "add" ? "**agregó**" : "**quitó**"
            } el rol <@&${role.id}> a <@${user.id}>.`
          );
      }

      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } else if (option === "all") {
      const members = await guild.members.fetch();
      const embed = new EmbedBuilder().setColor(assets.color.green);
      let affectedMembers = 0;

      for (const guildMember of members.values()) {
        if (guildMember.user.bot) continue;

        const hasRole = guildMember.roles.cache.has(role.id);
        const roleAction =
          action === "add" && !hasRole
            ? guildMember.roles.add(role)
            : action === "remove" && hasRole
            ? guildMember.roles.remove(role)
            : null;

        if (roleAction) {
          await roleAction.catch(() => null);
          affectedMembers++;
        }
      }

      embed.setDescription(
        `${assets.emoji.check} <@${interaction.user.id}>: Se le ha ${
          action === "add" ? "**agregado**" : "**quitado**"
        } el rol <@&${role.id}> ${
          affectedMembers > 0
            ? `a **${affectedMembers} miembro(s)**.`
            : "pero no hubo cambios."
        }`
      );

      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
