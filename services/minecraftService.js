const { Rcon } = require('rcon-client');
const { rcon } = require('../config.json');

async function sendCommand(command) {
  const connection = await Rcon.connect({
    host: rcon.host,
    port: parseInt(rcon.port, 10),
    password: rcon.password
  });

  const response = await connection.send(command);
  connection.end();
  return response;
}

module.exports = { sendCommand };
