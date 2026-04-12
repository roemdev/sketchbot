const Database = require('better-sqlite3');
const { database } = require('../config.json');

let dbConnection = null;

function getDb() {
    if (dbConnection) return dbConnection;

    dbConnection = new Database(database.filename);
    initDb(dbConnection);

    return dbConnection;
}

function initDb(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_stats (
            discord_id TEXT PRIMARY KEY,
            username TEXT,
            balance INTEGER DEFAULT 0
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS role_rewards (
            role_id TEXT PRIMARY KEY,
            ammount INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS store (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            price INTEGER,
            status TEXT DEFAULT 'available',
            minecraft_item TEXT,
            icon_id TEXT
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_id TEXT,
            type TEXT,
            item_name TEXT,
            mc_nick TEXT,
            amount INTEGER,
            total_price INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS cooldowns (
            discord_id TEXT,
            command TEXT,
            expires_at DATETIME,
            PRIMARY KEY (discord_id, command)
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS temp_channels (
            channel_id TEXT PRIMARY KEY,
            owner_id TEXT
        )
    `);
}

module.exports = {
    query: (sql, params = []) => {
        const db = getDb();
        const stmt = db.prepare(sql);
        return stmt.reader ? stmt.all(...params) : stmt.run(...params);
    },
    execute: (sql, params = []) => {
        const db = getDb();
        return db.prepare(sql).run(...params);
    },
    getConnection: () => {
        const db = getDb();
        return {
            query: (sql, params = []) => db.prepare(sql).all(...params),
            release: () => {}
        };
    }
};