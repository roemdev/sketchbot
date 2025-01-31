const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const assets = require("../../../assets.json");
const ffmpeg = require('@ffmpeg-installer/ffmpeg');
process.env.FFMPEG_PATH = ffmpeg.path;

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
    const message = interaction.options.getString('mensaje');
    const voiceChannel = interaction.member.voice.channel;

    // Si el usuario no está en un canal de voz, intentar unirse al canal del usuario
    if (!voiceChannel) {
      const errorEmbed = new EmbedBuilder()
        .setColor(assets.color.red)
        .setAuthor({ name: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`${assets.emoji.deny} Debes estar en un canal de voz para usar este comando.`);
      return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }

    try {
      const url = googleTTS.getAudioUrl(message, { lang: 'es', slow: false });

      // Si el bot no está en un canal de voz, se une al canal del usuario
      let connection = interaction.guild.voice?.connections.get(voiceChannel.id);
      if (!connection) {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });
      }

      const player = createAudioPlayer();
      const resource = createAudioResource(url);

      player.play(resource);
      connection.subscribe(player);

      const embed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setAuthor({ name: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`> *${message}*`);

      await interaction.reply({ embeds: [embed] });

      let inactivityTimer;
      const resetInactivityTimer = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          if (connection.state.status === 'connected') {
            connection.destroy();
          }
        }, 180000); // 3 minutos
      };

      // Actualiza el timer al recibir la interacción
      resetInactivityTimer();

      player.on(AudioPlayerStatus.Idle, resetInactivityTimer);
      player.on('stateChange', (oldState, newState) => {
        if (newState.status === AudioPlayerStatus.Playing) {
          resetInactivityTimer();
        }
      });

      player.on('error', (error) => {
        console.error('Error en el reproductor de audio:', error);

        // Embed de error
        const errorEmbed = new EmbedBuilder()
          .setColor(assets.color.red)
          .setDescription(`${assets.emoji.deny} Hubo un error al reproducir el audio.`);

        interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        // Verifica si el bot sigue conectado antes de destruir la conexión
        if (connection.state.status === 'connected') {
          connection.destroy();
        }
      });

    } catch (error) {
      console.error('Error en el TTS:', error);

      // Embed de error
      const errorEmbed = new EmbedBuilder()
        .setColor(assets.color.red)
        .setDescription(`${assets.emoji.deny} Error al generar el audio.`);

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};
