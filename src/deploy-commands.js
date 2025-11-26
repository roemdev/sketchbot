require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const foldersPath = path.join(__dirname, "commands");

for (const folder of fs.readdirSync(foldersPath)) {
  const folderPath = path.join(foldersPath, folder);
  for (const file of fs.readdirSync(folderPath)) {
    const command = require(path.join(folderPath, file));
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log(`Comandos registrados`);
  } catch (e) {
    console.error(e);
  }
})();
