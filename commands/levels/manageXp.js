const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");
const XP = config.emojis.xp || "✨";

module.exports = {
  data: new SlashCommandBuilder()
      .setName("manage-xp")
      .setDescription("Administra el nivel y experiencia de un usuario")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub =>
          sub.setName("add")
              .setDescription("Añade XP a un usuario")
              .addUserOption(o => o.setName("user").setDescription("Usuario a modificar").setRequired(true))
              .addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad de XP a añadir").setMinValue(1).setRequired(true))
      )
      .addSubcommand(sub =>
          sub.setName("set")
              .setDescription("Establece el nivel y XP de un usuario")
              .addUserOption(o => o.setName("user").setDescription("Usuario a modificar").setRequired(true))
              .addIntegerOption(o => o.setName("nivel").setDescription("Nivel").setMinValue(1).setRequired(true))
              .addIntegerOption(o => o.setName("xp").setDescription("XP").setMinValue(0).setRequired(true))
      )
      .addSubcommand(sub =>
          sub.setName("remove")
              .setDescription("Quita XP a un usuario")
              .addUserOption(o => o.setName("user").setDescription("Usuario a modificar").setRequired(true))
              .addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad de XP a remover").setMinValue(1).setRequired(true))
      ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser("user");
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Asegurar que el usuario tiene un perfil registrado en la base de datos
    await userService.createUser(targetUser.id, targetUser.username);

    if (subcommand === "add") {
      const amount = interaction.options.getInteger("cantidad");
      const xpInfo = await userService.addXp(targetUser.id, amount, targetUser.username);

      let levelUpRewardText = "";
      if (xpInfo && xpInfo.leveledUp) {
        // Otorgar recompensa de monedas por nivel
        const baseCoin = config.levels.baseCoinReward || 10000;
        const coinReward = xpInfo.level * baseCoin;
        await userService.addBalance(targetUser.id, coinReward, false);
        levelUpRewardText = `\n🎉 ¡Subió al **Nivel ${xpInfo.level}** **${XP}**! Recibió **${config.emojis.coin || "🪙"}${coinReward.toLocaleString("es-DO")}** monedas.`;

        // Asignar el rol del nivel si corresponde
        if (interaction.guild) {
          const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
          if (member) {
            try {
              const roleRewardService = require("../../services/roleRewardService");
              const syncResult = await roleRewardService.syncMemberRoles(member, xpInfo.level);
              if (syncResult.added.length > 0) {
                const addedRoleNames = syncResult.added.map(id => interaction.guild.roles.cache.get(id)?.name).filter(Boolean);
                levelUpRewardText += `\n🎖️ Se le otorgaron los roles: **${addedRoleNames.join(", ")}**.`;
              }
            } catch (e) {
              console.error("Error al asignar rol administrativo:", e);
            }
          }
        }
      }

      const panel = new ContainerBuilder()
        .setAccentColor(0x2ECC71) // Verde éxito
        .addTextDisplayComponents(t =>
          t.setContent(
            `### ✨ XP Añadida\n` +
            `Se añadieron **${XP}${amount.toLocaleString()}** XP a <@${targetUser.id}>.\n\n` +
            `🌟 **Nivel Actual:** **${xpInfo.level}**\n` +
            `✨ **XP Actual:** **${XP}${xpInfo.xp.toLocaleString()}** / **${userService.getXpNeededForLevel(xpInfo.level).toLocaleString()}** XP` +
            `${levelUpRewardText}`
          )
        );

      return interaction.editReply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
    }

    if (subcommand === "set") {
      const level = interaction.options.getInteger("nivel");
      const xp = interaction.options.getInteger("xp");

      // Validar que el XP no supere el límite del nivel establecido
      const maxXpForLevel = userService.getXpNeededForLevel(level);
      let finalXp = xp;
      if (xp >= maxXpForLevel) {
        finalXp = maxXpForLevel - 1; // Ajustamos para que no se autogratifique de forma incongruente
      }

      const xpInfo = await userService.setXpAndLevel(targetUser.id, level, finalXp, targetUser.username);

      // Asignar el rol del nivel si corresponde
      let roleText = "";
      if (interaction.guild) {
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (member) {
          try {
            const roleRewardService = require("../../services/roleRewardService");
            const syncResult = await roleRewardService.syncMemberRoles(member, xpInfo.level);
            if (syncResult.added.length > 0) {
              const addedRoleNames = syncResult.added.map(id => interaction.guild.roles.cache.get(id)?.name).filter(Boolean);
              roleText = `\n🎖️ Se le otorgaron los roles: **${addedRoleNames.join(", ")}**.`;
            }
            if (syncResult.removed.length > 0) {
              const removedRoleNames = syncResult.removed.map(id => interaction.guild.roles.cache.get(id)?.name).filter(Boolean);
              roleText += `\n➖ Se le removieron los roles: **${removedRoleNames.join(", ")}**.`;
            }
          } catch (e) {
            console.error("Error al asignar rol administrativo en SET:", e);
          }
        }
      }

      const panel = new ContainerBuilder()
        .setAccentColor(0x3498DB) // Azul info
        .addTextDisplayComponents(t =>
          t.setContent(
            `### ⚙️ Nivel y XP Establecidos\n` +
            `Se ha configurado manualmente la experiencia de <@${targetUser.id}>.\n\n` +
            `🌟 **Nivel:** **${xpInfo.level}**\n` +
            `✨ **XP:** **${XP}${xpInfo.xp.toLocaleString()}** / **${userService.getXpNeededForLevel(xpInfo.level).toLocaleString()}** XP` +
            `${roleText}`
          )
        );

      return interaction.editReply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
    }

    if (subcommand === "remove") {
      const amount = interaction.options.getInteger("cantidad");
      const xpInfo = await userService.removeXp(targetUser.id, amount);

      const panel = new ContainerBuilder()
        .setAccentColor(0xE74C3C) // Rojo peligro/remover
        .addTextDisplayComponents(t =>
          t.setContent(
            `### ➖ XP Removida\n` +
            `Se quitaron **${XP}${amount.toLocaleString()}** XP a <@${targetUser.id}>.\n\n` +
            `🌟 **Nivel Actual:** **${xpInfo.level}**\n` +
            `✨ **XP Actual:** **${XP}${xpInfo.xp.toLocaleString()}** / **${userService.getXpNeededForLevel(xpInfo.level).toLocaleString()}** XP`
          )
        );

      return interaction.editReply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
