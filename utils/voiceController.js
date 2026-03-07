const { MessageFlags } = require('discord.js');
const db = require('../services/dbService');

async function handleInteraction(interaction) {
    // 1. Obtener el canal de voz actual del usuario
    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return interaction.reply({ 
            content: '❌ Debes estar conectado a un canal de voz para usar este panel.', 
            flags: MessageFlags.Ephemeral 
        });
    }

    // 2. Verificar si el canal está registrado en la base de datos
    const rows = await db.query('SELECT * FROM temp_channels WHERE channel_id = ?', [voiceChannel.id]);
    if (rows.length === 0) {
        return interaction.reply({ 
            content: '❌ Este no es un canal temporal válido o ya expiró.', 
            flags: MessageFlags.Ephemeral 
        });
    }

    const ownerId = rows[0].owner_id;
    const action = interaction.customId;

    // 3. Lógica para Reclamar (El único botón que puede usar un No-Dueño)
    if (action === 'vc_claim') {
        if (ownerId === member.id) {
            return interaction.reply({ content: 'Ya eres el propietario de este canal.', flags: MessageFlags.Ephemeral });
        }

        // Si el dueño original sigue dentro, no se puede reclamar
        if (voiceChannel.members.has(ownerId)) {
            return interaction.reply({ 
                content: '❌ No puedes reclamar el canal porque el dueño actual sigue conectado a él.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        // Cambiamos el dueño en la base de datos y memoria
        await db.execute('UPDATE temp_channels SET owner_id = ? WHERE channel_id = ?', [member.id, voiceChannel.id]);
        if (!interaction.client.tempVCs) interaction.client.tempVCs = new Map();
        interaction.client.tempVCs.set(voiceChannel.id, { ownerId: member.id });

        return interaction.reply({ content: '👑 ¡Has reclamado el canal exitosamente! Ahora tienes el control.', flags: MessageFlags.Ephemeral });
    }

    // 4. Lógica estricta de propietario (Para el resto de botones)
    if (ownerId !== member.id) {
        return interaction.reply({ 
            content: '❌ Solo el propietario del canal puede usar esta función.', 
            flags: MessageFlags.Ephemeral 
        });
    }

    const everyoneRole = interaction.guild.roles.everyone;
    const botId = interaction.client.user.id;

    try {
        switch (action) {
            case 'vc_lock':
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: false });
                await voiceChannel.permissionOverwrites.edit(member.id, { Connect: true }); 
                await voiceChannel.permissionOverwrites.edit(botId, { Connect: true, ViewChannel: true, ManageChannels: true });
                
                await interaction.reply({ content: '🔐 Tu canal ha sido **bloqueado**. Nadie más puede entrar.', flags: MessageFlags.Ephemeral });
                break;

            case 'vc_unlock':
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: true });
                await interaction.reply({ content: '🔓 Tu canal ha sido **desbloqueado**. Cualquiera puede entrar.', flags: MessageFlags.Ephemeral });
                break;

            case 'vc_hide':
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: false });
                await voiceChannel.permissionOverwrites.edit(member.id, { ViewChannel: true });
                await voiceChannel.permissionOverwrites.edit(botId, { Connect: true, ViewChannel: true, ManageChannels: true });

                await interaction.reply({ content: '🙈 Tu canal ahora es **invisible** en la lista del servidor.', flags: MessageFlags.Ephemeral });
                break;

            case 'vc_show':
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: true });
                await interaction.reply({ content: '🙉 Tu canal vuelve a ser **visible** para todos.', flags: MessageFlags.Ephemeral });
                break;

            case 'vc_kick':
                const targetId = interaction.values[0];
                if (targetId === member.id) {
                    return interaction.reply({ content: '❌ No puedes expulsarte a ti mismo.', flags: MessageFlags.Ephemeral });
                }
                
                const targetMember = voiceChannel.members.get(targetId);
                if (!targetMember) {
                    return interaction.reply({ content: '❌ Ese usuario no se encuentra actualmente en tu canal.', flags: MessageFlags.Ephemeral });
                }
                
                // Expulsamos al usuario desconectándolo
                await targetMember.voice.disconnect('Expulsado por el dueño del canal temporal');
                await interaction.reply({ content: `👢 El usuario <@${targetId}> ha sido expulsado de tu canal.`, flags: MessageFlags.Ephemeral });
                break;
        }
    } catch (error) {
        console.error('Error modificando permisos del canal:', error);
        await interaction.reply({ content: '❌ Hubo un error al ejecutar la acción. Asegúrate de que mi rol tenga permisos de Administrador.', flags: MessageFlags.Ephemeral });
    }
}

module.exports = { handleInteraction };