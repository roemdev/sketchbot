const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const config = require("../config.json");

const DB_PATH = path.join(__dirname, "../data/database.sqlite");

async function fetchAllRows(tableName) {
  const url = config.supabase?.url || "https://xvzsmdxfirqescnxyqia.supabase.co";
  const key = config.supabase?.serviceRoleKey || "sb_publishable_gFFA-mFZuxXaa9WFFKqqqQ_lgeDwbKu";
  let allRows = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const endpoint = `${url}/rest/v1/${tableName}?select=*&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch from ${tableName}: ${res.status} ${text}`);
    }

    const rows = await res.json();
    if (!rows || rows.length === 0) break;
    allRows = allRows.concat(rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return allRows;
}

function initSchema(db) {
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

async function migrate() {
  console.log("=== INICIANDO MIGRACIÓN DE SUPABASE A SQLITE ===");

  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }

  // Si existe base de datos previa, crear backup
  if (fs.existsSync(DB_PATH)) {
    const backupPath = `${DB_PATH}.bak.${Date.now()}`;
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`Backup creado en: ${backupPath}`);
  }

  const db = new DatabaseSync(DB_PATH);
  initSchema(db);

  const tables = [
    "user_stats",
    "user_cards",
    "user_packs",
    "store",
    "giveaways",
    "cooldowns",
    "transactions",
    "role_rewards",
    "temp_channels",
  ];

  for (const table of tables) {
    console.log(`Descargando datos de '${table}' desde Supabase...`);
    const rows = await fetchAllRows(table);
    console.log(` -> Recibidas ${rows.length} filas.`);

    if (rows.length === 0) continue;

    db.exec("BEGIN TRANSACTION;");
    try {
      if (table === "user_stats") {
        const stmt = db.prepare(`
          INSERT INTO user_stats (discord_id, username, balance, xp, level, profession, profession_xp, stats)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(discord_id) DO UPDATE SET
            username=excluded.username,
            balance=excluded.balance,
            xp=excluded.xp,
            level=excluded.level,
            profession=excluded.profession,
            profession_xp=excluded.profession_xp,
            stats=excluded.stats
        `);
        for (const r of rows) {
          stmt.run(
            r.discord_id,
            r.username || null,
            r.balance ?? 0,
            r.xp ?? 0,
            r.level ?? 1,
            r.profession || null,
            r.profession_xp ?? 0,
            typeof r.stats === "object" ? JSON.stringify(r.stats) : r.stats || "{}"
          );
        }
      } else if (table === "user_cards") {
        const stmt = db.prepare(`
          INSERT INTO user_cards (id, discord_id, card_key, quantity)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(discord_id, card_key) DO UPDATE SET
            quantity=excluded.quantity
        `);
        for (const r of rows) {
          stmt.run(r.id, r.discord_id, r.card_key, r.quantity ?? 1);
        }
      } else if (table === "user_packs") {
        const stmt = db.prepare(`
          INSERT INTO user_packs (discord_id, username, packs_owned, packs_bought_today, last_free_pack_at, last_buy_pack_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(discord_id) DO UPDATE SET
            username=excluded.username,
            packs_owned=excluded.packs_owned,
            packs_bought_today=excluded.packs_bought_today,
            last_free_pack_at=excluded.last_free_pack_at,
            last_buy_pack_at=excluded.last_buy_pack_at
        `);
        for (const r of rows) {
          stmt.run(
            r.discord_id,
            r.username || null,
            r.packs_owned ?? 0,
            r.packs_bought_today ?? 0,
            r.last_free_pack_at || null,
            r.last_buy_pack_at || null
          );
        }
      } else if (table === "store") {
        const stmt = db.prepare(`
          INSERT INTO store (id, name, description, price, icon_id, minecraft_item, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            description=excluded.description,
            price=excluded.price,
            icon_id=excluded.icon_id,
            minecraft_item=excluded.minecraft_item,
            status=excluded.status
        `);
        for (const r of rows) {
          stmt.run(
            r.id,
            r.name,
            r.description || null,
            r.price,
            r.icon_id || null,
            r.minecraft_item || null,
            r.status || "available"
          );
        }
      } else if (table === "giveaways") {
        const stmt = db.prepare(`
          INSERT INTO giveaways (id, message_id, channel_id, guild_id, prize, winner_count, ends_at, status, hosted_by, participants, entry_fee, min_level, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            message_id=excluded.message_id,
            channel_id=excluded.channel_id,
            guild_id=excluded.guild_id,
            prize=excluded.prize,
            winner_count=excluded.winner_count,
            ends_at=excluded.ends_at,
            status=excluded.status,
            hosted_by=excluded.hosted_by,
            participants=excluded.participants,
            entry_fee=excluded.entry_fee,
            min_level=excluded.min_level,
            created_at=excluded.created_at
        `);
        for (const r of rows) {
          stmt.run(
            r.id,
            r.message_id,
            r.channel_id,
            r.guild_id,
            r.prize,
            r.winner_count ?? 1,
            r.ends_at,
            r.status || "active",
            r.hosted_by,
            Array.isArray(r.participants) ? JSON.stringify(r.participants) : r.participants || "[]",
            r.entry_fee ?? 0,
            r.min_level ?? 0,
            r.created_at || new Date().toISOString()
          );
        }
      } else if (table === "cooldowns") {
        const stmt = db.prepare(`
          INSERT INTO cooldowns (discord_id, command, expires_at)
          VALUES (?, ?, ?)
          ON CONFLICT(discord_id, command) DO UPDATE SET
            expires_at=excluded.expires_at
        `);
        for (const r of rows) {
          stmt.run(r.discord_id, r.command, r.expires_at);
        }
      } else if (table === "transactions") {
        const stmt = db.prepare(`
          INSERT INTO transactions (id, discord_id, type, item_name, mc_nick, amount, total_price, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            discord_id=excluded.discord_id,
            type=excluded.type,
            item_name=excluded.item_name,
            mc_nick=excluded.mc_nick,
            amount=excluded.amount,
            total_price=excluded.total_price,
            timestamp=excluded.timestamp
        `);
        for (const r of rows) {
          stmt.run(
            r.id,
            r.discord_id,
            r.type,
            r.item_name || null,
            r.mc_nick || null,
            r.amount ?? 0,
            r.total_price ?? 0,
            r.timestamp || new Date().toISOString()
          );
        }
      } else if (table === "role_rewards") {
        const stmt = db.prepare(`
          INSERT INTO role_rewards (role_id, ammount, level, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(role_id) DO UPDATE SET
            ammount=excluded.ammount,
            level=excluded.level,
            updated_at=excluded.updated_at
        `);
        for (const r of rows) {
          stmt.run(r.role_id, r.ammount, r.level ?? 1, r.updated_at || new Date().toISOString());
        }
      } else if (table === "temp_channels") {
        const stmt = db.prepare(`
          INSERT INTO temp_channels (channel_id, owner_id)
          VALUES (?, ?)
          ON CONFLICT(channel_id) DO UPDATE SET
            owner_id=excluded.owner_id
        `);
        for (const r of rows) {
          stmt.run(r.channel_id, r.owner_id);
        }
      }
      db.exec("COMMIT;");
      console.log(` -> Guardado correctamente en SQLite.`);
    } catch (err) {
      db.exec("ROLLBACK;");
      console.error(`Error guardando tabla ${table}:`, err);
      throw err;
    }
  }

  console.log("\n=== VALIDANDO REGISTROS EN SQLITE ===");
  for (const table of tables) {
    const res = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    console.log(`Tabla '${table}': ${res.count} registros.`);
  }

  console.log("\n✅ ¡MIGRACIÓN COMPLETADA CON ÉXITO!");
}

migrate().catch(console.error);
