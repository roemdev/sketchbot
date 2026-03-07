const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../services/dbService');

const PAYMENTER_API_KEY = 'PAYM36cf4a4dccff1162bd8ddd71cd6e3ea0fe9072c027af4412228a21e5c29b45ba';
const PAYMENTER_URL = 'https://billing.arkaniahost.xyz';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exchange-paymenter')
    .setDescription('Convierte monedas del servidor a créditos en Paymenter (Solo Admins)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario de Discord al que se le debitarán las monedas')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('email_paymenter')
        .setDescription('Correo electrónico del cliente en Paymenter')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('creditos_paymenter')
        .setDescription('Cantidad de créditos de Paymenter a entregar (1 = 500k monedas)')
        .setRequired(true)
        .setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser       = interaction.options.getUser('usuario');
    const paymenterEmail   = interaction.options.getString('email_paymenter');
    const paymenterCredits = interaction.options.getInteger('creditos_paymenter');
    const costInCoins      = paymenterCredits * 500000;

    try {
      // ── PASO 1: Verificar balance en DB local ───────────────────────────────
      const rows = await db.query(
        'SELECT balance FROM user_stats WHERE discord_id = ?',
        [targetUser.id]
      );
      const currentBalance = rows.length > 0 ? rows[0].balance : 0;

      if (currentBalance < costInCoins) {
        return interaction.editReply(
          `❌ El usuario <@${targetUser.id}> no tiene suficientes monedas. Balance actual: **${currentBalance.toLocaleString()}**.`
        );
      }

      // ── PASO 2: Buscar usuario en Paymenter ────────────────────────────────
      const getResponse = await fetch(`${PAYMENTER_URL}/api/v1/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYMENTER_API_KEY}`,
          'Accept': 'application/json'
        }
      });

      if (!getResponse.ok) {
        return interaction.editReply(`❌ No se pudo conectar con Paymenter (Código: ${getResponse.status}).`);
      }

      const usersData = await getResponse.json();
      const usersList = usersData.data || usersData;

      const targetPaymenterUser = usersList.find(u => {
        const email = u.email || (u.attributes && u.attributes.email);
        return email && email.toLowerCase() === paymenterEmail.toLowerCase();
      });

      if (!targetPaymenterUser) {
        return interaction.editReply(`❌ No se encontró ninguna cuenta con el correo **${paymenterEmail}**.`);
      }

      // El ID numérico está dentro de attributes (formato JSON:API de Paymenter)
      const paymenterId = targetPaymenterUser.attributes?.id ?? targetPaymenterUser.id;

      // ── PASO 3: Crear o actualizar créditos en Paymenter ───────────────────
      // Intentamos POST primero. Si el usuario ya tiene créditos en USD,
      // Paymenter devuelve 422 "already been taken" → buscamos el registro y hacemos PUT.

      const description = `Canje de monedas Discord - Usuario: ${targetUser.username} (${targetUser.id})`;

      let creditResponse = await fetch(`${PAYMENTER_URL}/api/v1/admin/credits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYMENTER_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_id:       parseInt(paymenterId),
          amount:        paymenterCredits,
          currency_code: 'USD',
          description
        })
      });

      // Si ya existe un registro para este usuario+moneda, actualizamos con PUT
      if (!creditResponse.ok) {
        const errBody = await creditResponse.json().catch(() => ({}));
        const alreadyExists = errBody?.errors?.currency_code?.some(e => e.includes('already been taken'));

        if (!alreadyExists) {
          console.error(`[exchange-paymenter] Error credits POST ${creditResponse.status}:`, errBody);
          return interaction.editReply(
            `❌ Falló la entrega de créditos en Paymenter (Código: ${creditResponse.status}).`
          );
        }

        // Buscar el registro de créditos existente del usuario
        const listRes = await fetch(
          `${PAYMENTER_URL}/api/v1/admin/credits?filter[user_id]=${paymenterId}`,
          {
            headers: {
              'Authorization': `Bearer ${PAYMENTER_API_KEY}`,
              'Accept': 'application/json'
            }
          }
        );
        

        if (!listRes.ok) {
          console.error(`[exchange-paymenter] No se pudo listar créditos: ${listRes.status}`);
          return interaction.editReply('❌ No se pudo obtener el registro de créditos existente.');
        }

        const creditsList = await listRes.json();
        console.log('[DEBUG] Credits list raw:', JSON.stringify(creditsList, null, 2));

        const existingCredit = (creditsList.data || creditsList).find(c => {
          const attrs = c.attributes || c;
          return String(attrs.user_id) === String(paymenterId) &&
                 attrs.currency_code?.toUpperCase() === 'USD';
        });

        if (!existingCredit) {
          console.error('[exchange-paymenter] No se encontró el registro de créditos existente.');
          return interaction.editReply('❌ No se encontró el registro de créditos del usuario.');
        }

        const creditId  = existingCredit.id;
        const attrs     = existingCredit.attributes || existingCredit;
        const newAmount = parseFloat(attrs.amount || 0) + paymenterCredits;

        creditResponse = await fetch(`${PAYMENTER_URL}/api/v1/admin/credits/${creditId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${PAYMENTER_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            user_id:       parseInt(paymenterId),
            amount:        newAmount,
            currency_code: 'USD',
            description
          })
        });

        if (!creditResponse.ok) {
          const putErr = await creditResponse.text();
          console.error(`[exchange-paymenter] Error credits PUT ${creditResponse.status}:`, putErr);
          return interaction.editReply(
            `❌ Falló la actualización de créditos en Paymenter (Código: ${creditResponse.status}).`
          );
        }
      }

      // ── PASO 4: Descontar monedas en DB local ──────────────────────────────
      await db.execute(
        'UPDATE user_stats SET balance = balance - ? WHERE discord_id = ?',
        [costInCoins, targetUser.id]
      );

      return interaction.editReply(
        `✅ Operación exitosa. Se descontaron **${costInCoins.toLocaleString()}** monedas y se añadieron **${paymenterCredits}** crédito(s) a la cuenta **${paymenterEmail}** en Paymenter.`
      );

    } catch (error) {
      console.error('[exchange-paymenter] Error general:', error);
      return interaction.editReply('❌ Ocurrió un error interno al procesar la operación.');
    }
  }
};