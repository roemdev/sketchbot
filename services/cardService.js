const db = require("./dbService");
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
  let data = db.get(`SELECT * FROM user_packs WHERE discord_id = ?`, discordId);

  if (!data) {
    db.run(
      `INSERT INTO user_packs (discord_id, username, packs_owned, packs_bought_today)
       VALUES (?, ?, 0, 0)`,
      discordId,
      username
    );
    data = db.get(`SELECT * FROM user_packs WHERE discord_id = ?`, discordId);
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
    db.run(`UPDATE user_packs SET packs_bought_today = 0 WHERE discord_id = ?`, discordId);
    data = db.get(`SELECT * FROM user_packs WHERE discord_id = ?`, discordId);
  }

  return data;
}

// Safe read-then-update increments
async function addPacks(discordId, count, username = "") {
  await getUserPacks(discordId, username);
  db.run(`UPDATE user_packs SET packs_owned = packs_owned + ? WHERE discord_id = ?`, count, discordId);
  return db.get(`SELECT * FROM user_packs WHERE discord_id = ?`, discordId);
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
  
  db.run(
    `UPDATE user_packs SET packs_owned = packs_owned + 1, last_free_pack_at = ? WHERE discord_id = ?`,
    now.toISOString(),
    discordId
  );
  return db.get(`SELECT * FROM user_packs WHERE discord_id = ?`, discordId);
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
  db.run(
    `UPDATE user_packs
     SET packs_owned = packs_owned + ?,
         packs_bought_today = packs_bought_today + ?,
         last_buy_pack_at = ?
     WHERE discord_id = ?`,
    count,
    count,
    now.toISOString(),
    discordId
  );
  
  return db.get(`SELECT * FROM user_packs WHERE discord_id = ?`, discordId);
}

// Save drawn cards to collection (returns true if card is newly collected, false if repeated)
async function addCardToCollection(discordId, cardKey) {
  const row = db.get(
    `SELECT * FROM user_cards WHERE discord_id = ? AND card_key = ?`,
    discordId,
    cardKey
  );
  
  if (row) {
    db.run(`UPDATE user_cards SET quantity = quantity + 1 WHERE id = ?`, row.id);
    return false; // Repeated
  } else {
    db.run(
      `INSERT INTO user_cards (discord_id, card_key, quantity) VALUES (?, ?, 1)`,
      discordId,
      cardKey
    );
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
    const cardInfo = cardsData[card.key] || {};
    card.name = cardInfo.name;
    card.anime = cardInfo.anime;
    card.emoji = cardInfo.emoji;
    card.imageUrl = cardInfo.imageUrl;
    const isNew = await addCardToCollection(discordId, card.key);
    card.isNew = isNew;
  }
  
  db.run(`UPDATE user_packs SET packs_owned = packs_owned - 1 WHERE discord_id = ?`, discordId);
  
  return drawn;
}

// Get user's complete collection status
async function getUserCollection(discordId) {
  const userCards = db.query(`SELECT * FROM user_cards WHERE discord_id = ?`, discordId);
  
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
  const userCards = db.query(
    `SELECT card_key, quantity FROM user_cards WHERE discord_id = ? AND quantity > 0`,
    discordId
  );

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
  const row = db.get(
    `SELECT quantity FROM user_cards WHERE discord_id = ? AND card_key = ?`,
    discordId,
    cardKey
  );
  return Boolean(row && row.quantity > 0);
}

// Safely remove 1 card copy from a user
async function removeCardFromCollection(discordId, cardKey) {
  const row = db.get(
    `SELECT id, quantity FROM user_cards WHERE discord_id = ? AND card_key = ?`,
    discordId,
    cardKey
  );

  if (!row || row.quantity < 1) {
    throw new Error(`El usuario no posee suficientes copias de la carta ${cardKey}.`);
  }

  const newQty = row.quantity - 1;
  if (newQty > 0) {
    db.run(`UPDATE user_cards SET quantity = ? WHERE id = ?`, newQty, row.id);
  } else {
    db.run(`DELETE FROM user_cards WHERE id = ?`, row.id);
  }
}

// Swap cards between two users atomically
async function swapCards(userAId, cardAKey, userBId, cardBKey) {
  return db.transaction(() => {
    const hasA = db.get(
      `SELECT quantity FROM user_cards WHERE discord_id = ? AND card_key = ? AND quantity > 0`,
      userAId,
      cardAKey
    );
    if (!hasA) {
      const nameA = cardsData[cardAKey]?.name || cardAKey;
      throw new Error(`<@${userAId}> ya no posee la carta **${nameA}**.`);
    }

    const hasB = db.get(
      `SELECT quantity FROM user_cards WHERE discord_id = ? AND card_key = ? AND quantity > 0`,
      userBId,
      cardBKey
    );
    if (!hasB) {
      const nameB = cardsData[cardBKey]?.name || cardBKey;
      throw new Error(`<@${userBId}> ya no posee la carta **${nameB}**.`);
    }

    // 1. Remove cardA from user A and add to user B
    removeCardFromCollection(userAId, cardAKey);
    addCardToCollection(userBId, cardAKey);

    // 2. Remove cardB from user B and add to user A
    removeCardFromCollection(userBId, cardBKey);
    addCardToCollection(userAId, cardBKey);

    // 3. Log transactions
    const cardAName = cardsData[cardAKey]?.name || cardAKey;
    const cardBName = cardsData[cardBKey]?.name || cardBKey;

    logTransaction({
      discordId: userAId,
      type: "trade_cards",
      itemName: `Intercambio: Entregó ${cardAName} por ${cardBName}`,
      amount: 1,
      totalPrice: 0
    }).catch(console.error);

    logTransaction({
      discordId: userBId,
      type: "trade_cards",
      itemName: `Intercambio: Entregó ${cardBName} por ${cardAName}`,
      amount: 1,
      totalPrice: 0
    }).catch(console.error);

    return true;
  });
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

  return db.transaction(() => {
    const row = db.get(
      `SELECT id, quantity FROM user_cards WHERE discord_id = ? AND card_key = ?`,
      discordId,
      cardKey
    );

    if (!row || row.quantity < count) {
      throw new Error(`No posees suficientes copias de **${cardInfo.name}**. Tienes ${row?.quantity || 0} y quieres quemar ${count}.`);
    }

    const newQty = row.quantity - count;
    if (newQty > 0) {
      db.run(`UPDATE user_cards SET quantity = ? WHERE id = ?`, newQty, row.id);
    } else {
      db.run(`DELETE FROM user_cards WHERE id = ?`, row.id);
    }

    const unitValue = getBurnValueForTier(cardInfo.tier);
    const totalReward = unitValue * count;

    // Add balance to user, deduct from bank
    userService.addBalance(discordId, totalReward, false);
    userService.addBalance("server_bank", -totalReward, false);

    logTransaction({
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
  });
}

// Mass burn all duplicate copies (quantity > 1) keeping 1 copy of each card
async function burnAllDuplicates(discordId) {
  return db.transaction(() => {
    const userCards = db.query(
      `SELECT id, card_key, quantity FROM user_cards WHERE discord_id = ? AND quantity > 1`,
      discordId
    );

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

      db.run(`UPDATE user_cards SET quantity = 1 WHERE id = ?`, row.id);

      totalCoins += reward;
      totalBurned += burnQty;
      if (cardInfo.tier === 1) breakdown.tier1 += burnQty;
      else if (cardInfo.tier === 2) breakdown.tier2 += burnQty;
      else if (cardInfo.tier === 3) breakdown.tier3 += burnQty;
      else breakdown.tier4 += burnQty;
    }

    userService.addBalance(discordId, totalCoins, false);
    userService.addBalance("server_bank", -totalCoins, false);

    logTransaction({
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
  });
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
