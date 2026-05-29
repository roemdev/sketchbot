const { 
  SlashCommandBuilder, 
  MessageFlags, 
  ContainerBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder 
} = require("discord.js");
const userService = require("../../services/userService");
const cooldownService = require("../../services/cooldownService");
const { logTransaction } = require("../../services/transactionService");
const config = require("../../utils/config");
const supabase = require("../../services/dbService");

const COIN = config.emojis.coin || "🪙";

const defaultCrimesConfig = {
  cooldown: 900, // Bajado a la mitad (15 minutos)
  robar: { chance: 0.70, percentStolen: 0.05, fineMin: 500, finePercent: 0.05 },
  hackear: { chance: 0.45, rewardMin: 3000, rewardMax: 6000, fineMin: 1000, finePercent: 0.05 },
  fraude: { chance: 0.30, rewardPercentMin: 0.10, rewardPercentMax: 0.20, rewardMin: 2000, fineMin: 2000, finePercent: 0.10 }
};

const crimesConfig = {
  ...defaultCrimesConfig,
  ...(config.crimes || {}),
  robar: { ...defaultCrimesConfig.robar, ...(config.crimes?.robar || {}) },
  hackear: { ...defaultCrimesConfig.hackear, ...(config.crimes?.hackear || {}) },
  fraude: { ...defaultCrimesConfig.fraude, ...(config.crimes?.fraude || {}) }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crimen")
    .setDescription("Elige una actividad delictiva interactiva en el panel para conseguir o perder monedas"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // 1. Verificar cooldown global de crímenes (30 minutos)
    const cd = await cooldownService.checkCooldown(userId, "crimen");
    if (cd) {
      const expirationTimestamp = Math.round((Date.now() + cd * 1000) / 1000);
      return interaction.reply({
        content: `🚨 **Nivel de Sospecha Alto:** Las autoridades te están vigilando de cerca. Espera a que se enfríe la situación.\n\n✨ *Podrás volver a cometer un crimen <t:${expirationTimestamp}:R>.*`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Asegurar perfil del usuario
    await userService.createUser(userId, username);

    // 2. Obtener balances necesarios de antemano
    const bankBalance = await userService.getBalance("server_bank");

    // 3. Construir panel de selección interactivo
    const menuContainer = new ContainerBuilder()
      .setAccentColor(0x2F3136) // NotQuiteBlack
      .addTextDisplayComponents(t =>
        t.setContent(
          `### 🕵️‍♂️ Planificación del Crimen\n` +
          `Selecciona tu próximo golpe presionando un botón. Cada actividad delictiva tiene su propio nivel de riesgo y ganancia potencial:\n\n` +
          `1. **🥷 Robar a Jugador**: Hurta el **${(crimesConfig.robar.percentStolen * 100).toFixed(0)}%** de la cartera de un jugador al azar.\n` +
          `   * Probabilidad de éxito: **${(crimesConfig.robar.chance * 100).toFixed(0)}%** | Multa en caso de fallo.\n\n` +
          `2. **🖥️ Hackear Casino**: Intenta vulnerar las redes del Casino para transferirte fondos de sus reservas.\n` +
          `   * Probabilidad de éxito: **${(crimesConfig.hackear.chance * 100).toFixed(0)}%** | Botín: **${COIN}${crimesConfig.hackear.rewardMin.toLocaleString()}-${crimesConfig.hackear.rewardMax.toLocaleString()}**.\n\n` +
          `3. **🏛️ Fraude al Banco**: Intenta malversar fondos del **Banco del Servidor** (Fondo actual: ${COIN}**${bankBalance.toLocaleString()}**).\n` +
          `   * Probabilidad de éxito: **${(crimesConfig.fraude.chance * 100).toFixed(0)}%** | Botín: **10%-20%** del banco | Multa severa en caso de fallo.`
        )
      )
      .addSeparatorComponents(s => s);

    const menuRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("crimen_menu_robar")
        .setLabel("Robar Jugador")
        .setEmoji("🥷")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("crimen_menu_hackear")
        .setLabel("Hackear Casino")
        .setEmoji("🖥️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("crimen_menu_fraude")
        .setLabel("Fraude al Banco")
        .setEmoji("🏛️")
        .setStyle(ButtonStyle.Danger)
    );

    const reply = await interaction.reply({
      components: [menuContainer, menuRow],
      flags: MessageFlags.IsComponentsV2
    });

    // 4. Recolector para la selección de crimen
    const menuCollector = reply.createMessageComponentCollector({
      filter: i => i.user.id === userId && i.customId.startsWith("crimen_menu_"),
      time: 30000
    });

    let selected = false;

    menuCollector.on("collect", async menuInteraction => {
      selected = true;
      menuCollector.stop();

      const choice = menuInteraction.customId.replace("crimen_menu_", "");
      const avatarUrl = interaction.user.displayAvatarURL({ extension: "png", size: 128 });

      // Establecer cooldown global de crímenes (1800 segundos)
      await cooldownService.setCooldown(userId, "crimen", crimesConfig.cooldown || 1800);

      // ==========================================
      // CRIME: ROBAR (Robar a jugador)
      // ==========================================
      if (choice === "robar") {
        const { data: users, error } = await supabase
          .from("user_stats")
          .select("discord_id, username, balance")
          .not("discord_id", "ilike", "%_bank")
          .neq("discord_id", userId);

        if (error || !users || users.length === 0) {
          return menuInteraction.update({ content: `🕵️‍♂️ **Sin Víctimas:** No hay otros jugadores registrados en el servidor a los que puedas robar. ¡Espera a que alguien más se una!`, components: [] });
        }

        const target = users[Math.floor(Math.random() * users.length)];
        const success = Math.random() < crimesConfig.robar.chance;

        if (success) {
          const stolen = Math.floor(target.balance * crimesConfig.robar.percentStolen);

          if (stolen <= 0) {
            const container = new ContainerBuilder()
              .setAccentColor(0xCA9F1B) // Amarillo tenue (Alerta)
              .addTextDisplayComponents(t =>
                t.setContent(`### 🕵️‍♂️ Bolsillos Vacíos\nAcechaste en las sombras a <@${target.discord_id}>, pero sus bolsillos están vacíos. ¡Te vas con las manos vacías! 💨`)
              );
            return menuInteraction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
          }

          await userService.addBalance(target.discord_id, -stolen, false);
          await userService.addBalance(userId, stolen, false);
          await logTransaction({ discordId: userId, type: "robar_success", amount: stolen, itemName: `Robo a <@${target.discord_id}>` });

          const container = new ContainerBuilder()
            .setAccentColor(0x2ECC71)
            .addTextDisplayComponents(t => t.setContent(`### 🥷 ¡Hurto Exitoso en las Sombras!`))
            .addSeparatorComponents(s => s)
            .addSectionComponents(section =>
              section
                .addTextDisplayComponents(t =>
                  t.setContent(
                    `Lograste sustraer sigilosamente la billetera de <@${target.discord_id}> sin llamar la atención.\n\n` +
                    `💵 **Dinero obtenido:** +${COIN}**${stolen.toLocaleString("es-DO")}** monedas`
                  )
                )
                .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
            );

          return menuInteraction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } else {
          // Fallo: Pagar multa que se añade al banco del servidor
          const robberStats = await userService.getUser(userId);
          const robberBalance = robberStats ? robberStats.balance : 0;

          const fine = Math.max(crimesConfig.robar.fineMin, Math.round(robberBalance * crimesConfig.robar.finePercent));
          const newBalance = robberBalance - fine;

          // Descontar balance (permite saldo negativo)
          await supabase.from("user_stats").update({ balance: newBalance }).eq("discord_id", userId);
          // Depositar multa en el banco del servidor
          await userService.addBalance("server_bank", fine, false);

          await logTransaction({ discordId: userId, type: "robar_failed", amount: -fine, itemName: "Arresto por robar a jugador (Multa al Banco)" });
          await logTransaction({ discordId: "server_bank", type: "bank_fine", amount: fine, itemName: `Multa cobrada de <@${userId}> por robo fallido` });

          const container = new ContainerBuilder()
            .setAccentColor(0xAE3D3D) // Rojo fallo tenue
            .addTextDisplayComponents(t => t.setContent(`### 🚨 ¡Atrapado in fraganti!`))
            .addSeparatorComponents(s => s)
            .addSectionComponents(section =>
              section
                .addTextDisplayComponents(t =>
                  t.setContent(
                    `Intentaste meter la mano en el bolsillo de <@${target.discord_id}>, pero gritó y la policía te acorraló.\n\n` +
                    `💸 **Sanción del Estado:** Multa del **${(crimesConfig.robar.finePercent * 100).toFixed(0)}%** de tu cartera: -${COIN}**${fine.toLocaleString("es-DO")}**.\n` +
                    `🏛️ *La multa ha sido depositada en los fondos del Banco del Servidor.*`
                  )
                )
                .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
            );

          return menuInteraction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
      }

      // ==========================================
      // CRIME: HACKEAR (Hackear al bot)
      // ==========================================
      if (choice === "hackear") {
        const casinoBalance = await userService.getBalance("server_casino");
        if (casinoBalance <= 0) {
          return menuInteraction.update({ content: `🎰 **Casino en Quiebra:** El Casino del Servidor no tiene fondos actualmente. ¡Espera a que los jugadores pierdan apuestas para realizar un hackeo!`, components: [] });
        }

        const success = Math.random() < crimesConfig.hackear.chance;

        if (success) {
          const reward = Math.floor(Math.random() * (crimesConfig.hackear.rewardMax - crimesConfig.hackear.rewardMin + 1)) + crimesConfig.hackear.rewardMin;
          const finalReward = Math.min(casinoBalance, reward);

          await userService.addBalance("server_casino", -finalReward, false);
          await userService.addBalance(userId, finalReward, false);
          
          await logTransaction({ discordId: userId, type: "hack_success", amount: finalReward, itemName: "Hackeo exitoso a la red del Casino" });
          await logTransaction({ discordId: "server_casino", type: "bank_robbed", amount: -finalReward, itemName: `<@${userId}> hackeó el casino` });

          const container = new ContainerBuilder()
            .setAccentColor(0x27AE60) // Verde éxito tenue
            .addTextDisplayComponents(t => t.setContent(`### 🖥️ ¡Sistemas Infiltrados! Access Granted`))
            .addSeparatorComponents(s => s)
            .addSectionComponents(section =>
              section
                .addTextDisplayComponents(t =>
                  t.setContent(
                    `Ejecutaste un exploit de día cero contra los servidores del Casino y desviaste fondos de la bóveda.\n\n` +
                    `💵 **Fondos sustraídos:** +${COIN}**${finalReward.toLocaleString("es-DO")}** monedas`
                  )
                )
                .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
            );

          return menuInteraction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } else {
          // Fallo: Pagar multa que se añade al banco del servidor
          const hackerStats = await userService.getUser(userId);
          const hackerBalance = hackerStats ? hackerStats.balance : 0;

          const fine = Math.max(crimesConfig.hackear.fineMin, Math.round(hackerBalance * crimesConfig.hackear.finePercent));
          const newBalance = hackerBalance - fine;

          await supabase.from("user_stats").update({ balance: newBalance }).eq("discord_id", userId);
          await userService.addBalance("server_bank", fine, false);

          await logTransaction({ discordId: userId, type: "hack_failed", amount: -fine, itemName: "Hackeo fallido al Casino (Multa al Banco)" });
          await logTransaction({ discordId: "server_bank", type: "bank_fine", amount: fine, itemName: `Multa cobrada de <@${userId}> por hackeo fallido de casino` });

          const container = new ContainerBuilder()
            .setAccentColor(0xAE3D3D) // Rojo fallo tenue
            .addTextDisplayComponents(t => t.setContent(`### 🚨 ¡Intrusión Detectada por el Firewall!`))
            .addSeparatorComponents(s => s)
            .addSectionComponents(section =>
              section
                .addTextDisplayComponents(t =>
                  t.setContent(
                    `El cortafuegos del Casino detectó tus paquetes maliciosos, rastreó tu proxy y bloqueó tu terminal.\n\n` +
                    `💸 **Multa de Seguridad:** -${COIN}**${fine.toLocaleString("es-DO")}** monedas.\n` +
                    `🏛️ *El Banco del Servidor ha confiscado tus fondos y se los transfirió al Fisco.*`
                  )
                )
                .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
            );

          return menuInteraction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
      }

      // ==========================================
      // CRIME: FRAUDE (Robar al banco del servidor)
      // ==========================================
      if (choice === "fraude") {
        if (bankBalance <= 0) {
          return menuInteraction.update({ content: `🏛️ **Banco en Quiebra:** El Banco del Servidor no tiene fondos actualmente. ¡Espera a que recaude más impuestos o multas para realizar un fraude!`, components: [] });
        }

        const success = Math.random() < crimesConfig.fraude.chance;

        if (success) {
          // Roba un porcentaje del banco (entre min y max)
          const randomPercent = Math.random() * (crimesConfig.fraude.rewardPercentMax - crimesConfig.fraude.rewardPercentMin) + crimesConfig.fraude.rewardPercentMin;
          let stolenFromBank = Math.floor(bankBalance * randomPercent);
          
          if (stolenFromBank < crimesConfig.fraude.rewardMin) {
            stolenFromBank = Math.min(bankBalance, crimesConfig.fraude.rewardMin);
          }

          // Realizar transacción
          await userService.addBalance("server_bank", -stolenFromBank, false);
          await userService.addBalance(userId, stolenFromBank, false);
          await logTransaction({ discordId: userId, type: "fraude_success", amount: stolenFromBank, itemName: "Fraude exitoso al Banco del Servidor" });
          await logTransaction({ discordId: "server_bank", type: "bank_robbed", amount: -stolenFromBank, itemName: `<@${userId}> malversó fondos del banco` });

          const container = new ContainerBuilder()
            .setAccentColor(0x27AE60) // Verde éxito tenue
            .addTextDisplayComponents(t => t.setContent(`### 🏦 ¡Gran Estafa al Banco completada!`))
            .addSeparatorComponents(s => s)
            .addSectionComponents(section =>
              section
                .addTextDisplayComponents(t =>
                  t.setContent(
                    `Falsificaste firmas fiscales y creaste cuentas fantasma para desviar capital del Banco del Servidor.\n\n` +
                    `💰 **Fórmula de Desvío:** ${(randomPercent * 100).toFixed(1)}% de las reservas reales.\n` +
                    `💵 **Dinero malversado:** +${COIN}**${stolenFromBank.toLocaleString("es-DO")}** monedas`
                  )
                )
                .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
            );

          return menuInteraction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } else {
          // Fallo: Pagar multa muy severa
          const userStats = await userService.getUser(userId);
          const balance = userStats ? userStats.balance : 0;

          const fine = Math.max(crimesConfig.fraude.fineMin, Math.round(balance * crimesConfig.fraude.finePercent));
          const newBalance = balance - fine;

          await supabase.from("user_stats").update({ balance: newBalance }).eq("discord_id", userId);
          await userService.addBalance("server_bank", fine, false);

          await logTransaction({ discordId: userId, type: "fraude_failed", amount: -fine, itemName: "Fraude fallido al Banco (Multa al Banco)" });
          await logTransaction({ discordId: "server_bank", type: "bank_fine", amount: fine, itemName: `Multa cobrada de <@${userId}> por fraude bancario fallido` });

          const container = new ContainerBuilder()
            .setAccentColor(0xAE3D3D) // Rojo fallo tenue
            .addTextDisplayComponents(t => t.setContent(`### 🏛️ ¡Fraude Detectado por el Fisco!`))
            .addSeparatorComponents(s => s)
            .addSectionComponents(section =>
              section
                .addTextDisplayComponents(t =>
                  t.setContent(
                    `El departamento de auditorías del banco descubrió tu esquema de lavado de dinero. ¡Congelaron tu cuenta y te impusieron cargos graves!\n\n` +
                    `💸 **Multa Fiscal (${(crimesConfig.fraude.finePercent * 100).toFixed(0)}%):** -${COIN}**${fine.toLocaleString("es-DO")}** monedas.\n` +
                    `🏛️ *El capital incautado ha sido reinyectado íntegramente en las arcas del Banco.*`
                  )
                )
                .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
            );

          return menuInteraction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
      }
    });

    menuCollector.on("end", async (collected, reason) => {
      if (!selected && reason === "time") {
        const timeoutContainer = new ContainerBuilder()
          .setAccentColor(0x2F3136) // NotQuiteBlack
          .addTextDisplayComponents(t => t.setContent("### ⏱️ Golpe Cancelado\nNo seleccionaste ninguna actividad a tiempo. El plan ha sido archivado."));

        await interaction.editReply({
          components: [timeoutContainer],
          flags: MessageFlags.IsComponentsV2
        }).catch(console.error);
      }
    });
  }
};
