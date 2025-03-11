const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const kick = require('./subcommands/kick');
const ban = require('./subcommands/ban');
const mute = require('./subcommands/mute');
const warn = require('./subcommands/warn');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Comandos de moderación')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addSubcommand(kick.data)
    .addSubcommand(ban.data)
    .addSubcommand(mute.data)
    .addSubcommand(warn.data),

  async execute(interaction) {
    const subcommands = {
      'kick': kick.execute,
      'ban': ban.execute,
      'mute': mute.execute,
      'warn': warn.execute
    };

    const subcommand = interaction.options.getSubcommand();
    const commandFunc = subcommands[subcommand];

    if (commandFunc) {
      await commandFunc(interaction);
    } else {
      await interaction.reply({ content: 'Subcomando no reconocido.', flags: MessageFlags.Ephemeral });
    }
  },
};
