const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  InteractionContextType,
  PermissionsBitField,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');
const assets = require('../../../assets.json')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Ejecuta acciones de moderador')
    .addSubcommand(subcommand =>
      subcommand
        .setName('kick')
        .setDescription('Expulsa a un usuario del servidor.')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('Usuario a expulsar')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Razón de la expulsión')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ban')
        .setDescription('Banea a un usuario del servidor.')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('Usuario a banear')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Razón del baneo')
            .setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unban')
        .setDescription('Desbanea a un usuario del servidor.')
        .addUserOption(option =>
          option
            .setName('target_id')
            .setDescription('ID del usuario a desbanear')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Razón del desbaneo')
            .setRequired(false))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {

    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (interaction.options.getSubcommand() === 'kick') {

      const replyEmbed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setDescription(`${assets.emoji.check} **${target.username}** fue expulsado\n`)

      const privateEmbed = new EmbedBuilder()
        .setColor('Red')
        .setDescription(
          '**Fuiste expulsado**\n' +
          `> **Razón**:  ${reason}\n` +
          `> **Responsable**: ${interaction.user.username}`
        )

      const sentFromButton = new ButtonBuilder()
        .setLabel(`Enviado desde ARKANIA`)
        .setURL('https://discord.com/channels/942822377849507841/1330894933715845140')
        .setStyle(ButtonStyle.Link)

      const row = new ActionRowBuilder()
        .addComponents(sentFromButton)

      target.send({ embeds: [privateEmbed], components: [row] })

      await interaction.guild.members.kick(target);
      return interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral })

    } else if (interaction.options.getSubcommand() === 'ban') {

      const replyEmbed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setDescription(`${assets.emoji.check} **${target.username}** fue baneado\n`)

      target.send({ embeds: [privateEmbed], components: [row] })

      await interaction.guild.members.ban(target);
      return interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral })

    } else if (interaction.options.getSubcommand() === 'unban') {

      const replyEmbed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setDescription(`${assets.emoji.check} **${target.username}** fue desbaneado\n`)

      target.send({ embeds: [privateEmbed], components: [row] })

      await interaction.guild.members.unban(target);
      return interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral })
    }
  }
};