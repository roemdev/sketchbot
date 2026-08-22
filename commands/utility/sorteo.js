const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  MessageFlags, 
  ContainerBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require("discord.js");
const giveawayService = require("../../services/giveawayService");
const userService = require("../../services/userService");

function parseDuration(str) {
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  
  if (unit === 's') return val * 1000;
  if (unit === 'm') return val * 60 * 1000;
  if (unit === 'h') return val * 60 * 60 * 1000;
  if (unit === 'd') return val * 24 * 60 * 60 * 1000;
  return null;
}

function buildActivePanel(messageId, prize, hostedBy, endsAt, winnerCount, entryFee, minLevel, participantCount = 0) {
  const endsAtUnix = Math.floor(endsAt.getTime() / 1000);
  const endsTimestamp = `<t:${endsAtUnix}:R> (<t:${endsAtUnix}:f>)`;

  let requirementsText = "";
  if (entryFee > 0) {
    requirementsText += `\n🪙 **Costo de entrada:** **${entryFee.toLocaleString("es-DO")}** monedas`;
  }
  if (minLevel > 0) {
    requirementsText += `\n🔰 **Nivel requerido:** **${minLevel}**+`;
  }

  const container = new ContainerBuilder()
    .setAccentColor(7419530) // DarkPurple (Juegos activos)
    .addTextDisplayComponents(t =>
      t.setContent(`## **${prize}**`)
    )
    .addSeparatorComponents(s => s)
    .addTextDisplayComponents(t =>
      t.setContent(
        `⏳ **Finaliza:** ${endsTimestamp}\n` +
        `👤 **Organizado por:** <@${hostedBy}>\n` +
        `🟢 **Participantes:** **${participantCount}**\n` +
        `🏆 **Ganadores:** **${winnerCount}**` +
        requirementsText
      )
    )
    .addSeparatorComponents(s => s);

  container.addActionRowComponents(row => {
    const btn = new ButtonBuilder()
      .setCustomId(`sorteo_join_${messageId}`)
      .setEmoji("🎉")
      .setLabel("Participar")
      .setStyle(ButtonStyle.Primary);
    return row.setComponents(btn);
  });

  return container;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sorteo")
    .setDescription("Gestiona los sorteos del servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName("crear")
        .setDescription("Crea un nuevo sorteo")
        .addStringOption(o => o.setName("premio").setDescription("El premio a sortear (Ej: 1 sobre de cartas, 500k monedas, Rol VIP)").setRequired(true))
        .addStringOption(o => o.setName("duracion").setDescription("Duración del sorteo (Ej: 30s, 5m, 2h, 1d)").setRequired(true))
        .addIntegerOption(o => o.setName("ganadores").setDescription("Número de ganadores (por defecto 1)").setRequired(false).setMinValue(1))
        .addIntegerOption(o => o.setName("costo").setDescription("Costo de entrada en monedas (por defecto 0)").setRequired(false).setMinValue(0))
        .addIntegerOption(o => o.setName("nivel").setDescription("Nivel mínimo de usuario requerido (por defecto 0)").setRequired(false).setMinValue(0))
    )
    .addSubcommand(sub =>
      sub.setName("terminar")
        .setDescription("Fuerza la finalización inmediata de un sorteo activo")
        .addStringOption(o => o.setName("id").setDescription("El ID de mensaje del sorteo").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("resorteo")
        .setDescription("Elige nuevos ganadores de un sorteo finalizado")
        .addStringOption(o => o.setName("id").setDescription("El ID de mensaje del sorteo").setRequired(true))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === "crear") {
      const prize = interaction.options.getString("premio");
      const durationStr = interaction.options.getString("duracion");
      const winnerCount = interaction.options.getInteger("ganadores") ?? 1;
      const entryFee = interaction.options.getInteger("costo") ?? 0;
      const minLevel = interaction.options.getInteger("nivel") ?? 0;

      const durationMs = parseDuration(durationStr);
      if (!durationMs) {
        return interaction.reply({
          content: "❌ **Error:** Duración inválida. Usa formatos como `30s`, `5m`, `2h`, `1d`.",
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const endsAt = new Date(Date.now() + durationMs);
        
        // 1. Send temporary message to get message ID
        const tempContainer = new ContainerBuilder()
          .setAccentColor(7419530)
          .addTextDisplayComponents(t => t.setContent("⏳ Preparando sorteo..."));

        const sent = await interaction.channel.send({
          components: [tempContainer],
          flags: MessageFlags.IsComponentsV2
        });

        // 2. Save in database
        const dbData = await giveawayService.createGiveaway({
          messageId: sent.id,
          channelId: interaction.channelId,
          guildId: interaction.guildId,
          prize,
          winnerCount,
          endsAt: endsAt.toISOString(),
          hostedBy: interaction.user.id,
          entryFee,
          minLevel
        });

        // 3. Edit message to display the active panel with correct button customId
        const activeContainer = buildActivePanel(sent.id, prize, interaction.user.id, endsAt, winnerCount, entryFee, minLevel, 0);
        await sent.edit({ components: [activeContainer], flags: MessageFlags.IsComponentsV2 });

        // 4. Set setTimeout to automatically resolve the giveaway
        const timer = setTimeout(() => {
          giveawayService.resolveGiveaway(interaction.client, sent.id).catch(console.error);
        }, durationMs);
        giveawayService.activeTimeouts.set(sent.id, timer);

        return interaction.editReply({
          content: `✅ ¡Sorteo creado exitosamente! [Ver Mensaje](https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${sent.id})`
        });
      } catch (err) {
        console.error("[SORTEOS] Error al crear sorteo:", err);
        return interaction.editReply({
          content: `❌ **Error:** ${err.message}`
        });
      }
    }

    if (subcommand === "terminar") {
      const messageId = interaction.options.getString("id");
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const giveaway = await giveawayService.getGiveaway(messageId);
        if (!giveaway) {
          return interaction.editReply({ content: "❌ **Error:** Sorteo no encontrado." });
        }
        if (giveaway.status !== "active") {
          return interaction.editReply({ content: "❌ **Error:** Ese sorteo ya ha finalizado." });
        }

        // Cancel timeout if any
        if (giveawayService.activeTimeouts.has(messageId)) {
          clearTimeout(giveawayService.activeTimeouts.get(messageId));
          giveawayService.activeTimeouts.delete(messageId);
        }

        await giveawayService.resolveGiveaway(interaction.client, messageId);

        return interaction.editReply({ content: "✅ Sorteo finalizado y resuelto de inmediato." });
      } catch (err) {
        return interaction.editReply({ content: `❌ **Error:** ${err.message}` });
      }
    }

    if (subcommand === "resorteo") {
      const messageId = interaction.options.getString("id");
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const result = await giveawayService.rerollGiveaway(messageId);
        
        const channel = interaction.client.channels.cache.get(interaction.channelId) || 
                        await interaction.client.channels.fetch(interaction.channelId).catch(() => null);

        let msg = `🎉 **[RESORTEO]** ¡Nuevo ganador elegido para **${result.prize}**! Felicidades <@${result.winner}>.\n`;
        if (result.deliveryReport && result.deliveryReport.detail) {
          msg += `> <@${result.winner}>: ${result.deliveryReport.detail}`;
        }

        if (channel) {
          await channel.send(msg).catch(console.error);
        }

        return interaction.editReply({ content: "✅ Resorteo completado con éxito." });
      } catch (err) {
        return interaction.editReply({ content: `❌ **Error:** ${err.message}` });
      }
    }
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;

    if (interaction.customId.startsWith("sorteo_join_")) {
      const messageId = interaction.customId.split("sorteo_join_")[1];
      
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      } catch (err) {
        if (err.code === 10062) return true; // Ignorar interacciones duplicadas por doble clic
        throw err;
      }
      
      try {
        const result = await giveawayService.addParticipant(messageId, interaction.user.id, interaction.user.username);
        
        // Fetch current giveaway details to update panel
        const giveaway = await giveawayService.getGiveaway(messageId);
        const updatedContainer = buildActivePanel(
          messageId,
          giveaway.prize,
          giveaway.hosted_by,
          new Date(giveaway.ends_at),
          giveaway.winner_count,
          giveaway.entry_fee,
          giveaway.min_level,
          result.totalParticipants
        );

        // Edit parent message to update participant count
        await interaction.message.edit({ components: [updatedContainer], flags: MessageFlags.IsComponentsV2 }).catch(console.error);

        return interaction.editReply({
          content: `🎉 ¡Te has registrado con éxito en el sorteo! Costo de entrada: **${result.entryFee.toLocaleString("es-DO")}** monedas.`
        });
      } catch (err) {
        return interaction.editReply({
          content: `❌ **No pudiste unirte:** ${err.message}`
        });
      }
    }
  }
};
