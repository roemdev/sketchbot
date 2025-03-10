const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { addDonation, getDonationRank, getNobilityRoles } = require('./nobilityUtils');
const { getUserBalance, updateUserBalance } = require('../src/utilities/userBalanceUtils');
const assets = require('../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('donar')
    .setDescription('Donar monedas al sistema de nobleza')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('Cantidad de monedas a donar')
        .setRequired(true)
    ),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const amount = interaction.options.getInteger('cantidad');

    // Verificar si la cantidad es válida
    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle('Error')
          .setDescription('Por favor, ingresa una cantidad válida.')
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // Verificar el saldo del usuario
    const userBalance = await getUserBalance(connection, interaction.user.id);
    if (userBalance < amount) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle('Error')
          .setDescription('No tienes suficientes monedas para donar.')
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // Restar el saldo y registrar la donación
    await updateUserBalance(connection, interaction.user.id, -amount);
    await addDonation(connection, interaction.user.id, amount);

    // Obtener el ranking actualizado
    const updatedDonors = await getDonationRank(connection);
    const nobilityRoles = await getNobilityRoles(connection);

    // Ordenar los roles por límite (de menor a mayor)
    nobilityRoles.sort((a, b) => a.limit - b.limit);

    // Obtener los roles actuales del usuario antes de la actualización
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const userRolesBefore = member ? member.roles.cache.map(role => role.id) : [];

    // Asignar o quitar roles según la posición en el ranking
    let newRoleAssigned = null;
    let oldRoleRemoved = null;

    for (let i = 0; i < updatedDonors.length; i++) {
      const donor = updatedDonors[i];
      const donorMember = await interaction.guild.members.fetch(donor.user_id).catch(() => null);

      if (!donorMember) continue; // Si el usuario no está en el servidor, continuar con el siguiente

      // Determinar el rol correspondiente según la posición
      let assignedRole = null;
      for (const roleData of nobilityRoles) {
        if (i < roleData.limit) {
          assignedRole = roleData;
          break;
        }
      }

      // Quitar todos los roles de nobleza que no corresponden
      for (const roleData of nobilityRoles) {
        const role = interaction.guild.roles.cache.get(roleData.role_id);
        if (!role) continue;

        if (roleData !== assignedRole && donorMember.roles.cache.has(role.id)) {
          await donorMember.roles.remove(role);
          if (donor.user_id === interaction.user.id) {
            oldRoleRemoved = roleData.title;
          }
        }
      }

      // Asignar el nuevo rol si corresponde
      if (assignedRole) {
        const role = interaction.guild.roles.cache.get(assignedRole.role_id);
        if (role && !donorMember.roles.cache.has(role.id)) {
          await donorMember.roles.add(role);
          if (donor.user_id === interaction.user.id) {
            newRoleAssigned = assignedRole.title;
          }
        }
      }
    }

    // Construir el embed de respuesta
    const responseEmbed = new EmbedBuilder()
      .setColor(assets.color.green)
      .setTitle('Donación exitosa')
      .setDescription(`Has donado ⏣${amount.toLocaleString()} monedas.`);

    // Si se asignó un nuevo rol, añadirlo al embed
    if (newRoleAssigned) {
      responseEmbed.addFields({
        name: '¡Nuevo rol asignado!',
        value: `Felicidades, ahora tienes el rol de **${newRoleAssigned}**.`
      });
    }

    // Si se quitó un rol, añadirlo al embed
    if (oldRoleRemoved) {
      responseEmbed.addFields({
        name: 'Rol removido',
        value: `Se te ha removido el rol de **${oldRoleRemoved}**.`
      });
    }

    // Respuesta de éxito
    await interaction.reply({
      embeds: [responseEmbed],
      flags: MessageFlags.Ephemeral
    });

    // Mostrar el ranking actualizado (opcional)
    const updatedDescription = updatedDonors
      .map((donor, index) => `**${index + 1}.** <@${donor.user_id}> • ⏣${donor.amount.toLocaleString()} monedas`)
      .join('\n') || "Aún no hay donaciones.";

    const updatedRankEmbed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setDescription(updatedDescription);

    await interaction.followUp({
      embeds: [updatedRankEmbed],
      flags: MessageFlags.Ephemeral
    });
  }
};