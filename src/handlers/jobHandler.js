const { EmbedBuilder } = require("discord.js");
const {
  getCooldown,
  setCooldown,
  getRequiredItem,
  checkUserHasItem,
  removeItem,
  generateRewards,
  updateUserBalance,
} = require("../utilities/jobsUtils");

const executeJob = async (interaction, jobName, assets) => {
  const connection = interaction.client.dbConnection;
  const userId = interaction.user.id;
  const mapa = interaction.options.getString("mapa");

  // 1️⃣ Obtener datos del trabajo
  const [jobRows] = await connection.query(
    "SELECT id, min_coins, max_coins, cooldown FROM curr_jobs WHERE name = ?;",
    [jobName]
  );

  if (!jobRows || jobRows.length === 0) {
    return interaction.reply({
      content: `Error: No se encontró el trabajo '${jobName}'.`,
    });
  }
  const jobData = jobRows[0];
  const jobId = jobData.id;
  const cooldownDuration = jobData.cooldown * 1000;

  // 2️⃣ Verificar cooldown del usuario
  const lastUsed = await getCooldown(userId, jobId, connection);
  const currentTimeUTC = Date.now();

  if (lastUsed) {
    const lastUsedUTC = new Date(lastUsed).getTime() - (new Date().getTimezoneOffset() * 60000);
    const elapsedTime = currentTimeUTC - lastUsedUTC;
    if (elapsedTime < cooldownDuration) {
      const remainingTime = cooldownDuration - elapsedTime;
      const timestamp = Math.floor((currentTimeUTC + remainingTime) / 1000);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle(`${assets.emoji.deny} Cooldown activo`)
            .setDescription(`Debes esperar <t:${timestamp}:R>⏳ antes de volver a realizar este trabajo.`),
        ],
      });
    }
  }

  // 3️⃣ Obtener el ítem requerido para el mapa
  const requiredItem = await getRequiredItem(mapa, jobId, connection);
  if (!requiredItem) {
    return interaction.reply({
      content: "Este mapa no requiere ningún ítem o no existe.",
    });
  }

  // 4️⃣ Verificar si el usuario tiene el ítem requerido
  const hasItem = await checkUserHasItem(userId, requiredItem.item_id, connection);
  if (!hasItem) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} No puedes realizar este trabajo`)
          .setDescription(`Para realizar este trabajo necesitas el ítem **${requiredItem.item_emoji} ${requiredItem.item_name}**`),
      ],
    });
  }

  // 5️⃣ Restar 1 unidad del ítem requerido
  await removeItem(userId, requiredItem.item_id, connection);

  // 6️⃣ Determinar las recompensas
  const { rewards, itemMap } = await generateRewards(jobId, connection);

  // 7️⃣ Agregar los ítems obtenidos al inventario
  for (const item of rewards) {
    await connection.query(
      `INSERT INTO curr_user_inventory (user_id, item_id, quantity) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE quantity = quantity + ?;`,
      [userId, item.item_id, item.cantidad, item.cantidad]
    );
  }

  // 8️⃣ Determinar la cantidad de credits ganadas
  const creditsGanadas = Math.floor(
    Math.random() * (jobData.max_coins - jobData.min_coins + 1)
  ) + jobData.min_coins;

  // 9️⃣ Actualizar balance del usuario
  await updateUserBalance(userId, creditsGanadas, connection);

  // 🔟 Registrar cooldown
  await setCooldown(userId, jobId, connection);

  // 11️⃣ Construir el mensaje de recompensa
  const recompensaTexto = rewards
    .map((item) => `> ${itemMap[item.item_id].emoji} ${itemMap[item.item_id].name} x${item.cantidad}`)
    .join("\n");

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(assets.color.green)
        .setTitle(`🗺️ Trabajaste en ${mapa}`)
        .setDescription(`Has obtenido: \n` +
          `${recompensaTexto}\n> 💰 **${creditsGanadas}** créditos\n\nConsumiste:\n> ${requiredItem.item_emoji} | **${requiredItem.item_name}**`
        ),
    ],
  });
};

module.exports = { executeJob };