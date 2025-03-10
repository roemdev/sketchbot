const { SlashCommandSubcommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const sendError = require('../utils/embedsMsg')
const assets = require('../../../../../config/assets.json')

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un usuario del servidor')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a expulsar')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('razón')
        .setDescription('Razón de la expulsión')
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('prueba1')
        .setDescription('Captura de pantalla de prueba (opcional)')
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('prueba2')
        .setDescription('Captura de pantalla de prueba (opcional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razón');
    const proof1 = interaction.options.getAttachment('prueba1');
    const proof2 = interaction.options.getAttachment('prueba2');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    // Verificaciones

    if (!member) {
      return sendError(interaction, `Usuario \`${user}\` no encontrado.`);
    }
    if (user.id === interaction.user.id) {
      return sendError(interaction, 'No puedes expulsarte a ti mismo.');
    }
    if (user.id === interaction.client.user.id) {
      return sendError(interaction, 'No puedo expulsarme a mí mismo.');
    }

    try {
      // Enviar mensaje privado al usuario expulsado
      const kickEmbed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setDescription(`${assets.emoji.check} **${user.username}** expulsado`)

      let dmMessage = `Has sido expulsado de **${interaction.guild.name}** por la razón: ${reason}`;
      if (proof1 || proof2) {
        dmMessage += '\nPruebas adjuntas:';
      }
      const dmOptions = { content: dmMessage, files: [] };
      if (proof1) dmOptions.files.push(proof1.url);
      if (proof2) dmOptions.files.push(proof2.url);

      await user.send(dmOptions).catch(() => { });
      //await member.kick(reason);

      const successEmbed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setDescription(`${assets.emoji.check} **${user.username}** expulsado`)

      return interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error(error);
      return interaction.reply({ content: '❌ Hubo un error al intentar expulsar al usuario.', flags: MessageFlags.Ephemeral });
    }
  },
};
