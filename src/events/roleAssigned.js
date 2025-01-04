const { Events, EmbedBuilder } = require("discord.js");
const assets = require('../../assets.json');

const BOOSTER_ROLE_ID = "1241182617504579594";
const VIP_ROLE_ID = "1303816942326648884";
const MONITORED_ROLES = [BOOSTER_ROLE_ID, VIP_ROLE_ID];
const NOTIFICATION_CHANNEL_ID = "1173781298721063014";

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const addedRoleId = MONITORED_ROLES.find(roleId => 
      !oldMember.roles.cache.has(roleId) && newMember.roles.cache.has(roleId)
    );

    if (!addedRoleId) return;

    const notificationChannel = newMember.guild.channels.cache.get(NOTIFICATION_CHANNEL_ID);
    if (!notificationChannel) return;

    if (addedRoleId === BOOSTER_ROLE_ID) {
      try {
        await newMember.roles.add(VIP_ROLE_ID);
        await newMember.send("¡Gracias por el boost🚀, tu apoyo es increíble! Como agradecimiento, se te ha asignado el rol **VIP**. ¡Disfrútalo!");
      } catch (error) {
        console.error(`Error al asignar el rol VIP a ${newMember.user.tag}:`, error);
      }
    }

      const notificationEmbed = new EmbedBuilder()
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setColor(assets.color.base)
        .setDescription(
          `* ¡Nuevo miembro VIP! ✨\n` +
          `* Utiliza \`/help\` para ver tus beneficios.`
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setImage('https://cdn.discordapp.com/attachments/860528686403158046/1108384769147932682/ezgif-2-f41b6758ff.gif?ex=677a8841&is=677936c1&hm=131c750f96d8c1c518862c13dd61850c4c3566e9585e33a75fbbe41c3cddd420&')

      try {
        await notificationChannel.send({
          content: `<@${newMember.user.id}>`,
          embeds: [notificationEmbed],
        });
      } catch (error) {
        console.error(`Error al enviar la notificación para ${newMember.user.tag}:`, error);
      }
    }
}
