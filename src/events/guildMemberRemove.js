const { Events, EmbedBuilder } = require("discord.js");
const assets = require("../../config/assets.json");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (member.user.bot) return; // No hacer nada si es un bot

    const user = member.user;
    const guild = member.guild;
    const iconURL = guild.iconURL({ dynamic: true, size: 1024 });

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${guild.name}`, iconURL: iconURL })
      .setColor(assets.color.base)
      .setTitle(`${user.username} ha dejado el servidor`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `**Usuario:** <@${user.id}> (${user.username})\n` +
        `**ID:** \`${user.id}\``
      )
      .setFooter({ text: `Ahora somos ${guild.memberCount} miembros.` });

    member.guild.systemChannel.send({
      content: `**${user.username}** ha abandonado el servidor`,
      embeds: [embed],
    });
  },
};
