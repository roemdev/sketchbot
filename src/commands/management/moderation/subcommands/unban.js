const { SlashCommandSubcommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../../../config/assets.json');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('unban')
    .setDescription('Desbanea a un usuario por su ID')
    .addStringOption(option =>
      option.setName('usuario_id')
        .setDescription('ID del usuario a desbanear')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('razón')
        .setDescription('Razón del desbaneo')
        .setRequired(false)
    ),

  async execute(interaction) {
    const userId = interaction.options.getString('usuario_id');
    const reason = interaction.options.getString('razón') || 'No especificada';

    try {
      // Buscar el baneo en la lista de baneos
      const banList = await interaction.guild.bans.fetch();
      const bannedUser = banList.get(userId);

      if (!bannedUser) {
        const errorEmbed = new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} Desbaneo fallido`)
          .setDescription(`No encontré a ningún usuario con la ID \`${userId}\` en la lista de baneados.`);

        return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }

      // Desbanear usuario
      await interaction.guild.members.unban(userId, reason);

      const successEmbed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setTitle(`${assets.emoji.check} Usuario desbaneado`)
        .setDescription(`**${bannedUser.user.username}** ha sido desbaneado.\n> **Razón:** ${reason}`);

      return interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error(error);
      return interaction.reply({ content: '❌ Hubo un error al intentar desbanear al usuario.', flags: MessageFlags.Ephemeral });
    }
  },
};

module.exports.isSubcommand = true;
