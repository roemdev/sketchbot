const fs = require("fs");
const path = require("path");
require('dotenv').config({ path: './config/.env' });
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const connection = require("./config/database");
const { execSync } = require("child_process");

// Create discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.dbConnection = connection;

// Deploy slash commands
try {
  const fileToRun = path.join(__dirname, "./scripts/deploy-commands");
  execSync(`node ${fileToRun}`);
  console.log("commands deploy: ✔");
} catch (error) {
  console.error("commands deploy: ✘", error);
}

// Load slash commands
client.commands = new Collection();

function loadCommands(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);

    if (fs.lstatSync(filePath).isDirectory()) {
      loadCommands(filePath);
    } else if (file.endsWith(".js")) {
      const command = require(filePath);

      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
      }
    }
  }
}

// 🔄 Iniciar la carga de comandos desde la carpeta "commands"
loadCommands(path.join(__dirname, "./src/commands"));


// Load prefix commands
client.prefixCommands = new Collection();
const prefixFoldersPath = path.join(__dirname, "./src/prefixCommands");
const prefixCommandFiles = fs.readdirSync(prefixFoldersPath);

for (const file of prefixCommandFiles) {
  const filePath = path.join(prefixFoldersPath, file);

  if (file.endsWith(".js")) {
    const prefixCommand = require(filePath);

    if ("name" in prefixCommand && "execute" in prefixCommand) {
      client.prefixCommands.set(prefixCommand.name, prefixCommand);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

// Load events
const eventsPath = path.join(__dirname, "./src/events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Detect and execute prefix commands
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.prefixCommands.get(commandName);

  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(`Error al ejecutar el comando ${commandName}:`, error);
  }
});

client.login(process.env.BOT_TOKEN);