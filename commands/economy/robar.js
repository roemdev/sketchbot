const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");
const supabase = require("../../services/dbService");

const COIN = config.emojis.coin || "🪙";

module.exports = {
  cooldown: 300, // 5 minutos de cooldown para evitar spam
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
                        `¡Silencioso como el viento! Le has robado el **5%** de la cartera a <@${target.discord_id}>.\n\n` +
                        `💵 **Botín obtenido:** +${COIN}**${stolen.toLocaleString("es-DO")}**`
                    )
                )
                .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } else {
      // Fracaso: pagar multa de 2% del banco
      const fine = Math.round(bankBalance * 0.02);

      if (fine > 0) {
        const newBankBalance = Math.max(0, bankBalance - fine);
        await userService.setBankBalance(userId, newBankBalance, username);
      }

      const avatarUrl = interaction.user.displayAvatarURL({ extension: "png", size: 128 });
      const fineText = fine > 0 
        ? `Tuviste que pagar una multa del **2%** de tu banco: -${COIN}**${fine.toLocaleString("es-DO")}**.`
        : `Te salvaste de la multa porque no tienes monedas guardadas en tu banco.`;

      const container = new ContainerBuilder()
        .setAccentColor(0xC0392B) // Rojo fracaso/cárcel
        .addTextDisplayComponents(t => t.setContent(`### 🚨 ¡Atrapado por la Ley!`))
        .addSeparatorComponents(s => s)
        .addSectionComponents(section =>
            section
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `Intentaste robarle a <@${target.discord_id}>, pero saltaron las alarmas. ¡Te atraparon con las manos en la masa!\n\n` +
                        `💸 **Sanción:** ${fineText}`
                    )
                )
                .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
