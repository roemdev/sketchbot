const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { database } = require('../config.json');

let dbConnection = null;

async function getDb() {
    if (dbConnection) return dbConnection;

    dbConnection = await open({
        filename: database.filename,
        driver: sqlite3.Database
    });

    await initDb(dbConnection);
    
    return dbConnection;
}

async function initDb(db) {
    // Tablas existentes
    await db.exec(`
        CREATE TABLE IF NOT EXISTS user_stats (
            discord_id TEXT PRIMARY KEY,
            username TEXT,
            balance INTEGER DEFAULT 0
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS role_rewards (
            role_id TEXT PRIMARY KEY,
            ammount INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS store (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            price INTEGER,
            status TEXT DEFAULT 'available',
            minecraft_item TEXT,
            icon_id TEXT
        )
    `);

    await db.exec(`
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

    await db.exec(`
        CREATE TABLE IF NOT EXISTS cooldowns (
            discord_id TEXT,
            command TEXT,
            expires_at DATETIME,
            PRIMARY KEY (discord_id, command)
        )
    `);

    // NUEVA TABLA: Canales temporales
    await db.exec(`
        CREATE TABLE IF NOT EXISTS temp_channels (
            channel_id TEXT PRIMARY KEY,
            owner_id TEXT
        )
    `);
}

module.exports = {
    query: async (sql, params = []) => {
        const db = await getDb();
        return await db.all(sql, params);
    },
    execute: async (sql, params = []) => {
        const db = await getDb();
        return await db.run(sql, params);
    },
    getConnection: async () => {
        const db = await getDb();
        return {
            query: (sql, params) => db.all(sql, params),
            release: () => {} 
        };
    }
};