const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../utils/config");
const userService = require("../../services/userService");
const cooldownService = require("../../services/cooldownService");
const { logTransaction } = require("../../services/transactionService");

const { minEarn, maxEarn, cooldown } = config.tasks;
const COIN = config.emojis.coin;
const XP = config.emojis.xp || "✨";
const taxRate = (config.bank && config.bank.taxRate) !== undefined ? config.bank.taxRate : 0.05;

async function grantReward(interaction, userId) {
  const bankGenerated = Math.floor(Math.random() * (120000 - 50000 + 1)) + 50000;
  const percentage = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
  const earned = Math.floor(bankGenerated * (percentage / 100));

  await userService.addBalance(userId, earned, false);
  await userService.addBalance("server_bank", bankGenerated, false);

  await logTransaction({ discordId: "server_bank", type: "bank_tax", amount: bankGenerated, itemName: `Generación de trabajo de <@${userId}>` });
  await logTransaction({ discordId: userId, type: "task", amount: earned });
  await cooldownService.setCooldown(userId, "trabajo", cooldown || 3600);

  return { earned, bankGenerated, percentage };
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

      // Límite estricto de 30 segundos
      const deadline = now + 30;

      // 5 tipos de tareas interactivas
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

          const container = new ContainerBuilder()
              .setAccentColor(2303786) // Tech Blue
              .addTextDisplayComponents(t =>
                  t.setContent(
                    `### 🛠️ Centro de Trabajo - Suma Rápida\n` +
                    `Demuestra tus habilidades matemáticas resolviendo la siguiente operación:\n\n` +
                    `🎯 **Operación:** **${a} + ${b} = ?**\n` +
                    `⏳ **Límite:** Tienes hasta <t:${deadline}:R> para responder.`
                  )
              )
              .addSeparatorComponents(s => s)
              .addActionRowComponents(row =>
                  row.setComponents(
                      choices.map(val =>
                          new ButtonBuilder()
                              .setCustomId(`trabajo_sum_${val}_${sum}_${userId}_${deadline}`)
                              .setLabel(val.toString())
                              .setStyle(ButtonStyle.Primary)
                      )
                  )
              );

          return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        case 1: {
          const container = new ContainerBuilder()
              .setAccentColor(2303786) // Tech Blue
              .addTextDisplayComponents(t =>
                  t.setContent(
                    `### 🛠️ Centro de Trabajo - Presión Veloz\n` +
                    `Prueba tus reflejos haciendo clic repetidamente en el botón antes de que expire el tiempo:\n\n` +
                    `🎯 **Objetivo:** Presiona el botón **10 veces**.\n` +
                    `📊 **Progreso:** ⬜ ⬜ ⬜ ⬜ ⬜ ⬜ ⬜ ⬜ ⬜ ⬜ (**0/10**)\n` +
                    `⏳ **Límite:** Tienes hasta <t:${deadline}:R>.`
                  )
              )
              .addSeparatorComponents(s => s)
              .addActionRowComponents(row =>
                  row.setComponents(
                      new ButtonBuilder()
                          .setCustomId(`trabajo_click10_${userId}_10_${deadline}`)
                          .setLabel("Presionar (10)")
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

          const container = new ContainerBuilder()
              .setAccentColor(2303786) // Tech Blue
              .addTextDisplayComponents(t =>
                  t.setContent(
                    `### 🛠️ Centro de Trabajo - Control de Calidad\n` +
                    `Examina el panel de objetos y selecciona la figura geométrica solicitada:\n\n` +
                    `🎯 **Figura a buscar:** El **${correct.name}** (${correct.emoji})\n` +
                    `⏳ **Límite:** Tienes hasta <t:${deadline}:R> para responder.`
                  )
              )
              .addSeparatorComponents(s => s)
              .addActionRowComponents(row =>
                  row.setComponents(
                      shuffled.map(shape =>
                          new ButtonBuilder()
                              .setCustomId(`trabajo_shape_${shape.id}_${correct.id}_${userId}_${deadline}`)
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
          
          const container = new ContainerBuilder()
              .setAccentColor(2303786) // Tech Blue
              .addTextDisplayComponents(t =>
                  t.setContent(
                    `### 🛠️ Centro de Trabajo - Secuencia CAPTCHA\n` +
                    `Introduce la secuencia de colores presionando los botones en el orden exacto:\n\n` +
                    `🎯 **Secuencia:** **${targetSequence.map(c => c.emoji).join(" ")}**\n` +
                    `📊 **Progreso:** ⬜ ⬜ ⬜ ⬜\n` +
                    `⏳ **Límite:** Tienes hasta <t:${deadline}:R>.`
                  )
              )
              .addSeparatorComponents(s => s)
              .addActionRowComponents(row =>
                  row.setComponents(
                    [...colors].sort(() => Math.random() - 0.5).map(c =>
                      new ButtonBuilder()
                          .setCustomId(`trabajo_captchaSeq_${c.id}_${targetSequenceString}_0_${userId}_${deadline}`)
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
          
          const container = new ContainerBuilder()
              .setAccentColor(2303786) // Tech Blue
              .addTextDisplayComponents(t =>
                  t.setContent(
                    `### 🛠️ Centro de Trabajo - Teclado CAPTCHA\n` +
                    `Ingresa el siguiente código de seguridad presionando las letras/números en orden:\n\n` +
                    `🎯 **Código:** **${targetCode}**\n` +
                    `📊 **Progreso:** _ _ _ _ _\n` +
                    `⏳ **Límite:** Tienes hasta <t:${deadline}:R>.`
                  )
              )
              .addSeparatorComponents(s => s)
              .addActionRowComponents(row =>
                  row.setComponents(
                    [...uniqueChars].sort(() => Math.random() - 0.5).map(char =>
                      new ButtonBuilder()
                          .setCustomId(`trabajo_codeSeq_${char}_${targetCode}_0_${userId}_${deadline}`)
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

    let userId = "";
    let deadline = 0;

    // Extraer userId y deadline según el tipo
    if (type === "sum") {
      userId = parts[4];
      deadline = parseInt(parts[5], 10);
    } else if (type === "click10") {
      userId = parts[2];
      deadline = parseInt(parts[4], 10);
    } else if (type === "shape") {
      userId = parts[4];
      deadline = parseInt(parts[5], 10);
    } else if (type === "captchaSeq" || type === "codeSeq") {
      userId = parts[5];
      deadline = parseInt(parts[6], 10);
    }

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: "Esa no es tu tarea.", flags: MessageFlags.Ephemeral });
    }

    // Verificar límite estricto de tiempo
    const now = Math.floor(Date.now() / 1000);
    if (now > deadline) {
      await cooldownService.setCooldown(userId, "trabajo", cooldown || 3600);
      
      const container = new ContainerBuilder()
          .setAccentColor(10038562) // Rojo Fracaso
          .addTextDisplayComponents(t =>
              t.setContent(
                `### ⏰ ¡Se acabó el tiempo!\n` +
                `Tardaste demasiado en realizar la tarea (límite de 30 segundos).\n\n` +
                `⚠️ *Has perdido la oportunidad y el cooldown de espera ha comenzado.*`
              )
          );
      return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (type === "sum") {
      const clicked = parseInt(parts[2], 10);
      const correctSum = parseInt(parts[3], 10);

      if (clicked === correctSum) {
        const { earned, bankGenerated, percentage } = await grantReward(interaction, userId);
        const container = new ContainerBuilder()
            .setAccentColor(2067276) // Verde Éxito
            .addTextDisplayComponents(t =>
                t.setContent(
                  `### ✅ ¡Trabajo Completado!\n` +
                  `Excelente desempeño. Resolviste la operación matemática correctamente.\n\n` +
                  `💰 **Tu Pago (${percentage}%):** +${COIN}**${earned.toLocaleString("es-DO")}** monedas\n` +
                  `🏛️ **Generado para el Banco:** +${COIN}**${bankGenerated.toLocaleString("es-DO")}** monedas`
                )
            );
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else {
        const container = new ContainerBuilder()
            .setAccentColor(10038562) // Rojo Fracaso
            .addTextDisplayComponents(t =>
                t.setContent(
                  `### ❌ ¡Tarea Fallida!\n` +
                  `Cometiste un error al ingresar la respuesta. El turno de trabajo ha terminado.\n\n` +
                  `⚠️ *Has perdido la oportunidad y el cooldown de espera ha comenzado.*`
                )
            );
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
    }

    if (type === "click10") {
      let remaining = parseInt(parts[3], 10) - 1;

      if (remaining <= 0) {
        const { earned, bankGenerated, percentage } = await grantReward(interaction, userId);
        const container = new ContainerBuilder()
            .setAccentColor(2067276) // Verde Éxito
            .addTextDisplayComponents(t =>
                t.setContent(
                  `### ✅ ¡Trabajo Completado!\n` +
                  `¡Excelente velocidad de reacción! Completaste la pulsación repetida de forma exitosa.\n\n` +
                  `💰 **Tu Pago (${percentage}%):** +${COIN}**${earned.toLocaleString("es-DO")}** monedas\n` +
                  `🏛️ **Generado para el Banco:** +${COIN}**${bankGenerated.toLocaleString("es-DO")}** monedas`
                )
            );
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const progressBlocks = "🟩".repeat(10 - remaining) + "⬜".repeat(remaining);
      const container = new ContainerBuilder()
          .setAccentColor(2303786) // Tech Blue
          .addTextDisplayComponents(t =>
              t.setContent(
                `### 🛠️ Centro de Trabajo - Presión Veloz\n` +
                `¡Sigue presionando rápidamente!\n\n` +
                `🎯 **Objetivo:** Presiona el botón **10 veces**.\n` +
                `📊 **Progreso:** ${progressBlocks} (**${10 - remaining}/10**)\n` +
                `⏳ **Límite:** Tienes hasta <t:${deadline}:R>.`
              )
          )
          .addSeparatorComponents(s => s)
          .addActionRowComponents(row =>
              row.setComponents(
                  new ButtonBuilder()
                      .setCustomId(`trabajo_click10_${userId}_${remaining}_${deadline}`)
                      .setLabel(`Presionar (${remaining})`)
                      .setStyle(ButtonStyle.Primary)
              )
          );

      return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (type === "shape") {
      const clickedId = parts[2];
      const correctId = parts[3];

      if (clickedId === correctId) {
        const { earned, bankGenerated, percentage } = await grantReward(interaction, userId);
        const container = new ContainerBuilder()
            .setAccentColor(2067276) // Verde Éxito
            .addTextDisplayComponents(t =>
                t.setContent(
                  `### ✅ ¡Trabajo Completado!\n` +
                  `Excelente agudeza visual. Encontraste la figura geométrica correcta.\n\n` +
                  `💰 **Tu Pago (${percentage}%):** +${COIN}**${earned.toLocaleString("es-DO")}** monedas\n` +
                  `🏛️ **Generado para el Banco:** +${COIN}**${bankGenerated.toLocaleString("es-DO")}** monedas`
                )
            );
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else {
        const container = new ContainerBuilder()
            .setAccentColor(10038562) // Rojo Fracaso
            .addTextDisplayComponents(t =>
                t.setContent(
                  `### ❌ ¡Tarea Fallida!\n` +
                  `Cometiste un error al ingresar la respuesta. El turno de trabajo ha terminado.\n\n` +
                  `⚠️ *Has perdido la oportunidad y el cooldown de espera ha comenzado.*`
                )
            );
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
    }

    if (type === "captchaSeq") {
      const clickedColorId = parts[2];
      const targetSequenceString = parts[3];
      let currentIndex = parseInt(parts[4], 10);

      const targetArr = targetSequenceString.split("-");
      const correctColorId = targetArr[currentIndex];

      if (clickedColorId === correctColorId) {
        currentIndex++;

        if (currentIndex === 4) {
          const { earned, bankGenerated, percentage } = await grantReward(interaction, userId);
          const container = new ContainerBuilder()
              .setAccentColor(2067276) // Verde Éxito
              .addTextDisplayComponents(t =>
                  t.setContent(
                    `### ✅ ¡Trabajo Completado!\n` +
                    `¡Excelente memoria y coordinación! Secuencia CAPTCHA de colores completada correctamente.\n\n` +
                    `💰 **Tu Pago (${percentage}%):** +${COIN}**${earned.toLocaleString("es-DO")}** monedas\n` +
                    `🏛️ **Generado para el Banco:** +${COIN}**${bankGenerated.toLocaleString("es-DO")}** monedas`
                  )
              );
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
            .setAccentColor(2303786) // Tech Blue
            .addTextDisplayComponents(t =>
                t.setContent(
                  `### 🛠️ Centro de Trabajo - Secuencia CAPTCHA\n` +
                  `Sigue ingresando la secuencia de colores en el orden exacto:\n\n` +
                  `🎯 **Secuencia:** **${targetArr.map(id => colorEmojis[id]).join(" ")}**\n` +
                  `📊 **Progreso:** ${progressDisplay}\n` +
                  `⏳ **Límite:** Tienes hasta <t:${deadline}:R>.`
                )
            )
            .addSeparatorComponents(s => s)
            .addActionRowComponents(row =>
                row.setComponents(
                  [...colors].sort(() => Math.random() - 0.5).map(c =>
                    new ButtonBuilder()
                        .setCustomId(`trabajo_captchaSeq_${c.id}_${targetSequenceString}_${currentIndex}_${userId}_${deadline}`)
                        .setEmoji(c.emoji)
                        .setStyle(ButtonStyle.Secondary)
                  )
                )
            );

        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else {
        const container = new ContainerBuilder()
            .setAccentColor(10038562) // Rojo Fracaso
            .addTextDisplayComponents(t =>
                t.setContent(
                  `### ❌ ¡Tarea Fallida!\n` +
                  `Cometiste un error al ingresar la respuesta. El turno de trabajo ha terminado.\n\n` +
                  `⚠️ *Has perdido la oportunidad y el cooldown de espera ha comenzado.*`
                )
            );
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
    }

    if (type === "codeSeq") {
      const clickedChar = parts[2];
      const targetCode = parts[3];
      let currentIndex = parseInt(parts[4], 10);

      const correctChar = targetCode.charAt(currentIndex);

      if (clickedChar === correctChar) {
        currentIndex++;

        if (currentIndex === 5) {
          const { earned, bankGenerated, percentage } = await grantReward(interaction, userId);
          const container = new ContainerBuilder()
              .setAccentColor(2067276) // Verde Éxito
              .addTextDisplayComponents(t =>
                  t.setContent(
                    `### ✅ ¡Trabajo Completado!\n` +
                    `¡Acceso Concedido! Código alfanumérico de seguridad verificado correctamente.\n\n` +
                    `💰 **Tu Pago (${percentage}%):** +${COIN}**${earned.toLocaleString("es-DO")}** monedas\n` +
                    `🏛️ **Generado para el Banco:** +${COIN}**${bankGenerated.toLocaleString("es-DO")}** monedas`
                  )
              );
          return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const uniqueChars = targetCode.split("");
        const progressDisplay = targetCode.substring(0, currentIndex) + " " + "_ ".repeat(5 - currentIndex);

        const container = new ContainerBuilder()
            .setAccentColor(2303786) // Tech Blue
            .addTextDisplayComponents(t =>
                t.setContent(
                  `### 🛠️ Centro de Trabajo - Teclado CAPTCHA\n` +
                  `Sigue ingresando el código de seguridad en el orden exacto:\n\n` +
                  `🎯 **Código:** **${targetCode}**\n` +
                  `📊 **Progreso:** ${progressDisplay}\n` +
                  `⏳ **Límite:** Tienes hasta <t:${deadline}:R>.`
                )
            )
            .addSeparatorComponents(s => s)
            .addActionRowComponents(row =>
                row.setComponents(
                  [...uniqueChars].sort(() => Math.random() - 0.5).map(char =>
                    new ButtonBuilder()
                        .setCustomId(`trabajo_codeSeq_${char}_${targetCode}_${currentIndex}_${userId}_${deadline}`)
                        .setLabel(char)
                        .setStyle(ButtonStyle.Secondary)
                  )
                )
            );

        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else {
        const container = new ContainerBuilder()
            .setAccentColor(10038562) // Rojo Fracaso
            .addTextDisplayComponents(t =>
                t.setContent(
                  `### ❌ ¡Tarea Fallida!\n` +
                  `Cometiste un error al ingresar la respuesta. El turno de trabajo ha terminado.\n\n` +
                  `⚠️ *Has perdido la oportunidad y el cooldown de espera ha comenzado.*`
                )
            );
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