const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');
const { getUserBalance, updateUserBalance } = require('../../utilities/userBalanceUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Craftea herramientas')
    .addStringOption(option =>
      option.setName('herramienta')
        .setDescription('Herramienta que deseas hacer.')
        .setAutocomplete(true)
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;
    const connection = interaction.client.dbConnection;

    try {
      const [rows] = await connection.query(
        `SELECT ccr.result_item_id, ci.name FROM curr_crafting_recipes ccr 
         JOIN curr_items ci ON ccr.result_item_id = ci.id ORDER BY ci.name;`
      );
      const choices = rows.map(row => ({ name: row.name, value: row.name }));
      await interaction.respond(choices);
    } catch (error) {
      console.error('Error en el autocompletado de /craft:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const itemName = interaction.options.getString("herramienta").trim();

    try {
      const [items] = await connection.query(
        `SELECT ccr.recipe_id, ccr.result_item_id, ci.name, ci.emoji, ccr.success_rate 
         FROM curr_crafting_recipes ccr 
         JOIN curr_items ci ON ccr.result_item_id = ci.id 
         WHERE ci.name = ?;`, [itemName]
      );

      if (items.length === 0) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(assets.color.red).setDescription(`${assets.emoji.deny} No se encontró el ítem "${itemName}".`)],
        });
      }

      const item = items[0];
      const itemEmoji = item.emoji || '❓';
      const successRate = item.success_rate;

      const [materials] = await connection.query(
        `SELECT cci.ingredient_item_id, ci.name, ci.emoji, cci.quantity_needed, ccr.cost 
         FROM curr_crafting_ingredients cci 
         JOIN curr_items ci ON cci.ingredient_item_id = ci.id 
         JOIN curr_crafting_recipes ccr ON cci.recipe_id = ccr.recipe_id 
         WHERE ccr.recipe_id = ?;`, [item.recipe_id]
      );

      if (materials.length === 0) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(assets.color.red).setDescription(`${assets.emoji.deny} No hay receta definida para "${itemName}".`)],
        });
      }

      const itemList = materials.map(mat => `\`🆔\` \`${mat.ingredient_item_id}\` | ${mat.emoji} ${mat.name} | \`📦\` ${mat.quantity_needed}`).join('\n');
      const craftCost = materials[0].cost;

      const embed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle('¡🛠️ Craftman!')
        .setDescription(
          `¡Hola <@${userId}>! 👋\n\n` +
          `Estos son los materiales necesarios para craftear:\n\n` +
          `\`🆔\` \`${item.result_item_id}\` | ${itemEmoji} **${itemName}**.\n\n` +
          `>>> ${itemList}\n` +
          `\`💰\` **⏣${craftCost.toLocaleString()}** por mano de obra.\n` +
          `\`🎲\` **${successRate}%** de probabilidad de éxito.`
        )
        .setFooter({ text: 'El intento consumirá los materiales y el costo.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`craft_${userId}_${item.result_item_id}`)
          .setLabel('Craftear')
          .setEmoji('🛠️')
          .setStyle(ButtonStyle.Secondary)
      );

      const message = await interaction.reply({ embeds: [embed], components: [row] });

      const collector = message.createMessageComponentCollector({});

      collector.on('collect', async buttonInteraction => {
        if (buttonInteraction.user.id !== userId) {
          return buttonInteraction.reply({
            embeds: [new EmbedBuilder().setColor(assets.color.red).setDescription('No puedes interactuar con este botón.')],
            flags: MessageFlags.Ephemeral
          });
        }

        const userBalance = await getUserBalance(connection, userId);
        if (userBalance < craftCost) {
          embed.addFields({ name: ' ', value: `${assets.emoji.deny} Crafteo fallido: Fondos insuficientes.` });
          return buttonInteraction.update({ embeds: [embed] });
        }

        for (const mat of materials) {
          const [userItems] = await connection.query(
            `SELECT item_id, quantity FROM curr_user_inventory WHERE user_id = ? AND item_id = ?;`, [userId, mat.ingredient_item_id]
          );
          if (!userItems.length || userItems[0].quantity < mat.quantity_needed) {
            embed.addFields({ name: ' ', value: `${assets.emoji.warn} Falta ${mat.emoji} ${mat.name}.` });
            return buttonInteraction.update({ embeds: [embed] });
          }
        }

        await updateUserBalance(connection, userId, -craftCost);
        for (const mat of materials) {
          await connection.query(
            `UPDATE curr_user_inventory SET quantity = quantity - ? WHERE user_id = ? AND item_id = ?;`,
            [mat.quantity_needed, userId, mat.ingredient_item_id]
          );
        }

        // Aplicar la tasa de éxito
        const random = Math.random() * 100;
        if (random <= successRate) {
          // Crafteo exitoso
          await connection.query(
            `INSERT INTO curr_user_inventory (user_id, item_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1;`,
            [userId, item.result_item_id]
          );
          embed.addFields({ name: ' ', value: `${assets.emoji.check} Crafteo exitoso. ¡Has obtenido ${itemEmoji} ${itemName}!` });
        } else {
          // Crafteo fallido
          embed.addFields({ name: ' ', value: `${assets.emoji.deny} Crafteo fallido. Se perdieron los materiales.` });
        }

        await buttonInteraction.update({ embeds: [embed] });
      });
    } catch (error) {
      console.error("Error en /craft:", error);
      return interaction.reply({ content: "Hubo un problema al procesar tu crafteo.", flags: MessageFlags.Ephemeral });
    }
  }
};