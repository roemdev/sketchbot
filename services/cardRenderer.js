const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const cardsData = require("../data/cards.json");

const CACHE_DIR = path.join(__dirname, "../data/card_images");

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Downloads a remote image and returns its buffer
 */
async function downloadImage(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(response.data);
}

/**
 * Helper to create a rounded rectangle path
 */
function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generates a collectible card image with a custom template border and text
 */
async function renderCard(cardKey) {
  const card = cardsData[cardKey];
  if (!card) throw new Error(`Card ${cardKey} not found in catalog.`);

  const width = 300;
  const height = 440;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1. Draw solid dark background
  ctx.fillStyle = "#0c0c0e";
  ctx.fillRect(0, 0, width, height);

  // 2. Load and draw the character image (clipped to card shape)
  ctx.save();
  drawRoundRect(ctx, 10, 10, width - 20, height - 20, 14);
  ctx.clip();

  if (card.imageUrl) {
    try {
      const imgBuffer = await downloadImage(card.imageUrl);
      const charImg = await loadImage(imgBuffer);
      
      // Calculate aspect ratio fit (cover the whole card)
      const scale = Math.max(width / charImg.width, height / charImg.height);
      const x = (width - charImg.width * scale) / 2;
      const y = (height - charImg.height * scale) / 2;

      ctx.drawImage(charImg, x, y, charImg.width * scale, charImg.height * scale);
    } catch (err) {
      console.error(`Failed to load image for ${cardKey}:`, err.message);
      ctx.fillStyle = "#1e1e24";
      ctx.fillRect(10, 10, width - 20, height - 20);
      ctx.fillStyle = "#4a4a5a";
      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.fillText("?", width / 2, height / 2 - 20);
    }
  } else {
    ctx.fillStyle = "#1e1e24";
    ctx.fillRect(10, 10, width - 20, height - 20);
  }

  // 3. Draw a sleek gradient footer background (still inside clip)
  const footerGrad = ctx.createLinearGradient(0, 240, 0, height - 10);
  footerGrad.addColorStop(0, "rgba(12, 12, 14, 0.0)");
  footerGrad.addColorStop(0.3, "rgba(12, 12, 14, 0.85)");
  footerGrad.addColorStop(0.7, "rgba(10, 10, 12, 0.98)");
  footerGrad.addColorStop(1, "rgba(6, 6, 8, 1.0)");
  ctx.fillStyle = footerGrad;
  ctx.fillRect(10, 220, width - 20, height - 230);
  ctx.restore();

  // 4. Determine Rarity Colors and Borders
  let borderColor1 = "#8e8e93"; // Comun - Plata/Gris
  let borderColor2 = "#d1d1d6";
  let innerColor = "rgba(142, 142, 147, 0.35)";
  let rarityText = "Comun";
  let textColor = "#cccccc";

  if (card.tier === 2) {
    borderColor1 = "#0052d4"; // Rara - Azul Zafiro
    borderColor2 = "#9cc3ff";
    innerColor = "rgba(0, 82, 212, 0.4)";
    rarityText = "Rara";
    textColor = "#5dade2";
  } else if (card.tier === 3) {
    borderColor1 = "#e65c00"; // Epica - Oro Radiant / Fuego
    borderColor2 = "#f9d423";
    innerColor = "rgba(230, 92, 0, 0.4)";
    rarityText = "Epica";
    textColor = "#f4d03f";
  } else if (card.tier === 4) {
    borderColor1 = "#8a2387"; // Legendaria - Fucsia Cosmico / Oro
    borderColor2 = "#e94057";
    innerColor = "rgba(138, 35, 135, 0.5)";
    rarityText = "Legendaria";
    textColor = "#e94057";
  }

  // 5. Draw outer rounded border
  ctx.lineWidth = 10;
  const borderGrad = ctx.createLinearGradient(0, 0, width, height);
  borderGrad.addColorStop(0, borderColor1);
  borderGrad.addColorStop(0.5, borderColor2);
  borderGrad.addColorStop(1, borderColor1);
  ctx.strokeStyle = borderGrad;
  drawRoundRect(ctx, 5, 5, width - 10, height - 10, 18);
  ctx.stroke();

  // 6. Draw inner glowing border (fine detail line)
  ctx.lineWidth = 2;
  ctx.strokeStyle = innerColor;
  drawRoundRect(ctx, 11, 11, width - 22, height - 22, 13);
  ctx.stroke();

  // 7. Draw Character Name (with premium outline for legibility)
  const nameY = 350;
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  
  // Black stroke outline
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.strokeText(card.name, width / 2, nameY);
  
  // Solid white fill
  ctx.fillStyle = "#ffffff";
  ctx.fillText(card.name, width / 2, nameY);

  // 8. Draw Anime Name
  const animeY = 378;
  ctx.font = "italic 14px Arial";
  
  // Black stroke outline
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.strokeText(card.anime, width / 2, animeY);

  // Solid light gray fill
  ctx.fillStyle = "#aaaaaa";
  ctx.fillText(card.anime, width / 2, animeY);

  // 9. Draw Tier & Rarity (no emoji to prevent broken unicode blocks)
  const tierY = 406;
  ctx.font = "bold 13px Arial";
  
  // Black stroke outline
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.strokeText(rarityText, width / 2, tierY);

  // Colored text fill
  ctx.fillStyle = textColor;
  ctx.fillText(rarityText, width / 2, tierY);

  return canvas.toBuffer("image/png");
}

/**
 * Gets the card image buffer from cache, or generates it if missing
 */
async function getCardImageBuffer(cardKey) {
  const cachePath = path.join(CACHE_DIR, `${cardKey}.png`);
  
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath);
  }

  // Generate and save to cache
  const buffer = await renderCard(cardKey);
  fs.writeFileSync(cachePath, buffer);
  return buffer;
}

module.exports = {
  getCardImageBuffer
};
