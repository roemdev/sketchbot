const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../core.json");
const userService = require("../../services/userService");
const cooldownService = require("../../services/cooldownService");
const { logTransaction } = require("../../services/transactionService");

const { minEarn, maxEarn, taskDuration, cooldown } = config.tasks;
const COIN = config.emojis.coin;

async function grantReward(userId) {
  const earned = Math.floor(Math.random() * (maxEarn - minEarn + 1)) + minEarn;
  await userService.addBalance(userId, earned, false);
  await logTransaction({ discordId: userId, type: "task", amount: earned });
  await cooldownService.setCooldown(userId, "trabajo", cooldown || 3600);
  return earned;
}

module.exports = {
  data: new SlashCommandBuilder()
      .setName("trabajo")
      .setDescription("Realiza una tarea y gana monedas."),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const now = Math.floor(Date.now() / 1000);

      const cd = await cooldownService.checkCooldown(userId, "trabajo");
      if (cd) {
        const resetTimestamp = now + cd;
        return interaction.reply({
          content: `Aún no hay tareas disponibles para ti. Vuelve <t:${resetTimestamp}:R>.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await userService.createUser(userId, interaction.user.username);

      const taskType = Math.floor(Math.random() * 4);

      switch (taskType) {
        case 0: {
          const earned = await grantReward(userId);
          return interaction.reply({
            content: `Hoy tocó trabajar de funcionario público. Hiciste nada y ganaste **${COIN}${earned.toLocaleString()}**. El sueño.`,
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
          const container = new ContainerBuilder()
              .setAccentColor(0x6C3483)
              .addTextDisplayComponents(t =>
                  t.setContent(`### 🧮 Suma rápida\n**${a} + ${b} = ?**\nTienes hasta <t:${deadline}:R> para responder.`)
              )
              .addSeparatorComponents(s => s)
              .addActionRowComponents(row =>
                  row.setComponents(
                      choices.map(val =>
                          new ButtonBuilder()
                              .setCustomId(`trabajo_sum_${val}_${sum}_${userId}`)
                              .setLabel(val.toString())
                              .setStyle(ButtonStyle.Primary)
                      )
                  )
              );

          return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        case 2: {
          const deadline = now + taskDuration;
          const container = new ContainerBuilder()
              .setAccentColor(0x6C3483)
              .addTextDisplayComponents(t =>
                  t.setContent(`### 👆 Presiona el botón\nPresiónalo 10 veces antes de <t:${deadline}:R>.`)
              )
              .addSeparatorComponents(s => s)
              .addActionRowComponents(row =>
                  row.setComponents(
                      new ButtonBuilder()
                          .setCustomId(`trabajo_click10_${userId}_10`)
                          .setLabel("10")
                          .setStyle(ButtonStyle.Primary)
                  )
              );

          return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        case 3: {
          const shapes = [
            { name: "Círculo", emoji: "🟢", id: "circulo" },
            { name: "Cuadrado", emoji: "⬜", id: "cuadrado" },
            { name: "Triángulo", emoji: "🔺", id: "triangulo" },
            { name: "Rombo", emoji: "🔷", id: "rombo" },
          ];
          const correct = shapes[Math.floor(Math.random() * shapes.length)];
          const shuffled = [...shapes].sort(() => Math.random() - 0.5);
          const deadline = now + taskDuration;

          const container = new ContainerBuilder()
              .setAccentColor(0x6C3483)
              .addTextDisplayComponents(t =>
                  t.setContent(`### 🔍 Identifica la figura\nSelecciona el **${correct.name}** antes de <t:${deadline}:R>.`)
              )
              .addSeparatorComponents(s => s)
              .addActionRowComponents(row =>
                  row.setComponents(
                      shuffled.map(shape =>
                          new ButtonBuilder()
                              .setCustomId(`trabajo_shape_${shape.id}_${correct.id}_${userId}`)
                              .setEmoji(shape.emoji)
                              .setStyle(ButtonStyle.Secondary)
                      )
                  )
              );

          return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
      }
    } catch (error) {
      console.error("Error en comando trabajo:", error);
      await interaction.reply({
        content: "Algo salió mal iniciando la tarea. Intenta de nuevo.",
        flags: MessageFlags.Ephemeral,
      }).catch(console.error);
    }
  }
};

module.exports.buttonHandler = async (interaction) => {
  try {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("trabajo_")) return false;

    const parts = interaction.customId.split("_");
    const type = parts[1];

    if (type === "sum") {
      const clicked = parseInt(parts[2], 10);
      const correctSum = parseInt(parts[3], 10);
      const userId = parts[4];

      if (interaction.user.id !== userId) {
        return interaction.reply({ content: "Esa no es tu tarea.", flags: MessageFlags.Ephemeral });
      }

      if (clicked === correctSum) {
        const earned = await grantReward(userId);
        const container = new ContainerBuilder()
            .setAccentColor(0xF4C542)
            .addTextDisplayComponents(t => t.setContent(`### ✅ ¡Correcto!\nSe nota que pasaste matemáticas. Ganaste **${COIN}${earned.toLocaleString()}**.`));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else {
        const container = new ContainerBuilder()
            .setAccentColor(0xC0392B)
            .addTextDisplayComponents(t => t.setContent("### ❌ Incorrecto\nEso no era. Sin recompensa esta vez 👀"));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
    }

    if (type === "click10") {
      const userId = parts[2];
      let remaining = parseInt(parts[3], 10) - 1;

      if (interaction.user.id !== userId) {
        return interaction.reply({ content: "Esa no es tu tarea.", flags: MessageFlags.Ephemeral });
      }

      if (remaining <= 0) {
        const earned = await grantReward(userId);
        const container = new ContainerBuilder()
            .setAccentColor(0xF4C542)
            .addTextDisplayComponents(t => t.setContent(`### ✅ ¡Lo lograste!\nDedo entrenado. Ganaste **${COIN}${earned.toLocaleString()}**.`));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const container = new ContainerBuilder()
          .setAccentColor(0x6C3483)
          .addTextDisplayComponents(t => t.setContent(`### 👆 Sigue presionando\n**${remaining}** ${remaining === 1 ? "vez más" : "veces más"}.`))
          .addSeparatorComponents(s => s)
          .addActionRowComponents(row =>
              row.setComponents(
                  new ButtonBuilder()
                      .setCustomId(`trabajo_click10_${userId}_${remaining}`)
                      .setLabel(remaining.toString())
                      .setStyle(ButtonStyle.Primary)
              )
          );

      return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (type === "shape") {
      const clickedId = parts[2];
      const correctId = parts[3];
      const userId = parts[4];

      if (interaction.user.id !== userId) {
        return interaction.reply({ content: "Esa no es tu tarea.", flags: MessageFlags.Ephemeral });
      }

      if (clickedId === correctId) {
        const earned = await grantReward(userId);
        const container = new ContainerBuilder()
            .setAccentColor(0xF4C542)
            .addTextDisplayComponents(t => t.setContent(`### ✅ ¡Bien visto!\nElegiste la figura correcta. Ganaste **${COIN}${earned.toLocaleString()}**.`));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else {
        const container = new ContainerBuilder()
            .setAccentColor(0xC0392B)
            .addTextDisplayComponents(t => t.setContent("### ❌ No era esa\nLa vista te falló esta vez. Sin recompensa 👀"));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
    }

    return false;
  } catch (error) {
    console.error("Error en buttonHandler de trabajo:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Algo salió mal procesando tu respuesta.", flags: MessageFlags.Ephemeral }).catch(console.error);
    }
    return true;
  }
};