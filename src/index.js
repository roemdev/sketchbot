require("dotenv").config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
client.commands = new Collection();

// =======================
// Cargar comandos
// =======================
console.log("🔄 Cargando comandos...");
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
console.log(`✅ Comandos cargados: ${commands.length}`);

// =======================
// Registrar comandos en la guild
// =======================
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    console.log("🔄 Registrando comandos en la guild...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados en la guild.");
  } catch (error) {
    console.error(error);
  }
})();

// =======================
// Cargar eventos
// =======================
console.log("🔄 Cargando eventos...");
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}
console.log(`✅ Eventos cargados: ${eventFiles.length}`);

// =======================
// Conectar a Discord
// =======================
client.once("clientReady", () => {
  console.log(`🤖 Bot listo! Conectado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
