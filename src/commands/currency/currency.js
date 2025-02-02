const { SlashCommandBuilder } = require('discord.js');
const work = require('./subcommands/work');
const crime = require('./subcommands/crime');
const balance = require('./subcommands/balance');
const daily = require('./subcommands/daily');
const buy = require('./subcommands/buy');
const store = require('./subcommands/store');
const leaderboard = require('./subcommands/leaderboard');
const inventory = require('./subcommands/inventory');
const sell = require('./subcommands/sell');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economía')
    .setDescription('Comandos relacionados con la economía y trabajos')
    .addSubcommand(work.data)
    .addSubcommand(crime.data)
    .addSubcommand(daily.data)
    .addSubcommand(buy.data)
    .addSubcommand(balance.data)
    .addSubcommand(store.data)
    .addSubcommand(leaderboard.data)
    .addSubcommand(inventory.data)
    .addSubcommand(sell.data),

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
      'vender': sell.execute,
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
