const { ContainerBuilder, MessageFlags } = require("discord.js");
const config = require("../utils/config");

const COIN = config.emojis.coin || "🪙";

async function getLogChannel(client) {
  const channelId = config.publicLogChannel || "1545056871151566899";
  if (!channelId || !client) return null;
  try {
    const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId);
    return channel || null;
  } catch (err) {
    console.error(`[PUBLIC-LOG] Error obteniendo canal de logs (${channelId}):`, err);
    return null;
  }
}

// 1. Entrada de usuario (Color neutro NotQuiteBlack: 2303786) - 1 línea
async function logMemberJoin(member) {
  const channel = await getLogChannel(member.client);
  if (!channel) return;

  const container = new ContainerBuilder()
    .setAccentColor(2303786)
    .addTextDisplayComponents(t => t.setContent(`📥 **<@${member.id}>** se ha unido a la comunidad.`));

  await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(console.error);
}

// 2. Salida de usuario (Color neutro NotQuiteBlack: 2303786) - 1 línea
async function logMemberLeave(member) {
  const channel = await getLogChannel(member.client);
  if (!channel) return;

  const container = new ContainerBuilder()
    .setAccentColor(2303786)
    .addTextDisplayComponents(t => t.setContent(`📤 **<@${member.id}>** ha dejado el servidor.`));

  await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(console.error);
}

// 3. Ganancia en Casino (Color verde: 2067276) - 1 línea
async function logCoinWin(client, { userId, amount, gameName }) {
  const channel = await getLogChannel(client);
  if (!channel) return;

  const container = new ContainerBuilder()
    .setAccentColor(2067276)
    .addTextDisplayComponents(t => t.setContent(`💰 **<@${userId}>** ganó **${COIN}${amount.toLocaleString("es-DO")}** en **${gameName}**.`));

  await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(console.error);
}

// 4. Pérdida en Casino (Color rojo: 10038562) - 1 línea
async function logCoinLoss(client, { userId, amount, gameName }) {
  const channel = await getLogChannel(client);
  if (!channel) return;

  const container = new ContainerBuilder()
    .setAccentColor(10038562)
    .addTextDisplayComponents(t => t.setContent(`💥 **<@${userId}>** perdió **${COIN}${amount.toLocaleString("es-DO")}** en **${gameName}**.`));

  await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(console.error);
}

// 5. Ganancia por Economía (Trabajo / Tareas / Subsidio) (Color verde: 2067276) - 1 línea
async function logWorkReward(client, { userId, amount, sourceName }) {
  const channel = await getLogChannel(client);
  if (!channel) return;

  const container = new ContainerBuilder()
    .setAccentColor(2067276)
    .addTextDisplayComponents(t => t.setContent(`🪙 **<@${userId}>** recibió **${COIN}${amount.toLocaleString("es-DO")}** por **${sourceName}**.`));

  await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(console.error);
}

// 6. Carta Épica (Color morado: 7419530) - 1 línea
async function logEpicCardPull(client, { userId, cardName, anime, emoji }) {
  const channel = await getLogChannel(client);
  if (!channel) return;

  const container = new ContainerBuilder()
    .setAccentColor(7419530)
    .addTextDisplayComponents(t => t.setContent(`🟣 **<@${userId}>** obtuvo la carta Épica ${emoji || "🟣"} **${cardName}** *(${anime || "Anime"})*.`));

  await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(console.error);
}

// 7. Carta Legendaria (Color amarillo: 15844367) - 1 línea
async function logLegendaryCardPull(client, { userId, cardName, anime, emoji }) {
  const channel = await getLogChannel(client);
  if (!channel) return;

  const container = new ContainerBuilder()
    .setAccentColor(15844367)
    .addTextDisplayComponents(t => t.setContent(`🟡 **<@${userId}>** ¡ha conseguido la carta Legendaria ${emoji || "🟡"} **${cardName}** *(${anime || "Anime"})*!`));

  await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(console.error);
}

async function sendTestLogs(client, targetChannel) {
  const channel = await getLogChannel(client) || targetChannel;
  if (!channel) return;

  // 1. Entrada
  const joinContainer = new ContainerBuilder()
    .setAccentColor(2303786)
    .addTextDisplayComponents(t => t.setContent(`📥 **<@123456789012345678>** se ha unido a la comunidad.`));
  await channel.send({ components: [joinContainer], flags: MessageFlags.IsComponentsV2 }).catch(console.error);

  // 2. Salida
  const leaveContainer = new ContainerBuilder()
    .setAccentColor(2303786)
    .addTextDisplayComponents(t => t.setContent(`📤 **<@123456789012345678>** ha dejado el servidor.`));
  await channel.send({ components: [leaveContainer], flags: MessageFlags.IsComponentsV2 }).catch(console.error);

  // 3. Ganancia de Casino
  const winContainer = new ContainerBuilder()
    .setAccentColor(2067276)
    .addTextDisplayComponents(t => t.setContent(`💰 **<@123456789012345678>** ganó **${COIN}500,000** en **Blackjack**.`));
  await channel.send({ components: [winContainer], flags: MessageFlags.IsComponentsV2 }).catch(console.error);

  // 4. Pérdida de Casino
  const lossContainer = new ContainerBuilder()
    .setAccentColor(10038562)
    .addTextDisplayComponents(t => t.setContent(`💥 **<@123456789012345678>** perdió **${COIN}250,000** en **Torre de Riesgo**.`));
  await channel.send({ components: [lossContainer], flags: MessageFlags.IsComponentsV2 }).catch(console.error);

  // 5. Recompensa por Economía (Trabajo / Subsidio)
  const workContainer = new ContainerBuilder()
    .setAccentColor(2067276)
    .addTextDisplayComponents(t => t.setContent(`🪙 **<@123456789012345678>** recibió **${COIN}150,000** por **Subsidio Diario**.`));
  await channel.send({ components: [workContainer], flags: MessageFlags.IsComponentsV2 }).catch(console.error);

  // 6. Carta Épica
  const epicContainer = new ContainerBuilder()
    .setAccentColor(7419530)
    .addTextDisplayComponents(t => t.setContent(`🟣 **<@123456789012345678>** obtuvo la carta Épica 🟣 **Goku Super Saiyan** *(Dragon Ball Z)*.`));
  await channel.send({ components: [epicContainer], flags: MessageFlags.IsComponentsV2 }).catch(console.error);

  // 7. Carta Legendaria
  const legendaryContainer = new ContainerBuilder()
    .setAccentColor(15844367)
    .addTextDisplayComponents(t => t.setContent(`🟡 **<@123456789012345678>** ¡ha conseguido la carta Legendaria 🐉 **Kaido (Forma Dragón)** *(One Piece)*!`));
  await channel.send({ components: [legendaryContainer], flags: MessageFlags.IsComponentsV2 }).catch(console.error);
}

module.exports = {
  logMemberJoin,
  logMemberLeave,
  logCoinWin,
  logCoinLoss,
  logWorkReward,
  logEpicCardPull,
  logLegendaryCardPull,
  sendTestLogs
};
