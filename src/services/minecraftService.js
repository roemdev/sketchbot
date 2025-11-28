const { Rcon } = require('rcon-client');

async function sendCommand(command) {
  const rcon = await Rcon.connect({
    host: process.env.RCON_HOST,
    port: parseInt(process.env.RCON_PORT, 10),
    password: process.env.RCON_PASSWORD
  });

  const response = await rcon.send(command);
  rcon.end();
  return response;
}

module.exports = { sendCommand };
