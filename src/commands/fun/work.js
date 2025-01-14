const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');

const usersBalance = new Map();
const userCooldown = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('¡Trabaja y gana dinero!'),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Verificar si el usuario tiene un cooldown activo
    const lastWorkTime = userCooldown.get(userId);
    const currentTime = Date.now();
    const cooldownDuration = 60000;

    if (lastWorkTime && currentTime - lastWorkTime < cooldownDuration) {
      const nextWorkTime = Math.floor((lastWorkTime + cooldownDuration) / 1000);
      const embed = new EmbedBuilder()
        .setColor(assets.color.red)
        .setDescription(`${assets.emoji.deny} Todavía no puedes volver a trabajar. Podrás hacerlo en: <t:${nextWorkTime}:R>.`);
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Monto aleatorio entre 35,000 y 75,000
    const earnings = Math.floor(Math.random() * 40001) + 35000;

    // Obtener el balance actual o iniciar con el monto ganado
    const balance = usersBalance.has(userId)
      ? usersBalance.get(userId) + earnings
      : earnings;

    usersBalance.set(userId, balance);

    // Actualizar el tiempo del último trabajo
    userCooldown.set(userId, currentTime);

    const embed = new EmbedBuilder()
      .setColor(assets.color.green)
      .setDescription(`${assets.emoji.check} ¡Fuiste a trabajar y obtuviste **🔸${earnings.toLocaleString()}** créditos! ⚒️`);

    await interaction.reply({ embeds: [embed] });
  },
};
