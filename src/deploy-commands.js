require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Array donde guardaremos todos los comandos
const commands = [];
const commandsPath = path.join(__dirname, "commands");

// Cargar todos los comandos de la carpeta
for (const folder of fs.readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);
  for (const file of fs.readdirSync(folderPath)) {
    if (!file.endsWith(".js")) continue;

    const command = require(path.join(folderPath, file));
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    }
  }
}

// Crear REST client con token
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    // 🔹 Sobrescribir comandos de un guild (inmediato para pruebas)
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Comandos del guild registrados correctamente.`);
    }

    // 🔹 Sobrescribir comandos globales (tarda hasta 1 hora en propagarse)
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log(`✅ Comandos globales registrados correctamente.`);

    console.log("🔹 Comandos viejos eliminados automáticamente si ya no existen en las carpetas.");
  } catch (error) {
    console.error("❌ Error al registrar comandos:", error);
  }
})();
