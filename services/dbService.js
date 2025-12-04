const mysql = require("mysql2/promise");
const { database } = require("../config.json");

// Crear pool de conexiones para eficiencia
const pool = mysql.createPool({
  host: database.host,
  user: database.user,
  password: database.password,
  database: database.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  /**
   * Ejecuta una consulta SELECT
   * @param {string} query - Consulta SQL con placeholders
   * @param {Array} params - Valores para los placeholders
   * @returns {Promise<Array>} - Resultado de la consulta
   */
  query: async (query, params) => {
    const [rows] = await pool.execute(query, params);
    return rows;
  },

  /**
   * Ejecuta una consulta INSERT/UPDATE/DELETE
   * @param {string} query - Consulta SQL con placeholders
   * @param {Array} params - Valores para los placeholders
   * @returns {Promise<Object>} - Información de la ejecución (insertId, affectedRows, etc.)
   */
  execute: async (query, params) => {
    const [result] = await pool.execute(query, params);
    return result;
  },

  /**
   * Obtener una conexión para transacciones complejas
   * @returns {Promise<mysql.PoolConnection>}
   */
  getConnection: async () => {
    return await pool.getConnection();
  }
};
