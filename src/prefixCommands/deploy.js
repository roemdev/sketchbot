const { EmbedBuilder } = require("discord.js");
const { execSync } = require("child_process");
const path = require("path");

module.exports = {
  name: "deploy",
  description: "Despliega los comandos del bot.",

  async execute(message, args) {
    const embed = new EmbedBuilder()
      .setColor('Random')
      .setTitle('Deploying Commands... ⏳')
      .setDescription('Estamos ejecutando el script de despliegue, por favor espera un momento.');

    const loadingMessage = await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

    try {
      // Ruta del script de despliegue
      const fileToRun = path.join(__dirname, "../../scripts/deploy-commands");

      // Ejecuta el script de manera síncrona
      execSync(`node ${fileToRun}`);

      // Responde con el resultado
      embed.setColor('Green')
        .setTitle('Deploy Complete! ✔️')
        .setDescription('Los comandos han sido desplegados correctamente.');

      loadingMessage.edit({ embeds: [embed] });
    } catch (error) {
      console.error("Error al desplegar los comandos:", error);

      // Responde con el error
      embed.setColor('Red')
        .setTitle('Deploy Failed! ❌')
        .setDescription('Ocurrió un error al intentar desplegar los comandos.');

      loadingMessage.edit({ embeds: [embed] });
    }
  },
};
