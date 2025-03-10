const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const kick = require('./subcommands/kick');
const ban = require('./subcommands/ban');
const unban = require('./subcommands/unban');
const mute = require('./subcommands/mute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Comandos de moderación')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addSubcommand(kick.data)
    .addSubcommand(ban.data)
    .addSubcommand(unban.data)
    .addSubcommand(mute.data),

  async execute(interaction) {
    const subcommands = {
      'kick': kick.execute,
      'ban': ban.execute,
      'unban': unban.execute,
      'mute': mute.execute
    };

    const subcommand = interaction.options.getSubcommand();
    const commandFunc = subcommands[subcommand];

    if (commandFunc) {
      await commandFunc(interaction);
    } else {
      await interaction.reply({ content: 'Subcomando no reconocido.', ephemeral: true });
    }
  },
};
