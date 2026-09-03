const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

const db = require("../../services/dbService");
const config = require("../../utils/config");
const userService = require("../../services/userService");
const cooldownService = require("../../services/cooldownService");
const { logTransaction } = require("../../services/transactionService");
const { logGameOutcome } = require("../../utils/discordLogger");
const taskTracker = require("../../services/taskTracker");
const supabase = require("../../services/dbService");

const COIN = config.emojis.coin;
const crimesConfig = config.crimes;
const taskCooldown = config.tasks.cooldown;

// Helper para conceder recompensa de trabajo
async function grantWorkReward(interaction, userId) {
  const user = await userService.getUser(userId);
  const minBank = config.tasks.minBankEarn;
  const maxBank = config.tasks.maxBankEarn;
  const percentage = config.tasks.commissionPercent;

  const bankGenerated = Math.floor(Math.random() * (maxBank - minBank + 1)) + minBank;

  let multiplier = 1.0;
  if (user && user.profession === "magnate") multiplier = 1.15;
  if (user && user.profession === "gambler") multiplier = 0.90;

  const earned = Math.floor(bankGenerated * (percentage / 100) * multiplier);

  if (user && user.profession === "magnate") {
  }

  await userService.addBalance(userId, earned, false);
  await userService.addBalance("server_bank", bankGenerated, false);

  await logTransaction({ discordId: "server_bank", type: "bank_tax", amount: bankGenerated, itemName: `Generación de trabajo de <@${userId}>` });
  await logTransaction({ discordId: userId, type: "task", amount: earned });
  await cooldownService.setCooldown(userId, "trabajo", taskCooldown);

  await logGameOutcome(interaction, "Trabajo", 0, earned, true).catch(console.error);

  return { earned, bankGenerated, percentage };
}

// Inicialización de minijuego de trabajo
async function initWorkTask(interaction) {
  const userId = interaction.user.id;
  const now = Math.floor(Date.now() / 1000);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const cd = await cooldownService.checkCooldown(userId, "trabajo");
  if (cd) {
    const resetTimestamp = now + cd;
    return interaction.editReply({
      content: `Aún no hay tareas disponibles para ti. Vuelve <t:${resetTimestamp}:R>.`
    });
  }

  await userService.createUser(userId, interaction.user.username);

  const deadline = now + 30;
  const taskType = Math.floor(Math.random() * 5);

  switch (taskType) {
    case 0: {
      // SUMA MATEMÁTICA
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
            `### 🛠️ Centro de Trabajo - Operación Matemática\n` +
            `Resuelve la siguiente operación matemática de rapidez para cobrar tu salario:\n\n` +
            `🎯 **Pregunta:** ¿Cuánto es **${a} + ${b}**?\n` +
            `⏳ **Límite:** Tienes hasta <t:${deadline}:R> para responder.`
          )
        )
        .addSeparatorComponents(s => s)
        .addActionRowComponents(row =>
          row.setComponents(
            choices.map(choice =>
              new ButtonBuilder()
                .setCustomId(`economia_trabajo_sum_${choice}_${sum}_${userId}_${deadline}`)
                .setLabel(choice.toString())
                .setStyle(ButtonStyle.Primary)
            )
          )
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    case 1: {
      // PRESIÓN VELOZ (10 CLICS)
      const container = new ContainerBuilder()
        .setAccentColor(2303786) // Tech Blue
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 🛠️ Centro de Trabajo - Presión Veloz\n` +
            `Presiona el botón rápidamente para completar tu turno laboral:\n\n` +
            `🎯 **Objetivo:** Presiona el botón **10 veces**.\n` +
            `📊 **Progreso:** ⬜ ⬜ ⬜ ⬜ ⬜ ⬜ ⬜ ⬜ ⬜ ⬜ (**0/10**)\n` +
            `⏳ **Límite:** Tienes hasta <t:${deadline}:R>.`
          )
        )
        .addSeparatorComponents(s => s)
        .addActionRowComponents(row =>
          row.setComponents(
            new ButtonBuilder()
              .setCustomId(`economia_trabajo_click10_${userId}_10_${deadline}`)
              .setLabel("Comenzar a presionar")
              .setStyle(ButtonStyle.Primary)
          )
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    case 2: {
      // IDENTIFICAR FIGURA GEOMÉTRICA
      const shapes = [
        { name: "Círculo", emoji: "🔴", id: "circulo" },
        { name: "Cuadrado", emoji: "🟩", id: "cuadrado" },
        { name: "Triángulo", emoji: "🔺", id: "triangulo" },
        { name: "Diamante", emoji: "🔷", id: "diamante" }
      ];
      const correctShape = shapes[Math.floor(Math.random() * shapes.length)];
      const choices = [...shapes].sort(() => Math.random() - 0.5);

      const container = new ContainerBuilder()
        .setAccentColor(2303786) // Tech Blue
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 🛠️ Centro de Trabajo - Reconocimiento de Formas\n` +
            `Identifica la figura geométrica solicitada para completar la tarea:\n\n` +
            `🎯 **Busca el:** **${correctShape.name}**\n` +
            `⏳ **Límite:** Tienes hasta <t:${deadline}:R>.`
          )
        )
        .addSeparatorComponents(s => s)
        .addActionRowComponents(row =>
          row.setComponents(
            choices.map(c =>
              new ButtonBuilder()
                .setCustomId(`economia_trabajo_shape_${c.id}_${correctShape.id}_${userId}_${deadline}`)
                .setEmoji(c.emoji)
                .setStyle(ButtonStyle.Secondary)
            )
          )
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    case 3: {
      // CAPTCHA COLOR SEQUENCE
      const colors = [
        { name: "Rojo", emoji: "🔴", id: "rojo" },
        { name: "Azul", emoji: "🔵", id: "azul" },
        { name: "Verde", emoji: "🟢", id: "verde" },
        { name: "Amarillo", emoji: "🟡", id: "amarillo" }
      ];
      const targetSeq = Array.from({ length: 4 }, () => colors[Math.floor(Math.random() * colors.length)]);
      const targetSeqString = targetSeq.map(c => c.id).join("-");
      const targetSeqEmojis = targetSeq.map(c => c.emoji).join(" ");

      const container = new ContainerBuilder()
        .setAccentColor(2303786) // Tech Blue
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 🛠️ Centro de Trabajo - Secuencia CAPTCHA\n` +
            `Ingresa la secuencia de colores en el orden exacto para registrar tu turno:\n\n` +
            `🎯 **Secuencia:** **${targetSeqEmojis}**\n` +
            `📊 **Progreso:** ⬜ ⬜ ⬜ ⬜\n` +
            `⏳ **Límite:** Tienes hasta <t:${deadline}:R>.`
          )
        )
        .addSeparatorComponents(s => s)
        .addActionRowComponents(row =>
          row.setComponents(
            [...colors].sort(() => Math.random() - 0.5).map(c =>
              new ButtonBuilder()
                .setCustomId(`economia_trabajo_captchaSeq_${c.id}_${targetSeqString}_0_${userId}_${deadline}`)
                .setEmoji(c.emoji)
                .setStyle(ButtonStyle.Secondary)
            )
          )
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    case 4: {
      // CAPTCHA ALFANUMÉRICO (TECLADO DE LETRAS)
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let targetCode = "";
      for (let i = 0; i < 5; i++) {
        targetCode += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }
      const uniqueChars = targetCode.split("");

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
                .setCustomId(`economia_trabajo_codeSeq_${char}_${targetCode}_0_${userId}_${deadline}`)
                .setLabel(char)
                .setStyle(ButtonStyle.Secondary)
            )
          )
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
}

// Ejecución de crímenes específicos
async function runSpecificCrime(interaction, choice) {
  const userId = interaction.user.id;
  const user = await userService.getUser(userId);
  const avatarUrl = interaction.user.displayAvatarURL({ extension: "png", size: 128 });
  const bankBalance = await userService.getBalance("server_bank");
  const casinoBalance = await userService.getBalance("server_casino");

  let cooldown = crimesConfig.cooldown;
  let chanceMod = 0;
  let stealMod = 1.0;
  let fineMod = 1.0;

  if (user && user.profession === "criminal") {
    cooldown = Math.floor(cooldown / 2);
    chanceMod = 0.15;
    stealMod = 0.90;
    fineMod = 1.25;
  }

  // Establecer cooldown global de crímenes
  await cooldownService.setCooldown(userId, "crimen", cooldown);

  if (choice === "hackear") {
    // HACKEO AL BANCO CENTRAL
    if (bankBalance <= 0) {
      const container = new ContainerBuilder()
        .setAccentColor(10038562)
        .addTextDisplayComponents(t => t.setContent(`🏛️ **Banco en Quiebra:** El Banco Central no tiene fondos actualmente. ¡Espera a que recaude más impuestos o multas para realizar un hackeo!`));
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const successChance = crimesConfig.hackear.chance + chanceMod;
    const success = Math.random() < successChance;

    if (success) {
      const finalReward = Math.max(1, Math.floor(bankBalance * crimesConfig.hackear.percentStolen * stealMod));

      await userService.addBalance("server_bank", -finalReward, false);
      await userService.addBalance(userId, finalReward, false);

      await logTransaction({ discordId: userId, type: "hack_success", amount: finalReward, itemName: "Hackeo exitoso a la red del Banco Central" });
      await logTransaction({ discordId: "server_bank", type: "bank_robbed", amount: -finalReward, itemName: `<@${userId}> hackeó el Banco Central` });
      await logGameOutcome(interaction, "Crimen (Hackeo)", 0, finalReward, true).catch(console.error);

      const container = new ContainerBuilder()
        .setAccentColor(2067276) // Verde éxito tenue
        .addTextDisplayComponents(t => t.setContent(`### 🥷 ¡Banco Central Infiltrado! Access Granted`))
        .addSeparatorComponents(s => s)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(t =>
              t.setContent(
                `Ejecutaste un exploit de día cero contra los servidores del Banco Central y desviaste fondos de la bóveda federal.\n\n` +
                `💰 **Fórmula de Desvío:** ${(crimesConfig.hackear.percentStolen * 100).toFixed(0)}% de las reservas del Banco.\n` +
                `💵 **Fondos sustraídos:** +${COIN}**${finalReward.toLocaleString("es-DO")}** monedas`
              )
            )
            .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } else {
      const stats = await userService.getUser(userId);
      const walletBalance = stats ? stats.balance : 0;
      const bankBalance2 = await userService.getBankBalance(userId);
      const totalBalance = walletBalance + bankBalance2;

      const finePercent = crimesConfig.hackear.finePercent * fineMod;
      const fine = Math.max(crimesConfig.hackear.fineMin, Math.round(totalBalance * finePercent));
      const newWalletBalance = walletBalance - fine; // Puede ser negativo (deuda)

      await supabase.from("user_stats").update({ balance: newWalletBalance }).eq("discord_id", userId);
      await userService.addBalance("server_bank", fine, false);

      await logTransaction({ discordId: userId, type: "hack_failed", amount: -fine, itemName: "Hackeo fallido al Banco Central (Multa al Banco)" });
      await logTransaction({ discordId: "server_bank", type: "bank_fine", amount: fine, itemName: `Multa cobrada de <@${userId}> por hackeo bancario fallido` });
      await logGameOutcome(interaction, "Crimen (Hackeo)", fine, 0, false).catch(console.error);

      const debtLine = newWalletBalance < 0
        ? `\n⚠️ **Deuda activa:** Tu cartera quedó en ${COIN}**${newWalletBalance.toLocaleString("es-DO")}**. La deuda se cubrirá automáticamente con tus próximas ganancias.`
        : "";

      const container = new ContainerBuilder()
        .setAccentColor(10038562) // Rojo fallo tenue
        .addTextDisplayComponents(t => t.setContent(`### 🚨 ¡Cortafuegos Bancario Activo!`))
        .addSeparatorComponents(s => s)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(t =>
              t.setContent(
                `El cortafuegos del Banco Central detectó tus paquetes maliciosos, rastreó tu terminal y bloqueó tus cuentas.\n\n` +
                `💸 **Multa de Seguridad (${(crimesConfig.hackear.finePercent * 100).toFixed(0)}% de tu balance total):** -${COIN}**${fine.toLocaleString("es-DO")}** monedas.` +
                debtLine + `\n` +
                `🏛️ *La multa ha sido confiscada por las autoridades federales para reabastecer el Tesoro Público.*`
              )
            )
            .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }

  if (choice === "fraude") {
    // ESTAFA AL CASINO
    if (casinoBalance <= 0) {
      const container = new ContainerBuilder()
        .setAccentColor(10038562)
        .addTextDisplayComponents(t => t.setContent(`🎰 **Casino en Quiebra:** El Casino del Servidor no tiene fondos actualmente. ¡Espera a que los jugadores pierdan apuestas para realizar una estafa!`));
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const successChance = crimesConfig.fraude.chance + chanceMod;
    const success = Math.random() < successChance;

    if (success) {
      const stolenFromCasino = Math.max(1, Math.floor(casinoBalance * crimesConfig.fraude.percentStolen * stealMod));

      await userService.addBalance("server_casino", -stolenFromCasino, false);
      await userService.addBalance(userId, stolenFromCasino, false);
      await logTransaction({ discordId: userId, type: "fraude_success", amount: stolenFromCasino, itemName: "Estafa exitosa al Casino de Arkania" });
      await logTransaction({ discordId: "server_casino", type: "bank_robbed", amount: -stolenFromCasino, itemName: `<@${userId}> estafó al Casino` });
      await logGameOutcome(interaction, "Crimen (Estafa)", 0, stolenFromCasino, true).catch(console.error);

      const container = new ContainerBuilder()
        .setAccentColor(2067276) // Verde éxito tenue
        .addTextDisplayComponents(t => t.setContent(`### 🎰 ¡Gran Estafa al Casino completada!`))
        .addSeparatorComponents(s => s)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(t =>
              t.setContent(
                `Falsificaste registros de juego y hackeaste las ruletas para desviar capital de la bóveda del Casino.\n\n` +
                `💰 **Fórmula de Desvío:** ${(crimesConfig.fraude.percentStolen * 100).toFixed(0)}% de las reservas del Casino.\n` +
                `💵 **Dinero obtenido:** +${COIN}**${stolenFromCasino.toLocaleString("es-DO")}** monedas`
              )
            )
            .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } else {
      const stats = await userService.getUser(userId);
      const walletBalance = stats ? stats.balance : 0;
      const bankBalance3 = await userService.getBankBalance(userId);
      const totalBalance = walletBalance + bankBalance3;

      const finePercent = crimesConfig.fraude.finePercent * fineMod;
      const fine = Math.max(crimesConfig.fraude.fineMin, Math.round(totalBalance * finePercent));
      const newWalletBalance = walletBalance - fine; // Puede ser negativo (deuda)

      await supabase.from("user_stats").update({ balance: newWalletBalance }).eq("discord_id", userId);
      await userService.addBalance("server_bank", fine, false);

      await logTransaction({ discordId: userId, type: "fraude_failed", amount: -fine, itemName: "Estafa fallida al Casino (Multa al Banco)" });
      await logTransaction({ discordId: "server_bank", type: "bank_fine", amount: fine, itemName: `Multa cobrada de <@${userId}> por estafa fallida de casino` });
      await logGameOutcome(interaction, "Crimen (Estafa)", fine, 0, false).catch(console.error);

      const debtLine = newWalletBalance < 0
        ? `\n⚠️ **Deuda activa:** Tu cartera quedó en ${COIN}**${newWalletBalance.toLocaleString("es-DO")}**. La deuda se cubrirá automáticamente con tus próximas ganancias.`
        : "";

      const container = new ContainerBuilder()
        .setAccentColor(10038562) // Rojo fallo tenue
        .addTextDisplayComponents(t => t.setContent(`### 🏛️ ¡Esquema de Estafa Detectado por Seguridad!`))
        .addSeparatorComponents(s => s)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(t =>
              t.setContent(
                `El equipo de seguridad de la bóveda del Casino descubrió tu esquema de desvío de fichas y alertó a la policía.\n\n` +
                `💸 **Multa Aplicada (${(crimesConfig.fraude.finePercent * 100).toFixed(0)}% de tu balance total):** -${COIN}**${fine.toLocaleString("es-DO")}** monedas.` +
                debtLine + `\n` +
                `🏛️ *La fianza y la multa han sido confiscadas a favor del Banco Central.*`
              )
            )
            .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
}

// Inicialización de confirmación de crimen
async function initSpecificCrime(interaction, choice) {
  const userId = interaction.user.id;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const cd = await cooldownService.checkCooldown(userId, "crimen");
  if (cd) {
    const expirationTimestamp = Math.round((Date.now() + cd * 1000) / 1000);
    return interaction.editReply({
      content: `🚨 **Nivel de Sospecha Alto:** Las autoridades te están vigilando de cerca. Espera a que se enfríe la situación.\n\n✨ *Podrás volver a cometer un crimen <t:${expirationTimestamp}:R>.*`
    });
  }

  await userService.createUser(userId, interaction.user.username);

  let container = null;
  let confirmButton = null;

  if (choice === "hackear") {
    container = new ContainerBuilder()
      .setAccentColor(10038562) // Rojo
      .addTextDisplayComponents(t =>
        t.setContent(
          `### 🖥️ Infiltración al Banco Central\n` +
          `¿Estás seguro de que deseas hackear los servidores del Banco Central?\n\n` +
          `> * **Riesgo:** ${(crimesConfig.hackear.chance * 100).toFixed(0)}% de éxito.\n` +
          `> * **Ganancia:** ${(crimesConfig.hackear.percentStolen * 100).toFixed(0)}% de las reservas federales del Banco.\n` +
          `> * **Sanción:** ${(crimesConfig.hackear.finePercent * 100).toFixed(0)}% de multa de tu cartera si eres detectado.`
        )
      );
    confirmButton = new ButtonBuilder()
      .setCustomId("economia_crimen_confirm_hackear")
      .setLabel("Confirmar Hackeo")
      .setEmoji("💻")
      .setStyle(ButtonStyle.Success);
  } else if (choice === "fraude") {
    container = new ContainerBuilder()
      .setAccentColor(10038562) // Rojo
      .addTextDisplayComponents(t =>
        t.setContent(
          `### 🏛️ Malversación del Casino de Arkania\n` +
          `¿Estás seguro de que deseas falsificar firmas para estafar al Casino?\n\n` +
          `> * **Riesgo:** ${(crimesConfig.fraude.chance * 100).toFixed(0)}% de éxito.\n` +
          `> * **Ganancia:** ${(crimesConfig.fraude.percentStolen * 100).toFixed(0)}% de las reservas reales del Casino.\n` +
          `> * **Sanción:** ${(crimesConfig.fraude.finePercent * 100).toFixed(0)}% de multa de tu cartera si eres auditado.`
        )
      );
    confirmButton = new ButtonBuilder()
      .setCustomId("economia_crimen_confirm_fraude")
      .setLabel("Confirmar Estafa")
      .setEmoji("💼")
      .setStyle(ButtonStyle.Success);
  }

  container.addActionRowComponents(r => r.addComponents(confirmButton));
  return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("economia")
    .setDescription("Envía el panel unificado de economía (tareas y casino) al canal de economía")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    if (!guild) return;

    let channels = guild.channels.cache;
    if (!channels || channels.size === 0) {
      await guild.channels.fetch().catch(() => { });
      channels = guild.channels.cache;
    }

    const targetChannel = channels.find(c =>
      (c.name === "economía" || c.name === "economia") && c.isTextBased()
    ) || interaction.channel;

    const panel = new ContainerBuilder()
      .setAccentColor(2303786) // Tech Blue / Cyan
      // Sección 1: Profesiones
      .addTextDisplayComponents(t =>
        t.setContent(
          "## 👔 Roles y Profesiones\n" +
          "Elige un camino para obtener bonificaciones o consecuencias.\n" +
          "*Si no eliges ningún rol, serás un ciudadano común sin ventajas ni penalizaciones.*\n\n" +
          "ℹ️ **:** Información detallada sobre cada rol.\n" +
          "🕴️ **:** Seleccionar el rol de Magnate.\n" +
          "🎰 **:** Seleccionar el rol de Ludópata.\n" +
          "🥷 **:** Seleccionar el rol de Criminal.\n" +
          "🚪 **:** Retirarse (Quitarse los roles)."
        )
      )
      .addActionRowComponents(row =>
        row.setComponents(
          new ButtonBuilder().setCustomId("economia_roles_magnate").setEmoji("🕴️").setStyle(ButtonStyle.Secondary).setLabel("Magnate"),
          new ButtonBuilder().setCustomId("economia_roles_gambler").setEmoji("🎰").setStyle(ButtonStyle.Secondary).setLabel("Ludópata"),
          new ButtonBuilder().setCustomId("economia_roles_criminal").setEmoji("🥷").setStyle(ButtonStyle.Secondary).setLabel("Criminal")
        )
      )
      .addActionRowComponents(row =>
        row.setComponents(
          new ButtonBuilder().setCustomId("economia_roles_info").setEmoji("ℹ️").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("economia_roles_retirarse").setEmoji("🚪").setStyle(ButtonStyle.Danger).setLabel("Retirarse")
        )
      )
      // Separador
      .addSeparatorComponents(s => s)
      // Sección 2: Tareas
      .addTextDisplayComponents(t =>
        t.setContent(
          "## 🛠️ Centro de Trabajo de Arkania\n" +
          "Realiza tus deberes diarios y cumple con tus jornadas laborales para ganar monedas.\n\n" +
          "ℹ️ **:** Guía e información sobre las tareas.\n" +
          "📆 **:** Reclamar el subsidio diario.\n" +
          "📜 **:** Ver/aceptar la tarea diaria rotativa.\n" +
          "🛠️ **:** Comenzar una jornada laboral interactiva.\n" +
          "💰 **:** Ver tu balance de monedas.\n" +
          "🥷 **:** Hackear el Banco Central.\n\n" +
          "-# Nota: Las partidas desde aquí se juegan de forma privada (efímeras) para mantener limpio el canal."
        )
      )
      .addActionRowComponents(row =>
        row.setComponents(
          new ButtonBuilder().setCustomId("economia_tareas_diario").setEmoji("📆").setStyle(ButtonStyle.Secondary).setLabel("Subsidio"),
          new ButtonBuilder().setCustomId("economia_tareas_rotativa").setEmoji("📜").setStyle(ButtonStyle.Secondary).setLabel("Misión"),
          new ButtonBuilder().setCustomId("economia_tareas_trabajo").setEmoji("🛠️").setStyle(ButtonStyle.Secondary).setLabel("Tarea"),
          new ButtonBuilder().setCustomId("economia_tareas_balance").setEmoji("💰").setStyle(ButtonStyle.Secondary).setLabel("Balance")
        )
      )
      .addActionRowComponents(row =>
        row.setComponents(
          new ButtonBuilder().setCustomId("economia_tareas_info").setEmoji("ℹ️").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("economia_tareas_crimen").setEmoji("🥷").setStyle(ButtonStyle.Danger).setLabel("Hackear")
        )
      )
      // Separador
      .addSeparatorComponents(s => s)
      // Sección 3: Casino
      .addTextDisplayComponents(t =>
        t.setContent(
          "## 🎰 Casino de Arkania\n" +
          "Apuesta tus monedas y multiplica tu riqueza en nuestros juegos interactivos.\n\n" +
          "ℹ️ **:** Guía e información sobre los juegos.\n" +
          "🪙 **:** Jugar a Cara o Cruz.\n" +
          "🃏 **:** Jugar a Blackjack.\n" +
          "💣 **:** Jugar a Campo de Minas.\n" +
          "🗼 **:** Jugar a Torre de Riesgo.\n" +
          "🥷 **:** Estafar al Casino."
        )
      )
      .addActionRowComponents(row =>
        row.setComponents(
          new ButtonBuilder().setCustomId("economia_casino_coinflip").setEmoji("🪙").setStyle(ButtonStyle.Secondary).setLabel("CaraCruz"),
          new ButtonBuilder().setCustomId("economia_casino_blackjack").setEmoji("🃏").setStyle(ButtonStyle.Secondary).setLabel("Blackjack"),
          new ButtonBuilder().setCustomId("economia_casino_minas").setEmoji("💣").setStyle(ButtonStyle.Secondary).setLabel("Minas"),
          new ButtonBuilder().setCustomId("economia_casino_torre").setEmoji("🗼").setStyle(ButtonStyle.Secondary).setLabel("Torre")
        )
      )
      .addActionRowComponents(row =>
        row.setComponents(
          new ButtonBuilder().setCustomId("economia_casino_info").setEmoji("ℹ️").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("economia_casino_crimen").setEmoji("🥷").setStyle(ButtonStyle.Danger).setLabel("Estafar")
        )
      );

    await targetChannel.send({ components: [panel], flags: MessageFlags.IsComponentsV2 });
    return interaction.editReply({ content: `Panel unificado de economía enviado a <#${targetChannel.id}>.` });
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;

    const userId = interaction.user.id;
    const customId = interaction.customId;

    // Manejar aceptación de la tarea diaria rotativa
    if (customId === "economia_accept_rotativa") {
      try {
        await interaction.deferUpdate();
      } catch { }

      const completedCd = await cooldownService.checkCooldown(userId, "daily_task");
      if (completedCd) {
        return interaction.editReply({
          content: `✅ **¡Tarea Diaria ya Completada!**\nYa reclamaste tu recompensa de hoy. Vuelve mañana para una nueva tarea.`,
          components: []
        });
      }

      const accepted = taskTracker.acceptTask(userId);
      return interaction.editReply({
        content: `✅ **¡Tarea Diaria Aceptada!**\nHora de ponerse en marcha:\n> 📋 **Misión:** *${accepted.description}*\n> 💰 **Recompensa:** **${COIN}${accepted.reward.toLocaleString("es-DO")}** monedas.`,
        components: []
      });
    }

    // --- MANEJAR ACTUALIZACIONES DE MINIJUEGOS DE TRABAJO ---
    if (customId.startsWith("economia_trabajo_")) {
      const parts = customId.split("_");
      const type = parts[2];

      let taskUserId = "";
      let deadline = 0;

      if (type === "sum") {
        taskUserId = parts[5];
        deadline = parseInt(parts[6], 10);
      } else if (type === "click10") {
        taskUserId = parts[3];
        deadline = parseInt(parts[5], 10);
      } else if (type === "shape") {
        taskUserId = parts[5];
        deadline = parseInt(parts[6], 10);
      } else if (type === "captchaSeq" || type === "codeSeq") {
        taskUserId = parts[6];
        deadline = parseInt(parts[7], 10);
      }

      if (userId !== taskUserId) {
        return interaction.reply({ content: "Esa no es tu tarea.", flags: MessageFlags.Ephemeral });
      }

      try {
        await interaction.deferUpdate();
      } catch { }

      const now = Math.floor(Date.now() / 1000);
      if (now > deadline) {
        await cooldownService.setCooldown(userId, "trabajo", taskCooldown);
        const container = new ContainerBuilder()
          .setAccentColor(10038562) // Rojo Fracaso
          .addTextDisplayComponents(t =>
            t.setContent(
              `### ⏰ ¡Se acabó el tiempo!\n` +
              `Tardaste demasiado en realizar la tarea (límite de 30 segundos).\n\n` +
              `⚠️ *Has perdido la oportunidad y el cooldown de espera ha comenzado.*`
            )
          );
        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (type === "sum") {
        const clicked = parseInt(parts[3], 10);
        const correctSum = parseInt(parts[4], 10);

        if (clicked === correctSum) {
          const { earned, bankGenerated, percentage } = await grantWorkReward(interaction, userId);
          const container = new ContainerBuilder()
            .setAccentColor(2067276)
            .addTextDisplayComponents(t =>
              t.setContent(
                `### ✅ ¡Trabajo Completado!\n` +
                `Excelente desempeño. Resolviste la operación matemática correctamente.\n\n` +
                `💰 **Tu Pago (${percentage}%):** +${COIN}**${earned.toLocaleString("es-DO")}** monedas\n` +
                `🏛️ **Generado para el Banco:** +${COIN}**${bankGenerated.toLocaleString("es-DO")}** monedas`
              )
            );
          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } else {
          const container = new ContainerBuilder()
            .setAccentColor(10038562)
            .addTextDisplayComponents(t =>
              t.setContent(
                `### ❌ ¡Tarea Fallida!\n` +
                `Cometiste un error al ingresar la respuesta. El turno de trabajo ha terminado.\n\n` +
                `⚠️ *Has perdido la oportunidad y el cooldown de espera ha comenzado.*`
              )
            );
          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
      }

      if (type === "click10") {
        let remaining = parseInt(parts[4], 10) - 1;

        if (remaining <= 0) {
          const { earned, bankGenerated, percentage } = await grantWorkReward(interaction, userId);
          const container = new ContainerBuilder()
            .setAccentColor(2067276)
            .addTextDisplayComponents(t =>
              t.setContent(
                `### ✅ ¡Trabajo Completado!\n` +
                `¡Excelente velocidad de reacción! Completaste la pulsación repetida de forma exitosa.\n\n` +
                `💰 **Tu Pago (${percentage}%):** +${COIN}**${earned.toLocaleString("es-DO")}** monedas\n` +
                `🏛️ **Generado para el Banco:** +${COIN}**${bankGenerated.toLocaleString("es-DO")}** monedas`
              )
            );
          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const progressBlocks = "🟩".repeat(10 - remaining) + "⬜".repeat(remaining);
        const container = new ContainerBuilder()
          .setAccentColor(2303786)
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
                .setCustomId(`economia_trabajo_click10_${userId}_${remaining}_${deadline}`)
                .setLabel(`Presionar (${remaining})`)
                .setStyle(ButtonStyle.Primary)
            )
          );

        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (type === "shape") {
        const clickedId = parts[3];
        const correctId = parts[4];

        if (clickedId === correctId) {
          const { earned, bankGenerated, percentage } = await grantWorkReward(interaction, userId);
          const container = new ContainerBuilder()
            .setAccentColor(2067276)
            .addTextDisplayComponents(t =>
              t.setContent(
                `### ✅ ¡Trabajo Completado!\n` +
                `Excelente agudeza visual. Encontraste la figura geométrica correcta.\n\n` +
                `💰 **Tu Pago (${percentage}%):** +${COIN}**${earned.toLocaleString("es-DO")}** monedas\n` +
                `🏛️ **Generado para el Banco:** +${COIN}**${bankGenerated.toLocaleString("es-DO")}** monedas`
              )
            );
          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } else {
          const container = new ContainerBuilder()
            .setAccentColor(10038562)
            .addTextDisplayComponents(t =>
              t.setContent(
                `### ❌ ¡Tarea Fallida!\n` +
                `Cometiste un error al ingresar la respuesta. El turno de trabajo ha terminado.\n\n` +
                `⚠️ *Has perdido la oportunidad y el cooldown de espera ha comenzado.*`
              )
            );
          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
      }

      if (type === "captchaSeq") {
        const clickedColorId = parts[3];
        const targetSequenceString = parts[4];
        let currentIndex = parseInt(parts[5], 10);

        const targetArr = targetSequenceString.split("-");
        const correctColorId = targetArr[currentIndex];

        if (clickedColorId === correctColorId) {
          currentIndex++;

          if (currentIndex === 4) {
            const { earned, bankGenerated, percentage } = await grantWorkReward(interaction, userId);
            const container = new ContainerBuilder()
              .setAccentColor(2067276)
              .addTextDisplayComponents(t =>
                t.setContent(
                  `### ✅ ¡Trabajo Completado!\n` +
                  `¡Excelente memoria y coordinación! Secuencia CAPTCHA de colores completada correctamente.\n\n` +
                  `💰 **Tu Pago (${percentage}%):** +${COIN}**${earned.toLocaleString("es-DO")}** monedas\n` +
                  `🏛️ **Generado para el Banco:** +${COIN}**${bankGenerated.toLocaleString("es-DO")}** monedas`
                )
              );
            return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
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
            .setAccentColor(2303786)
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
                    .setCustomId(`economia_trabajo_captchaSeq_${c.id}_${targetSequenceString}_${currentIndex}_${userId}_${deadline}`)
                    .setEmoji(c.emoji)
                    .setStyle(ButtonStyle.Secondary)
                )
              )
            );

          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } else {
          const container = new ContainerBuilder()
            .setAccentColor(10038562)
            .addTextDisplayComponents(t =>
              t.setContent(
                `### ❌ ¡Tarea Fallida!\n` +
                `Cometiste un error al ingresar la respuesta. El turno de trabajo ha terminado.\n\n` +
                `⚠️ *Has perdido la oportunidad y el cooldown de espera ha comenzado.*`
              )
            );
          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
      }

      if (type === "codeSeq") {
        const clickedChar = parts[3];
        const targetCode = parts[4];
        let currentIndex = parseInt(parts[5], 10);

        const correctChar = targetCode.charAt(currentIndex);

        if (clickedChar === correctChar) {
          currentIndex++;

          if (currentIndex === 5) {
            const { earned, bankGenerated, percentage } = await grantWorkReward(interaction, userId);
            const container = new ContainerBuilder()
              .setAccentColor(2067276)
              .addTextDisplayComponents(t =>
                t.setContent(
                  `### ✅ ¡Trabajo Completado!\n` +
                  `¡Acceso Concedido! Código alfanumérico de seguridad verificado correctamente.\n\n` +
                  `💰 **Tu Pago (${percentage}%):** +${COIN}**${earned.toLocaleString("es-DO")}** monedas\n` +
                  `🏛️ **Generado para el Banco:** +${COIN}**${bankGenerated.toLocaleString("es-DO")}** monedas`
                )
              );
            return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
          }

          const uniqueChars = targetCode.split("");
          const progressDisplay = targetCode.substring(0, currentIndex) + " " + "_ ".repeat(5 - currentIndex);

          const container = new ContainerBuilder()
            .setAccentColor(2303786)
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
                    .setCustomId(`economia_trabajo_codeSeq_${char}_${targetCode}_${currentIndex}_${userId}_${deadline}`)
                    .setLabel(char)
                    .setStyle(ButtonStyle.Secondary)
                )
              )
            );

          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } else {
          const container = new ContainerBuilder()
            .setAccentColor(10038562)
            .addTextDisplayComponents(t =>
              t.setContent(
                `### ❌ ¡Tarea Fallida!\n` +
                `Cometiste un error al ingresar la respuesta. El turno de trabajo ha terminado.\n\n` +
                `⚠️ *Has perdido la oportunidad y el cooldown de espera ha comenzado.*`
              )
            );
          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
      }
    }

    // --- MANEJAR CONFIRMACIÓN DE CRÍMENES ---
    if (customId.startsWith("economia_crimen_confirm_")) {
      const choice = customId.replace("economia_crimen_confirm_", "");
      try {
        await interaction.deferUpdate();
        await runSpecificCrime(interaction, choice);
        return true;
      } catch (error) {
        console.error(`Error procesando crimen directo (${choice}):`, error);
      }
      return true;
    }

    if (!customId.startsWith("economia_")) return false;

    const action = customId.replace("economia_", "");

    // --- ACCIONES DE TAREAS ---
    if (action === "tareas_info") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await interaction.editReply({
        content:
          "### ℹ️ Guía de Tareas — Centro de Trabajo de Arkania\n\n" +
          "1. 📆 **Premio Diario**\n" +
          "> Reclama tu recompensa económica una vez al día de forma gratuita.\n" +
          "> * **Recompensa:** La cantidad de monedas otorgada depende del rol más alto que tengas asignado en el servidor.\n" +
          "> * **Financiación:** Las recompensas provienen en su totalidad del Banco Central.\n\n" +
          "2. 📜 **Tarea Diaria (Rotativa)**\n" +
          "> Acepta una misión especial que cambia cada día (por ejemplo: enviar mensajes en los canales, jugar al casino, etc.) para obtener una gran recompensa de monedas al completarla.\n" +
          "> * **Recompensa:** ¡Paga el **doble** de una jornada laboral normal!\n\n" +
          "3. 🛠️ **Tarea Cíclica (Trabajo)**\n" +
          "> Completa una tarea interactiva de rapidez, reflejos o cálculo para cobrar tu salario.\n" +
          "> * **Tipos de tareas:** Podrás enfrentarte a resolver sumas rápidas, presionar botones velozmente, identificar figuras geométricas o resolver secuencias CAPTCHA de colores y letras.\n" +
          "> * **Límite de tiempo:** Cuentas con un máximo de **30 segundos** para resolver cada tarea de manera exitosa.\n\n" +
          "4. 🥷 **Asalto (Crimen)**\n" +
          "> Ejecuta un hackeo de seguridad contra el Banco Central y desvía sus fondos."
      });
      return true;
    }

    if (action === "tareas_diario") {
      // PROCESAR RECLAMO DIARIO DIRECTAMENTE AQUÍ
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await userService.createUser(userId, interaction.user.username);

      const cd = await cooldownService.checkCooldown(userId, "diario");
      if (cd) {
        const resetTimestamp = Math.floor(Date.now() / 1000 + cd);
        return interaction.editReply({
          content: `Ya reclamaste hoy. Vuelve <t:${resetTimestamp}:R> para la siguiente.`
        });
      }

      const memberRoles = interaction.member.roles.cache.map(r => r.id);
      if (!memberRoles.length) {
        return interaction.editReply({
          content: "No tienes ningún rol que otorgue recompensa diaria."
        });
      }

      const { data: rows, error } = await db
        .from("role_rewards")
        .select("role_id, ammount")
        .in("role_id", memberRoles);

      if (error || !rows || rows.length === 0) {
        return interaction.editReply({
          content: "Ninguno de tus roles otorga monedas diarias en el sistema de recompensas."
        });
      }

      const maxRewardRow = rows.reduce((max, row) => row.ammount > max.ammount ? row : max, rows[0]);
      let amount = maxRewardRow.ammount;
      const roleId = maxRewardRow.role_id;

      const user = await userService.getUser(userId);
      let multiplier = 1.0;
      if (user && user.profession === "magnate") multiplier = 1.15;
      if (user && user.profession === "gambler") multiplier = 0.90;

      amount = Math.floor(amount * multiplier);

      if (user && user.profession === "magnate") {
      }

      try {
        const bankBalance = await userService.getBalance("server_bank");
        if (bankBalance < amount) {
          return interaction.editReply({
            content: `❌ **El Banco del Servidor está en quiebra:** El banco no tiene suficientes monedas para pagar tu recompensa diaria en este momento (Faltan **${COIN}${(amount - bankBalance).toLocaleString("es-DO")}**). ¡Anima a la comunidad a realizar tareas con \`/trabajo\` para rellenar las arcas del banco!`
          });
        }

        await userService.addBalance("server_bank", -amount, false);
        await logTransaction({ discordId: "server_bank", type: "bank_withdrawal", amount: -amount, itemName: `Pago de diario a <@${userId}>` });
        await userService.addBalance(userId, amount, false);
        const publicLogService = require("../../services/publicLogService");
        publicLogService.logWorkReward(interaction.client, { userId, amount, sourceName: "Subsidio Diario" }).catch(() => {});
      } catch (updateError) {
        console.error(updateError);
        return interaction.editReply({
          content: "Error actualizando balances con el banco."
        });
      }

      await cooldownService.setCooldown(userId, "diario", config.dailyClaim.cooldown);
      await logTransaction({ discordId: userId, type: "daily", amount: amount });

      const container = new ContainerBuilder()
        .setAccentColor(2067276) // Verde Éxito
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 📆 ¡Recompensa Diaria Reclamada!\n` +
            `Has reclamado tu bonificación diaria correspondiente a tu rol <@&${roleId}>.\n\n` +
            `💰 **Recompensa:** +${COIN}**${amount.toLocaleString("es-DO")}** monedas`
          )
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === "tareas_rotativa") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const completedCd = await cooldownService.checkCooldown(userId, "daily_task");
      if (completedCd) {
        await interaction.editReply({
          content: `✅ **¡Tarea Diaria ya Completada!**\nYa has completado tu tarea diaria de hoy. Vuelve mañana para una nueva misión.`
        });
        return true;
      }

      const active = taskTracker.getActiveTask(userId);
      if (active) {
        await interaction.editReply({
          content:
            `### 📋 Tarea Diaria en Progreso\n\n` +
            `> **Descripción:** *${active.description}*\n` +
            `> 📊 **Progreso actual:** **${active.progress}/${active.target}**\n` +
            `> 💰 **Recompensa:** **${COIN}${active.reward.toLocaleString("es-DO")}** monedas`
        });
        return true;
      }

      const todayTask = taskTracker.getDailyTask();
      const acceptRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("economia_accept_rotativa")
          .setLabel("Aceptar Tarea")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.editReply({
        content:
          `### 📋 Tarea Diaria Rotativa\n\n` +
          `¿Quieres aceptar la tarea del día de hoy?\n\n` +
          `> **Descripción:** *${todayTask.description}*\n` +
          `> 💰 **Recompensa:** **${COIN}${todayTask.reward.toLocaleString("es-DO")}** monedas`,
        components: [acceptRow]
      });
      return true;
    }

    if (action === "tareas_trabajo") {
      await initWorkTask(interaction);
      return true;
    }

    if (action === "tareas_crimen") {
      await initSpecificCrime(interaction, "hackear");
      return true;
    }

    if (action === "tareas_balance") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const user = await userService.getUser(userId) || await userService.createUser(userId, interaction.user.username);
      const pocket = user.balance || 0;
      const bank = await userService.getBankBalance(userId) || 0;
      const total = pocket + bank;

      const container = new ContainerBuilder()
        .setAccentColor(2303786) // Tech Blue
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 💰 Estado de Cuenta de ${interaction.user.username}\n\n` +
            `> 👛 **Cartera:** ${COIN}**${pocket.toLocaleString("es-DO")}**\n` +
            `> 🏦 **Banco:** ${COIN}**${bank.toLocaleString("es-DO")}**\n\n` +
            `> 📊 **Total Neto:** ${COIN}**${total.toLocaleString("es-DO")}**`
          )
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    // --- ACCIONES DE CASINO ---
    if (action === "casino_info") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await interaction.editReply({
        content:
          "### ℹ️ Guía de Juegos — Casino de Arkania\n\n" +
          "🪙 **Cara o Cruz**\n" +
          "> Apuesta tus monedas y elige una cara. Si la suerte te acompaña, duplicarás tu apuesta.\n" +
          "> * **Ganancias:** +100% de lo apostado (impuesto del 10% sobre ganancias netas).\n" +
          "> * **Pérdida:** Se retiene un 20% como impuesto para el Banco Central.\n\n" +
          "🃏 **Blackjack**\n" +
          "> Compite contra el dealer en el clásico 21. Obtén una puntuación superior a la banca sin pasarte de 21.\n" +
          "> * **Victoria Estándar:** Paga 2x de tu apuesta original.\n" +
          "> * **Blackjack Natural:** Paga 2.5x (si obtienes 21 en tus dos primeras cartas).\n\n" +
          "💣 **Campo de Minas (3x3)**\n" +
          "> Descubre gemas en un tablero de 9 casillas. Cada gema aumenta tu multiplicador de cobro. ¡Retírate antes de tocar una mina!\n" +
          "> * **Requisito de Retiro:** Debes encontrar al menos **2 gemas** para poder cobrar (o vaciar el tablero).\n" +
          "> * **Victoria Perfecta:** Encontrar todas las gemas otorga el premio acumulado de forma automática.\n\n" +
          "🗼 **Torre de Riesgo**\n" +
          "> Sube pisos en la torre. Cada nivel alcanzado con éxito multiplica tu premio acumulado, pero si colapsa, pierdes todo.\n" +
          "> * **Multiplicación:** Cada nivel sube tu premio por **1.5x** del valor anterior.\n" +
          "> * **Retiro:** Puedes retirarte y cobrar en cualquier nivel antes de volver a arriesgar.\n\n" +
          "🥷 **Asalto (Crimen)**\n" +
          "> Realiza una estafa de lavado de dinero o desvío de capital contra el Casino."
      });
      return true;
    }

    if (action === "casino_coinflip") {
      const modal = new ModalBuilder()
        .setCustomId("cara_cruz_modal")
        .setTitle("Apostar: Cara o Cruz");

      const amountInput = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("Monto a apostar (máx 300,000)")
        .setStyle(TextInputStyle.Short)
        .setValue("100000")
        .setPlaceholder("Ej: 100000")
        .setRequired(true);

      const choiceInput = new TextInputBuilder()
        .setCustomId("choice")
        .setLabel("Escribe CARA o CRUZ")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("cara / cruz")
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(amountInput),
        new ActionRowBuilder().addComponents(choiceInput)
      );

      await interaction.showModal(modal);
      return true;
    }

    if (action === "casino_blackjack") {
      const modal = new ModalBuilder()
        .setCustomId("blackjack_modal")
        .setTitle("Apostar: Blackjack");

      const amountInput = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("Monto a apostar (máx 300,000)")
        .setStyle(TextInputStyle.Short)
        .setValue("100000")
        .setPlaceholder("Ej: 100000")
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(amountInput));

      await interaction.showModal(modal);
      return true;
    }

    if (action === "casino_minas") {
      const modal = new ModalBuilder()
        .setCustomId("minas_modal")
        .setTitle("Apostar: Campo de Minas");

      const amountInput = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("Monto a apostar (máx 300,000)")
        .setStyle(TextInputStyle.Short)
        .setValue("100000")
        .setPlaceholder("Ej: 100000")
        .setRequired(true);

      const minesInput = new TextInputBuilder()
        .setCustomId("mines")
        .setLabel("Cantidad de minas (1 a 8, por defecto 2)")
        .setStyle(TextInputStyle.Short)
        .setValue("2")
        .setPlaceholder("Ej: 2")
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(amountInput),
        new ActionRowBuilder().addComponents(minesInput)
      );

      await interaction.showModal(modal);
      return true;
    }

    if (action === "casino_torre") {
      const modal = new ModalBuilder()
        .setCustomId("torre_modal")
        .setTitle("Apostar: Torre de Riesgo");

      const amountInput = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("Monto a apostar (máx 300,000)")
        .setStyle(TextInputStyle.Short)
        .setValue("100000")
        .setPlaceholder("Ej: 100000")
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(amountInput));

      await interaction.showModal(modal);
      return true;
    }

    if (action === "casino_crimen") {
      await initSpecificCrime(interaction, "fraude");
      return true;
    }

    // --- ACCIONES DE ROLES ---
    if (action.startsWith("roles_")) {
      const subAction = action.replace("roles_", "");

      if (subAction === "info") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.editReply({
          content:
            "### ℹ️ Guía de Roles y Profesiones\n\n" +
            "🕴️ **Magnate**\n" +
            "> Experto en finanzas. Obtiene bonificaciones en sus trabajos y puede almacenar más dinero, a costa de pagar impuestos.\n" +
            "> * **Beneficios:** +15% monedas en `/trabajo` y `/diario`, banco de 10M.\n" +
            "> * **Consecuencia:** 2% de impuesto al depositar.\n\n" +
            "🎰 **Ludópata**\n" +
            "> Adictos al riesgo. Cuentan con pase libre en los casinos.\n" +
            "> * **Beneficios:** 0% impuestos al ganar o perder en juegos de casino.\n" +
            "> * **Consecuencia:** -10% monedas en el `/trabajo`.\n\n" +
            "🥷 **Criminal**\n" +
            "> Maestros del robo. Ejecutan crímenes con mayor frecuencia y éxito.\n" +
            "> * **Beneficios:** +15% éxito en crímenes, cooldown reducido a la mitad.\n" +
            "> * **Consecuencia:** -10% botín robado y +5% multa si son atrapados.\n\n" +
            "🚪 **Retirarse**\n" +
            "> Renuncia a todos los beneficios y penalizaciones para volver a ser un ciudadano común."
        });
        return true;
      }

      if (subAction === "cancel") {
        try {
          await interaction.message.delete();
        } catch (e) { }
        return true;
      }

      const roleDefinitions = config.roles || {
        magnate: { name: "Magnate", emoji: "🕴️" },
        gambler: { name: "Ludópata", emoji: "🎰" },
        criminal: { name: "Criminal", emoji: "🥷" },
        retirarse: { name: "Ciudadano Común", emoji: "🚶" }
      };

      // Función auxiliar para actualizar los roles de Discord
      const updateDiscordRoles = async (member, newRoleKey) => {
        if (!member) return;
        try {
          // Remover roles antiguos
          const rolesToRemove = [];
          for (const key in roleDefinitions) {
            if (key !== "retirarse" && roleDefinitions[key].roleId && member.roles.cache.has(roleDefinitions[key].roleId)) {
              rolesToRemove.push(roleDefinitions[key].roleId);
            }
          }
          if (rolesToRemove.length > 0) {
            await member.roles.remove(rolesToRemove);
          }

          // Agregar el nuevo rol si lo tiene
          if (newRoleKey && newRoleKey !== "retirarse" && roleDefinitions[newRoleKey] && roleDefinitions[newRoleKey].roleId) {
            await member.roles.add(roleDefinitions[newRoleKey].roleId);
          }
        } catch (err) {
          console.error("Error al actualizar roles de Discord:", err);
        }
      };

      if (subAction.startsWith("confirm_")) {
        const choice = subAction.replace("confirm_", "");
        const profDef = roleDefinitions[choice];
        if (!profDef) return false;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const user = await userService.getUser(userId);
        if (!user) return interaction.editReply({ content: "Error al cargar tu perfil." });

        if (user.profession !== null) {
          if (user.balance < 1000000) {
            return interaction.editReply({ content: `❌ **Fondos Insuficientes:** Cambiar de rol cuesta **${COIN}1,000,000**, pero solo tienes **${COIN}${user.balance.toLocaleString()}** en tu cartera.` });
          }
          await userService.addBalance(userId, -1000000, false);
          await userService.addBalance("server_bank", 1000000, false);
          await logTransaction({ discordId: userId, type: "fee", amount: -1000000, itemName: "Cambio de rol" });
          await logTransaction({ discordId: "server_bank", type: "bank_deposit", amount: 1000000, itemName: `Tarifa de rol de <@${userId}>` });
        }

        const newRole = choice === "retirarse" ? null : choice;
        await userService.changeProfession(userId, newRole);
        await updateDiscordRoles(interaction.member, choice);

        const container = new ContainerBuilder()
          .setAccentColor(2067276)
          .addTextDisplayComponents(t =>
            t.setContent(
              `### 🎉 ¡Nuevo Rol Adquirido!\n` +
              `Ahora eres un **${profDef.emoji} ${profDef.name}**.\n\n` +
              (newRole ? `Disfruta de tus nuevos beneficios y/o penalizaciones.` : `Te has retirado y vuelves a ser un ciudadano común, sin bonificaciones ni penalizaciones.`)
            )
          );

        await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        try {
          await interaction.message.delete();
        } catch (e) { }
        return true;
      }

      // Handle direct role selection
      const profDef = roleDefinitions[subAction];
      if (profDef) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const user = await userService.getUser(userId);
        if (!user) return interaction.editReply({ content: "Error al cargar tu perfil." });

        const currentProfession = user.profession || "retirarse";
        if (currentProfession === subAction) {
          return interaction.editReply({ content: `Ya tienes el rol de **${profDef.emoji} ${profDef.name}**.` });
        }

        if (user.profession === null) {
          // It's free the first time, skip confirmation
          const newRole = subAction === "retirarse" ? null : subAction;
          await userService.changeProfession(userId, newRole);
          await updateDiscordRoles(interaction.member, subAction);

          const container = new ContainerBuilder()
            .setAccentColor(2067276)
            .addTextDisplayComponents(t =>
              t.setContent(
                `### 🎉 ¡Primer Rol Adquirido!\n` +
                `Ahora eres un **${profDef.emoji} ${profDef.name}**.\n\n` +
                (newRole ? `Disfruta de tus nuevos beneficios y/o penalizaciones.` : `Te has retirado de cualquier camino y eres un ciudadano común.`)
              )
            );
          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } else {
          // User already has a profession, ask for confirmation
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`economia_roles_confirm_${subAction}`).setLabel("Confirmar (Cuesta 1M)").setStyle(ButtonStyle.Success).setEmoji("✅"),
            new ButtonBuilder().setCustomId("economia_roles_cancel").setLabel("Cancelar").setStyle(ButtonStyle.Danger).setEmoji("❌")
          );

          return interaction.editReply({
            content: `### ⚠️ Confirmar Cambio de Rol\n¿Estás seguro de que deseas cambiar tu rol a **${profDef.emoji} ${profDef.name}**?\n\n*Esta acción deducirá **${COIN}1,000,000** de tu cartera.*`,
            components: [row]
          });
        }
      }
    }

    return false;
  }
};
