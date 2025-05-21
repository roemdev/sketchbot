const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionFlagsBits, } = require("discord.js");
  const assets = require("../../../../config/assets.json");
  const { updateUserBalance } = require("./utils/userBalanceUtils");
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
      .setName("daily-msg")
      .setDescription("Publica un mensaje con un botón para reclamar la recompensa diaria."),
  
    async execute(interaction) {
      const connection = interaction.client.dbConnection;
  
      const embed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle("⏰ ¡Recompensa diaria!")
        .setDescription("Presiona el botón debajo para reclamar tu recompensa.");
  
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("daily_button")
          .setLabel("Reclamar")
          .setEmoji("🪙")
          .setStyle(ButtonStyle.Primary)
      );
  
      // Responder epheméricamente al usuario y luego eliminar la respuesta
      await interaction.reply({
        content: "✅ Mensaje enviado.",
        flags: MessageFlags.Ephemeral,
      });
  
      await interaction.channel.send({
        embeds: [embed],
        components: [row],
      });
  
      // Asegurarse de no registrar múltiples listeners
      if (!interaction.client.dailyButtonHandlerRegistered) {
        interaction.client.on("interactionCreate", async buttonInteraction => {
          if (!buttonInteraction.isButton()) return;
          if (buttonInteraction.customId !== "daily_button") return;
  
          const connection = buttonInteraction.client.dbConnection;
          const userId = buttonInteraction.user.id;
          const roles = buttonInteraction.member.roles.cache;
          const author = {
            name: buttonInteraction.user.displayName,
            iconURL: buttonInteraction.user.displayAvatarURL({ dynamic: true }),
          };
  
          try {
            const [roleRewards] = await connection.query(
              "SELECT id, role_id, reward FROM curr_role_rewards WHERE role_id IN (?) ORDER BY reward DESC",
              [roles.map(role => role.id)]
            );
  
            if (!roleRewards.length) {
              return buttonInteraction.reply({
                content: `${assets.emoji.deny} No tienes un rol con recompensa diaria asignada.`,
                flags: MessageFlags.Ephemeral,
              });
            }
  
            const COOLDOWN_SECONDS = 9 * 60 * 60;
            const cooldownDuration = COOLDOWN_SECONDS * 1000;
  
            const [cooldownResult] = await connection.execute(
              "SELECT daily FROM cooldowns WHERE user_id = ?",
              [userId]
            );
  
            const lastUsed = cooldownResult[0]?.daily;
            const now = new Date();
  
            if (lastUsed && new Date(lastUsed) > now - cooldownDuration) {
              const nextAvailable = new Date(new Date(lastUsed).getTime() + cooldownDuration);
              return buttonInteraction.reply({
                embeds: [
                  new EmbedBuilder()
                    .setColor(assets.color.red)
                    .setTitle(`${assets.emoji.deny} Recompensa reclamada`)
                    .setDescription(`Ya has reclamado tu recompensa diaria.\nLa próxima estará disponible <t:${Math.floor(nextAvailable.getTime() / 1000)}:R>⏳.`),
                ],
                flags: MessageFlags.Ephemeral,
              });
            }
  
            let totalReward = 0;
            let rewardDetails = roleRewards
              .map(({ role_id, reward }) => {
                totalReward += Number(reward);
                return `<@&${role_id}> • **${Number(reward).toLocaleString()}**🪙`;
              })
              .join("\n");
  
            await updateUserBalance(connection, userId, totalReward);
  
            const nextCooldown = new Date(now.getTime() + cooldownDuration);
            await connection.execute(
              `INSERT INTO cooldowns (user_id, daily)
               VALUES (?, ?)
               ON DUPLICATE KEY UPDATE daily = VALUES(daily)`,
              [userId, nextCooldown]
            );
  
            return buttonInteraction.reply({
              embeds: [
                new EmbedBuilder()
                  .setAuthor(author)
                  .setColor(assets.color.green)
                  .setDescription(`¡Aquí tienes tus monedas de hoy!\n>>> ${rewardDetails}`),
              ],
              flags: MessageFlags.Ephemeral,
            });
  
          } catch (error) {
            console.error(error);
            return buttonInteraction.reply({
              content: "❌ Hubo un error al intentar reclamar tu recompensa diaria. Inténtalo de nuevo más tarde.",
              flags: MessageFlags.Ephemeral,
            });
          }
        });
  
        // Marcar que ya fue registrado
        interaction.client.dailyButtonHandlerRegistered = true;
      }
    },
  };
  