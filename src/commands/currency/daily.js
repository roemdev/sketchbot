const { SlashCommandSubcommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const assets = require("../../../assets.json");
const { updateUserBalance } = require("../../utilities/userBalanceUtils");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
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
      // Obtener las recompensas y cooldown desde la base de datos
      const [roleRewards] = await connection.query(
        "SELECT id, role_id, reward, cooldown FROM curr_role_rewards WHERE role_id IN (?) ORDER BY reward DESC",
        [roles.map((role) => role.id)]
      );

      if (!roleRewards.length) {
        return interaction.reply({
          content: `${assets.emoji.deny} No tienes un rol con recompensa diaria asignada.`,
        });
      }

      // Obtener el cooldown en segundos
      const cooldownSeconds = roleRewards[0].cooldown;
      const cooldownDuration = cooldownSeconds * 1000; // Convertir a milisegundos

      // Verificar cooldown
      const [cooldownData] = await connection.query(
        "SELECT last_used FROM curr_cooldowns WHERE user_id = ? AND action_type = 'daily'",
        [userId]
      );

      const now = new Date();
      if (cooldownData.length && cooldownData[0].last_used) {
        const lastUsedUTC = new Date(cooldownData[0].last_used);
        if (now - lastUsedUTC < cooldownDuration) {
          const nextClaim = new Date(lastUsedUTC.getTime() + cooldownDuration);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setTitle(`${assets.emoji.deny} Recompensa reclamada`)
                .setDescription(`Ya has reclamado tu recompensa diaria. La próxima estará lista <t:${Math.floor(nextClaim.getTime() / 1000)}:R>⏳.`),
            ],
          });
        }
      }

      // Calcular la recompensa total y generar detalles
      let totalReward = 0;
      let rewardDetails = roleRewards
        .map(({ role_id, reward }) => {
          totalReward += Number(reward);
          return `<@&${role_id}> ⏣**${Number(reward).toLocaleString()}**`;
        })
        .join("\n");

      // Actualizar el balance del usuario
      await updateUserBalance(connection, userId, totalReward);

      // Registrar el cooldown en la tabla (con la fecha actual en formato compatible con MySQL)
      const currentUTC = new Date();
      const formattedUTC = currentUTC.toISOString().slice(0, 19).replace("T", " "); // Formato: 'YYYY-MM-DD HH:MM:SS'

      await connection.query(
        "INSERT INTO curr_cooldowns (user_id, action_id, action_type, last_used) VALUES (?, ?, 'daily', ?) ON DUPLICATE KEY UPDATE last_used = VALUES(last_used)",
        [userId, roleRewards[0].id, formattedUTC]
      );

      // Responder con el embed detallado
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setAuthor(author)
            .setColor(assets.color.green)
            .setTitle(`${assets.emoji.check} Créditos reclamados`)
            .setDescription(`¡Aquí tienes tus créditos de hoy!\n> ${rewardDetails}`)
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
