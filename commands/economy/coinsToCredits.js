const { exchangeRate, currency } = require("../../utils/config").economy;
const { apiKey: PAYMENTER_API_KEY, url: PAYMENTER_URL } = require("../../config.json").paymenter;
const { coin: COIN } = require("../../utils/config").emojis;
const { SlashCommandBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
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
    const paymenterEmail = interaction.fields.getTextInputValue("email_paymenter").trim();
    const rawAmount = interaction.fields.getTextInputValue("creditos_paymenter").trim();
    const paymenterCredits = parseInt(rawAmount, 10);
    const costInCoins = paymenterCredits * exchangeRate;

    if (isNaN(paymenterCredits) || paymenterCredits < 1) {
      return interaction.reply({
        content: "❌ **Error:** La cantidad de créditos tiene que ser un número entero mayor a 0.",
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      const currentBalance = await userService.getBalance(interaction.user.id);

      if (currentBalance < costInCoins) {
        return interaction.reply({
          content: `❌ **Error:** No te alcanzan las monedas. Tienes **${currentBalance.toLocaleString()} ${COIN}** y necesitas **${costInCoins.toLocaleString()} ${COIN}**.`,
          flags: MessageFlags.Ephemeral
        });
      }

      // Enviar panel de confirmación con botones
      const text = `### 🪙 Confirmación de Canje\n\n` +
                   `Vas a canjear **${costInCoins.toLocaleString()} ${COIN}** por **${paymenterCredits}** créditos en Paymenter.\n` +
                   `> **Correo:** \`${paymenterEmail}\`\n` +
                   `> **Costo:** **${costInCoins.toLocaleString()} ${COIN}**\n\n` +
                   `⚠️ *Por favor, confirma que tu correo está bien escrito. Una vez realizado, esta operación no se puede deshacer.*`;

      const container = new ContainerBuilder()
          .setAccentColor(2303786) // NotQuiteBlack
          .addTextDisplayComponents(t => t.setContent(text))
          .addSeparatorComponents(s => s)
          .addActionRowComponents(row =>
              row.setComponents(
                  new ButtonBuilder()
                      .setCustomId(`monedas-a-creditos_confirm:${paymenterCredits}:${costInCoins}:${paymenterEmail}:${interaction.user.id}`)
                      .setLabel("Confirmar Canje")
                      .setStyle(ButtonStyle.Success),
                  new ButtonBuilder()
                      .setCustomId(`monedas-a-creditos_cancel:${interaction.user.id}`)
                      .setLabel("Cancelar")
                      .setStyle(ButtonStyle.Danger)
              )
          );

      return interaction.reply({
        components: [container],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("[coinsToCredits] Error en modal submit:", error);
      return interaction.reply({
        content: "❌ Ocurrió un error al preparar el canje. Intenta de nuevo.",
        flags: MessageFlags.Ephemeral
      });
    }
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("monedas-a-creditos_")) return false;

    const mainParts = interaction.customId.split("_");
    const subParts = mainParts[1].split(":");
    const action = subParts[0];

    const authorId = subParts[subParts.length - 1];

    if (interaction.user.id !== authorId) {
      await interaction.reply({
        content: "Solo la persona que ejecutó el comando puede usar estos botones.",
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    if (action === "cancel") {
      const cancelContainer = new ContainerBuilder()
          .setAccentColor(2303786) // NotQuiteBlack
          .addTextDisplayComponents(t => t.setContent("### Canje cancelado\nNo se procesó ninguna transacción."));
      await interaction.update({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2 });
      return true;
    }

    if (action === "confirm") {
      const paymenterCredits = parseInt(subParts[1], 10);
      const costInCoins = parseInt(subParts[2], 10);
      const paymenterEmail = subParts[3];

      await interaction.deferUpdate();

      try {
        const currentBalance = await userService.getBalance(interaction.user.id);
        if (currentBalance < costInCoins) {
          await interaction.editReply({
            content: `❌ **Error:** Ya no te alcanzan las monedas. Tienes **${currentBalance.toLocaleString()} ${COIN}** y necesitas **${costInCoins.toLocaleString()} ${COIN}**.`,
            components: []
          });
          return true;
        }

        // 1. Obtener la lista de usuarios para encontrar el ID del usuario en Paymenter
        const getResponse = await fetch(`${PAYMENTER_URL}/api/v1/admin/users`, {
          method: "GET",
          headers: { Authorization: `Bearer ${PAYMENTER_API_KEY}`, Accept: "application/json" },
        });

        if (!getResponse.ok) {
          await interaction.editReply({
            content: `❌ **Error:** No se pudo conectar con Paymenter (código: ${getResponse.status}).`,
            components: []
          });
          return true;
        }

        const usersData = await getResponse.json();
        const usersList = usersData.data || usersData;
        const targetPaymenterUser = usersList.find(u => {
          const email = u.email || (u.attributes && u.attributes.email);
          return email && email.toLowerCase() === paymenterEmail.toLowerCase();
        });

        if (!targetPaymenterUser) {
          await interaction.editReply({
            content: `❌ **Error:** No encontré ninguna cuenta con el correo **${paymenterEmail}**. Verifica que esté bien escrito.`,
            components: []
          });
          return true;
        }

        const paymenterId = targetPaymenterUser.attributes?.id ?? targetPaymenterUser.id;
        const description = `Canje Discord — ${interaction.user.username} (${interaction.user.id})`;

        // 2. Intentar POST para agregar créditos
        let creditResponse = await fetch(`${PAYMENTER_URL}/api/v1/admin/credits`, {
          method: "POST",
          headers: { Authorization: `Bearer ${PAYMENTER_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ user_id: parseInt(paymenterId, 10), amount: paymenterCredits, currency_code: currency, description }),
        });

        if (!creditResponse.ok) {
          const errBody = await creditResponse.json().catch(() => ({}));
          const alreadyExists = errBody?.errors?.currency_code?.some(e => e.includes("already been taken"));

          if (!alreadyExists) {
            console.error(`[coinsToCredits] Error POST ${creditResponse.status}:`, errBody);
            await interaction.editReply({
              content: `❌ **Error:** Falló la entrega de créditos en Paymenter (código: ${creditResponse.status}).`,
              components: []
            });
            return true;
          }

          // Si ya existe el registro de esta divisa, buscarlo para hacer PUT
          const listRes = await fetch(`${PAYMENTER_URL}/api/v1/admin/credits?filter[user_id]=${paymenterId}`, {
            headers: { Authorization: `Bearer ${PAYMENTER_API_KEY}`, Accept: "application/json" },
          });

          if (!listRes.ok) {
            await interaction.editReply({
              content: "❌ **Error:** No se pudo obtener el registro de créditos existente en Paymenter.",
              components: []
            });
            return true;
          }

          const creditsList = await listRes.json();
          const existingCredit = (creditsList.data || creditsList).find(c => {
            const attrs = c.attributes || c;
            return attrs.currency_code?.toUpperCase() === currency.toUpperCase();
          });

          if (!existingCredit) {
            await interaction.editReply({
              content: "❌ **Error:** No se encontró el registro de créditos del usuario.",
              components: []
            });
            return true;
          }

          const creditId = existingCredit.id;
          const attrs = existingCredit.attributes || existingCredit;
          const newAmount = parseFloat(attrs.amount || 0) + paymenterCredits;

          // Hacer PUT para actualizar
          creditResponse = await fetch(`${PAYMENTER_URL}/api/v1/admin/credits/${creditId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${PAYMENTER_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ user_id: parseInt(paymenterId, 10), amount: newAmount, currency_code: currency, description }),
          });

          if (!creditResponse.ok) {
            const putErr = await creditResponse.text();
            console.error(`[coinsToCredits] Error PUT ${creditResponse.status}:`, putErr);
            await interaction.editReply({
              content: `❌ **Error:** Falló la actualización de créditos en Paymenter (código: ${creditResponse.status}).`,
              components: []
            });
            return true;
          }
        }

        // 3. Procesar cobro contable en la base de datos
        await userService.removeBalance(interaction.user.id, costInCoins, false);
        await userService.addBalance("server_bank", costInCoins, false);
        await logTransaction({
          discordId: "server_bank",
          type: "bank_tax",
          amount: costInCoins,
          itemName: `Ingreso Canje de Créditos de <@${interaction.user.id}>`
        });
        await logTransaction({
          discordId: interaction.user.id,
          type: "coins_to_credits",
          amount: costInCoins,
          itemName: `${paymenterCredits} crédito(s) Paymenter → ${paymenterEmail}`
        });

        // 4. Mostrar panel de éxito
        const successContainer = new ContainerBuilder()
            .setAccentColor(2067276) // DarkGreen
            .addTextDisplayComponents(t =>
                t.setContent(`### ✅ ¡Canje completado!\nSe descontaron **${costInCoins.toLocaleString()} ${COIN}** y se añadieron **${paymenterCredits}** crédito(s) a **${paymenterEmail}**.`)
            );

        await interaction.editReply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
      } catch (err) {
        console.error("[coinsToCredits] Error general en confirmación:", err);
        await interaction.editReply({
          content: "❌ Ocurrió un error inesperado procesando el canje. Intenta de nuevo.",
          components: []
        });
      }
      return true;
    }
    return false;
  }
};