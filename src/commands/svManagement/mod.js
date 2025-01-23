const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  InteractionContextType,
  PermissionsBitField,
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
            .setDescription('Usuario a desbanear')
            .setRequired(true))
        .addStringOption(option => 
          option
            .setName('reason')
            .setDescription('Razón del desbaneo')
            .setRequired(false))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setContexts(InteractionContextType.Guild),

    async execute(interaction){

      const target = interaction.options.getUser('target');
      const reason = interaction.options.getString('reason') ?? 'No reason provided';

      if (interaction.options.getSubcommand() === 'kick') {

        const embed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setDescription(`${assets.emoji.check} **${target.username}** fue expulsado\n`)

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })

      } else if (interaction.options.getSubcommand() === 'ban'){

        const embed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setDescription(`${assets.emoji.check} **${target.username}** fue baneado\n`)
      
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })

      } else if (interaction.options.getSubcommand() === 'unban'){

        const embed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setDescription(`${assets.emoji.check} **${target.username}** fue desbaneado\n`)
      
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
        
      }
    }
};