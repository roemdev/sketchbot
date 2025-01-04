const { EmbedBuilder } = require("discord.js");
const connection = require('../../db');

module.exports = {
  name: "ug",
  description: "Actualiza la información del servidor, cambiando el estado de los miembros que ya no están presentes y eliminando bots.",

  async execute(message, args) {
    const guild = message.guild;

    // Obtener IDs actuales de miembros, roles y canales
    const currentMemberIDs = guild.members.cache.map(member => member.id);
    const currentRoleIDs = guild.roles.cache.map(role => role.id);
    const currentChannelIDs = guild.channels.cache.map(channel => channel.id);

    // Actualizar estados de los miembros que ya no están presentes a false (0) y eliminar bots
    const updateAbsentMembersQuery = `
      UPDATE members
      SET status = 0
      WHERE member_id NOT IN (${currentMemberIDs.join(', ')}) AND is_bot = 0;
    `;
    connection.execute(updateAbsentMembersQuery, (err, result) => {
      if (err) {
        console.error('Error al actualizar estados de miembros ausentes:', err);
        message.channel.send('Hubo un error al actualizar estados de miembros ausentes.');
        return;
      }

      // Eliminar bots que ya no están presentes
      const deleteAbsentBotsQuery = `
        DELETE FROM members
        WHERE member_id NOT IN (${currentMemberIDs.join(', ')}) AND is_bot = 1;
      `;
      connection.execute(deleteAbsentBotsQuery, (err, result) => {
        if (err) {
          console.error('Error al eliminar bots ausentes:', err);
          message.channel.send('Hubo un error al eliminar bots ausentes.');
          return;
        }

        // Actualizar estados de los miembros presentes a true (1) y sus otros datos
        guild.members.fetch().then(members => {
          for (const member of members.values()) {
            const memberData = {
              member_id: member.id,
              member_nick: member.nickname || member.user.username,
              created_at: member.user.createdAt,
              join_at: member.joinedAt,
              status: 1,  // Actualizar como true (1)
              role_id: member.roles.highest.id,
              is_bot: member.user.bot ? 1 : 0
            };

            const queryMember = `
              INSERT INTO members (member_id, member_nick, created_at, join_at, status, role_id, is_bot)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
              member_nick = VALUES(member_nick), created_at = VALUES(created_at), join_at = VALUES(join_at), status = VALUES(status), role_id = VALUES(role_id), is_bot = VALUES(is_bot)
            `;
            connection.execute(queryMember, [
              memberData.member_id,
              memberData.member_nick,
              memberData.created_at,
              memberData.join_at,
              memberData.status,
              memberData.role_id,
              memberData.is_bot
            ], (err, result) => {
              if (err) {
                console.error('Error al actualizar miembro:', err);
                return;
              }
            });
          }

          // Crear el embed para la respuesta
          const embed = new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("Información del Servidor Actualizada")
            .addFields(
              { name: "Miembros", value: `Se han actualizado ${members.size} miembros`, inline: false }
            );

          message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        }).catch(err => {
          console.error('Error al obtener miembros', err);
        });
      });
    });

    // Actualizar roles presentes
    const roles = guild.roles.cache;
    for (const role of roles.values()) {
      const roleData = {
        role_id: role.id,
        role_name: role.name,
        role_color: role.hexColor,
        permissions: role.permissions.bitfield,
        hoisted: role.hoist ? 1 : 0
      };

      const queryRole = `
        INSERT INTO roles (role_id, role_name, role_color, permissions, hoisted)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        role_name = VALUES(role_name), role_color = VALUES(role_color), permissions = VALUES(permissions), hoisted = VALUES(hoisted)
      `;
      connection.execute(queryRole, [
        roleData.role_id,
        roleData.role_name,
        roleData.role_color,
        roleData.permissions,
        roleData.hoisted
      ], (err, result) => {
        if (err) {
          console.error('Error al actualizar rol:', err);
        } else {
        }
      });
    }

    // Crear el embed para la respuesta de roles
    const embedRoles = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("Información de Roles Actualizada")
      .addFields(
        { name: "Roles", value: `Se han actualizado ${roles.size} roles`, inline: false }
      );

    message.reply({ embeds: [embedRoles], allowedMentions: { repliedUser: false } });

    // Actualizar canales presentes
    const channels = guild.channels.cache;
    for (const channel of channels.values()) {
      const channelType = channel.type === 0 ? 'text' : (channel.type === 2 ? 'voice' : 'category');
      const channelData = {
        channel_id: channel.id,
        channel_name: channel.name,
        channel_type: channelType,
        topic: channel.topic || null,
        gld_id: guild.id
      };

      const queryChannel = `
        INSERT INTO channels (channel_id, channel_name, channel_type, topic, gld_id)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        channel_name = VALUES(channel_name), channel_type = VALUES(channel_type), topic = VALUES(topic), gld_id = VALUES(gld_id)
      `;
      connection.execute(queryChannel, [
        channelData.channel_id,
        channelData.channel_name,
        channelData.channel_type,
        channelData.topic,
        channelData.gld_id
      ], (err, result) => {
        if (err) {
          console.error('Error al actualizar canal:', err);
        } else {
        }
      });
    }

    // Crear el embed para la respuesta de canales
    const embedChannels = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("Información de Canales Actualizada")
      .addFields(
        { name: "Canales", value: `Se han actualizado ${channels.size} canales`, inline: false }
      );

    message.reply({ embeds: [embedChannels], allowedMentions: { repliedUser: false } });
  }
};
