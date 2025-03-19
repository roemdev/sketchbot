const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../../config/assets.json');
const { createButtons, handleButtonInteraction } = require('./handlers/horseRacingHandler');

let carreraEnProgreso = false;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('carrera-caballos')
    .setDescription('Inicia una carrera con 6 caballos de colores.'),
  async execute(interaction) {
    if (carreraEnProgreso) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setDescription('Ya hay una carrera en proceso')
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    carreraEnProgreso = true;

    const pistaLength = 40;
    const colores = ['🔴', '🟢', '🔵', '🟡', '🟣'];
    const caballos = colores.map((color) => ({
      color,
      emoji: '<:horse:1351939506324111513>',
      posicion: 0,
    }));

    const tiempoInicio = Math.floor(Date.now() / 1000) + 60;
    const embedInicial = new EmbedBuilder()
      .setTitle('<:horse:1351939506324111513> Carrera de Caballos')
      .setDescription(`La carrera comenzará <t:${tiempoInicio}:R>. ¡Hagan sus apuestas! ⏳`)
      .setColor(assets.color.base);

    const buttons = createButtons();

    await interaction.reply({ embeds: [embedInicial], components: buttons });

    const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', handleButtonInteraction);

    setTimeout(async () => {
      const embedCarrera = new EmbedBuilder()
        .setTitle('🎉 ¡Arranca la carrera!')
        .setDescription(
          caballos
            .map((caballo) => `${caballo.color}🏁 ${caballo.emoji}${'—'.repeat(pistaLength)} 🏁`)
            .join('\n')
        )
        .setColor(assets.color.base);

      const mensajeCarrera = await interaction.followUp({ embeds: [embedCarrera] });

      const updateRace = () => {
        let carreraTerminada = false;
        caballos.forEach((caballo) => {
          if (!carreraTerminada) {
            const avance = Math.floor(Math.random() * 3) + 1;
            caballo.posicion += avance;
            if (caballo.posicion >= pistaLength) {
              caballo.posicion = pistaLength;
              carreraTerminada = true;
            }
          }
        });

        const pistaVisual = caballos
          .map((caballo) => {
            const pista = '-'.repeat(pistaLength).split('');
            pista[caballo.posicion] = caballo.emoji;
            return `${caballo.color}🏁 ${pista.join('')} 🏁`;
          })
          .join('\n');

        embedCarrera.setDescription(pistaVisual);
        mensajeCarrera.edit({ embeds: [embedCarrera] });

        if (carreraTerminada) {
          clearInterval(intervalo);
          const caballoGanador = caballos.find((caballo) => caballo.posicion >= pistaLength);
          interaction.followUp(`¡${caballoGanador.emoji} (${caballoGanador.color}) ha ganado la carrera! 🎉`);
          carreraEnProgreso = false;
        }
      };

      const intervalo = setInterval(updateRace, 2000);
    }, 60000);
  },
};