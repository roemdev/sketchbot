const db = require("./dbService");

module.exports = {
  createUser: async (discordId, username) => {
    db.run(
      `INSERT INTO user_stats (discord_id, username) VALUES (?, ?) ON CONFLICT(discord_id) DO NOTHING`,
      discordId,
      username
    );
    return await module.exports.getUser(discordId);
  },

  getUser: async (discordId) => {
    let row = db.get(`SELECT * FROM user_stats WHERE discord_id = ?`, discordId);

    if (!row && (discordId === "server_bank" || discordId === "server_casino")) {
      const username = discordId === "server_bank" ? "Banco del Servidor" : "Casino del Servidor";
      db.run(
        `INSERT INTO user_stats (discord_id, username, balance) VALUES (?, ?, 0)
         ON CONFLICT(discord_id) DO NOTHING`,
        discordId,
        username
      );
      row = db.get(`SELECT * FROM user_stats WHERE discord_id = ?`, discordId);
    }

    return row ?? null;
  },

  getBalance: async (discordId) => {
    const user = await module.exports.getUser(discordId);
    return user ? user.balance : 0;
  },

  addBalance: async (discordId, amount, returnUser = true) => {
    if (amount < 0) {
      return await module.exports.removeBalance(discordId, Math.abs(amount), returnUser);
    }

    return db.transaction(() => {
      if (discordId === "server_bank" || discordId === "server_casino") {
        const username = discordId === "server_bank" ? "Banco del Servidor" : "Casino del Servidor";
        db.run(
          `INSERT INTO user_stats (discord_id, username, balance) VALUES (?, ?, 0)
           ON CONFLICT(discord_id) DO NOTHING`,
          discordId,
          username
        );
      } else {
        db.run(
          `INSERT INTO user_stats (discord_id, username, balance) VALUES (?, 'Usuario', 0)
           ON CONFLICT(discord_id) DO NOTHING`,
          discordId
        );
      }

      db.run(
        `UPDATE user_stats SET balance = balance + ? WHERE discord_id = ?`,
        amount,
        discordId
      );

      return returnUser ? db.get(`SELECT * FROM user_stats WHERE discord_id = ?`, discordId) : null;
    });
  },

  removeBalance: async (discordId, amount, returnUser = true) => {
    return db.transaction(() => {
      let user = db.get(`SELECT * FROM user_stats WHERE discord_id = ?`, discordId);
      if (!user && (discordId === "server_bank" || discordId === "server_casino")) {
        const username = discordId === "server_bank" ? "Banco del Servidor" : "Casino del Servidor";
        db.run(
          `INSERT INTO user_stats (discord_id, username, balance) VALUES (?, ?, 0)
           ON CONFLICT(discord_id) DO NOTHING`,
          discordId,
          username
        );
        user = db.get(`SELECT * FROM user_stats WHERE discord_id = ?`, discordId);
      }

      if (!user || user.balance < amount) {
        throw new Error("Insufficient balance");
      }

      db.run(
        `UPDATE user_stats SET balance = balance - ? WHERE discord_id = ?`,
        amount,
        discordId
      );

      return returnUser ? db.get(`SELECT * FROM user_stats WHERE discord_id = ?`, discordId) : null;
    });
  },

  setBalance: async (discordId, amount, returnUser = true) => {
    db.run(
      `INSERT INTO user_stats (discord_id, username, balance) VALUES (?, 'Usuario', ?)
       ON CONFLICT(discord_id) DO UPDATE SET balance = excluded.balance`,
      discordId,
      amount
    );
    return returnUser ? await module.exports.getUser(discordId) : null;
  },

  updateUsername: async (discordId, newUsername) => {
    db.run(
      `UPDATE user_stats SET username = ? WHERE discord_id = ?`,
      newUsername,
      discordId
    );
    return await module.exports.getUser(discordId);
  },

  getXpNeededForLevel: (level) => {
    const lvl = level || 1;
    return 5 * lvl * lvl + 50 * lvl + 100;
  },

  getTotalXp: (level, xp) => {
    const lvl = level || 1;
    let total = 0;
    for (let i = 1; i < lvl; i++) {
      total += 5 * i * i + 50 * i + 100;
    }
    return total + (xp || 0);
  },

  getBankBalance: async (discordId) => {
    const bankRecord = await module.exports.getUser(`${discordId}_bank`);
    return bankRecord ? bankRecord.balance : 0;
  },

  setBankBalance: async (discordId, amount, username = "Banco") => {
    const bankId = `${discordId}_bank`;
    const bankRecord = await module.exports.getUser(bankId);
    if (!bankRecord) {
      await module.exports.createUser(bankId, `${username}_bank`);
    }
    db.run(`UPDATE user_stats SET balance = ? WHERE discord_id = ?`, amount, bankId);
  },

  getTopUsers: async (limit = 10, sortBy = "balance", offset = 0) => {
    let sql = `
      SELECT discord_id, username, balance, level, xp
      FROM user_stats
      WHERE discord_id NOT LIKE '%_bank'
        AND discord_id != 'server_casino'
    `;

    if (sortBy === "level") {
      sql += ` ORDER BY level DESC, xp DESC LIMIT ? OFFSET ?`;
    } else {
      sql += ` ORDER BY balance DESC LIMIT ? OFFSET ?`;
    }

    const rows = db.query(sql, limit, offset);
    return rows ?? [];
  },

  addXp: async (discordId, amount, username = "Usuario de Voz") => {
    let user = await module.exports.getUser(discordId);
    if (!user) {
      user = await module.exports.createUser(discordId, username);
    }

    let currentXp = (user.xp || 0) + amount;
    let currentLevel = user.level || 1;
    let leveledUp = false;
    let levelsGained = 0;

    while (currentXp >= module.exports.getXpNeededForLevel(currentLevel)) {
      currentXp -= module.exports.getXpNeededForLevel(currentLevel);
      currentLevel++;
      leveledUp = true;
      levelsGained++;
    }

    db.run(
      `UPDATE user_stats SET xp = ?, level = ? WHERE discord_id = ?`,
      currentXp,
      currentLevel,
      discordId
    );

    return { xp: currentXp, level: currentLevel, leveledUp, levelsGained };
  },

  setXpAndLevel: async (discordId, level, xp, username = "Usuario") => {
    let user = await module.exports.getUser(discordId);
    if (!user) {
      user = await module.exports.createUser(discordId, username);
    }
    db.run(
      `UPDATE user_stats SET xp = ?, level = ? WHERE discord_id = ?`,
      xp,
      level,
      discordId
    );
    return { xp, level };
  },

  removeXp: async (discordId, amount) => {
    const user = await module.exports.getUser(discordId);
    if (!user) return null;

    let currentXp = (user.xp || 0) - amount;
    let currentLevel = user.level || 1;

    while (currentXp < 0 && currentLevel > 1) {
      currentLevel--;
      currentXp += module.exports.getXpNeededForLevel(currentLevel);
    }

    if (currentXp < 0) {
      currentXp = 0;
    }

    db.run(
      `UPDATE user_stats SET xp = ?, level = ? WHERE discord_id = ?`,
      currentXp,
      currentLevel,
      discordId
    );

    return { xp: currentXp, level: currentLevel };
  },

  getBalanceRank: async (discordId, balance) => {
    const row = db.get(
      `SELECT COUNT(*) as count FROM user_stats
       WHERE discord_id NOT LIKE '%_bank'
         AND discord_id != 'server_casino'
         AND balance > ?`,
      balance
    );
    return (row?.count ?? 0) + 1;
  },

  getLevelRank: async (discordId, level, xp) => {
    const row = db.get(
      `SELECT COUNT(*) as count FROM user_stats
       WHERE discord_id NOT LIKE '%_bank'
         AND discord_id != 'server_casino'
         AND (level > ? OR (level = ? AND xp > ?))`,
      level,
      level,
      xp
    );
    return (row?.count ?? 0) + 1;
  },

  applyEmergencyTax: async (percentage) => {
    return db.transaction(() => {
      const users = db.query(
        `SELECT discord_id, username, balance FROM user_stats
         WHERE discord_id NOT LIKE '%_bank'
           AND discord_id != 'server_casino'`
      );

      let totalDeducted = 0;
      let affectedPlayers = 0;

      const updateStmt = db.getDb().prepare(
        `UPDATE user_stats SET balance = balance - ? WHERE discord_id = ?`
      );

      for (const user of users) {
        if (user.balance > 0) {
          const deductAmount = Math.floor(user.balance * (percentage / 100));
          if (deductAmount > 0) {
            totalDeducted += deductAmount;
            affectedPlayers++;
            updateStmt.run(deductAmount, user.discord_id);
          }
        }
      }

      if (totalDeducted > 0) {
        db.run(
          `INSERT INTO user_stats (discord_id, username, balance) VALUES ('server_bank', 'Banco del Servidor', ?)
           ON CONFLICT(discord_id) DO UPDATE SET balance = balance + ?`,
          totalDeducted,
          totalDeducted
        );
      }

      return {
        affectedPlayers,
        totalDeducted,
      };
    });
  },

  changeProfession: async (discordId, profession) => {
    let user = await module.exports.getUser(discordId);
    if (!user) {
      user = await module.exports.createUser(discordId, "Usuario");
    }
    db.run(
      `UPDATE user_stats SET profession = ?, profession_xp = 0 WHERE discord_id = ?`,
      profession,
      discordId
    );
    return await module.exports.getUser(discordId);
  },
};