const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');
const assets = require('../../../../config/assets.json');
const { updateUserBalance } = require("./utils/userBalanceUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setName('daily-msg')
    .setDescription('Recompensa diaria - mensaje'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const roles = interaction.member.roles.cache;

    const embed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setTitle('¡Recompensa diaria disponible!')
      .setDescription('Ya puedes reclamar tus monedas diarias. ¡Pulsa el botón!')
      .setTimestamp();

    const claimButton = new ButtonBuilder()
      .setCustomId('claim')
      .setEmoji('💰')
      .setLabel('Reclamar')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(claimButton);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const message = await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.deleteReply();

    const collector = message.createMessageComponentCollector();

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.customId === 'claim') {
        try {
          const [roleRewards] = await connection.query(
            "SELECT id, role_id, reward, cooldown FROM curr_role_rewards WHERE role_id IN (?) ORDER BY reward DESC",
            [roles.map((role) => role.id)]
          );

          if (!roleRewards.length) {
            return buttonInteraction.reply({
              embeds: [new EmbedBuilder().setColor(assets.color.red).setDescription(`${assets.emoji.deny} No tienes ningún rol con recompensa.`)],
              flags: MessageFlags.Ephemeral,
            });
          }

          const cooldownSeconds = roleRewards[0].cooldown;
          const cooldownDuration = cooldownSeconds * 1000;

          const [cooldownData] = await connection.query(
            "SELECT last_used FROM curr_cooldowns WHERE user_id = ? AND action_type = 'daily'",
            [userId]
          );

          const now = new Date();
          if (cooldownData.length && cooldownData[0].last_used) {
            const lastUsedUTC = new Date(cooldownData[0].last_used);
            if (now - lastUsedUTC < cooldownDuration) {
              const nextClaim = new Date(lastUsedUTC.getTime() + cooldownDuration);
              return buttonInteraction.reply({
                embeds: [
                  new EmbedBuilder()
                    .setColor(assets.color.yellow)
                    .setDescription(`Ya has reclamado tu recompensa diaria.\n> La próxima estará lista <t:${Math.floor(nextClaim.getTime() / 1000)}:R> ⏳.`),
                ],
                flags: MessageFlags.Ephemeral,
              });
            }
          }

          let totalReward = 0;
          let rewardDetails = roleRewards
            .map(({ role_id, reward }) => {
              totalReward += Number(reward);
              return `<@&${role_id}> ⏣**${Number(reward).toLocaleString()}**`;
            })
            .join("\n");

          await updateUserBalance(connection, userId, totalReward);

          const currentUTC = new Date();
          const formattedUTC = currentUTC.toISOString().slice(0, 19).replace("T", " ");

          await connection.query(
            "INSERT INTO curr_cooldowns (user_id, action_id, action_type, last_used) VALUES (?, ?, 'daily', ?) ON DUPLICATE KEY UPDATE last_used = VALUES(last_used)",
            [userId, roleRewards[0].id, formattedUTC]
          );

          return buttonInteraction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.green)
                .setDescription(`¡Aquí tienes tus créditos de hoy!\n>>> ${rewardDetails}\n\n**Total:** ⏣**${totalReward.toLocaleString()}**`),
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
      }
    });
  }
};