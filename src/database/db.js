const fs = require('fs');

const rawData = fs.readFileSync('./config.json');
const config = JSON.parse(rawData);

const mysql = require('mysql2')

const connection = mysql.createConnection({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  port: config.database.port
});

connection.connect((err) => {
  if (err) throw err;
});

module.exports = connection;