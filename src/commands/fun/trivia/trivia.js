const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const assets = require('../../../../config/assets.json')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Responde a una trivia'),

  async execute(interaction) {
    const question = "¿De dónde es esta bandera?";
    const imageUrl = "https://i.pinimg.com/originals/3b/19/3b/3b193bb6f92294d2dde4a62cd73afe00.jpg"; // URL de la bandera

    const options = [
      { label: "Argentina", correct: false },
      { label: "Uruguay", correct: true },
      { label: "Brasil", correct: false },
    ];

    options.sort(() => Math.random() - 0.5); // Mezclar las opciones

    const embed = new EmbedBuilder()
      .setTitle("Trivia")
      .setDescription(question)
      .setImage(imageUrl)
      .setColor(assets.color.base)
      .setFooter({ text: 'ID: 1293' });

    const buttons = new ActionRowBuilder();
    options.forEach((option, index) => {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`trivia_${index}`)
          .setLabel(option.label)
          .setStyle(ButtonStyle.Primary)
      );
    });

    const message = await interaction.reply({ embeds: [embed], components: [buttons], fetchReply: true });

    const collector = message.createMessageComponentCollector({ time: 15000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "No puedes responder a esta trivia.", flags: MessageFlags.Ephemeral });
      }

      collector.stop();

      const chosenOption = options[parseInt(i.customId.split("_")[1])];

      options.forEach((option, index) => {
        buttons.components[index]
          .setDisabled(true)
          .setStyle(option.correct ? ButtonStyle.Success : ButtonStyle.Danger);
      });

      if (chosenOption.correct) {
        embed.setColor(assets.color.green).setDescription(`${question}\n\n✅ Respuesta correcta: **${chosenOption.label}**`);
      } else {
        embed.setColor(assets.color.red).setDescription(`${question}\n\n❌ Respuesta incorrecta. La correcta era **Uruguay**.`);
      }

      await i.update({ embeds: [embed], components: [buttons] });
    });
  }
};