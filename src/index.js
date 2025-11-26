require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const connection = require("../src/database/database");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// DB connection
client.dbConnection = connection;

// Colecciones para comandos
client.commands = new Collection();

// Cargar comandos
const commandsPath = path.join(__dirname, "commands");
for (const folder of fs.readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);
  for (const file of fs.readdirSync(folderPath)) {
    if (!file.endsWith(".js")) continue;

    const command = require(path.join(folderPath, file));
    client.commands.set(command.data.name, command);
  }
}

// Cargar eventos
const eventsPath = path.join(__dirname, "events");
for (const file of fs.readdirSync(eventsPath)) {
  if (!file.endsWith(".js")) continue;

  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.login(process.env.DISCORD_TOKEN);
