const pool = require("./dbService");

// ---------------------------------------------------------------------
// GET ALL SERVERS
// ---------------------------------------------------------------------
async function getServers() {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT name, server_id FROM servers ORDER BY id"
    );
    return rows;
  } finally {
    conn.release();
  }
}

// ---------------------------------------------------------------------
module.exports = {
  getServers
};
