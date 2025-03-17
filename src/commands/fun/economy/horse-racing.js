const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const assets = require('../../../../config/assets.json')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('carrera-caballos')
    .setDescription('Inicia una carrera de caballos.'),
  async execute(interaction) {
    const colores = ['🔴', '🟢', '🔵', '🟡', '🟣'];
    const caballos = colores.map(color => `${color}: 🐎                                                              🏁`);

    const embed = new EmbedBuilder()
      .setTitle('🏇 Carrera de Caballos 🏇')
      .setDescription(caballos.join('\n'))
      .setColor(assets.color.base);

    await interaction.reply({ embeds: [embed] });
  }
};
