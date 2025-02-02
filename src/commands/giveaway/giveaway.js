const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const create = require('./subcommands/create');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('sorteo')
    .setDescription('Comandos relacionados con los sorteos')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addSubcommand(create.data),

  async execute(interaction) {
    // Mapea el nombre del subcomando a su función correspondiente
    const subcommands = {
      'crear': create.execute
    };

    const subcommand = interaction.options.getSubcommand();
    const commandFunc = subcommands[subcommand];

    if (commandFunc) {
      await commandFunc(interaction);
    } else {
      await interaction.reply('Subcomando no reconocido.');
    }
  },
};
