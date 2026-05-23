const { Events } = require('discord.js');
const googleTTS = require('google-tts-api');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');

// Queue structure: Map<guildId, { queue: Array<{text, voiceChannel}>, isPlaying: boolean, player: AudioPlayer, timeout: Timeout }>}
const ttsQueues = new Map();

module.exports = {
  name: Events.MessageCreate,
  ttsQueues,
  async execute(message) {
    if (message.author.bot) return;

    // Check if the message is in the specific channels
    const allowedChannels = ['1479545547806347415', '1310722470596317194'];
    if (!allowedChannels.includes(message.channel.id)) return;

    // Check if user is in a voice channel
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return;

    // Get text and truncate to 200 chars max
    let text = message.content;
    if (!text || text.trim() === '') return;
    
    if (text.length > 200) {
      text = text.substring(0, 197) + '...';
    }

    const guildId = message.guild.id;

    if (!ttsQueues.has(guildId)) {
      ttsQueues.set(guildId, {
        queue: [],
        isPlaying: false,
        player: createAudioPlayer(),
        timeout: null
      });

      const queueData = ttsQueues.get(guildId);

      // Handle when player finishes playing
      queueData.player.on(AudioPlayerStatus.Idle, () => {
        queueData.isPlaying = false;
        playNext(guildId);
      });
    }

    const queueData = ttsQueues.get(guildId);
    queueData.queue.push({ text, voiceChannel });

    if (!queueData.isPlaying) {
      playNext(guildId);
    }
  }
};

async function playNext(guildId) {
  const queueData = ttsQueues.get(guildId);
  if (!queueData || queueData.queue.length === 0) {
    // If queue is empty, set a timeout to leave the voice channel after 1 minute of inactivity
    if (queueData && !queueData.timeout) {
      queueData.timeout = setTimeout(() => {
        const connection = getVoiceConnection(guildId);
        if (connection) {
          connection.destroy();
        }
        ttsQueues.delete(guildId);
      }, 180000); // 3 minutes
    }
    return;
  }

  // Clear timeout if there was one
  if (queueData.timeout) {
    clearTimeout(queueData.timeout);
    queueData.timeout = null;
  }

  queueData.isPlaying = true;
  const { text, voiceChannel } = queueData.queue.shift();

  try {
    // Ensure bot is in the correct voice channel
    let connection = getVoiceConnection(guildId);
    if (!connection || connection.joinConfig.channelId !== voiceChannel.id) {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });
      connection.subscribe(queueData.player);
    }

    // Generate TTS URL
    const url = googleTTS.getAudioUrl(text, {
      lang: 'es',
      slow: false,
      host: 'https://translate.google.com',
    });

    // Play the resource
    const resource = createAudioResource(url);
    queueData.player.play(resource);

  } catch (error) {
    console.error('Error playing TTS:', error);
    queueData.isPlaying = false;
    playNext(guildId); // Continue with next item in queue
  }
}
