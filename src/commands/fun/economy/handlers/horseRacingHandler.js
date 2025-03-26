const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, EmbedBuilder } = require('discord.js');
const { getUserBalance, updateUserBalance } = require('../utils/userBalanceUtils');
const assets = require('../../../../../config/assets.json');

const coloresMap = {
  rojo: { emoji: '🔴', color: 'Red' },
  verde: { emoji: '🟢', color: 'Green' },
  azul: { emoji: '🔵', color: 'Blue' },
  amarillo: { emoji: '🟡', color: 'Yellow' },
  morado: { emoji: '🟣', color: 'Purple' },
};

function crearBotonApostar() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('apostar')
      .setEmoji('🪙')
      .setLabel('Apostar')
      .setStyle(ButtonStyle.Secondary)
  );
}

function manejarApuestas(interaction, connection, carreraId) {
  const collector = interaction.channel.createMessageComponentCollector({
    filter: (i) => i.customId === 'apostar', time: 60000
  });

  collector.on('collect', async (i) => {
    const modal = new ModalBuilder()
      .setCustomId('modalApuesta')
      .setTitle('Apostar en la Carrera');

    const caballoInput = new TextInputBuilder()
      .setCustomId('caballo')
      .setLabel('Elige un caballo')
      .setPlaceholder('rojo, verde, azul, amarillo, morado')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const cantidadInput = new TextInputBuilder()
      .setCustomId('cantidad')
      .setLabel('Cantidad a apostar')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const primeraFila = new ActionRowBuilder().addComponents(caballoInput);
    const segundaFila = new ActionRowBuilder().addComponents(cantidadInput);
    modal.addComponents(primeraFila, segundaFila);

    await i.showModal(modal);
    const modalResponse = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
    if (!modalResponse) return;

    const nombreColor = modalResponse.fields.getTextInputValue('caballo').toLowerCase();
    const cantidadApostada = modalResponse.fields.getTextInputValue('cantidad');

    const caballoElegido = coloresMap[nombreColor];
    if (!caballoElegido) {
      return modalResponse.reply({
        content: '¡Color no válido! Elige entre rojo, verde, azul, amarillo o morado.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const cantidad = parseInt(cantidadApostada, 10);
    if (isNaN(cantidad) || cantidad <= 0) {
      return modalResponse.reply({
        content: '¡Cantidad no válida! Ingresa un número mayor que 0.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const userId = i.user.id;
    const balance = await getUserBalance(connection, userId);
    if (balance < cantidad) {
      return modalResponse.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle('¡Fondos insuficientes!')
            .setDescription('No tienes suficiente balance para realizar esta apuesta.')
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    await updateUserBalance(connection, userId, -cantidad);
    await connection.execute(
      'INSERT INTO horse_race_bets (user_id, race_id, horse, bet) VALUES (?, ?, ?, ?)',
      [userId, carreraId, caballoElegido.emoji, cantidad]
    );

    await modalResponse.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(caballoElegido.color)
          .setDescription(`¡<@${modalResponse.user.id}> apostó **${cantidad.toLocaleString()}** al caballo ${caballoElegido.emoji}!`)
      ]
    });
  });
}

module.exports = { crearBotonApostar, manejarApuestas };
