const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ban = require('./subcommands/ban');
const kick = require('./subcommands/kick');
const lock = require('./subcommands/lock');
const mute = require('./subcommands/mute');
const unban = require('./subcommands/unban');
const unlock = require('./subcommands/unlock');
const warn = require('./subcommands/warn');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Comandos de moderación')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addSubcommand(ban.data)
    .addSubcommand(kick.data)
    .addSubcommand(lock.data)
    .addSubcommand(mute.data)
    .addSubcommand(unban.data)
    .addSubcommand(unlock.data)
    .addSubcommand(warn.data),

  async execute(interaction) {
    const subcommands = {
      'ban': ban.execute,
      'kick': kick.execute,
      'lock': lock.execute,
      'mute': mute.execute,
      'unban': unban.execute,
      'unlock': unlock.execute,
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
