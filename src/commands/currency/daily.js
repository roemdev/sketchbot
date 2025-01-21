const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandBuilder()
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
      if (
        cooldownData.length &&
        cooldownData[0].daily &&
        new Date(cooldownData[0].daily) > now
      ) {
        const nextClaim = new Date(cooldownData[0].daily);
        return interaction.reply({
          content: `⏳ Ya has reclamado tu recompensa diaria. Puedes volver a intentarlo <t:${Math.floor(
            nextClaim.getTime() / 1000
          )}:R>.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Buscar roles del usuario y la recompensa más alta
      const [roleRewards] = await connection.query(
        "SELECT reward_amount FROM currency_roles_rewards WHERE role_id IN (?) ORDER BY reward_amount DESC LIMIT 1",
        [roles.map((role) => role.id)]
      );

      if (!roleRewards.length) {
        return interaction.reply({
          content: `${assets.emoji.deny} No tienes un rol con recompensa diaria asignada.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const reward = roleRewards[0].reward_amount;

      // Actualizar saldo del usuario
      await connection.query(
        "UPDATE currency_users SET balance = balance + ? WHERE user_id = ?",
        [reward, userId]
      );

      // Actualizar cooldown
      const nextDaily = new Date(now.getTime() + cooldownDuration);

      await connection.query(
        "INSERT INTO currency_users_cooldowns (user_id, daily) VALUES (?, ?) ON DUPLICATE KEY UPDATE daily = VALUES(daily)",
        [userId, nextDaily]
      );

      // Responder al usuario
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setAuthor(author)
            .setColor(assets.color.green)
            .setTitle("Recompensa diaria")
            .setDescription(
              `Has reclamado tu recompensa diaria y has obtenido **🔸${reward}** créditos!`
            ),
        ],
      });
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content:
          "❌ Hubo un error al intentar reclamar tu recompensa diaria. Inténtalo de nuevo más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
