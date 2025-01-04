const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits, REST, Routes } = require("discord.js");
const config = require('./config.json');
const connection = require('./db');

// Configuración del cliente - cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.commands = new Collection();
client.prefixCommands = new Collection();

// Función para cargar comandos slash
function loadCommands(commandsPath) {
  const commands = [];
  const items = fs.readdirSync(commandsPath);

  for (const item of items) {
    const itemPath = path.join(commandsPath, item);
    if (fs.statSync(itemPath).isDirectory()) {
      commands.push(...loadCommands(itemPath));
    } else if (item.endsWith(".js")) {
      const command = require(itemPath);
      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
      } else {
        console.warn(`[WARNING] El comando en ${itemPath} no tiene propiedades "data" o "execute".`);
      }
    }
  }

  return commands;
}

// Función para cargar comandos con prefijo
function loadPrefixCommands(prefixCommandsPath) {
  const items = fs.readdirSync(prefixCommandsPath);

  for (const item of items) {
    const itemPath = path.join(prefixCommandsPath, item);
    if (fs.statSync(itemPath).isDirectory()) {
      loadPrefixCommands(itemPath);
    } else if (item.endsWith(".js")) {
      const command = require(itemPath);
      if ("name" in command && "execute" in command) {
        client.prefixCommands.set(command.name, command);
      } else {
        console.warn(`[WARNING] El comando con prefijo en ${itemPath} no tiene propiedades "name" o "execute".`);
      }
    }
  }
}

// Función para cargar eventos
function loadEvents(eventsPath) {
  const files = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));
  for (const file of files) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.name && typeof event.execute === "function") {
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
    } else {
      console.warn(`[WARNING] El evento en ${filePath} no tiene propiedades "name" o "execute".`);
    }
  }
}

// Detectar y ejecutar comandos con prefijo
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
    message.channel.send("Hubo un error al ejecutar ese comando.");
  }
});

// Registrar comandos y conectar el bot
(async () => {
  const commandsPath = path.join(__dirname, "./src/commands");
  const eventsPath = path.join(__dirname, "./src/events");
  const prefixCommandsPath = path.join(__dirname, "./src/prefixCommands");
  const token = config.bot.token;
  const clientId = config.bot.clientId;
  const guildId = config.bot.guildId;

  try {
    const commands = loadCommands(commandsPath);
    loadEvents(eventsPath);
    loadPrefixCommands(prefixCommandsPath);

    const rest = new REST({ version: "10" }).setToken(token);
    console.log(`Registrando ${commands.length} comandos en el servidor...`);
    const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });

    console.log(`${data.length} comandos registrados exitosamente.`);
    client.login(token);
  } catch (error) {
    console.error("Error al iniciar el bot:", error);
  }
})();