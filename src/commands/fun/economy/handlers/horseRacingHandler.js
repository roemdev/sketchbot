const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function createButtons() {
  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('red_horse').setEmoji('🔴').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('green_horse').setEmoji('🟢').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('blue_horse').setEmoji('🔵').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('yellow_horse').setEmoji('🟡').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('purple_horse').setEmoji('🟣').setStyle(ButtonStyle.Secondary),
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('bet_1').setLabel('100').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('bet_2').setLabel('200').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('bet_3').setLabel('300').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('bet_4').setLabel('400').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('bet_5').setLabel('500').setStyle(ButtonStyle.Secondary),
    );

  return [row1, row2];
}

function handleButtonInteraction(buttonInteraction) {
  return buttonInteraction.reply({ content: `Botón presionado: ${buttonInteraction.customId}`, ephemeral: true });
}

module.exports = { createButtons, handleButtonInteraction };