const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const kick = require('./subcommands/kick');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Comandos de moderación')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addSubcommand(kick.data),

  async execute(interaction) {
    const subcommands = {
      'kick': kick.execute
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
