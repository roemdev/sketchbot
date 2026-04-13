const { exchangeRate, currency } = require("../../core.json").economy;
const { apiKey: PAYMENTER_API_KEY, url: PAYMENTER_URL } = require("../../config.json").paymenter;
const { coin: COIN } = require("../../core.json").emojis;
const { SlashCommandBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const db = require("../../services/dbService");
const { logTransaction } = require("../../services/transactionService");

module.exports = {
  data: new SlashCommandBuilder()
      .setName("monedas-a-creditos")
      .setDescription("Convierte tus monedas del servidor a créditos en Paymenter"),

  async execute(interaction) {
    const modal = new ModalBuilder()
        .setCustomId("monedas_a_creditos_modal")
        .setTitle("Canjear monedas por créditos");

    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId("email_paymenter")
                .setLabel("Correo electrónico en Paymenter")
                .setPlaceholder("tucorreo@ejemplo.com")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId("creditos_paymenter")
                .setLabel(`Créditos a canjear (1 = ${exchangeRate.toLocaleString()} monedas)`)
                .setPlaceholder("Ej: 2")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        )
    );

    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.user;
    const paymenterEmail = interaction.fields.getTextInputValue("email_paymenter").trim();
    const rawAmount = interaction.fields.getTextInputValue("creditos_paymenter").trim();
    const paymenterCredits = parseInt(rawAmount);
    const costInCoins = paymenterCredits * exchangeRate;

    if (isNaN(paymenterCredits) || paymenterCredits < 1) {
      return interaction.editReply("La cantidad de créditos tiene que ser un número entero mayor a 0.");
    }

    try {
      const rows = await db.query("SELECT balance FROM user_stats WHERE discord_id = ?", [targetUser.id]);
      const currentBalance = rows.length > 0 ? rows[0].balance : 0;

      if (currentBalance < costInCoins) {
        return interaction.editReply(
            `No te alcanzan las monedas. Tienes **${currentBalance.toLocaleString()} ${COIN}** y necesitas **${costInCoins.toLocaleString()} ${COIN}**.`
        );
      }

      const getResponse = await fetch(`${PAYMENTER_URL}/api/v1/admin/users`, {
        method: "GET",
        headers: { Authorization: `Bearer ${PAYMENTER_API_KEY}`, Accept: "application/json" },
      });

      if (!getResponse.ok) {
        return interaction.editReply(`No se pudo conectar con Paymenter (código: ${getResponse.status}).`);
      }

      const usersData = await getResponse.json();
      const usersList = usersData.data || usersData;
      const targetPaymenterUser = usersList.find(u => {
        const email = u.email || (u.attributes && u.attributes.email);
        return email && email.toLowerCase() === paymenterEmail.toLowerCase();
      });

      if (!targetPaymenterUser) {
        return interaction.editReply(`No encontré ninguna cuenta con el correo **${paymenterEmail}**. Verifica que esté bien escrito.`);
      }

      const paymenterId = targetPaymenterUser.attributes?.id ?? targetPaymenterUser.id;
      const description = `Canje Discord — ${targetUser.username} (${targetUser.id})`;

      let creditResponse = await fetch(`${PAYMENTER_URL}/api/v1/admin/credits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYMENTER_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ user_id: parseInt(paymenterId), amount: paymenterCredits, currency_code: currency, description }),
      });

      if (!creditResponse.ok) {
        const errBody = await creditResponse.json().catch(() => ({}));
        const alreadyExists = errBody?.errors?.currency_code?.some(e => e.includes("already been taken"));

        if (!alreadyExists) {
          console.error(`[coinsToCredits] Error POST ${creditResponse.status}:`, errBody);
          return interaction.editReply(`Falló la entrega de créditos en Paymenter (código: ${creditResponse.status}).`);
        }

        const listRes = await fetch(`${PAYMENTER_URL}/api/v1/admin/credits?filter[user_id]=${paymenterId}`, {
          headers: { Authorization: `Bearer ${PAYMENTER_API_KEY}`, Accept: "application/json" },
        });

        if (!listRes.ok) {
          return interaction.editReply("No se pudo obtener el registro de créditos existente.");
        }

        const creditsList = await listRes.json();
        const existingCredit = (creditsList.data || creditsList).find(c => {
          const attrs = c.attributes || c;
          return attrs.currency_code?.toUpperCase() === currency.toUpperCase();
        });

        if (!existingCredit) {
          return interaction.editReply("No se encontró el registro de créditos del usuario.");
        }

        const creditId = existingCredit.id;
        const attrs = existingCredit.attributes || existingCredit;
        const newAmount = parseFloat(attrs.amount || 0) + paymenterCredits;

        creditResponse = await fetch(`${PAYMENTER_URL}/api/v1/admin/credits/${creditId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${PAYMENTER_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ user_id: parseInt(paymenterId), amount: newAmount, currency_code: currency, description }),
        });

        if (!creditResponse.ok) {
          const putErr = await creditResponse.text();
          console.error(`[coinsToCredits] Error PUT ${creditResponse.status}:`, putErr);
          return interaction.editReply(`Falló la actualización de créditos en Paymenter (código: ${creditResponse.status}).`);
        }
      }

      await db.execute("UPDATE user_stats SET balance = balance - ? WHERE discord_id = ?", [costInCoins, targetUser.id]);
      await logTransaction({ discordId: targetUser.id, type: "coins_to_credits", amount: costInCoins, itemName: `${paymenterCredits} crédito(s) Paymenter → ${paymenterEmail}` });

      return interaction.editReply(
          `¡Canje completado! Se descontaron **${costInCoins.toLocaleString()} ${COIN}** y se añadieron **${paymenterCredits}** crédito(s) a **${paymenterEmail}**.`
      );
    } catch (error) {
      console.error("[coinsToCredits] Error general:", error);
      return interaction.editReply("Algo salió mal procesando el canje. Intenta de nuevo.");
    }
  }
};