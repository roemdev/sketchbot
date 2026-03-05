const Database = require('better-sqlite3');
const { database } = require('../config.json');

let dbConnection = null;

function getDb() {
    if (dbConnection) return dbConnection;

    dbConnection = new Database(database.filename);

    // Crear las tablas si el archivo es nuevo
    initDb(dbConnection);
    
    return dbConnection;
}

function initDb(db) {
    // Tabla de usuarios
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_stats (
            discord_id TEXT PRIMARY KEY,
            username TEXT,
            balance INTEGER DEFAULT 0
        )
    `);

    // Tabla de recompensas por rol
    db.exec(`
        CREATE TABLE IF NOT EXISTS role_rewards (
            role_id TEXT PRIMARY KEY,
            ammount INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabla de la tienda
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

    // Tabla de transacciones
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

    // Tabla de cooldowns
    db.exec(`
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
        const db = getDb();
        return db.prepare(sql).all(params);
    },
    execute: async (sql, params = []) => {
        const db = getDb();
        return db.prepare(sql).run(params);
    },
    // Mock de getConnection para mantener compatibilidad con tus servicios actuales
    getConnection: async () => {
        const db = getDb();
        return {
            query: async (sql, params = []) => db.prepare(sql).all(params),
            release: () => {} 
        };
    }
};
