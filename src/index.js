require("dotenv").config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// =======================
// Cargar comandos
// =======================
const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));

    if (!command.data) {
      console.warn(`⚠️ El archivo ${file} en ${folder} no tiene 'data' y se ignorará.`);
      continue;
    }

    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  }
}

// =======================
// Registrar comandos (guild + global)
// =======================
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔄 Actualizando comandos...");

    const existingGuildCommands = await rest.get(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    );
    for (const cmd of existingGuildCommands) {
      await rest.delete(
        Routes.applicationGuildCommand(process.env.CLIENT_ID, process.env.GUILD_ID, cmd.id)
      );
    }

    const existingGlobalCommands = await rest.get(
      Routes.applicationCommands(process.env.CLIENT_ID)
    );
    for (const cmd of existingGlobalCommands) {
      await rest.delete(
        Routes.applicationCommand(process.env.CLIENT_ID, cmd.id)
      );
    }

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log("✅ Comandos registrados.");
  } catch (error) {
    console.error(error);
  }
})();

// =======================
// Cargar eventos
// =======================
const eventsPath = path.join(__dirname, "events");
fs.readdirSync(eventsPath).forEach(file => {
  if (file.endsWith(".js")) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
});

// =======================
// Conectar a Discord
// =======================
client.login(process.env.DISCORD_TOKEN);
