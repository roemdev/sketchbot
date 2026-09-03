const supabase = require("./dbService");
const userService = require("./userService");
const { logTransaction } = require("./transactionService");
const config = require("../utils/config");
const cardsData = require("../data/cards.json");

// Helper function to build lists of cards by tier
function getCardsByTier() {
  const tier1 = [];
  const tier2 = [];
  const tier3 = [];
  const legendary = [];

  for (const cardKey of Object.keys(cardsData)) {
    const card = cardsData[cardKey];
    if (card.tier === 1) {
      tier1.push(cardKey);
    } else if (card.tier === 2) {
      tier2.push(cardKey);
    } else if (card.tier === 3) {
      tier3.push(cardKey);
    } else if (card.tier === 4) {
      legendary.push(cardKey);
    }
  }

  return { tier1, tier2, tier3, legendary };
}

// Draw a single card according to configured rarity weights
function drawCard(cardsByTier) {
  const weights = config.cardsMinigame.rarityWeights;
  
  const rand = Math.random();
  let cumulative = 0;
  
  cumulative += weights.tier1;
  if (rand < cumulative) {
    const idx = Math.floor(Math.random() * cardsByTier.tier1.length);
    return { key: cardsByTier.tier1[idx], tier: 1 };
  }
  
  cumulative += weights.tier2;
  if (rand < cumulative) {
    const idx = Math.floor(Math.random() * cardsByTier.tier2.length);
    return { key: cardsByTier.tier2[idx], tier: 2 };
  }
  
  cumulative += weights.tier3;
  if (rand < cumulative) {
    const idx = Math.floor(Math.random() * cardsByTier.tier3.length);
    return { key: cardsByTier.tier3[idx], tier: 3 };
  }
  
  const idx = Math.floor(Math.random() * cardsByTier.legendary.length);
  return { key: cardsByTier.legendary[idx], tier: 4 };
}

// Convert a card key to its Discord emoji string
function getCardEmoji(cardKey) {
  return cardsData[cardKey]?.emoji || "🎴";
}

// Retrieve or create a user's pack record, applying UTC-4 daily reset for purchases
async function getUserPacks(discordId, username = "") {
  let { data, error } = await supabase
    .from("user_packs")
    .select("*")
    .eq("discord_id", discordId)
    .single();

  if (error && error.code === "PGRST116") {
    const { data: inserted, error: insertError } = await supabase
      .from("user_packs")
      .insert({
        discord_id: discordId,
        username,
        packs_owned: 0,
        packs_bought_today: 0
      })
      .select()
      .single();
    if (insertError) throw insertError;
    data = inserted;
  } else if (error) {
    throw error;
  }

  // UTC-4 timezone helper for 12-hour period (00:00 - 11:59:59 and 12:00 - 23:59:59)
  const now = new Date();
  const getUTC4Period = (d) => {
    const utc4 = new Date(d.getTime() - 4 * 60 * 60 * 1000);
    const year = utc4.getUTCFullYear();
    const month = String(utc4.getUTCMonth() + 1).padStart(2, "0");
    const date = String(utc4.getUTCDate()).padStart(2, "0");
    const hours = utc4.getUTCHours();
    const period = hours < 12 ? "00" : "12";
    return `${year}-${month}-${date} ${period}`;
  };

  const currentPeriod = getUTC4Period(now);
  const lastBuyPeriod = data.last_buy_pack_at ? getUTC4Period(new Date(data.last_buy_pack_at)) : null;

  if (currentPeriod !== lastBuyPeriod && data.packs_bought_today > 0) {
    const { data: updated, error: updateError } = await supabase
      .from("user_packs")
      .update({ packs_bought_today: 0 })
      .eq("discord_id", discordId)
      .select()
      .single();
    if (updateError) throw updateError;
    data = updated;
  }

  return data;
}

// Safe read-then-update increments
async function addPacks(discordId, count, username = "") {
  const packs = await getUserPacks(discordId, username);
  const newCount = packs.packs_owned + count;
  
  const { data, error } = await supabase
    .from("user_packs")
    .update({ packs_owned: newCount })
    .eq("discord_id", discordId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

// Process the claim of a daily free pack
async function claimDailyPack(discordId, username) {
  const packs = await getUserPacks(discordId, username);
  
  const now = new Date();
  const getUTC4Day = (d) => {
    const utc4 = new Date(d.getTime() - 4 * 60 * 60 * 1000);
    return utc4.toISOString().split("T")[0];
  };
  
  if (packs.last_free_pack_at && getUTC4Day(now) === getUTC4Day(new Date(packs.last_free_pack_at))) {
    throw new Error("Ya reclamaste tu sobre diario hoy. Vuelve mañana.");
  }
  
  const { data, error } = await supabase
    .from("user_packs")
    .update({
      packs_owned: packs.packs_owned + 1,
      last_free_pack_at: now.toISOString()
    })
    .eq("discord_id", discordId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

// Purchase packs using bot balance in a closed-loop transaction
async function buyPacks(discordId, count, username) {
  if (count <= 0) throw new Error("La cantidad debe ser mayor a 0.");
  
  const packPrice = config.cardsMinigame.packPrice;
  const dailyLimit = config.cardsMinigame.dailyPurchaseLimit;
  
  const packs = await getUserPacks(discordId, username);
  if (packs.packs_bought_today + count > dailyLimit) {
    throw new Error(`Límite de compra alcanzado. Solo puedes comprar hasta ${dailyLimit} sobres cada 12 horas (el reset es a las 00:00 y 12:00 hora UTC-4). En este período ya has comprado ${packs.packs_bought_today}.`);
  }
  
  const totalPrice = packPrice * count;
  const userBalance = await userService.getBalance(discordId);
  if (userBalance < totalPrice) {
    throw new Error(`No tienes suficientes monedas. Cada sobre cuesta **${packPrice.toLocaleString("es-DO")}** y necesitas **${totalPrice.toLocaleString("es-DO")}** en total.`);
  }
  
  // Closed loop: Subtract from user, add to server bank
  await userService.addBalance(discordId, -totalPrice, false);
  await userService.addBalance("server_bank", totalPrice, false);
  
  // Log transactions
  await logTransaction({
    discordId,
    type: "buy_packs",
    itemName: `${count} sobre(s) de cartas`,
    amount: count,
    totalPrice
  });
  
  await logTransaction({
    discordId: "server_bank",
    type: "bank_deposit",
    itemName: `Venta de ${count} sobre(s) a <@${discordId}>`,
    amount: totalPrice,
    totalPrice: 0
  });
  
  const now = new Date();
  const { data, error } = await supabase
    .from("user_packs")
    .update({
      packs_owned: packs.packs_owned + count,
      packs_bought_today: packs.packs_bought_today + count,
      last_buy_pack_at: now.toISOString()
    })
    .eq("discord_id", discordId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

// Save drawn cards to collection (returns true if card is newly collected, false if repeated)
async function addCardToCollection(discordId, cardKey) {
  const { data, error } = await supabase
    .from("user_cards")
    .select("*")
    .eq("discord_id", discordId)
    .eq("card_key", cardKey)
    .single();
    
  if (error && error.code !== "PGRST116") throw error;
  
  if (data) {
    const { error: updateError } = await supabase
      .from("user_cards")
      .update({ quantity: data.quantity + 1 })
      .eq("id", data.id);
    if (updateError) throw updateError;
    return false; // Repeated
  } else {
    const { error: insertError } = await supabase
      .from("user_cards")
      .insert({ discord_id: discordId, card_key: cardKey, quantity: 1 });
    if (insertError) throw insertError;
    return true; // New
  }
}

// Process pack opening
async function openPack(discordId, username) {
  const packs = await getUserPacks(discordId, username);
  if (packs.packs_owned <= 0) {
    throw new Error("No tienes ningún sobre para abrir. Consigue sobres con `/sobres diario` o `/sobres comprar`.");
  }
  
  const cardsByTier = getCardsByTier();
  const drawn = [];
  for (let i = 0; i < 3; i++) {
    drawn.push(drawCard(cardsByTier));
  }
  
  for (const card of drawn) {
    const isNew = await addCardToCollection(discordId, card.key);
    card.isNew = isNew;
  }
  
  const { error: updateError } = await supabase
    .from("user_packs")
    .update({ packs_owned: packs.packs_owned - 1 })
    .eq("discord_id", discordId);
    
  if (updateError) throw updateError;
  
  return drawn;
}

// Get user's complete collection status
async function getUserCollection(discordId) {
  const { data: userCards, error } = await supabase
    .from("user_cards")
    .select("*")
    .eq("discord_id", discordId);
    
  if (error) throw error;
  
  const ownedMap = new Map();
  for (const row of userCards || []) {
    ownedMap.set(row.card_key, row.quantity);
  }
  
  const cardsByTier = getCardsByTier();
  
  const buildCollectionList = (list) => {
    return list.map(cardKey => {
      const owned = ownedMap.has(cardKey);
      const quantity = owned ? ownedMap.get(cardKey) : 0;
      return {
        key: cardKey,
        owned,
        quantity,
        emoji: getCardEmoji(cardKey)
      };
    });
  };
  
  const tier1 = buildCollectionList(cardsByTier.tier1);
  const tier2 = buildCollectionList(cardsByTier.tier2);
  const tier3 = buildCollectionList(cardsByTier.tier3);
  const legendary = buildCollectionList(cardsByTier.legendary);
  
  const totalUnique = userCards?.length || 0;
  
  return {
    tier1,
    tier2,
    tier3,
    legendary,
    totalUnique,
    totalCards: 51,
    progressPercent: Math.round((totalUnique / 51) * 100)
  };
}

// Get list of cards owned by a user with quantity > 0
async function getUserOwnedCards(discordId) {
  const { data: userCards, error } = await supabase
    .from("user_cards")
    .select("card_key, quantity")
    .eq("discord_id", discordId)
    .gt("quantity", 0);

  if (error) throw error;
  
  return (userCards || []).map(row => {
    const cardInfo = cardsData[row.card_key] || {};
    return {
      cardKey: row.card_key,
      quantity: row.quantity,
      name: cardInfo.name || row.card_key,
      emoji: cardInfo.emoji || "🎴",
      tier: cardInfo.tier || 1,
      anime: cardInfo.anime || "Desconocido"
    };
  });
}

// Check if a user owns at least 1 copy of a card
async function hasCard(discordId, cardKey) {
  const { data, error } = await supabase
    .from("user_cards")
    .select("quantity")
    .eq("discord_id", discordId)
    .eq("card_key", cardKey)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data && data.quantity > 0;
}

// Safely remove 1 card copy from a user
async function removeCardFromCollection(discordId, cardKey) {
  const { data, error } = await supabase
    .from("user_cards")
    .select("id, quantity")
    .eq("discord_id", discordId)
    .eq("card_key", cardKey)
    .single();

  if (error) throw error;
  if (!data || data.quantity < 1) {
    throw new Error(`El usuario no posee suficientes copias de la carta ${cardKey}.`);
  }

  const newQty = data.quantity - 1;
  if (newQty > 0) {
    const { error: updateError } = await supabase
      .from("user_cards")
      .update({ quantity: newQty })
      .eq("id", data.id);
    if (updateError) throw updateError;
  } else {
    const { error: deleteError } = await supabase
      .from("user_cards")
      .delete()
      .eq("id", data.id);
    if (deleteError) throw deleteError;
  }
}

// Swap cards between two users atomically
async function swapCards(userAId, cardAKey, userBId, cardBKey) {
  const hasA = await hasCard(userAId, cardAKey);
  if (!hasA) {
    const nameA = cardsData[cardAKey]?.name || cardAKey;
    throw new Error(`<@${userAId}> ya no posee la carta **${nameA}**.`);
  }

  const hasB = await hasCard(userBId, cardBKey);
  if (!hasB) {
    const nameB = cardsData[cardBKey]?.name || cardBKey;
    throw new Error(`<@${userBId}> ya no posee la carta **${nameB}**.`);
  }

  // 1. Remove cardA from user A and add to user B
  await removeCardFromCollection(userAId, cardAKey);
  await addCardToCollection(userBId, cardAKey);

  // 2. Remove cardB from user B and add to user A
  await removeCardFromCollection(userBId, cardBKey);
  await addCardToCollection(userAId, cardBKey);

  // 3. Log transactions
  const cardAName = cardsData[cardAKey]?.name || cardAKey;
  const cardBName = cardsData[cardBKey]?.name || cardBKey;

  await logTransaction({
    discordId: userAId,
    type: "trade_cards",
    itemName: `Intercambio: Entregó ${cardAName} por ${cardBName}`,
    amount: 1,
    totalPrice: 0
  }).catch(console.error);

  await logTransaction({
    discordId: userBId,
    type: "trade_cards",
    itemName: `Intercambio: Entregó ${cardBName} por ${cardAName}`,
    amount: 1,
    totalPrice: 0
  }).catch(console.error);

  return true;
}

function getBurnValueForTier(tier) {
  const defaults = { tier1: 2500, tier2: 7500, tier3: 25000, tier4: 100000 };
  const burnValues = config.cardsMinigame?.burnValues || defaults;
  if (tier === 1) return burnValues.tier1 || 2500;
  if (tier === 2) return burnValues.tier2 || 7500;
  if (tier === 3) return burnValues.tier3 || 25000;
  return burnValues.tier4 || 100000;
}

// Burn a specific quantity of a specific card for coins
async function burnCard(discordId, cardKey, count = 1) {
  if (count <= 0) throw new Error("La cantidad a quemar debe ser mayor a 0.");

  const cardInfo = cardsData[cardKey];
  if (!cardInfo) throw new Error(`La carta ${cardKey} no existe.`);

  const { data, error } = await supabase
    .from("user_cards")
    .select("id, quantity")
    .eq("discord_id", discordId)
    .eq("card_key", cardKey)
    .single();

  if (error && error.code === "PGRST116") {
    throw new Error(`No posees la carta **${cardInfo.name}**.`);
  } else if (error) {
    throw error;
  }

  if (!data || data.quantity < count) {
    throw new Error(`No posees suficientes copias de **${cardInfo.name}**. Tienes ${data?.quantity || 0} y quieres quemar ${count}.`);
  }

  const newQty = data.quantity - count;
  if (newQty > 0) {
    const { error: updateError } = await supabase
      .from("user_cards")
      .update({ quantity: newQty })
      .eq("id", data.id);
    if (updateError) throw updateError;
  } else {
    const { error: deleteError } = await supabase
      .from("user_cards")
      .delete()
      .eq("id", data.id);
    if (deleteError) throw deleteError;
  }

  const unitValue = getBurnValueForTier(cardInfo.tier);
  const totalReward = unitValue * count;

  // Add balance to user, deduct from bank
  await userService.addBalance(discordId, totalReward, false);
  await userService.addBalance("server_bank", -totalReward, false);

  await logTransaction({
    discordId,
    type: "burn_cards",
    itemName: `Quema de ${count}x ${cardInfo.name}`,
    amount: count,
    totalPrice: totalReward
  }).catch(console.error);

  return {
    count,
    cardKey,
    name: cardInfo.name,
    emoji: cardInfo.emoji,
    tier: cardInfo.tier,
    unitValue,
    totalReward
  };
}

// Mass burn all duplicate copies (quantity > 1) keeping 1 copy of each card
async function burnAllDuplicates(discordId) {
  const { data: userCards, error } = await supabase
    .from("user_cards")
    .select("id, card_key, quantity")
    .eq("discord_id", discordId)
    .gt("quantity", 1);

  if (error) throw error;
  if (!userCards || userCards.length === 0) {
    throw new Error("No tienes cartas duplicadas para quemar en este momento.");
  }

  let totalCoins = 0;
  let totalBurned = 0;
  const breakdown = { tier1: 0, tier2: 0, tier3: 0, tier4: 0 };

  for (const row of userCards) {
    const cardInfo = cardsData[row.card_key] || { tier: 1 };
    const burnQty = row.quantity - 1;
    const unitValue = getBurnValueForTier(cardInfo.tier);
    const reward = unitValue * burnQty;

    // Update row to quantity = 1
    const { error: updateError } = await supabase
      .from("user_cards")
      .update({ quantity: 1 })
      .eq("id", row.id);

    if (updateError) throw updateError;

    totalCoins += reward;
    totalBurned += burnQty;
    if (cardInfo.tier === 1) breakdown.tier1 += burnQty;
    else if (cardInfo.tier === 2) breakdown.tier2 += burnQty;
    else if (cardInfo.tier === 3) breakdown.tier3 += burnQty;
    else breakdown.tier4 += burnQty;
  }

  // Credit reward to user
  await userService.addBalance(discordId, totalCoins, false);
  await userService.addBalance("server_bank", -totalCoins, false);

  await logTransaction({
    discordId,
    type: "burn_cards_mass",
    itemName: `Quema masiva de ${totalBurned} cartas duplicadas`,
    amount: totalBurned,
    totalPrice: totalCoins
  }).catch(console.error);

  return {
    totalBurned,
    totalCoins,
    breakdown
  };
}

module.exports = {
  getCardsByTier,
  drawCard,
  getCardEmoji,
  getUserPacks,
  addPacks,
  claimDailyPack,
  buyPacks,
  openPack,
  getUserCollection,
  getUserOwnedCards,
  hasCard,
  swapCards,
  burnCard,
  burnAllDuplicates
};
