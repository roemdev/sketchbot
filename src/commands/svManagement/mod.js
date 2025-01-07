const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../assets.json");

const bans = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Comando de moderación para banear, expulsar, y más.")
    .addStringOption((option) =>
      option
        .setName("acción")
        .setDescription("Acción que deseas realizar (ban, kick).")
        .setRequired(true)
        .addChoices(
          { name: "ban", value: "ban" },
          { name: "kick", value: "kick" }
        )
    )
    .addUserOption((option) =>
      option
        .setName("miembro")
        .setDescription("El miembro que deseas afectar.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("razón")
        .setDescription("Razón de la acción.")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("eliminar_mensajes")
        .setDescription("¿Eliminar los últimos mensajes del usuario?")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.user;
    const action = interaction.options.getString("acción");
    const member = interaction.options.getUser("miembro");
    const reason = interaction.options.getString("razón") || "No especificada.";
    const deleteMsgs =
      interaction.options.getBoolean("eliminar_mensajes") || false;
    const memberId = await interaction.guild.members.fetch(member.id);

    const allowedRoles = {
      "991490018151514123": 2,
      "1251292331852697623": 3,
    };

    const userRole = interaction.member.roles.cache.find((r) =>
      Object.keys(allowedRoles).includes(r.id)
    );
    if (!userRole) {
      const embed = new EmbedBuilder()
        .setColor(assets.color.yellow)
        .setDescription(
          `${assets.emoji.warn} <@${interaction.user.id}>: No tienes **permiso** para ejecutar este comando.`
        );
      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const actionLimit = allowedRoles[userRole.id];
    const userId = interaction.member.id;

    const now = Date.now();
    if (!bans.has(userId)) {
      bans.set(userId, { count: 0, resetTime: now + 3600000 });
    }

    const userData = bans.get(userId);

    if (now > userData.resetTime) {
      userData.count = 0;
      userData.resetTime = now + 3600000;
    }

    if (userData.count >= actionLimit) {
      const timestampReset = Math.floor(userData.resetTime / 1000);
      const embed = new EmbedBuilder()
        .setColor(assets.color.yellow)
        .setDescription(
          `${assets.emoji.warn} <@${interaction.user.id}>: Has alcanzado el límite de acciones **(${actionLimit}/${actionLimit})**. Podrás realizar otra acción <t:${timestampReset}:R>.`
        );
      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (action === "ban" && (!memberId || !memberId.bannable)) {
      const embed = new EmbedBuilder()
        .setColor(assets.color.red)
        .setDescription(
          `${assets.emoji.warn} <@${interaction.user.id}>: Hubo un error al **banear** al usuario.`
        );
      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (action === "kick" && (!memberId || !memberId.kickable)) {
      const embed = new EmbedBuilder()
        .setColor(assets.color.red)
        .setDescription(
          `${assets.emoji.warn} <@${interaction.user.id}>: Hubo un error al **expulsar** al usuario.`
        );
      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      if (deleteMsgs) {
        const messages = await interaction.channel.messages.fetch({
          limit: 100,
        });
        const memberMsgs = messages.filter(
          (msg) => msg.author.id === member.id
        );
        await interaction.channel.bulkDelete(memberMsgs, true);
      }

      const embedDM = new EmbedBuilder()
        .setColor(assets.color.base)
        .setDescription(
          `Has sido **${
            action === "ban" ? "baneado" : "expulsado"
          }** del servidor **${
            interaction.guild.name
          }**.\nRazón: **${reason}**.`
        );

      await member.send({ embeds: [embedDM] }).catch(() => {
        const embed = new EmbedBuilder()
          .setColor(assets.color.yellow)
          .setDescription(
            `${assets.emoji.warn} No se pudo enviar el mensaje al usuario.`
          );
        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
      });

      if (action === "ban") {
        await memberId.ban({ reason: reason });
      } else if (action === "kick") {
        await memberId.kick({ reason: reason });
      }

      userData.count += 1;
      bans.set(userId, userData);

      const timestampReset = Math.floor(userData.resetTime / 1000);
      const remainingActions = actionLimit - userData.count;

      const embed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setDescription(
          `El miembro **${member.tag}** ha sido **${
            action === "ban" ? "baneado" : "expulsado"
          }**.\nAcciones restantes: **(${remainingActions}/${actionLimit})**. Reinicio: <t:${timestampReset}:R>.`
        );
      await interaction.reply({ embeds: [embed] });

      const actionChannel = interaction.guild.channels.cache.get(
        "1284140644843126794"
      );
      if (actionChannel) {
        const channelEmbed = new EmbedBuilder()
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setTitle(`Miembro ${action === "ban" ? "baneado" : "expulsado"}`)
          .setColor(assets.color.base)
          .setDescription(
            `He ${action === "ban" ? "baneado" : "expulsado"} a **${
              member.tag
            }**.\nRazón: **${reason}**.`
          )
          .setTimestamp()
          .setFooter({ text: "ArkaniaBot logs" });

        await actionChannel.send({ embeds: [channelEmbed] });
      }
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setColor(assets.color.red)
        .setDescription(
          `${assets.emoji.warn} <@${interaction.user.id}>: Hubo un error al **${
            action === "ban" ? "banear" : "expulsar"
          }** al usuario.`
        );
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
