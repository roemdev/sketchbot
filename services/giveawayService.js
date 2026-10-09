const crypto = require("node:crypto");
const db = require("./dbService");
const userService = require("./userService");
const transactionService = require("./transactionService");

// Map to keep track of active setTimeout instances
const activeTimeouts = new Map();

function formatGiveawayRow(row) {
  if (!row) return null;
  return {
    ...row,
    participants: typeof row.participants === "string" ? JSON.parse(row.participants || "[]") : row.participants || []
  };
}

async function createGiveaway({
  messageId,
  channelId,
  guildId,
  prize,
  winnerCount,
  endsAt,
  hostedBy,
  entryFee = 0,
  minLevel = 0
}) {
  const id = crypto.randomUUID();
  db.run(
    `INSERT INTO giveaways (id, message_id, channel_id, guild_id, prize, winner_count, ends_at, status, hosted_by, participants, entry_fee, min_level, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, '[]', ?, ?, ?)`,
    id,
    messageId,
    channelId,
    guildId,
    prize,
    winnerCount,
    endsAt,
    hostedBy,
    entryFee,
    minLevel,
    new Date().toISOString()
  );

  return await getGiveaway(messageId);
}

async function getGiveaway(messageId) {
  const row = db.get(`SELECT * FROM giveaways WHERE message_id = ?`, messageId);
  return formatGiveawayRow(row);
}

async function addParticipant(messageId, userId, username) {
  const giveaway = await getGiveaway(messageId);
  if (!giveaway) throw new Error("Sorteo no encontrado.");
  if (giveaway.status !== "active") throw new Error("Este sorteo ya ha finalizado.");
  
  if (giveaway.participants.includes(userId)) {
    throw new Error("Ya estás participando en este sorteo.");
  }

  // Verify min level requirement
  if (giveaway.min_level > 0) {
    const dbUser = await userService.getUser(userId);
    const userLevel = dbUser ? dbUser.level : 1;
    if (userLevel < giveaway.min_level) {
      throw new Error(`Necesitas al menos nivel **${giveaway.min_level}** para participar. Tu nivel actual es **${userLevel}**.`);
    }
  }

  // Verify and process entry fee
  if (giveaway.entry_fee > 0) {
    const balance = await userService.getBalance(userId);
    if (balance < giveaway.entry_fee) {
      throw new Error(`No tienes suficientes monedas para entrar. La entrada cuesta **${giveaway.entry_fee.toLocaleString("es-DO")}** monedas.`);
    }

    // Deduct coins and transfer to Server Bank
    await userService.addBalance(userId, -giveaway.entry_fee, false);
    await userService.addBalance("server_bank", giveaway.entry_fee, false);

    await transactionService.logTransaction({
      discordId: userId,
      type: "giveaway_fee",
      itemName: `Entrada a sorteo ${giveaway.prize}`,
      amount: 1,
      totalPrice: giveaway.entry_fee
    });

    await transactionService.logTransaction({
      discordId: "server_bank",
      type: "bank_deposit",
      itemName: `Entrada de <@${userId}> a sorteo ${giveaway.prize}`,
      amount: giveaway.entry_fee,
      totalPrice: 0
    });
  }

  // Add user to participants list
  const updatedParticipants = [...giveaway.participants, userId];
  db.run(
    `UPDATE giveaways SET participants = ? WHERE message_id = ?`,
    JSON.stringify(updatedParticipants),
    messageId
  );

  return { entryFee: giveaway.entry_fee, totalParticipants: updatedParticipants.length };
}

// Function to handle automated prize delivery
async function deliverPrize(winnerId, prizeText) {
  // 1. Check if the prize is cards packs (sobres)
  const packMatch = prizeText.match(/^(\d+)\s+sobre(s)?/i);
  if (packMatch) {
    const count = parseInt(packMatch[1], 10);
    const cardService = require("./cardService");
    await cardService.addPacks(winnerId, count, "Premio de Sorteo");
    return { type: "sobres", detail: `${count} sobre(s) agregados a su colección.` };
  }

  // 2. Check if the prize is coins
  const cleanPrizeText = prizeText.replace(/,/g, "").replace(/\./g, "");
  const coinsMatch = cleanPrizeText.match(/^(\d+)(k)?\s+(moneda(s)?|crédito(s)?|credito(s)?)/i) || 
                     cleanPrizeText.match(/^\+(\d+)(k)?\s*(moneda(s)?|crédito(s)?)/i);
                     
  if (coinsMatch) {
    let amount = parseInt(coinsMatch[1], 10);
    const multiplier = coinsMatch[2] ? 1000 : 1;
    amount = amount * multiplier;

    // Suma Cero: Debit from Server Bank and credit the winner
    const bankBalance = await userService.getBalance("server_bank");
    if (bankBalance >= amount) {
      await userService.addBalance("server_bank", -amount, false);
      await userService.addBalance(winnerId, amount, false);

      await transactionService.logTransaction({
        discordId: "server_bank",
        type: "bank_withdrawal",
        amount: -amount,
        itemName: `Premio de Sorteo entregado a <@${winnerId}>`
      });

      await transactionService.logTransaction({
        discordId: winnerId,
        type: "giveaway_win",
        amount: amount
      });

      return { type: "monedas", detail: `**+${amount.toLocaleString("es-DO")}** monedas depositadas en su cartera.` };
    } else {
      return { type: "error", detail: "El Banco del Servidor no tiene fondos suficientes para entregar este premio automáticamente." };
    }
  }

  return { type: "manual", detail: null };
}

async function endGiveaway(messageId) {
  const giveaway = await getGiveaway(messageId);
  if (!giveaway || giveaway.status !== "active") return null;

  // Select winners
  const participants = giveaway.participants || [];
  const winnerCount = giveaway.winner_count;
  const winners = [];

  if (participants.length > 0) {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const limit = Math.min(winnerCount, shuffled.length);
    for (let i = 0; i < limit; i++) {
      winners.push(shuffled[i]);
    }
  }

  // Mark ended in db
  db.run(`UPDATE giveaways SET status = 'ended' WHERE message_id = ?`, messageId);

  // Deliver prizes
  const deliveryReports = [];
  for (const winnerId of winners) {
    const report = await deliverPrize(winnerId, giveaway.prize);
    deliveryReports.push({ winnerId, ...report });
  }

  // Clear timeout reference
  if (activeTimeouts.has(messageId)) {
    clearTimeout(activeTimeouts.get(messageId));
    activeTimeouts.delete(messageId);
  }

  return {
    prize: giveaway.prize,
    hostedBy: giveaway.hosted_by,
    winners,
    deliveryReports,
    totalParticipants: participants.length
  };
}

async function rerollGiveaway(messageId) {
  const giveaway = await getGiveaway(messageId);
  if (!giveaway) throw new Error("Sorteo no encontrado.");
  if (giveaway.status !== "ended") throw new Error("El sorteo debe estar finalizado para hacer un resorteo.");

  const participants = giveaway.participants || [];
  if (participants.length === 0) {
    throw new Error("No hay participantes en este sorteo para elegir un nuevo ganador.");
  }

  // Pick random winner
  const randomWinner = participants[Math.floor(Math.random() * participants.length)];

  // Deliver prize to new winner
  const report = await deliverPrize(randomWinner, giveaway.prize);

  return {
    prize: giveaway.prize,
    hostedBy: giveaway.hosted_by,
    winner: randomWinner,
    deliveryReport: report
  };
}

// Resumes all pending active giveaways (to be called on bot startup)
async function resumeActiveGiveaways(client, endGiveawayCallback) {
  const activeGiveaways = db.query(`SELECT * FROM giveaways WHERE status = 'active'`).map(formatGiveawayRow);

  const now = Date.now();

  for (const gw of activeGiveaways) {
    const endsTime = new Date(gw.ends_at).getTime();
    const remainingTime = endsTime - now;

    if (remainingTime <= 0) {
      console.log(`[SORTEOS] Sorteo ${gw.message_id} ya expiró. Finalizando de inmediato.`);
      endGiveawayCallback(client, gw.message_id).catch(console.error);
    } else {
      const timer = setTimeout(() => {
        endGiveawayCallback(client, gw.message_id).catch(console.error);
      }, remainingTime);
      activeTimeouts.set(gw.message_id, timer);
    }
  }

  return activeGiveaways.length;
}

async function resolveGiveaway(client, messageId) {
  const { ContainerBuilder } = require("discord.js");
  const giveaway = await getGiveaway(messageId);
  if (!giveaway || giveaway.status !== "active") return;

  const channel = client.channels.cache.get(giveaway.channel_id) || 
                  await client.channels.fetch(giveaway.channel_id).catch(() => null);
  if (!channel) {
    db.run(`UPDATE giveaways SET status = 'ended' WHERE message_id = ?`, messageId);
    return;
  }

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    db.run(`UPDATE giveaways SET status = 'ended' WHERE message_id = ?`, messageId);
    return;
  }

  // End in DB and deliver prizes
  const result = await endGiveaway(messageId);
  if (!result) return;

  const winnersMentions = result.winners.length > 0 
    ? result.winners.map(w => `<@${w}>`).join(", ") 
    : "Ninguno (no hubo participantes)";

  const endsAtUnix = Math.floor(new Date(giveaway.ends_at).getTime() / 1000);

  // Edit the original message to show ended status
  const container = new ContainerBuilder()
    .setAccentColor(2303786) // NotQuiteBlack (Finalizado/Neutro)
    .addTextDisplayComponents(t =>
      t.setContent(`## **${result.prize}**`)
    )
    .addSeparatorComponents(s => s)
    .addTextDisplayComponents(t =>
      t.setContent(
        `⏳ **Finalizado:** <t:${endsAtUnix}:R> (<t:${endsAtUnix}:f>)\n` +
        `👤 **Organizado por:** <@${result.hostedBy}>\n` +
        `🟢 **Participantes:** **${result.totalParticipants}**\n` +
        `🏆 **Ganadores:** ${winnersMentions}`
      )
    );

  await message.edit({ components: [container], content: null }).catch(console.error);

  if (result.winners.length > 0) {
    let msg = `🎉 ¡Felicidades ${result.winners.map(w => `<@${w}>`).join(", ")}! Has ganado **${result.prize}**.\n`;
    
    const details = result.deliveryReports
      .map(r => `<@${r.winnerId}>: ${r.detail}`)
      .join("\n");
    if (details) {
      msg += `> ${details}`;
    }

    await channel.send(msg).catch(console.error);
  } else {
    await channel.send(`😭 El sorteo por **${result.prize}** ha finalizado, pero nadie participó.`).catch(console.error);
  }
}

module.exports = {
  createGiveaway,
  getGiveaway,
  addParticipant,
  endGiveaway,
  rerollGiveaway,
  resumeActiveGiveaways,
  resolveGiveaway,
  activeTimeouts
};
