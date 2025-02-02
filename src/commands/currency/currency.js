const { SlashCommandBuilder } = require('discord.js');
const work = require('./work');
const crime = require('./crime');
const balance = require('./balance');
const daily = require('./daily');
const buy = require('./buy');
const store = require('./store');
const leaderboard = require('./leaderboard');
const inventory = require('./inventory');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economia')
    .setDescription('Comandos relacionados con la economía y trabajos')
    .addSubcommand(work.data) // Subcomando /economia trabajo
    .addSubcommand(crime.data) // Subcomando /economia crimen
    .addSubcommand(daily.data) // Subcomando /economia crimen
    .addSubcommand(buy.data) // Subcomando /economia crimen
    .addSubcommand(balance.data) // Subcomando /economia crimen
    .addSubcommand(store.data) // Subcomando /economia crimen
    .addSubcommand(leaderboard.data) // Subcomando /economia crimen
    .addSubcommand(inventory.data), // Subcomando /economia crimen

  async execute(interaction) {
    // Mapea el nombre del subcomando a su función correspondiente
    const subcommands = {
      'trabajo': work.execute,
      'crimen': crime.execute,
      'balance': balance.execute,
      'diario': daily.execute,
      'comprar': buy.execute,
      'tienda': store.execute,
      'clasificación': leaderboard.execute,
      'inventario': inventory.execute,
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
