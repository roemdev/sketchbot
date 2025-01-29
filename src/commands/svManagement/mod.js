const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  InteractionContextType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require('discord.js');
const assets = require('../../../assets.json');

// Constantes para colores y mensajes
const COLORS = {
  SUCCESS: assets.color.green,
  ERROR: assets.color.red,
};

const MESSAGES = {
  KICK: `${assets.emoji.check} **{username}** fue expulsado\n`,
  BAN: `${assets.emoji.check} **{username}** fue baneado\n`,
  UNBAN: `${assets.emoji.check} **{username}** fue desbaneado\n`,
  PRIVATE_MESSAGE: '**Moderación Aplicada: {action}**\n> **Razón**: {reason}\n> **Responsable**: {moderator}',
};

// Función para crear un embed de respuesta
const createReplyEmbed = (color, message) => new EmbedBuilder().setColor(color).setDescription(message);

// Función para crear un embed de mensaje privado
const createPrivateEmbed = (action, reason, moderator) =>
  new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setDescription(MESSAGES.PRIVATE_MESSAGE.replace('{action}', action).replace('{reason}', reason).replace('{moderator}', moderator));

// Función para crear un botón de enlace
const createLinkButton = () =>
  new ButtonBuilder()
    .setLabel('Enviado desde ARKANIA')
    .setURL('https://discord.com/channels/942822377849507841/1330894933715845140')
    .setStyle(ButtonStyle.Link);

// Función para crear una fila de componentes
const createActionRow = (components) => new ActionRowBuilder().addComponents(components);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Ejecuta acciones de moderador')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('kick')
        .setDescription('Expulsa a un usuario del servidor.')
        .addUserOption((option) => option.setName('target').setDescription('Usuario a expulsar').setRequired(true))
        .addStringOption((option) => option.setName('reason').setDescription('Razón de la expulsión').setRequired(false))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('ban')
        .setDescription('Banea a un usuario del servidor.')
        .addUserOption((option) => option.setName('target').setDescription('Usuario a banear').setRequired(true))
        .addStringOption((option) => option.setName('reason').setDescription('Razón del baneo').setRequired(false))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('unban')
        .setDescription('Desbanea a un usuario del servidor.')
        .addUserOption((option) => option.setName('target_id').setDescription('ID del usuario a desbanear').setRequired(true))
        .addStringOption((option) => option.setName('reason').setDescription('Razón del desbaneo').setRequired(false))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    try {
      const target = interaction.options.getUser('target') || interaction.options.getUser('target_id');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!target) {
        return interaction.reply({
          embeds: [createReplyEmbed(COLORS.ERROR, 'Usuario no encontrado.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const action = interaction.options.getSubcommand();
      let responseMessage;

      switch (action) {
        case 'kick':
          responseMessage = MESSAGES.KICK.replace('{username}', target.username);
          await interaction.guild.members.kick(target, { reason });
          break;

        case 'ban':
          responseMessage = MESSAGES.BAN.replace('{username}', target.username);
          await interaction.guild.members.ban(target, { reason });
          break;

        case 'unban':
          responseMessage = MESSAGES.UNBAN.replace('{username}', target.username);
          await interaction.guild.members.unban(target, { reason });
          break;

        default:
          return interaction.reply({
            embeds: [createReplyEmbed(COLORS.ERROR, 'Acción no válida.')],
            flags: MessageFlags.Ephemeral,
          });
      }

      // Enviar mensaje privado al usuario
      const privateEmbed = createPrivateEmbed(action, reason, interaction.user.username);
      const linkButton = createLinkButton();
      const row = createActionRow([linkButton]);

      await target.send({ embeds: [privateEmbed], components: [row] }).catch(() => {
        // Si el usuario no puede recibir mensajes privados, ignorar el error
      });

      // Responder al moderador
      await interaction.reply({
        embeds: [createReplyEmbed(COLORS.SUCCESS, responseMessage)],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Error ejecutando comando de moderación:', error);
      await interaction.reply({
        embeds: [createReplyEmbed(COLORS.ERROR, 'Ocurrió un error al ejecutar el comando.')],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};