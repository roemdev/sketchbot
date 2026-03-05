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

    // Crear las tablas si el archivo es nuevo
    await initDb(dbConnection);
    
    return dbConnection;
}

async function initDb(db) {
    // Tabla de usuarios
    await db.exec(`
        CREATE TABLE IF NOT EXISTS user_stats (
            discord_id TEXT PRIMARY KEY,
            username TEXT,
            balance INTEGER DEFAULT 0
        )
    `);

    // Tabla de recompensas por rol
    await db.exec(`
        CREATE TABLE IF NOT EXISTS role_rewards (
            role_id TEXT PRIMARY KEY,
            ammount INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabla de la tienda
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

    // Tabla de transacciones
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

    // Tabla de cooldowns
    await db.exec(`
        CREATE TABLE IF NOT EXISTS cooldowns (
            discord_id TEXT,
            command TEXT,
            expires_at DATETIME,
            PRIMARY KEY (discord_id, command)
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
    // Mock de getConnection para mantener compatibilidad con tus servicios actuales
    getConnection: async () => {
        const db = await getDb();
        return {
            query: (sql, params) => db.all(sql, params),
            release: () => {} 
        };
    }
};