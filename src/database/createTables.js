// src/database/createTables.js
require("dotenv").config({ path: '.env' });
const pool = require("./database");

(async () => {
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Tabla de usuarios / stats
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id VARCHAR(30) PRIMARY KEY,
        username VARCHAR(100),
        balance INT NOT NULL DEFAULT 0,
        exp INT NOT NULL DEFAULT 0,
        level INT NOT NULL DEFAULT 1,
        created_at INT NOT NULL DEFAULT UNIX_TIMESTAMP(),
        updated_at INT NOT NULL DEFAULT UNIX_TIMESTAMP()
      );
    `);

    // Tabla de configuración de tareas
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tasks_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        reward_min INT NOT NULL DEFAULT 0,
        reward_max INT NOT NULL DEFAULT 0,
        exp_min INT NOT NULL DEFAULT 0,
        exp_max INT NOT NULL DEFAULT 0,
        cooldown_minutes INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at INT NOT NULL DEFAULT UNIX_TIMESTAMP()
      );
    `);

    // Tabla de cooldowns por usuario
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_cooldowns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(30) NOT NULL,
        task_id INT NOT NULL,
        expires_at INT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_stats(user_id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks_config(id) ON DELETE CASCADE
      );
    `);

    // Tabla de tienda
    await conn.query(`
      CREATE TABLE IF NOT EXISTS store_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_name VARCHAR(100) NOT NULL,
        description TEXT,
        price INT NOT NULL DEFAULT 0,
        category VARCHAR(50),
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        metadata JSON DEFAULT '{}',
        created_at INT NOT NULL DEFAULT UNIX_TIMESTAMP()
      );
    `);

    // Tabla de preguntas de trivia
    await conn.query(`
      CREATE TABLE IF NOT EXISTS trivia_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        wrong_answer_1 TEXT NOT NULL,
        wrong_answer_2 TEXT NOT NULL,
        category VARCHAR(50),
        difficulty VARCHAR(20),
        created_at INT NOT NULL DEFAULT UNIX_TIMESTAMP()
      );
    `);

    // Tabla de puntuaciones de trivia
    await conn.query(`
      CREATE TABLE IF NOT EXISTS trivia_scores (
        user_id VARCHAR(30) PRIMARY KEY,
        correct_answers INT NOT NULL DEFAULT 0,
        wrong_answers INT NOT NULL DEFAULT 0,
        streak INT NOT NULL DEFAULT 0,
        updated_at INT NOT NULL DEFAULT UNIX_TIMESTAMP(),
        FOREIGN KEY (user_id) REFERENCES user_stats(user_id) ON DELETE CASCADE
      );
    `);

    await conn.commit();

  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Error creando las tablas:", err);
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
})();
