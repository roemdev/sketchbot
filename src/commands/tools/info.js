const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const assets = require('../../../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Muestra información sobre un miembro o el servidor.')
    .addStringOption(option =>
      option
        .setName('tipo')
        .setDescription('Selecciona el tipo de información que deseas mostrar.')
        .setRequired(true)
        .addChoices(
          { name: 'usuario', value: 'miembro' },
          { name: 'servidor', value: 'servidor' }
        )
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Selecciona el usuario del cual deseas obtener información (solo para "miembro").')
        .setRequired(false)
    ),

  async execute(interaction) {
    const type = interaction.options.getString('tipo');

    if (type === 'miembro') {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild.members.cache.get(user.id);

      const discordJoinDate = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;
      const serverJoinDate = member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'No es miembro';
      const roles = member
        ? member.roles.cache
            .filter(role => role.name !== '@everyone')
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString())
        : [];
      const roleList = roles.length > 0 ? roles.join(', ') : 'Ninguno';

      const embed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle('Información de Usuario')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**Usuario:** <@${user.id}>\n`+
          `**ID:** \`${user.id}\`\n`+
          `**En Discord:** ${discordJoinDate}\n`+
          `**En el servidor:** ${serverJoinDate}\n`+
          `**Roles:** ${roleList}`
        );

      await interaction.reply({ embeds: [embed] });
    } else if (type === 'servidor') {
      const guild = interaction.guild;

      const owner = await guild.fetchOwner();
      const region = guild.preferredLocale;
      const totalMembers = guild.memberCount;
      const totalRoles = guild.roles.cache.size - 1;
      const creationDate = `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`;
      const iconURL = guild.iconURL({ dynamic: true, size: 1024 });

      const embed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle('Información del Servidor')
        .addFields(
          {
            name: guild.name,
            value: `> ${guild.description || 'Sin descripción'}\n`+
            `**ID:** \`${guild.id}\`\n`+
            `**Creado:** ${creationDate}\n`+
            `**Propietario:** ${owner}`,
          },
          {
            name: 'General',
            value: `**Miembros:** \`${totalMembers}\` | **Roles:** \`${totalRoles}\` | **Región de voz:** \`${region}\``,
          }
        )
        .setThumbnail(iconURL);

      await interaction.reply({
        content: 'https://discord.gg/jA8tx5Vwe5',
        embeds: [embed],
      });
    }
  },
};
