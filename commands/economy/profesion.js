const { SlashCommandBuilder, MessageFlags, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const config = require("../../utils/config");

const COIN = config.emojis.coin;
const CHANGE_FEE = 1000000;

const PROFESSIONS = {
  magnate: {
    name: "Magnate",
    emoji: "🕴️",
    desc: "Experto en finanzas. Bonificación en el trabajo y límite de banco extendido, pero paga un ligero impuesto al depositar.",
    benefits: [
      "💼 **+15%** monedas en `/trabajo` y `/diario`",
      "🏛️ Límite del banco aumentado a **10M** monedas",
      "📉 **2%** de impuesto fijo al depositar en el banco"
    ],
    style: ButtonStyle.Primary
  },
  gambler: {
    name: "Ludópata",
    emoji: "🎰",
    desc: "Adictos al riesgo. Cuentan con pase libre en los casinos, lo que les exime de impuestos.",
    benefits: [
      "💸 **0% Impuestos** al ganar o perder en juegos de casino",
      "📉 **-10%** monedas generadas en el `/trabajo`"
    ],
    style: ButtonStyle.Danger
  },
  criminal: {
    name: "Criminal",
    emoji: "🥷",
    desc: "Maestros del robo. Ejecutan crímenes con mayor frecuencia y éxito, aunque a costa del botín.",
    benefits: [
      "🎯 **+15%** probabilidad de éxito en crímenes y robos",
      "⏳ Cooldown de crímenes reducido a la **mitad**",
      "📉 **-10%** del botín robado y **+5%** de multa si te atrapan"
    ],
    style: ButtonStyle.Success
  },
  ciudadano: {
    name: "Ciudadano",
    emoji: "🚶",
    desc: "Una persona común y corriente. No tiene beneficios ni consecuencias.",
    benefits: ["⚖️ Sin bonificaciones ni penalizaciones"],
    style: ButtonStyle.Secondary
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profesion")
    .setDescription("Elige o cambia tu rol para obtener bonificaciones especiales."),

  async execute(interaction) {
    const userId = interaction.user.id;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = await userService.createUser(userId, interaction.user.username);
    const currentProfession = user.profession || "ciudadano";

    let title = "### 📜 Oficina de Roles";
    let desc = "Elige un rol para tu personaje. Cada camino te otorga ventajas exclusivas, pero también algunas desventajas para mantener el equilibrio.\n\n";

    desc += `> 🏷️ **Rol Actual:** **${PROFESSIONS[currentProfession].emoji} ${PROFESSIONS[currentProfession].name}**\n`;
    desc += `> ⚠️ *Cambiar de rol tiene un costo de **${COIN}${CHANGE_FEE.toLocaleString()}** monedas.*\n\n`;

    for (const [key, prof] of Object.entries(PROFESSIONS)) {
      desc += `**${prof.emoji} ${prof.name}**\n*${prof.desc}*\n`;
      prof.benefits.forEach(b => desc += `> ${b}\n`);
      desc += `\n`;
    }

    const container = new ContainerBuilder()
      .setAccentColor(2303786)
      .addTextDisplayComponents(t => t.setContent(title + desc));

    const row = new ActionRowBuilder();
    for (const [key, prof] of Object.entries(PROFESSIONS)) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`profesion_${key}`)
                .setLabel(prof.name)
                .setEmoji(prof.emoji)
                .setStyle(prof.style)
        );
    }

    await interaction.editReply({ components: [container, row], flags: MessageFlags.IsComponentsV2 });
  },

  async buttonHandler(interaction) {
    if (!interaction.customId.startsWith("profesion_")) return false;

    const choice = interaction.customId.replace("profesion_", "");
    const profDef = PROFESSIONS[choice];
    if (!profDef) return false;

    const userId = interaction.user.id;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = await userService.getUser(userId);
    if (!user) {
        return interaction.editReply({ content: "Error al cargar tu perfil." });
    }

    const currentProfession = user.profession || "ciudadano";

    if (currentProfession === choice) {
      return interaction.editReply({ content: `Ya tienes el rol de **${profDef.emoji} ${profDef.name}**.` });
    }

    // Cobrar tarifa (ya no es gratis la primera vez según la indicación, o sí? Asumamos que siempre cuesta si cambian)
    // Wait, let's keep it free the first time if they were originally 'ciudadano' because they never picked one?
    // Actually the user said "el cambio vale 1m". So if they go from Ciudadano to something, is it a change?
    // Let's make it cost 1m if they have enough balance, otherwise reject. If they are completely new (null), we charge them if they have money, if not we can just charge them. Wait, if they are new, they might not have 1M. Let's make it free if it's their FIRST choice.
    if (user.profession !== null) {
      if (user.balance < CHANGE_FEE) {
        return interaction.editReply({ content: `❌ **Fondos Insuficientes:** Cambiar de rol cuesta **${COIN}${CHANGE_FEE.toLocaleString()}**, pero solo tienes **${COIN}${user.balance.toLocaleString()}** en tu cartera.` });
      }

      await userService.addBalance(userId, -CHANGE_FEE, false);
      await userService.addBalance("server_bank", CHANGE_FEE, false);
      await transactionService.logTransaction({ discordId: userId, type: "fee", amount: -CHANGE_FEE, itemName: "Cambio de rol" });
      await transactionService.logTransaction({ discordId: "server_bank", type: "bank_deposit", amount: CHANGE_FEE, itemName: `Tarifa de rol de <@${userId}>` });
    }

    const newRole = choice === "ciudadano" ? null : choice;
    await userService.changeProfession(userId, newRole);

    const container = new ContainerBuilder()
      .setAccentColor(2067276) // Verde Éxito
      .addTextDisplayComponents(t => 
        t.setContent(
            `### 🎉 ¡Nuevo Rol Adquirido!\n` +
            `Ahora eres un **${profDef.emoji} ${profDef.name}**.\n\n` +
            `Disfruta de tus nuevos beneficios y/o penalizaciones.`
        )
      );

    await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    
    try {
        await interaction.message.delete();
    } catch (e) {}

    return true;
  }
};
