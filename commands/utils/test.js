const { SlashCommandBuilder, ContainerBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Mini-tienda interactiva usando ContainerBuilder V2'),

  async execute(interaction) {
    const items = [
      { name: 'Espada de Prueba', desc: 'Espada legendaria de ejemplo.', price: 500 },
      { name: 'Escudo de Ejemplo', desc: 'Protege de cualquier ataque.', price: 350 },
      { name: 'Poción Mágica', desc: 'Recupera salud y mana.', price: 200 }
    ];

    const container = new ContainerBuilder().setAccentColor(0xffd700);

    items.forEach((item, i) => {
      container.addSectionComponents(section =>
        section
          .addTextDisplayComponents(
            text => text.setContent(`**${item.name}**`),
            text => text.setContent(item.desc)
          )
          .setButtonAccessory(button => {
            return button
              .setCustomId(`buy_item_${item.name}`)
              .setLabel(`Comprar (${item.price}💰)`)
              .setStyle(ButtonStyle.Success);
          })
      );

      if (i < items.length - 1) {
        container.addSeparatorComponents(separator => {
          return separator;
        });
      }
    });

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },

  buttonHandler: async interaction => {
    if (!interaction.isButton()) return false;

    // Comprar ítem
    if (interaction.customId.startsWith('buy_item_')) {
      const itemName = interaction.customId.replace('buy_item_', '');
      const confirmationContainer = new ContainerBuilder().setAccentColor(0x00ff00);

      // Sección de confirmación
      confirmationContainer.addSectionComponents(section =>
        section
          .addTextDisplayComponents(text =>
            text.setContent(`✅ Compra realizada: ${itemName}`)
          )
          .setButtonAccessory(button => {
            return button
              .setCustomId('close_confirmation')
              .setLabel('Cerrar')
              .setStyle(ButtonStyle.Secondary);
          })
      );

      await interaction.update({
        components: [confirmationContainer],
        flags: MessageFlags.IsComponentsV2
      });

      return true;
    }

    // Cerrar confirmación
    if (interaction.customId === 'close_confirmation') {
      // Eliminar los componentes para cerrar la interacción
      await interaction.update({
        components: [],
        flags: MessageFlags.IsComponentsV2
      });
      return true;
    }

    return false;
  }
};
