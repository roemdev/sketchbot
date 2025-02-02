const { SlashCommandSubcommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const assets = require("../../../../assets.json");
const { updateUserBalance } = require("../utils/updateUserBalance"); // Asegúrate de que esta función esté correctamente implementada

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("diario")
    .setDescription("Reclama tu recompensa diaria según tu rol."),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const roles = interaction.member.roles.cache;
    const cooldownDuration = 86400000; // 24 horas en milisegundos
    const author = {
      name: interaction.user.displayName,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    };

    try {
      // Verificar cooldown
      const [cooldownData] = await connection.query(
        "SELECT daily FROM currency_users_cooldowns WHERE user_id = ?",
        [userId]
      );

      const now = new Date();
      if (cooldownData.length && cooldownData[0].daily && new Date(cooldownData[0].daily) > now) {
        const nextClaim = new Date(cooldownData[0].daily);
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setTitle(`${assets.emoji.deny} Recompensa reclamada`)
              .setDescription(`Ya has reclamado tu recompensa diaria. La próxima estará lista <t:${Math.floor(nextClaim.getTime() / 1000)}:R>.`),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Obtener todas las recompensas individuales según los roles del usuario
      const [roleRewards] = await connection.query(
        "SELECT role_id, reward_amount FROM currency_roles_rewards WHERE role_id IN (?) ORDER BY reward_amount DESC",
        [roles.map((role) => role.id)]
      );

      if (!roleRewards.length) {
        return interaction.reply({
          content: `${assets.emoji.deny} No tienes un rol con recompensa diaria asignada.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Construir los detalles de la recompensa
      let totalReward = 0;
      let rewardDetails = roleRewards
        .map(({ role_id, reward_amount }) => {
          // Usamos el ID del rol y lo etiquetamos con <@&role_id>
          totalReward += Number(reward_amount);
          return `* **<@&${role_id}>** ⏣ ${Number(reward_amount).toLocaleString()}`;
        })
        .join("\n");

      // Actualizar el balance del usuario
      await updateUserBalance(connection, userId, totalReward);

      // Actualizar el cooldown
      const nextDaily = new Date(now.getTime() + cooldownDuration);
      await connection.query(
        "INSERT INTO currency_users_cooldowns (user_id, daily) VALUES (?, ?) ON DUPLICATE KEY UPDATE daily = VALUES(daily)",
        [userId, nextDaily]
      );

      // Responder con el embed detallado
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setAuthor(author)
            .setColor(assets.color.green)
            .setTitle(`${assets.emoji.check} Créditos reclamados`)
            .setDescription(`¡Aquí tienes tus créditos de hoy!\n\n${rewardDetails}`)
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
