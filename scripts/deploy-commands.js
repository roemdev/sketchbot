const { REST, Routes } = require("discord.js");
require("dotenv").config({ path: "./config/.env" });
const fs = require("node:fs");
const path = require("node:path");

const commands = [];
const foldersPath = path.join(__dirname, "../src/commands");

// Función recursiva para cargar comandos desde subcarpetas
function loadCommands(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);

    if (fs.lstatSync(filePath).isDirectory()) {
      loadCommands(filePath); // 🔄 Si es una carpeta, se llama recursivamente
    } else if (file.endsWith(".js")) {
      const command = require(filePath);
      if ("data" in command && "execute" in command) {
        commands.push(command.data.toJSON());
      }
    }
  }
}

// Cargar todos los comandos desde la carpeta principal
loadCommands(foldersPath);

// Instancia del REST client
const rest = new REST().setToken(process.env.BOT_TOKEN);

// Desplegar los comandos
(async () => {
  try {
    console.log(`🔄 Encontrados ${commands.length} comandos para desplegar.`);
    console.log(`🚀 Iniciando la actualización de comandos...`);

    // Registrar comandos en Discord
    const data = await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log(`✅ ${data.length} comandos desplegados exitosamente.`);
  } catch (error) {
    console.error("❌ Error al desplegar comandos:", error);
  }
})();
