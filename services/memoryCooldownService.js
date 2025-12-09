const cooldowns = new Map();

module.exports = {
  checkCooldown(userId, key) {
    const k = `${key}:${userId}`;
    const expires = cooldowns.get(k);

    if (!expires) return 0;

    const now = Math.floor(Date.now() / 1000);
    const remaining = expires - now;

    return remaining > 0 ? remaining : 0;
  },

  setCooldown(userId, key, seconds) {
    const k = `${key}:${userId}`;
    const expires = Math.floor(Date.now() / 1000) + seconds;
    cooldowns.set(k, expires);
  }
};
