const supabase = require("./dbService");
const userService = require("./userService");
const transactionService = require("./transactionService");

// Map to keep track of active setTimeout instances
const activeTimeouts = new Map();

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
  const { data, error } = await supabase
    .from("giveaways")
    .insert({
      message_id: messageId,
      channel_id: channelId,
      guild_id: guildId,
      prize,
      winner_count: winnerCount,
      ends_at: endsAt,
      status: "active",
      hosted_by: hostedBy,
      entry_fee: entryFee,
      min_level: minLevel,
      participants: []
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getGiveaway(messageId) {
  const { data, error } = await supabase
    .from("giveaways")
    .select("*")
    .eq("message_id", messageId)
    .single();

  if (error) return null;
  return data;
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
  const { error: updateError } = await supabase
    .from("giveaways")
    .update({ participants: updatedParticipants })
    .eq("message_id", messageId);

  if (updateError) throw updateError;
  return { entryFee: giveaway.entry_fee, totalParticipants: updatedParticipants.length };
}

// Function to handle automated prize delivery
async function deliverPrize(winnerId, prizeText) {
  // 1. Check if the prize is cards packs (sobres)
  // Match patterns like "3 sobres de cartas", "1 sobre", "2 sobres"
  const packMatch = prizeText.match(/^(\d+)\s+sobre(s)?/i);
  if (packMatch) {
    const count = parseInt(packMatch[1], 10);
    const cardService = require("./cardService");
    await cardService.addPacks(winnerId, count, "Premio de Sorteo");
    return { type: "sobres", detail: `${count} sobre(s) agregados a su colección.` };
  }

  // 2. Check if the prize is coins
  // Match patterns like "500000 monedas", "500k monedas", "100,000 monedas", "1,000,000"
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

  // 3. Custom prize (manual delivery)
  return { type: "manual", detail: "Entrega manual por los administradores." };
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
  const { error } = await supabase
    .from("giveaways")
    .update({ status: "ended" })
    .eq("message_id", messageId);

  if (error) throw error;

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
  const { data: activeGiveaways, error } = await supabase
    .from("giveaways")
    .select("*")
    .eq("status", "active");

  if (error) {
    console.error("[SORTEOS] Error cargando sorteos activos:", error);
    return;
  }

  const now = Date.now();
  console.log(`[SORTEOS] Reanudando ${activeGiveaways.length} sorteos activos.`);

  for (const gw of activeGiveaways) {
    const endsTime = new Date(gw.ends_at).getTime();
    const remainingTime = endsTime - now;

    if (remainingTime <= 0) {
      // Ends immediately
      console.log(`[SORTEOS] Sorteo ${gw.message_id} ya expiró. Finalizando de inmediato.`);
      endGiveawayCallback(client, gw.message_id).catch(console.error);
    } else {
      // Schedule end
      const timer = setTimeout(() => {
        endGiveawayCallback(client, gw.message_id).catch(console.error);
      }, remainingTime);
      activeTimeouts.set(gw.message_id, timer);
    }
  }
}

async function resolveGiveaway(client, messageId) {
  const { ContainerBuilder } = require("discord.js");
  const giveaway = await getGiveaway(messageId);
  if (!giveaway || giveaway.status !== "active") return;

  const channel = client.channels.cache.get(giveaway.channel_id) || 
                  await client.channels.fetch(giveaway.channel_id).catch(() => null);
  if (!channel) {
    await supabase.from("giveaways").update({ status: "ended" }).eq("message_id", messageId);
    return;
  }

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    await supabase.from("giveaways").update({ status: "ended" }).eq("message_id", messageId);
    return;
  }

  // Live Spin / Roulette Animation if there are participants
  const participants = giveaway.participants || [];
  if (participants.length > 0) {
    const spinContainer = new ContainerBuilder()
      .setAccentColor(7419530) // DarkPurple (Juegos activos/procesos)
      .addTextDisplayComponents(t =>
        t.setContent(`## **${giveaway.prize}**`)
      )
      .addSeparatorComponents(s => s)
      .addTextDisplayComponents(t =>
        t.setContent(
          `⏳ **Finalizando:** *Girando la tómbola...*\n` +
          `👤 **Organizado por:** <@${giveaway.hosted_by}>\n` +
          `🟢 **Participantes:** **${participants.length}**`
        )
      );
    await message.edit({ components: [spinContainer] }).catch(() => null);
    
    // Wait 2.5 seconds for dramatic effect
    await new Promise(resolve => setTimeout(resolve, 2500));
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

  // Send congratulatory message in channel with automated delivery details if applicable
  if (result.winners.length > 0) {
    let msg = `🎉 ¡Felicidades ${result.winners.map(w => `<@${w}>`).join(", ")}! Has ganado **${result.prize}**.\n`;
    
    // Append details of automated prize delivery reports
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
