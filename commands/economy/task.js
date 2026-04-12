const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const { makeContainer, CV2, CV2_EPHEMERAL } = require("../../utils/ui");
const config = require("../../core.json");
const userService = require("../../services/userService");
const cooldownService = require("../../services/cooldownService");
const { logTransaction } = require("../../services/transactionService");

const { minEarn, maxEarn, taskDuration, cooldown } = config.tasks;

async function grantReward(userId) {
  const earned = Math.floor(Math.random() * (maxEarn - minEarn + 1)) + minEarn;
  await userService.addBalance(userId, earned, false);
  await logTransaction({ discordId: userId, type: "task", amount: earned });
  await cooldownService.setCooldown(userId, "trabajo", cooldown || 3600);
  return { earned, formatted: earned.toLocaleString("es-DO") };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trabajo")
    .setDescription("Realiza una tarea y gana créditos."),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const now = Math.floor(Date.now() / 1000);

      const cd = await cooldownService.checkCooldown(userId, "trabajo");
      if (cd) {
        return interaction.reply({
          components: [
            makeContainer(
              "info",
              "Cooldown activo",
              `Todavía no tienes tareas disponibles. Habrá más <t:${now + cd}:R>.`
            ),
          ],
          flags: CV2,
        });
      }

      await userService.createUser(userId, interaction.user.username);

      const taskType = Math.floor(Math.random() * 4);
      const deadline = now + taskDuration;

      switch (taskType) {
        case 0: {
          const { formatted } = await grantReward(userId);
          return interaction.reply({
            components: [
              makeContainer(
                "success",
                "Trabajo completado",
                `Hoy tocó trabajar como funcionario. Ganaste **${config.emojis.coin}${formatted}** sin hacer nada.`
              ),
            ],
            flags: CV2,
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

          return interaction.reply({
            components: [
              makeContainer(
                "info",
                "Tarea: Suma rápida",
                `Suma los números: **${a} + ${b} = ?**\nTienes hasta <t:${deadline}:R> para responder.`
              )
                .addSeparatorComponents((s) => s)
                .addActionRowComponents((row) =>
                  row.setComponents(
                    ...choices.map((val) =>
                      new ButtonBuilder()
                        .setCustomId(`trabajo_sum_${val}_${sum}_${userId}`)
                        .setLabel(val.toString())
                        .setStyle(ButtonStyle.Primary)
                    )
                  )
                ),
            ],
            flags: CV2,
          });
        }

        case 2: {
          return interaction.reply({
            components: [
              makeContainer(
                "info",
                "Tarea: Presiona el botón",
                `Debes presionar el botón **10** veces antes de <t:${deadline}:R>.`
              )
                .addSeparatorComponents((s) => s)
                .addActionRowComponents((row) =>
                  row.setComponents(
                    new ButtonBuilder()
                      .setCustomId(`trabajo_click10_${userId}_10`)
                      .setLabel("10")
                      .setStyle(ButtonStyle.Primary)
                  )
                ),
            ],
            flags: CV2,
          });
        }

        case 3: {
          const shapes = [
            { name: "Círculo",   emoji: "🟢", id: "circulo"  },
            { name: "Cuadrado",  emoji: "⬜", id: "cuadrado" },
            { name: "Triángulo", emoji: "🔺", id: "triangulo"},
            { name: "Rombo",     emoji: "🔷", id: "rombo"    },
          ];
          const correct = shapes[Math.floor(Math.random() * shapes.length)];
          const shuffled = [...shapes].sort(() => Math.random() - 0.5);

          return interaction.reply({
            components: [
              makeContainer(
                "info",
                "Tarea: Identifica la figura",
                `Selecciona el **${correct.name}** antes de <t:${deadline}:R>.`
              )
                .addSeparatorComponents((s) => s)
                .addActionRowComponents((row) =>
                  row.setComponents(
                    ...shuffled.map((shape) =>
                      new ButtonBuilder()
                        .setCustomId(`trabajo_shape_${shape.id}_${correct.id}_${userId}`)
                        .setEmoji(shape.emoji)
                        .setStyle(ButtonStyle.Secondary)
                    )
                  )
                ),
            ],
            flags: CV2,
          });
        }
      }
    } catch (error) {
      console.error("Error en comando trabajo:", error);
      await interaction.reply({
        components: [makeContainer("error", "Error", "Ocurrió un error al iniciar el trabajo. Intenta de nuevo.")],
        flags: CV2_EPHEMERAL,
      }).catch(console.error);
    }
  },

  async buttonHandler(interaction) {
    try {
      if (!interaction.isButton()) return false;
      if (!interaction.customId.startsWith("trabajo_")) return false;

      const parts = interaction.customId.split("_");
      const type = parts[1];

      if (type === "sum") {
        const clicked = parseInt(parts[2], 10);
        const correct = parseInt(parts[3], 10);
        const userId = parts[4];

        if (interaction.user.id !== userId) {
          return interaction.reply({ content: "Esto no es tu tarea.", flags: MessageFlags.Ephemeral });
        }

        if (clicked === correct) {
          const { formatted } = await grantReward(userId);
          await interaction.update({
            components: [makeContainer("success", "¡Respuesta correcta!", `¡Pitágoras sería orgulloso! Ganaste **${config.emojis.coin}${formatted}**.`)],
            flags: CV2,
          });
        } else {
          await interaction.update({
            components: [makeContainer("error", "Incorrecto", "No obtuviste recompensa.")],
            flags: CV2,
          });
        }
        return true;
      }

      if (type === "click10") {
        const userId = parts[2];
        let remaining = parseInt(parts[3], 10) - 1;

        if (interaction.user.id !== userId) {
          return interaction.reply({ content: "Esto no es tu tarea.", flags: MessageFlags.Ephemeral });
        }

        if (remaining <= 0) {
          const { formatted } = await grantReward(userId);
          await interaction.update({
            components: [makeContainer("success", "¡Tarea completada!", `Ganaste **${config.emojis.coin}${formatted}**.`)],
            flags: CV2,
          });
          return true;
        }

        await interaction.update({
          components: [
            makeContainer("info", "Tarea: Presiona el botón", `Pulsaciones restantes: **${remaining}**.`)
              .addSeparatorComponents((s) => s)
              .addActionRowComponents((row) =>
                row.setComponents(
                  new ButtonBuilder()
                    .setCustomId(`trabajo_click10_${userId}_${remaining}`)
                    .setLabel(remaining.toString())
                    .setStyle(ButtonStyle.Primary)
                )
              ),
          ],
          flags: CV2,
        });
        return true;
      }

      if (type === "shape") {
        const clicked = parts[2];
        const correct = parts[3];
        const userId = parts[4];

        if (interaction.user.id !== userId) {
          return interaction.reply({ content: "Esto no es tu tarea.", flags: MessageFlags.Ephemeral });
        }

        if (clicked === correct) {
          const { formatted } = await grantReward(userId);
          await interaction.update({
            components: [makeContainer("success", "¡Respuesta correcta!", `¡Buena vista! Ganaste **${config.emojis.coin}${formatted}**.`)],
            flags: CV2,
          });
        } else {
          await interaction.update({
            components: [makeContainer("error", "Incorrecto", "Esa no era la figura. No obtuviste recompensa.")],
            flags: CV2,
          });
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error en buttonHandler de trabajo:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Ocurrió un error al procesar tu respuesta.",
          flags: MessageFlags.Ephemeral,
        }).catch(console.error);
      }
      return true;
    }
  },
};
