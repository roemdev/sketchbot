const { EmbedBuilder } = require("discord.js");
const connection = require('../../db');
const assets = require('../../assets.json');

module.exports = {
  name: "sg",
  description: "Guarda la información del servidor, incluidos roles, canales y miembros.",

  async execute(message, args) {
    const guild = message.guild;

    // Guardar información del servidor
    const serverData = {
      gld_id: guild.id,
      gld_name: guild.name,
      owner_id: guild.ownerId,
      region: guild.preferredLocale,
      member_count: guild.memberCount,
      created_At: guild.createdAt,
      description: guild.description || null,
      icon_url: guild.iconURL() || null
    };

    const queryGuild = `
      INSERT INTO guild (gld_id, gld_name, owner_id, region, member_count, created_At, description, icon_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      gld_name = VALUES(gld_name), owner_id = VALUES(owner_id), region = VALUES(region), member_count = VALUES(member_count),
      created_At = VALUES(created_At), description = VALUES(description), icon_url = VALUES(icon_url)
    `;

    connection.execute(queryGuild, [
      serverData.gld_id,
      serverData.gld_name,
      serverData.owner_id,
      serverData.region,
      serverData.member_count,
      serverData.created_At,
      serverData.description,
      serverData.icon_url
    ], async (err, result) => {
      if (err) {
        console.error('Error al guardar servidor:', err);
        message.channel.send('Hubo un error al guardar la información del servidor.');
        return;
      }
      console.log('Servidor guardado:', result);

      // Guardar roles del servidor
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
        await connection.execute(queryRole, [
          roleData.role_id,
          roleData.role_name,
          roleData.role_color,
          roleData.permissions,
          roleData.hoisted
        ], (err, result) => {
          if (err) {
            console.error('Error al guardar rol:', err);
            return;
          }
          console.log(`Rol ${roleData.role_id} guardado.`);
        });
      }

      // Guardar canales del servidor
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
        await connection.execute(queryChannel, [
          channelData.channel_id,
          channelData.channel_name,
          channelData.channel_type,
          channelData.topic,
          channelData.gld_id
        ], (err, result) => {
          if (err) {
            console.error('Error al guardar canal:', err);
            return;
          }
          console.log(`Canal ${channelData.channel_id} guardado.`);
        });
      }

      // Guardar miembros del servidor
      guild.members.fetch().then(members => {
        for (const member of members.values()) {
          const isBot = member.user.bot ? 1 : 0;  // Verificar si es bot
          const memberData = {
            member_id: member.id,
            member_nick: member.nickname || member.user.username,
            created_at: member.user.createdAt,
            join_at: member.joinedAt,
            status: 1,  // Guardar siempre como true
            role_id: member.roles.highest.id,
            is_bot: isBot
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
              console.error('Error al guardar miembro:', err);
              return;
            }
            console.log(`Miembro ${memberData.member_id} guardado.`);
          });
        }

        // Crear el embed para la respuesta.
        const embed = new EmbedBuilder()
          .setColor(assets.color.green)
          .setTitle("Información del Servidor Guardada")
          .addFields(
            { name: "Servidor", value: `**Nombre:** ${guild.name}\n**ID:** ${guild.id}\n**Región:** ${guild.preferredLocale}\n**Miembros:** ${guild.memberCount}`, inline: false },
            { name: "Roles", value: `Se han guardado ${roles.size} roles`, inline: false },
            { name: "Canales", value: `Se han guardado ${channels.size} canales`, inline: false },
            { name: "Miembros", value: `Se han guardado ${members.size} miembros`, inline: false }
          );

        message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }).catch(err => {
        console.error('Error al obtener miembros', err);
      });
    });
  }
};
