const { SlashCommandSubcommandBuilder, EmbedBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { logModeration } = require('../punishHandler'); // Importamos la función de logs
const assets = require('../../../../../config/assets.json');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('warn')
    .setDescription('Advierte a un usuario en el servidor')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario al que se le dará la advertencia')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('razón')
        .setDescription('Razón de la advertencia')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razón') || 'No especificada';

    // Verificaciones básicas
    if (user.id === interaction.user.id) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} Advertencia no válida`)
          .setDescription('No puedes advertirte a ti mismo.')
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    if (user.id === interaction.client.user.id) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} Advertencia no válida`)
          .setDescription('No puedo advertirme a mí mismo.')
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      // Enviar advertencia al usuario por MD
      const warnEmbed = new EmbedBuilder()
        .setColor(assets.color.yellow)
        .setDescription(`**Has sido advertido**\n> **Mod**: ${interaction.user.username}\n> **Razón**: ${reason}`);

      const sentFrom = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(`Enviado desde ${interaction.guild.name}`)
        .setURL('https://discord.com/channels/815280751586050098/1173781298721063014');

      const row = new ActionRowBuilder().addComponents(sentFrom);

      await user.send({ embeds: [warnEmbed], components: [row] }).catch(() => { });

      // Loguear advertencia en el canal de moderación
      await logModeration(interaction, "Warn", user, reason);

      // Respuesta en el chat
      const successEmbed = new EmbedBuilder()
        .setColor(assets.color.yellow)
        .setDescription(`${assets.emoji.check} **${user.username}** ha sido advertido.\n> **Razón:** ${reason}`);

      return interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });

    } catch (error) {
      console.error(error);
      return interaction.reply({ content: '❌ Hubo un error al intentar advertir al usuario.', flags: MessageFlags.Ephemeral });
    }
  },
};

module.exports.isSubcommand = true;
