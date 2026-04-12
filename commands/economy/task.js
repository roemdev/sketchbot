const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ContainerBuilder
} = require("discord.js");
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
          content: `¡Afloja un poco! Todavía no es hora de tu turno. Te tocará en <t:${now + cd}:R>. 🤫`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await userService.createUser(userId, interaction.user.username);

      const taskType = Math.floor(Math.random() * 4);
      const deadline = now + taskDuration;

      switch (taskType) {
        case 0: {
          const { formatted } = await grantReward(userId);
          return interaction.reply({
            content: `### 💼 ¡Jornada de funcionario público!\nHoy viniste a sentarte, tomar café y ver la hora. Aún así te pagaron **${formatted}** ${config.emojis.coin}. ¡Qué suerte la tuya!`,
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
              new ContainerBuilder()
                .setAccentColor(0x6C3483)
                .addTextDisplayComponents(t =>
                    t.setContent(`### 🧠 Matemática Flash\nRápido, el jefe pregunta cuánto es: **${a} + ${b}**.\nSe le acaba la paciencia <t:${deadline}:R>.`)
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
            flags: MessageFlags.IsComponentsV2,
          });
        }

        case 2: {
          return interaction.reply({
            components: [
              new ContainerBuilder()
                .setAccentColor(0x6C3483)
                .addTextDisplayComponents(t =>
                    t.setContent(`### 👆 Clickeador frenético\n¡Dale duro al botón **10 veces** antes de <t:${deadline}:R> o estás despedido!`)
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
            flags: MessageFlags.IsComponentsV2,
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
              new ContainerBuilder()
                .setAccentColor(0x6C3483)
                .addTextDisplayComponents(t =>
                    t.setContent(`### 🕵️‍♂️ Juego de vista\nEncuentra el emoji de **${correct.name}** y púlsalo. Si dudas más allá de <t:${deadline}:R>, pierdes.`)
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
            flags: MessageFlags.IsComponentsV2,
          });
        }
      }
    } catch (error) {
      console.error("Error en comando trabajo:", error);
      await interaction.reply({
        content: `❌ Uy... hubo un bajón de luz y la máquina de tareas no arranca. Dile a un admin que la arregle.`,
        flags: MessageFlags.Ephemeral,
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
          return interaction.reply({ content: "¡Ey! Busca tu propio trabajo, no me andes robando.", flags: MessageFlags.Ephemeral });
        }

        if (clicked === correct) {
          const { formatted } = await grantReward(userId);
          await interaction.update({
            content: `🎉 ¡Bien ahí Einstein! Sumaste bien y el jefe te recompensó con **${formatted}** ${config.emojis.coin}.`,
            components: [],
          });
        } else {
          await interaction.update({
            content: `❌ ¡¿Pero qué estabas pensando?! Calculaste mal y no te pagaron nada hoy. Estudia pa' la próxima.`,
            components: [],
          });
        }
        return true;
      }

      if (type === "click10") {
        const userId = parts[2];
        let remaining = parseInt(parts[3], 10) - 1;

        if (interaction.user.id !== userId) {
          return interaction.reply({ content: "¡Ojo ahí! Toca tu propio botón.", flags: MessageFlags.Ephemeral });
        }

        if (remaining <= 0) {
          const { formatted } = await grantReward(userId);
          await interaction.update({
            content: `🎉 ¡Qué velocidad de dedos! Acabaste la chamba y el jefe te dio **${formatted}** ${config.emojis.coin}. Ve a sobarte el brazo.`,
            components: [],
          });
          return true;
        }

        await interaction.update({
          components: [
            new ContainerBuilder()
              .setAccentColor(0x6C3483)
              .addTextDisplayComponents(t =>
                  t.setContent(`### 👆 Clickeador frenético\n¡Sigue dándole, te faltan **${remaining}** golpes más!`)
              )
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
          flags: MessageFlags.IsComponentsV2,
        });
        return true;
      }

      if (type === "shape") {
        const clicked = parts[2];
        const correct = parts[3];
        const userId = parts[4];

        if (interaction.user.id !== userId) {
          return interaction.reply({ content: "Oiga, oiga, esta vista no es para usted.", flags: MessageFlags.Ephemeral });
        }

        if (clicked === correct) {
          const { formatted } = await grantReward(userId);
          await interaction.update({
            content: `🎉 ¡Ojo de águila! Encontraste el emoji y ganaste **${formatted}** ${config.emojis.coin}.`,
            components: [],
          });
        } else {
          await interaction.update({
            content: `❌ ¡¿Acaso andas bizco?! Tocaste el emoji equivocado. Te quedas sin pago por hoy.`,
            components: [],
          });
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error en buttonHandler de trabajo:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Ay, el servidor de trabajo se cayó y perdiste la onda. Repórtalo y vuelve más tarde.",
          flags: MessageFlags.Ephemeral,
        }).catch(console.error);
      }
      return true;
    }
  },
};
