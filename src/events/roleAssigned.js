const { Events, EmbedBuilder } = require("discord.js");
const assets = require("../../assets.json");

const BOOSTER_ROLE_ID = "1241182617504579594";
const VIP_ROLE_ID = "1303816942326648884";
const MONITORED_ROLES = [BOOSTER_ROLE_ID, VIP_ROLE_ID];

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const systemChannel = newMember.guild.systemChannel;
    if (!systemChannel) return;

    const addedRoleId = MONITORED_ROLES.find(
      (roleId) =>
        !oldMember.roles.cache.has(roleId) && newMember.roles.cache.has(roleId)
    );

    if (!addedRoleId) return;

    if (addedRoleId === BOOSTER_ROLE_ID) {
      try {
        // Asignar automáticamente el rol VIP
        await newMember.roles.add(VIP_ROLE_ID);

        // Enviar embed agradeciendo por el rol Booster
        const boosterEmbed = new EmbedBuilder()
          .setAuthor({ name: newMember.user.displayName, iconURL: newMember.user.displayAvatarURL({ dynamic: true }) })
          .setColor(assets.color.base)
          .setTitle(`${assets.emoji.boost} BOOST`)
          .setDescription(
            `* ¡Obtuviste el rol <@&${VIP_ROLE_ID}>!\n` +
            `* Usa \`/ayuda\` y ve tus beneficios.`
          )
          .setThumbnail(newMember.user.displayAvatarURL());

        await systemChannel.send({
          content: `<@${newMember.user.id}> ¡Gracias por el boost!`,
          embeds: [boosterEmbed]
        });
      } catch (error) {
        console.error(
          `Error al asignar el rol VIP a ${newMember.user.tag}:`,
          error
        );
      }
      return;
    }

    if (addedRoleId === VIP_ROLE_ID && !newMember.roles.cache.has(BOOSTER_ROLE_ID)) {
      // Enviar embed notificando que el rol VIP se asignó, solo si no se debe al rol Booster
      const vipEmbed = new EmbedBuilder()
        .setAuthor({ name: newMember.user.displayName, iconURL: newMember.user.displayAvatarURL({ dynamic: true }) })
        .setColor(assets.color.base)
        .setTitle("⭐VIP")
        .setDescription(
          `* ¡Disfruta de tu exclusividad!\n` +
          `* Usa \`/ayuda\` y ve tus beneficios.`
        )
        .setThumbnail(newMember.user.displayAvatarURL());

      try {
        await systemChannel.send({
          content: `<@${newMember.user.id}> Ahora eres un miembro VIP`,
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
