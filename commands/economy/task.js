const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../utils/config");
const userService = require("../../services/userService");
const cooldownService = require("../../services/cooldownService");
const { logTransaction } = require("../../services/transactionService");

const { minEarn, maxEarn, taskDuration, cooldown } = config.tasks;
const COIN = config.emojis.coin;
const XP = config.emojis.xp || "✨";

async function grantReward(interaction, userId) {
  const earned = Math.floor(Math.random() * (maxEarn - minEarn + 1)) + minEarn;
  await userService.addBalance(userId, earned, false);
  await logTransaction({ discordId: userId, type: "task", amount: earned });
  await cooldownService.setCooldown(userId, "trabajo", cooldown || 3600);

  return { earned };
}

module.exports = {
  data: new SlashCommandBuilder()
      .setName("trabajo")
      .setDescription("Realiza una tarea interactiva y gana monedas."),

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

      // 5 tipos de tareas interactivas (del 0 al 4)
      const taskType = Math.floor(Math.random() * 5);

      switch (taskType) {
        case 0: {
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

        case 1: {
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

        case 2: {
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

        case 3: {
          const colors = [
            { emoji: "🔴", id: "rojo" },
            { emoji: "🔵", id: "azul" },
            { emoji: "🟢", id: "verde" },
            { emoji: "🟡", id: "amarillo" }
          ];
          const targetSequence = [...colors].sort(() => Math.random() - 0.5);
          const targetSequenceString = targetSequence.map(c => c.id).join("-");
          
          const deadline = now + taskDuration;
          const container = new ContainerBuilder()
              .setAccentColor(0x6C3483)
              .addTextDisplayComponents(t =>
                  t.setContent(
                    `### 🤖 Secuencia CAPTCHA\n` +
                    `Presiona los botones en el orden exacto de la secuencia antes de <t:${deadline}:R>:\n\n` +
                    `Objetivo: **${targetSequence.map(c => c.emoji).join(" ")}**\n` +
                    `Tu progreso: **⬜ ⬜ ⬜ ⬜**`
                  )
              )
              .addSeparatorComponents(s => s)
              .addActionRowComponents(row =>
                  row.setComponents(
                    [...colors].sort(() => Math.random() - 0.5).map(c =>
                      new ButtonBuilder()
                          .setCustomId(`trabajo_captchaSeq_${c.id}_${targetSequenceString}_0_${userId}`)
                          .setEmoji(c.emoji)
                          .setStyle(ButtonStyle.Secondary)
                    )
                  )
              );

          return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        case 4: {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          const uniqueChars = [];
          while (uniqueChars.length < 5) {
            const c = chars.charAt(Math.floor(Math.random() * chars.length));
            if (!uniqueChars.includes(c)) uniqueChars.push(c);
          }
          const targetCode = uniqueChars.join("");
          
          const deadline = now + taskDuration;
          const container = new ContainerBuilder()
              .setAccentColor(0x6C3483)
              .addTextDisplayComponents(t =>
                  t.setContent(
                    `### 🤖 Teclado CAPTCHA\n` +
                    `Ingresa el siguiente código de seguridad presionando los botones en orden antes de <t:${deadline}:R>:\n\n` +
                    `Código Objetivo: **${targetCode}**\n` +
                    `Tu progreso: **_ _ _ _ _**`
                  )
              )
              .addSeparatorComponents(s => s)
              .addActionRowComponents(row =>
                  row.setComponents(
                    [...uniqueChars].sort(() => Math.random() - 0.5).map(char =>
                      new ButtonBuilder()
                          .setCustomId(`trabajo_codeSeq_${char}_${targetCode}_0_${userId}`)
                          .setLabel(char)
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
        const { earned } = await grantReward(interaction, userId);
        const container = new ContainerBuilder()
            .setAccentColor(0xF4C542)
            .addTextDisplayComponents(t => t.setContent(`### ✅ ¡Correcto!\nSe nota que pasaste matemáticas.\n\n**Ganaste:**\n-> **${COIN}${earned.toLocaleString()}** Monedas`));
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
        const { earned } = await grantReward(interaction, userId);
        const container = new ContainerBuilder()
            .setAccentColor(0xF4C542)
            .addTextDisplayComponents(t => t.setContent(`### ✅ ¡Lo lograste!\nDedo entrenado.\n\n**Ganaste:**\n-> **${COIN}${earned.toLocaleString()}** Monedas`));
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
        const { earned } = await grantReward(interaction, userId);
        const container = new ContainerBuilder()
            .setAccentColor(0xF4C542)
            .addTextDisplayComponents(t => t.setContent(`### ✅ ¡Bien visto!\nElegiste la figura correcta.\n\n**Ganaste:**\n-> **${COIN}${earned.toLocaleString()}** Monedas`));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else {
        const container = new ContainerBuilder()
            .setAccentColor(0xC0392B)
            .addTextDisplayComponents(t => t.setContent("### ❌ No era esa\nLa vista te falló esta vez. Sin recompensa 👀"));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
    }

    if (type === "captchaSeq") {
      const clickedColorId = parts[2];
      const targetSequenceString = parts[3];
      let currentIndex = parseInt(parts[4], 10);
      const userId = parts[5];

      if (interaction.user.id !== userId) {
        return interaction.reply({ content: "Esa no es tu tarea.", flags: MessageFlags.Ephemeral });
      }

      const targetArr = targetSequenceString.split("-");
      const correctColorId = targetArr[currentIndex];

      if (clickedColorId === correctColorId) {
        currentIndex++;

        if (currentIndex === 4) {
          const { earned } = await grantReward(interaction, userId);
          const container = new ContainerBuilder()
              .setAccentColor(0xF4C542)
              .addTextDisplayComponents(t => t.setContent(`### ✅ Secuencia Exitosa\n¡Excelente memoria! Código secuencial ingresado correctamente.\n\n**Ganaste:**\n-> **${COIN}${earned.toLocaleString()}** Monedas`));
          return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const colorEmojis = { rojo: "🔴", azul: "🔵", verde: "🟢", amarillo: "🟡" };
        const colors = [
          { emoji: "🔴", id: "rojo" },
          { emoji: "🔵", id: "azul" },
          { emoji: "🟢", id: "verde" },
          { emoji: "🟡", id: "amarillo" }
        ];

        const progressDisplay = targetArr.slice(0, currentIndex).map(id => colorEmojis[id]).join(" ") + " " + "⬜ ".repeat(4 - currentIndex);

        const container = new ContainerBuilder()
            .setAccentColor(0x6C3483)
            .addTextDisplayComponents(t =>
                t.setContent(
                  `### 🤖 Secuencia CAPTCHA\n` +
                  `Sigue ingresando la secuencia en el orden exacto:\n\n` +
                  `Objetivo: **${targetArr.map(id => colorEmojis[id]).join(" ")}**\n` +
                  `Tu progreso: **${progressDisplay}**`
                )
            )
            .addSeparatorComponents(s => s)
            .addActionRowComponents(row =>
                row.setComponents(
                  [...colors].sort(() => Math.random() - 0.5).map(c =>
                    new ButtonBuilder()
                        .setCustomId(`trabajo_captchaSeq_${c.id}_${targetSequenceString}_${currentIndex}_${userId}`)
                        .setEmoji(c.emoji)
                        .setStyle(ButtonStyle.Secondary)
                  )
                )
            );

        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else {
        const container = new ContainerBuilder()
            .setAccentColor(0xC0392B)
            .addTextDisplayComponents(t => t.setContent("### ❌ Secuencia Fallida\nTe equivocaste en el orden. No se pudo verificar tu trabajo 👀"));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
    }

    if (type === "codeSeq") {
      const clickedChar = parts[2];
      const targetCode = parts[3];
      let currentIndex = parseInt(parts[4], 10);
      const userId = parts[5];

      if (interaction.user.id !== userId) {
        return interaction.reply({ content: "Esa no es tu tarea.", flags: MessageFlags.Ephemeral });
      }

      const correctChar = targetCode.charAt(currentIndex);

      if (clickedChar === correctChar) {
        currentIndex++;

        if (currentIndex === 5) {
          const { earned } = await grantReward(interaction, userId);
          const container = new ContainerBuilder()
              .setAccentColor(0xF4C542)
              .addTextDisplayComponents(t => t.setContent(`### ✅ Acceso Concedido\nCódigo verificado con éxito. ¡Trabajo completado!\n\n**Ganaste:**\n-> **${COIN}${earned.toLocaleString()}** Monedas`));
          return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const uniqueChars = targetCode.split("");
        const progressDisplay = targetCode.substring(0, currentIndex) + " " + "_ ".repeat(5 - currentIndex);

        const container = new ContainerBuilder()
            .setAccentColor(0x6C3483)
            .addTextDisplayComponents(t =>
                t.setContent(
                  `### 🤖 Teclado CAPTCHA\n` +
                  `Sigue ingresando el código de seguridad en el orden exacto:\n\n` +
                  `Código Objetivo: **${targetCode}**\n` +
                  `Tu progreso: **${progressDisplay}**`
                )
            )
            .addSeparatorComponents(s => s)
            .addActionRowComponents(row =>
                row.setComponents(
                  [...uniqueChars].sort(() => Math.random() - 0.5).map(char =>
                    new ButtonBuilder()
                        .setCustomId(`trabajo_codeSeq_${char}_${targetCode}_${currentIndex}_${userId}`)
                        .setLabel(char)
                        .setStyle(ButtonStyle.Secondary)
                  )
                )
            );

        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else {
        const container = new ContainerBuilder()
            .setAccentColor(0xC0392B)
            .addTextDisplayComponents(t => t.setContent("### ❌ Acceso Denegado\nTe equivocaste al ingresar el código de seguridad. Sin recompensa esta vez 👀"));
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