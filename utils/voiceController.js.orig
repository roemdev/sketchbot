const { MessageFlags } = require("discord.js");
const db = require("../services/dbService");

async function handleInteraction(interaction) {
    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return interaction.reply({ content: "❌ Debes estar conectado a un canal de voz para usar este panel.", flags: MessageFlags.Ephemeral });
    }

    const rows = await db.query("SELECT * FROM temp_channels WHERE channel_id = ?", [voiceChannel.id]);
    if (rows.length === 0) {
        return interaction.reply({ content: "❌ Este no es un canal temporal válido o ya expiró.", flags: MessageFlags.Ephemeral });
    }

    const ownerId = rows[0].owner_id;
    const action = interaction.customId;

    if (action === "vc_claim") {
        if (ownerId === member.id) {
            return interaction.reply({ content: "Ya eres el propietario de este canal.", flags: MessageFlags.Ephemeral });
        }
        if (voiceChannel.members.has(ownerId)) {
            return interaction.reply({ content: "❌ No puedes reclamar el canal porque el dueño actual sigue conectado.", flags: MessageFlags.Ephemeral });
        }

        await db.execute("UPDATE temp_channels SET owner_id = ? WHERE channel_id = ?", [member.id, voiceChannel.id]);
        if (!interaction.client.tempVCs) interaction.client.tempVCs = new Map();
        interaction.client.tempVCs.set(voiceChannel.id, { ownerId: member.id });

        return interaction.reply({ content: "👑 ¡Has reclamado el canal exitosamente!", flags: MessageFlags.Ephemeral });
    }

    if (ownerId !== member.id) {
        return interaction.reply({ content: "❌ Solo el propietario del canal puede usar esta función.", flags: MessageFlags.Ephemeral });
    }

    const everyoneRole = interaction.guild.roles.everyone;
    const botId = interaction.client.user.id;

    try {
        switch (action) {
            case "vc_lock":
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: false });
                await voiceChannel.permissionOverwrites.edit(member.id, { Connect: true });
                await voiceChannel.permissionOverwrites.edit(botId, { Connect: true, ViewChannel: true, ManageChannels: true });
                return interaction.reply({ content: "🔐 Tu canal ha sido **bloqueado**.", flags: MessageFlags.Ephemeral });

            case "vc_unlock":
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: true });
                return interaction.reply({ content: "🔓 Tu canal ha sido **desbloqueado**.", flags: MessageFlags.Ephemeral });

            case "vc_hide":
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: false });
                await voiceChannel.permissionOverwrites.edit(member.id, { ViewChannel: true });
                await voiceChannel.permissionOverwrites.edit(botId, { Connect: true, ViewChannel: true, ManageChannels: true });
                return interaction.reply({ content: "🙈 Tu canal ahora es **invisible**.", flags: MessageFlags.Ephemeral });

            case "vc_show":
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: true });
                return interaction.reply({ content: "🙉 Tu canal vuelve a ser **visible** para todos.", flags: MessageFlags.Ephemeral });

            case "vc_kick": {
                const targetId = interaction.values[0];
                if (targetId === member.id) {
                    return interaction.reply({ content: "❌ No puedes expulsarte a ti mismo.", flags: MessageFlags.Ephemeral });
                }
                const targetMember = voiceChannel.members.get(targetId);
                if (!targetMember) {
                    return interaction.reply({ content: "❌ Ese usuario no se encuentra en tu canal.", flags: MessageFlags.Ephemeral });
                }
                await targetMember.voice.disconnect("Expulsado por el dueño del canal temporal");
                return interaction.reply({ content: `👢 <@${targetId}> ha sido expulsado de tu canal.`, flags: MessageFlags.Ephemeral });
            }
        }
    } catch (error) {
        console.error("Error modificando permisos del canal:", error);
        return interaction.reply({ content: "❌ Hubo un error al ejecutar la acción. Verifica que el bot tenga permisos suficientes.", flags: MessageFlags.Ephemeral });
    }
}

module.exports = { handleInteraction };