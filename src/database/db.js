const mysql = require('mysql2');
const config = require('../../config.json');

const pool = mysql.createPool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  port: config.database.port
});

const promisePool = pool.promise();

promisePool.getConnection()
  .then(connection => {
    console.log('db connection: ✔');
    connection.release();
  })
  .catch(err => {
    console.log('db connection: ✘', err.message);
  });

module.exports = promisePool;
