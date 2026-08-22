const cardsData = require("../data/cards.json");
const cardRenderer = require("../services/cardRenderer");

async function run() {
  const keys = Object.keys(cardsData);
  console.log(`Starting precaching of ${keys.length} cards...`);
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    console.log(`[${i+1}/${keys.length}] Rendering/Caching ${key}...`);
    try {
      await cardRenderer.getCardImageBuffer(key);
    } catch (e) {
      console.error(`Failed to cache ${key}:`, e.message);
    }
  }
  console.log("Precaching completed successfully!");
}

run();
