const {
  SlashCommandBuilder,
  ContainerBuilder,
  MessageFlags,
} = require("discord.js");

const userService = require("../../services/userService");
const cooldownService = require("../../services/cooldownService");
const { logTransaction } = require("../../services/transactionService");
const { logGameOutcome } = require("../../utils/discordLogger");
const config = require("../../utils/config");
const supabase = require("../../services/dbService");

const COIN = config.emojis.coin;
const robarConfig = config.crimes.robar;
const crimesCooldown = config.crimes.cooldown;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("robar")
    .setDescription("Intenta robarle monedas a otro usuario del servidor")
    .addUserOption(o =>
      o.setName("victima")
        .setDescription("El usuario al que quieres robarle")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const target = interaction.options.getUser("victima");
    const targetId = target.id;

    // Validaciones rápidas antes de diferir
    if (targetId === userId) {
      return interaction.reply({
        content: "❌ No puedes robarte a ti mismo.",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (target.bot) {
      return interaction.reply({
        content: "❌ No puedes robarle a un bot.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Verificar cooldown
    const cd = await cooldownService.checkCooldown(userId, "crimen");
    if (cd) {
      const expirationTimestamp = Math.round((Date.now() + cd * 1000) / 1000);
      return interaction.editReply({
        content: `🚨 **Nivel de Sospecha Alto:** Las autoridades te están vigilando de cerca. Espera a que se enfríe la situación.\n\n✨ *Podrás volver a cometer un crimen <t:${expirationTimestamp}:R>.*`,
      });
    }

    const user = await userService.createUser(userId, interaction.user.username);

    // Verificar que la víctima existe en el sistema
    const targetUser = await userService.getUser(targetId);
    if (!targetUser) {
      return interaction.editReply({
        content: `❌ **Víctima no encontrada:** <@${targetId}> no tiene cuenta en el sistema económico todavía.`,
      });
    }

    // Verificar que la víctima tiene algo que robar
    const targetWallet = targetUser.balance;
    const targetBankBal = await userService.getBankBalance(targetId);
    const targetTotalBalance = targetWallet + targetBankBal;

    if (targetWallet <= 0) {
      return interaction.editReply({
        content: `❌ **Víctima sin fondos:** <@${targetId}> no tiene monedas en su cartera. ¡No hay nada que robar!`,
      });
    }

    let cooldown = crimesCooldown;
    let chanceMod = 0;
    let stealMod = 1.0;
    let fineMod = 1.0;

    if (user && user.profession === "criminal") {
      cooldown = Math.floor(cooldown / 2);
      chanceMod = 0.15;
      stealMod = 0.90;
      fineMod = 1.05;
    }

    // Establecer cooldown antes de ejecutar (aunque falle)
    await cooldownService.setCooldown(userId, "crimen", cooldown);

    const avatarUrl = interaction.user.displayAvatarURL({ extension: "png", size: 128 });
    const successChance = robarConfig.chance + chanceMod;
    const success = Math.random() < successChance;

    if (success) {
      // Robo exitoso: se roba % del balance total de la víctima, se descuenta de su cartera
      const stolen = Math.max(1, Math.floor(targetTotalBalance * robarConfig.percentStolen * stealMod));
      // Si la víctima no tiene suficiente en cartera, se lleva todo lo que tiene
      const actualStolen = Math.min(stolen, targetWallet);

      if (user && user.profession === "criminal") {
        await userService.addProfessionXp(userId, 30);
      }

      await supabase.from("user_stats").update({ balance: targetWallet - actualStolen }).eq("discord_id", targetId);
      await userService.addBalance(userId, actualStolen, false);

      await logTransaction({ discordId: userId, type: "robo_success", amount: actualStolen, itemName: `Robo exitoso a <@${targetId}>` });
      await logTransaction({ discordId: targetId, type: "robo_victim", amount: -actualStolen, itemName: `Robado por <@${userId}>` });
      await logGameOutcome(interaction, "Crimen (Robo)", 0, actualStolen, true).catch(console.error);

      const container = new ContainerBuilder()
        .setAccentColor(2067276) // DarkGreen éxito
        .addTextDisplayComponents(t => t.setContent(`### 🎭 ¡Carterismo Exitoso!`))
        .addSeparatorComponents(s => s)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(t =>
              t.setContent(
                `Te mezclaste entre la multitud y vaciaste los bolsillos de <@${targetId}> sin que se diera cuenta.\n\n` +
                `💰 **Fórmula de Robo:** ${(robarConfig.percentStolen * 100).toFixed(0)}% de su balance total.\n` +
                `💵 **Monedas robadas:** +${COIN}**${actualStolen.toLocaleString("es-DO")}** monedas`
              )
            )
            .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } else {
      // Robo fallido: multa basada en balance total del ladrón, cartera puede ir negativa
      const thiefWallet = user ? user.balance : 0;
      const thiefBankBal = await userService.getBankBalance(userId);
      const thiefTotal = thiefWallet + thiefBankBal;

      const finePercent = robarConfig.finePercent * fineMod;
      const fine = Math.max(robarConfig.fineMin, Math.round(thiefTotal * finePercent));
      const newThiefWallet = thiefWallet - fine; // Puede ser negativo (deuda)

      await supabase.from("user_stats").update({ balance: newThiefWallet }).eq("discord_id", userId);
      await userService.addBalance("server_bank", fine, false);

      await logTransaction({ discordId: userId, type: "robo_failed", amount: -fine, itemName: `Robo fallido a <@${targetId}> (Multa al Banco)` });
      await logTransaction({ discordId: "server_bank", type: "bank_fine", amount: fine, itemName: `Multa cobrada de <@${userId}> por intento de robo fallido` });
      await logGameOutcome(interaction, "Crimen (Robo)", fine, 0, false).catch(console.error);

      const debtLine = newThiefWallet < 0
        ? `\n⚠️ **Deuda activa:** Tu cartera quedó en ${COIN}**${newThiefWallet.toLocaleString("es-DO")}**. La deuda se cubrirá automáticamente con tus próximas ganancias.`
        : "";

      const container = new ContainerBuilder()
        .setAccentColor(10038562) // DarkRed fallo
        .addTextDisplayComponents(t => t.setContent(`### 🚔 ¡Atrapado en Flagrancia!`))
        .addSeparatorComponents(s => s)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(t =>
              t.setContent(
                `<@${targetId}> se dio cuenta de tu intento y llamó a las autoridades. Fuiste detenido en el acto.\n\n` +
                `💸 **Multa (${(robarConfig.finePercent * 100).toFixed(0)}% de tu balance total):** -${COIN}**${fine.toLocaleString("es-DO")}** monedas.` +
                debtLine + `\n` +
                `🏛️ *La multa fue confiscada y depositada en el Banco Central.*`
              )
            )
            .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
