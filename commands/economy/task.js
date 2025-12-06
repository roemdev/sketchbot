const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../core.json");
const userService = require("../../services/userService");
const cooldownService = require("../../services/cooldownService");
const { logTransaction } = require("../../services/transactionService");

const { minEarn, maxEarn, taskDuration, cooldown } = config.tasks;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trabajo")
    .setDescription("Realiza una tarea y gana créditos."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const now = Math.floor(Date.now() / 1000);

    const cd = await cooldownService.checkCooldown(userId, "trabajo");
    if (cd) {
      const resetTimestamp = now + cd;
      return interaction.reply({
        embeds: [
          makeEmbed(
            "info",
            "Cooldown activo",
            `⏱ Debes esperar <t:${resetTimestamp}:R> antes de volver a usar /trabajo.`
          )
        ]
      });
    }

    await userService.createUser(userId, username);

    const taskType = Math.floor(Math.random() * 3);

    switch (taskType) {
      case 0: {
        const earned = Math.floor(Math.random() * (maxEarn - minEarn + 1)) + minEarn;
        const formatted = earned.toLocaleString("es-DO");
        await userService.addBalance(userId, earned);
        await logTransaction({ discordId: userId, type: "task", amount: earned });
        await cooldownService.setCooldown(userId, "trabajo", cooldown || 3600);

        return interaction.reply({
          embeds: [
            makeEmbed(
              "success",
              "Trabajo completado",
              `Hoy tocó trabajar como funcionario. Has ganado **${config.emojis.coin}${formatted}** sin hacer nada.`
            )
          ]
        });
      }

      case 1: {
        const a = Math.floor(Math.random() * 90) + 10;
        const b = Math.floor(Math.random() * 90) + 10;
        const sum = a + b;

        const choices = [sum];
        while (choices.length < 3) {
          const rand = Math.floor(Math.random() * 180) + 20;
          if (!choices.includes(rand)) choices.push(rand);
        }
        choices.sort(() => Math.random() - 0.5);

        const deadline = now + taskDuration;
        const row = new ActionRowBuilder().addComponents(
          choices.map(val =>
            new ButtonBuilder()
              .setCustomId(`task_sum_${val}_${sum}_${userId}`)
              .setLabel(val.toString())
              .setStyle(ButtonStyle.Primary)
          )
        );

        await interaction.reply({
          embeds: [
            makeEmbed(
              "info",
              "Tarea: Suma rápida",
              `Suma los números: **${a} + ${b} = ?**\nTienes hasta <t:${deadline}:R> para responder.`
            )
          ],
          components: [row]
        });
        break;
      }

      case 2: {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`task_click10_${userId}_10`)
            .setLabel("10")
            .setStyle(ButtonStyle.Primary)
        );

        const deadline = now + taskDuration;
        await interaction.reply({
          embeds: [
            makeEmbed(
              "info",
              "Tarea: Presiona el botón",
              `Debes presionar el botón 10 veces en <t:${deadline}:R>.`
            )
          ],
          components: [row]
        });
        break;
      }
    }
  }
};

module.exports.buttonHandler = async (interaction) => {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("task_")) return false;

  const parts = interaction.customId.split("_");
  const type = parts[1];

  if (type === "sum") {
    const clicked = parseInt(parts[2], 10);
    const correctSum = parseInt(parts[3], 10);
    const userId = parts[4];

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: "Esto no es tu tarea.", flags: MessageFlags.Ephemeral });
    }

    if (clicked === correctSum) {
      const earned = Math.floor(Math.random() * (maxEarn - minEarn + 1)) + minEarn;
      const formatted = earned.toLocaleString("es-DO");
      await userService.addBalance(userId, earned);
      await logTransaction({ discordId: userId, type: "task", amount: earned });
      await cooldownService.setCooldown(userId, "trabajo", cooldown || 3600);

      await interaction.update({
        embeds: [makeEmbed("success", "¡Respuesta correcta!", `¡De seguro te han de decir Pitágoras 😉! Ganaste **${config.emojis.coin}${formatted}**`)],
        components: []
      });
    } else {
      await interaction.update({
        embeds: [makeEmbed("error", "Incorrecto", "No obtuviste recompensa.")],
        components: []
      });
    }
    return true;
  }

  if (type === "click10") {
    const userId = parts[2];
    let remaining = parseInt(parts[3], 10);

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: "Esto no es tu tarea.", flags: MessageFlags.Ephemeral });
    }

    remaining--;

    if (remaining <= 0) {
      const earned = Math.floor(Math.random() * (maxEarn - minEarn + 1)) + minEarn;
      const formatted = earned.toLocaleString("es-DO");
      await userService.addBalance(userId, earned);
      await logTransaction({ discordId: userId, type: "task", amount: earned });
      await cooldownService.setCooldown(userId, "trabajo", cooldown || 3600);

      await interaction.update({
        embeds: [makeEmbed("success", "¡Tarea completada!", `¡Ganaste **${config.emojis.coin}${formatted}** por realizar esta tarea a tiempo!`)],
        components: []
      });
      return true;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`task_click10_${userId}_${remaining}`)
        .setLabel(remaining.toString())
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.update({ components: [row] });
    return true;
  }

  return false;
};
