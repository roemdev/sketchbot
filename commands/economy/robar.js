const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");
const supabase = require("../../services/dbService");

const COIN = config.emojis.coin || "🪙";

module.exports = {
  cooldown: 1800, // 30 minutos de cooldown para evitar spam
  data: new SlashCommandBuilder()
    .setName("robar")
    .setDescription("Intenta robarle el 5% de su cartera a un usuario registrado aleatorio"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    await interaction.deferReply();

    // Asegurar que el autor tenga perfil
    await userService.createUser(userId, username);

    // Obtener todos los usuarios elegibles para ser robados (excluyendo bancos y al propio autor)
    const { data: users, error } = await supabase
      .from("user_stats")
      .select("discord_id, username, balance")
      .not("discord_id", "ilike", "%_bank")
      .neq("discord_id", userId);

    if (error || !users || users.length === 0) {
      const container = new ContainerBuilder()
        .setAccentColor(0xC0392B)
        .addTextDisplayComponents(t => t.setContent(`### 🕵️‍♂️ Sin Víctimas\nNo hay otros jugadores registrados en el servidor a los que puedas robar. ¡Espera a que alguien más se una!`));
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    // Seleccionar una víctima aleatoria
    const target = users[Math.floor(Math.random() * users.length)];
    const bankBalance = await userService.getBankBalance(userId);

    const success = Math.random() < 0.70;

    if (success) {
      const stolen = Math.floor(target.balance * 0.05);

      if (stolen <= 0) {
        const container = new ContainerBuilder()
          .setAccentColor(0xF1C40F) // Amarillo advertencia
          .addTextDisplayComponents(t =>
            t.setContent(`### 🕵️‍♂️ Bolsillos Vacíos\nIntentaste robarle a <@${target.discord_id}>, pero su cartera está vacía. ¡No te llevas nada! 💨`)
          );
        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      // Procesar transacción del robo exitoso
      await userService.addBalance(target.discord_id, -stolen, false);
      await userService.addBalance(userId, stolen, false);

      const avatarUrl = interaction.user.displayAvatarURL({ extension: "png", size: 128 });
      const container = new ContainerBuilder()
        .setAccentColor(0x2ECC71) // Verde éxito
        .addTextDisplayComponents(t => t.setContent(`### 🥷 ¡Robo Exitoso!`))
        .addSeparatorComponents(s => s)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(t =>
              t.setContent(
                `Le has robado el **5%** de la cartera a <@${target.discord_id}>.\n` +
                `💵 **Botín obtenido:** +${COIN}**${stolen.toLocaleString("es-DO")}**`
              )
            )
            .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } else {
      // Fracaso: pagar multa del 5% de la cartera (se pone en negativo si no hay suficiente)
      const robberStats = await userService.getUser(userId);
      const robberBalance = robberStats ? robberStats.balance : 0;

      const fine = Math.max(500, Math.round(robberBalance * 0.05));
      const newBalance = robberBalance - fine;

      // Actualizar directamente en Supabase para permitir saldos negativos
      await supabase
        .from("user_stats")
        .update({ balance: newBalance })
        .eq("discord_id", userId);

      const avatarUrl = interaction.user.displayAvatarURL({ extension: "png", size: 128 });
      const container = new ContainerBuilder()
        .setAccentColor(0xC0392B) // Rojo fracaso/cárcel
        .addTextDisplayComponents(t => t.setContent(`### 🚨 ¡Atrapado por la Ley!`))
        .addSeparatorComponents(s => s)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(t =>
              t.setContent(
                `Intentaste robarle a <@${target.discord_id}>, pero saltaron las alarmas. ¡Te atraparon con las manos en la masa!\n\n` +
                `💸 **Sanción:** Tuviste que pagar una multa del **5%** de tu cartera: -${COIN}**${fine.toLocaleString("es-DO")}**.`
              )
            )
            .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
