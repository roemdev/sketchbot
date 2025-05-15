const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const assets = require("../../../../config/assets.json");
const { updateUserBalance } = require("./utils/userBalanceUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("diario")
    .setDescription("Reclama tu recompensa diaria según tu rol."),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const roles = interaction.member.roles.cache;
    const author = {
      name: interaction.user.displayName,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    };

    try {
      // Obtener las recompensas y cooldowns desde la base de datos
      const [roleRewards] = await connection.query(
        "SELECT id, role_id, reward FROM curr_role_rewards WHERE role_id IN (?) ORDER BY reward DESC",
        [roles.map(role => role.id)]
      );

      if (!roleRewards.length) {
        return interaction.reply({
          content: `${assets.emoji.deny} No tienes un rol con recompensa diaria asignada.`,
        });
      }

      const COOLDOWN_SECONDS = 8 * 60 * 60;
      const cooldownDuration = COOLDOWN_SECONDS * 1000;

      // Verificar cooldown desde la tabla 'cooldowns'
      const [cooldownResult] = await connection.execute(
        "SELECT daily FROM cooldowns WHERE user_id = ?",
        [userId]
      );

      const lastUsed = cooldownResult[0]?.daily;
      const now = new Date();

      if (lastUsed && new Date(lastUsed) > now - cooldownDuration) {
        const nextAvailable = new Date(new Date(lastUsed).getTime() + cooldownDuration);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setTitle(`${assets.emoji.deny} Recompensa reclamada`)
              .setDescription(`Ya has reclamado tu recompensa diaria. La próxima estará disponible <t:${Math.floor(nextAvailable.getTime() / 1000)}:R>⏳.`),
          ],
        });
      }

      // Calcular recompensa total
      let totalReward = 0;
      let rewardDetails = roleRewards
        .map(({ role_id, reward }) => {
          totalReward += Number(reward);
          return `<@&${role_id}> • **${Number(reward).toLocaleString()}**🪙`;
        })
        .join("\n");

      // Actualizar el balance
      await updateUserBalance(connection, userId, totalReward);

      // Registrar nuevo cooldown en tabla 'cooldowns'
      const nextCooldown = new Date(now.getTime() + cooldownDuration);
      await connection.execute(
        `INSERT INTO cooldowns (user_id, daily)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE daily = VALUES(daily)`,
        [userId, nextCooldown]
      );

      // Responder con éxito
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setAuthor(author)
            .setColor(assets.color.green)
            .setDescription(`¡Aquí tienes tus monedas de hoy!\n>>> ${rewardDetails}`)
        ],
      });

    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: "❌ Hubo un error al intentar reclamar tu recompensa diaria. Inténtalo de nuevo más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
