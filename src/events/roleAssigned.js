const { Events, EmbedBuilder } = require("discord.js");
const assets = require("../../config/assets.json");

const BOOSTER_ROLE_ID = "1241182617504579594";
const VIP_ROLE_ID = "1330908811946496103";
const MONITORED_ROLES = [BOOSTER_ROLE_ID, VIP_ROLE_ID];

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const connection = newMember.client.dbConnection;
    const systemChannel = newMember.guild.systemChannel;
    if (!systemChannel) return;

    const addedRoleId = MONITORED_ROLES.find(
      (roleId) =>
        !oldMember.roles.cache.has(roleId) && newMember.roles.cache.has(roleId)
    );

    if (!addedRoleId) return;

    if (addedRoleId === BOOSTER_ROLE_ID) {
      const boosterEmbed = new EmbedBuilder()
        .setAuthor({ name: newMember.user.displayName, iconURL: newMember.user.displayAvatarURL({ dynamic: true }) })
        .setColor(assets.color.base)
        .setTitle(`${assets.emoji.boost} BOOST`)
        .setDescription(`* ¡Gracias por ese fantástico boost!\n* Disfruta de tus beneficios.`)
        .setThumbnail(newMember.user.displayAvatarURL());

      try {
        await connection.query(`
          UPDATE curr_users SET vip = 1 WHERE id = ?
        `, [newMember.user.id]);
      } catch (error) {
        await systemChannel.send({
          content: `<@${newMember.user.id}>`,
          embeds: [boosterEmbed]
        });
        console.error(
          `Error al enviar la notificación para ${newMember.user.tag}:`,
          error
        );
      }
      return;
    }

    if (addedRoleId === VIP_ROLE_ID) {
      const vipEmbed = new EmbedBuilder()
        .setAuthor({ name: newMember.user.displayName, iconURL: newMember.user.displayAvatarURL({ dynamic: true }) })
        .setColor(assets.color.base)
        .setTitle("⭐VIP")
        .setDescription(`* ¡Felicidades, ahora eres VIP!\n* Disfruta de tus beneficios.`)
        .setThumbnail(newMember.user.displayAvatarURL());

      try {
        await connection.query(`
          UPDATE curr_users SET vip = 1 WHERE id = ?
        `, [newMember.user.id]);

        await systemChannel.send({
          content: `<@${newMember.user.id}>`,
          embeds: [vipEmbed],
        });
      } catch (error) {
        console.error(
          `Error al enviar la notificación para ${newMember.user.tag}:`,
          error
        );
      }
    }
  },
};
