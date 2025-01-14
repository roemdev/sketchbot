const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');

const usersBalance = new Map();
const userCooldown = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Trabaja y gana dinero!'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const userName = interaction.user.username;

    // Verificar si el usuario tiene un cooldown activo
    const lastWorkTime = userCooldown.get(userId);
    const currentTime = Date.now();
    const cooldownDuration = 3600000;

    if (lastWorkTime && currentTime - lastWorkTime < cooldownDuration) {
      const timeLeft = ((cooldownDuration - (currentTime - lastWorkTime)) / 1000).toFixed(0);
      const embed = new EmbedBuilder()
      .setColor(assets.color.red)
      .setDescription(`${assets.emoji.deny} Todavía no puedes volver a trabajar. Espera ${timeLeft}`);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Monto aleatorio entre 35,000 y 75,000
    const earnings = Math.floor(Math.random() * 40001) + 35000;

    // Obtener el balance actual o iniciar con el monto ganado
    const balance = usersBalance.has(userId)
      ? usersBalance.set(userId, usersBalance.get(userId) + earnings)
      : usersBalance.set(userId, earnings);

    // Actualizar el tiempo del último trabajo
    userCooldown.set(userId, currentTime);

    const embed = new EmbedBuilder()
      .setColor(assets.color.green)
      .setDescription(`${assets.emoji.check} ¡Fuiste a trabajar y obtuviste **🔸${earnings.toLocaleString()}** créditos!\n-# Puedes volver a trabajar en: ${cooldownDuration}`);

    await interaction.follow({ embeds: [embed] });
  },
};
