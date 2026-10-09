const fs = require("node:fs");
const path = require("node:path");

let Database;
try {
  Database = require("better-sqlite3");
} catch {
  Database = require("node:sqlite").DatabaseSync;
}

let dbInstance = null;

function getDbPath() {
  try {
    const config = require("../config.json");
    if (config.database?.filename) {
      return path.resolve(process.cwd(), config.database.filename);
    }
  } catch {}
  return path.resolve(__dirname, "../data/database.sqlite");
}

function initDb(db) {
  db.exec(`PRAGMA journal_mode = WAL;`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_stats (
      discord_id TEXT PRIMARY KEY,
      username TEXT,
      balance INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      profession TEXT,
      profession_xp INTEGER DEFAULT 0,
      stats TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS user_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      card_key TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      UNIQUE(discord_id, card_key)
    );

    CREATE TABLE IF NOT EXISTS user_packs (
      discord_id TEXT PRIMARY KEY,
      username TEXT,
      packs_owned INTEGER DEFAULT 0,
      packs_bought_today INTEGER DEFAULT 0,
      last_free_pack_at TEXT,
      last_buy_pack_at TEXT
    );

    CREATE TABLE IF NOT EXISTS store (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      icon_id TEXT,
      minecraft_item TEXT,
      status TEXT DEFAULT 'available'
    );

    CREATE TABLE IF NOT EXISTS giveaways (
      id TEXT PRIMARY KEY,
      message_id TEXT UNIQUE NOT NULL,
      channel_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      winner_count INTEGER DEFAULT 1,
      ends_at TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      hosted_by TEXT NOT NULL,
      participants TEXT DEFAULT '[]',
      entry_fee INTEGER DEFAULT 0,
      min_level INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cooldowns (
      discord_id TEXT NOT NULL,
      command TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      PRIMARY KEY (discord_id, command)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      type TEXT NOT NULL,
      item_name TEXT,
      mc_nick TEXT,
      amount INTEGER DEFAULT 0,
      total_price INTEGER DEFAULT 0,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS role_rewards (
      role_id TEXT PRIMARY KEY,
      ammount INTEGER NOT NULL,
      level INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS temp_channels (
      channel_id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL
    );
  `);
}

function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(dbPath);
  initDb(dbInstance);

  return dbInstance;
}

module.exports = {
  getDb,
  query: (sql, ...params) => {
    const db = getDb();
    return db.prepare(sql).all(...params);
  },
  get: (sql, ...params) => {
    const db = getDb();
    return db.prepare(sql).get(...params);
  },
  run: (sql, ...params) => {
    const db = getDb();
    return db.prepare(sql).run(...params);
  },
  exec: (sql) => {
    const db = getDb();
    return db.exec(sql);
  },
  transaction: (fn) => {
    const db = getDb();
    db.exec("BEGIN IMMEDIATE;");
    try {
      const result = fn(db);
      db.exec("COMMIT;");
      return result;
    } catch (err) {
      db.exec("ROLLBACK;");
      throw err;
    }
  },
};