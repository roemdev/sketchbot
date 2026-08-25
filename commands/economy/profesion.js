const { SlashCommandBuilder, MessageFlags, ContainerBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const config = require("../../utils/config");

const COIN = config.emojis.coin;
const CHANGE_FEE = 2000000;

const PROFESSIONS = {
  magnate: {
    name: "Magnate",
    emoji: "🕴️",
    desc: "Experto en finanzas. Bonificación en el trabajo y límite de banco extendido, pero paga un ligero impuesto al depositar.",
    benefits: [
      "💼 **+15%** monedas en `/trabajo` y `/diario`",
      "🏛️ Límite del banco aumentado a **10M** monedas",
      "📉 **2%** de impuesto fijo al depositar en el banco"
    ]
  },
  gambler: {
    name: "Ludópata",
    emoji: "🎰",
    desc: "Adictos al riesgo. Mejores probabilidades en el casino y recuperación de pérdidas.",
    benefits: [
      "🎲 Probabilidades ligeramente mejoradas en juegos de casino",
      "💸 **5% Cashback** automático al perder una apuesta",
      "📉 **-10%** monedas generadas en el `/trabajo`"
    ]
  },
  criminal: {
    name: "Criminal",
    emoji: "🥷",
    desc: "Maestros del robo. Ejecutan crímenes con mayor frecuencia y éxito, aunque a costa del botín.",
    benefits: [
      "🎯 **+15%** probabilidad de éxito en crímenes y robos",
      "⏳ Cooldown de crímenes reducido a la **mitad**",
      "📉 **-10%** del botín robado y **+5%** de multa si te atrapan"
    ]
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profesion")
    .setDescription("Elige o cambia tu profesión para obtener bonificaciones especiales."),

  async execute(interaction) {
    const userId = interaction.user.id;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = await userService.createUser(userId, interaction.user.username);
    const currentProfession = user.profession;

    let title = "### 📜 Oficina de Profesiones";
    let desc = "Elige una profesión para tu personaje. Cada camino te otorga ventajas exclusivas, pero también algunas desventajas para mantener el equilibrio.\n\n";

    if (currentProfession) {
      desc += `> 🏷️ **Profesión Actual:** **${PROFESSIONS[currentProfession].emoji} ${PROFESSIONS[currentProfession].name}**\n`;
      desc += `> ⚠️ *Cambiar de profesión tiene un costo de **${COIN}${CHANGE_FEE.toLocaleString()}** monedas.*\n\n`;
    } else {
      desc += `> 🆓 *Tu primera elección de profesión es completamente **gratuita**.*\n\n`;
    }

    for (const [key, prof] of Object.entries(PROFESSIONS)) {
      desc += `**${prof.emoji} ${prof.name}**\n*${prof.desc}*\n`;
      prof.benefits.forEach(b => desc += `> ${b}\n`);
      desc += `\n`;
    }

    const container = new ContainerBuilder()
      .setAccentColor(2303786)
      .addTextDisplayComponents(t => t.setContent(title + desc));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("profesion_select")
      .setPlaceholder("Selecciona una profesión...")
      .addOptions(
        Object.entries(PROFESSIONS).map(([key, prof]) => 
          new StringSelectMenuOptionBuilder()
            .setLabel(prof.name)
            .setValue(key)
            .setEmoji(prof.emoji)
            .setDescription(prof.desc.substring(0, 100))
        )
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.editReply({ components: [container, row], flags: MessageFlags.IsComponentsV2 });
  },

  async buttonHandler(interaction) {
    if (interaction.customId !== "profesion_select") return false;

    const userId = interaction.user.id;
    const choice = interaction.values[0];
    const profDef = PROFESSIONS[choice];

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = await userService.getUser(userId);
    if (!user) {
        return interaction.editReply({ content: "Error al cargar tu perfil." });
    }

    if (user.profession === choice) {
      return interaction.editReply({ content: `Ya tienes la profesión de **${profDef.emoji} ${profDef.name}**.` });
    }

    if (user.profession) {
      // Intentar cobrar tarifa
      if (user.balance < CHANGE_FEE) {
        return interaction.editReply({ content: `❌ **Fondos Insuficientes:** Cambiar de profesión cuesta **${COIN}${CHANGE_FEE.toLocaleString()}**, pero solo tienes **${COIN}${user.balance.toLocaleString()}** en tu cartera.` });
      }

      await userService.addBalance(userId, -CHANGE_FEE, false);
      await userService.addBalance("server_bank", CHANGE_FEE, false);
      await transactionService.logTransaction({ discordId: userId, type: "fee", amount: -CHANGE_FEE, itemName: "Cambio de profesión" });
      await transactionService.logTransaction({ discordId: "server_bank", type: "bank_deposit", amount: CHANGE_FEE, itemName: `Tarifa de profesión de <@${userId}>` });
    }

    await userService.changeProfession(userId, choice);

    const container = new ContainerBuilder()
      .setAccentColor(2067276) // Verde Éxito
      .addTextDisplayComponents(t => 
        t.setContent(
            `### 🎉 ¡Nueva Profesión Adquirida!\n` +
            `Ahora eres un **${profDef.emoji} ${profDef.name}**.\n\n` +
            `Disfruta de tus nuevos beneficios y empieza a ganar experiencia de profesión para subir de rango.`
        )
      );

    await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    
    // Eliminar el mensaje original del select para que no lo vuelvan a usar fácilmente
    try {
        await interaction.message.delete();
    } catch (e) {}

    return true;
  }
};
