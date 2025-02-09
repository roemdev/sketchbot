const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const assets = require("../../../assets.json");
const ffmpeg = require('@ffmpeg-installer/ffmpeg');
process.env.FFMPEG_PATH = ffmpeg.path;

// Almacenar conexiones de voz globalmente
const voiceConnections = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('Reproduce un mensaje en el canal de voz usando texto a voz de Google.')
    .addStringOption(option =>
      option.setName('mensaje')
        .setDescription('El mensaje que quieres reproducir.')
        .setRequired(true)
    ),

  async execute(interaction) {
    const message = interaction.options.getString('mensaje').trim();
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) return sendEmbed(interaction, 'error', 'Debes estar en un canal de voz para usar este comando.');
    if (message.length > 200) return sendEmbed(interaction, 'error', 'El mensaje no puede tener más de 200 caracteres.');

    try {
      const url = googleTTS.getAudioUrl(message, { lang: 'es', slow: false });

      let connection = getOrCreateConnection(interaction, voiceChannel);
      if (!connection) return sendEmbed(interaction, 'error', 'No se pudo conectar al canal de voz.');

      const player = createAudioPlayer();
      const resource = createAudioResource(url);

      player.play(resource);
      connection.subscribe(player);

      sendEmbed(interaction, 'success', message);

      // Iniciar temporizador de desconexión
      manageAutoDisconnect(interaction.guild.id, connection, player);

    } catch (error) {
      console.error('Error en el TTS:', error);
      sendEmbed(interaction, 'error', 'Error al generar el audio.');
    }
  }
};

/**
 * Obtiene la conexión de voz existente o la crea si no existe.
 */
function getOrCreateConnection(interaction, voiceChannel) {
  let connection = getVoiceConnection(interaction.guild.id);

  if (!connection) {
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    // Guardar conexión globalmente
    voiceConnections.set(interaction.guild.id, connection);
  }

  return connection;
}

/**
 * Maneja la desconexión automática del bot tras 3 minutos de inactividad.
 */
function manageAutoDisconnect(guildId, connection, player) {
  if (!connection) return;

  // Limpiar cualquier temporizador previo
  if (voiceConnections.get(guildId)?.timeout) {
    clearTimeout(voiceConnections.get(guildId).timeout);
  }

  const timeout = setTimeout(() => {
    const activeConnection = getVoiceConnection(guildId);
    if (activeConnection) {
      activeConnection.destroy();
      voiceConnections.delete(guildId);
    }
  }, 180000); // 3 minutos

  // Guardar la nueva referencia del temporizador
  voiceConnections.set(guildId, { connection, timeout });

  player.on(AudioPlayerStatus.Idle, () => manageAutoDisconnect(guildId, connection, player));
}

/**
 * Envía un embed de respuesta al usuario.
 */
function sendEmbed(interaction, type, description) {
  const colors = {
    success: assets.color.green,
    error: assets.color.red,
  };

  const embed = new EmbedBuilder()
    .setColor(colors[type] || assets.color.base)
    .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
    .setDescription(`> *${description}*`);

  return interaction.reply({ embeds: [embed] }).catch(() => { });
}