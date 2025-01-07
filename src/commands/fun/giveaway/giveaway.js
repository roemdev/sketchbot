const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} = require("discord.js");
const ms = require("ms");
const fs = require("fs");
const path = require("path");

// Rutas y configuraciones
const GIVEAWAY_FILE = path.join(__dirname, "giveaway.json");
const DOUBLE_ENTRY_ROLES = ["1241182617504579594", "1303816942326648884"];
const ERROR_COLOR = "#F87171";
const SUCCESS_COLOR = "#79E096";
const WARNING_COLOR = "#FFC868";
const DEFAULT_COLOR = "NotQuiteBlack";

// Utilidad: Leer o inicializar el archivo JSON
function readGiveawayFile() {
  try {
    if (fs.existsSync(GIVEAWAY_FILE)) {
      return JSON.parse(fs.readFileSync(GIVEAWAY_FILE, "utf-8"));
    }
    return { active: false, entries: [] };
  } catch (err) {
    console.error("Error al leer el archivo JSON:", err);
    return { active: false, entries: [] };
  }
}

// Utilidad: Guardar datos en el archivo JSON
function saveGiveawayFile(data) {
  try {
    let existingData = {};
    if (fs.existsSync(GIVEAWAY_FILE)) {
      existingData = JSON.parse(fs.readFileSync(GIVEAWAY_FILE, "utf-8"));
    }
    const updatedData = { ...existingData, ...data }; // Combina los datos existentes con los nuevos
    fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify(updatedData, null, 2));
  } catch (err) {
    console.error("Error al guardar el archivo JSON:", err);
  }
}

// Crear el embed de un sorteo
function createGiveawayEmbed(
  prize,
  organizer,
  entriesCount,
  winners,
  endTimestamp
) {
  return new EmbedBuilder()
    .setColor(DEFAULT_COLOR)
    .setTitle(prize)
    .setDescription(
      `Finaliza: <t:${endTimestamp}:R> | (<t:${endTimestamp}:D>)\nOrganizador: <@${organizer}>\nEntradas: **${entriesCount}**\nGanadores: **${winners}**`
    )
    .setFooter({
      text: new Date(endTimestamp * 1000).toLocaleDateString("es-ES"),
    });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Inicia un nuevo sorteo")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Duración del sorteo")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("winners")
        .setDescription("Cantidad de ganadores")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("prize").setDescription("Premio").setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("required_role")
        .setDescription("Rol necesario para participar (opcional)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const { user, channel, options } = interaction;
    const duration = options.getString("duration");
    const prize = options.getString("prize");
    const winnersQty = options.getInteger("winners");
    const requiredRole = options.getRole("required_role");

    const durationMs = ms(duration);
    if (!durationMs) {
      const embed = new EmbedBuilder()
        .setColor(ERROR_COLOR)
        .setDescription(
          "<:deny:1313237501359558809> Duración inválida. Usa formatos como `1m`, `1h`, `1d`."
        );
      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const endTimestamp = Math.floor((Date.now() + durationMs) / 1000);

    // Verificar si hay un sorteo activo
    const giveawayData = readGiveawayFile();
    if (giveawayData.active) {
      const embed = new EmbedBuilder()
        .setColor(WARNING_COLOR)
        .setDescription(
          "<:advise:1313237521634689107> Ya hay un sorteo activo. Espera a que termine para iniciar otro."
        );
      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Botones
    const enterBtn = new ButtonBuilder()
      .setCustomId("enter")
      .setLabel(" ")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🎉");

    const requirementsBtn = new ButtonBuilder()
      .setCustomId("requirements")
      .setLabel("Condiciones")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(enterBtn, requirementsBtn);

    // Crear y enviar el embed inicial
    const embed = createGiveawayEmbed(
      prize,
      user.id,
      0,
      winnersQty,
      endTimestamp
    );
    const message = await channel.send({ embeds: [embed], components: [row] });

    const replyEmbed = new EmbedBuilder()
      .setColor(SUCCESS_COLOR)
      .setDescription(
        "<:check:1313237490395648021> Sorteo creado exitosamente."
      );
    interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });

    // Actualizar datos del sorteo sin eliminar otros datos
    const updatedGiveawayData = {
      ...giveawayData,
      active: true,
      prize,
      organizer: user.id,
      endTimestamp,
      entries: giveawayData.entries || [], // Mantén las entradas existentes si las hay
    };
    saveGiveawayFile(updatedGiveawayData);

    const filter = (i) => ["enter", "requirements"].includes(i.customId);
    const collector = channel.createMessageComponentCollector({
      filter,
      time: durationMs,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "enter") {
        const userId = i.user.id;

        if (requiredRole && !i.member.roles.cache.has(requiredRole.id)) {
          const embed = new EmbedBuilder()
            .setColor(WARNING_COLOR)
            .setDescription(
              "<:advise:1313237521634689107> No cumples con los **requisitos** para participar en el sorteo."
            );
          return i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (giveawayData.entries.includes(userId)) {
          const embed = new EmbedBuilder()
            .setColor(WARNING_COLOR)
            .setDescription(
              "<:advise:1313237521634689107> Ya estás **inscrit**o en el sorteo."
            );
          return i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const hasDoubleEntryRole = DOUBLE_ENTRY_ROLES.some((roleId) =>
          i.member.roles.cache.has(roleId)
        );

        giveawayData.entries.push(userId);
        if (hasDoubleEntryRole) {
          giveawayData.entries.push(userId);
        }

        saveGiveawayFile(giveawayData);

        const updatedEmbed = createGiveawayEmbed(
          prize,
          user.id,
          giveawayData.entries.length,
          winnersQty,
          endTimestamp
        );
        await message.edit({ embeds: [updatedEmbed], components: [row] });

        const embed = new EmbedBuilder()
          .setColor(SUCCESS_COLOR)
          .setDescription(
            "<:check:1313237490395648021> ¡Te has **inscrito** en el sorteo! ¡Buena suerte!"
          );
        i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      if (i.customId === "requirements") {
        const embed = new EmbedBuilder()
          .setColor("#2b2d31")
          .setTitle("Condiciones del sorteo")
          .setDescription(
            `Requisitos:\n` +
              `* Debes comprar una entrada en <#1247632279027843152>\n` +
              `* Roles con doble entrada: ${DOUBLE_ENTRY_ROLES.map(
                (role) => `<@&${role}>`
              ).join(", ")}.\n` +
              "* Tendrás **24 horas** para contactar al organizador y reclamar tu premio."
          );
        i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
    });

    collector.on("end", async () => {
      giveawayData.active = false;
      saveGiveawayFile(giveawayData);

      if (giveawayData.entries.length === 0) {
        return channel.send("No hubo participantes en el sorteo.");
      }

      let participants = [...giveawayData.entries];
      const winners = [];

      while (winners.length < winnersQty && participants.length > 0) {
        const randomIndex = Math.floor(Math.random() * participants.length);
        const winner = participants[randomIndex];

        if (!winners.includes(winner)) {
          winners.push(winner);
        }

        participants.splice(randomIndex, 1);
        participants = participants.filter((entry) => entry !== winner);
      }

      const winnersMentions = winners.map((id) => `<@${id}>`).join(", ");

      const finalEmbed = new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setTitle(prize)
        .setDescription(
          `Finalizó: <t:${endTimestamp}:R> | (<t:${endTimestamp}:D>)\n` +
            `Organizador: <@${user.id}>\n` +
            `Entradas: **${giveawayData.entries.length}**\n` +
            `Ganadores: **${winnersMentions}**`
        )
        .setFooter({
          text: new Date(endTimestamp * 1000).toLocaleDateString("es-ES"),
        });

      await message.edit({ embeds: [finalEmbed], components: [] });

      const winnerMsg =
        winnersQty === 1
          ? `🎉 ¡Felicidades ${winnersMentions}! Has ganado el sorteo.`
          : `🎉 ¡Felicidades ${winnersMentions}! Han ganado el sorteo.`;

      await channel.send(winnerMsg);
    });
  },
};
