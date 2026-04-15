const { MessageFlags } = require("discord.js");
const supabase = require("../services/dbService"); // Ahora utilizamos el cliente de Supabase

async function handleInteraction(interaction) {
    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return interaction.reply({ content: "Tienes que estar en un canal de voz para usar esto.", flags: MessageFlags.Ephemeral });
    }

    // Migración a Supabase: Consultar el canal temporal
    const { data: rows, error: selectError } = await supabase
        .from("temp_channels")
        .select("*")
        .eq("channel_id", voiceChannel.id);

    if (selectError) {
        console.error("Error consultando temp_channels:", selectError);
        return interaction.reply({ content: "Ocurrió un error interno al verificar el canal.", flags: MessageFlags.Ephemeral });
    }

    if (!rows || rows.length === 0) {
        return interaction.reply({ content: "Este canal no es temporal o ya expiró.", flags: MessageFlags.Ephemeral });
    }

    const ownerId = rows[0].owner_id;
    const action = interaction.customId;

    if (action === "vc_claim") {
        if (ownerId === member.id) {
            return interaction.reply({ content: "Ya eres el dueño de este canal.", flags: MessageFlags.Ephemeral });
        }
        if (voiceChannel.members.has(ownerId)) {
            return interaction.reply({ content: "El dueño actual sigue conectado. No puedes reclamar el canal todavía.", flags: MessageFlags.Ephemeral });
        }

        // Migración a Supabase: Actualizar el dueño del canal
        const { error: updateError } = await supabase
            .from("temp_channels")
            .update({ owner_id: member.id })
            .eq("channel_id", voiceChannel.id);

        if (updateError) {
            console.error("Error actualizando el dueño del canal en Supabase:", updateError);
            return interaction.reply({ content: "Ocurrió un error al intentar reclamar el canal.", flags: MessageFlags.Ephemeral });
        }

        if (!interaction.client.tempVCs) interaction.client.tempVCs = new Map();
        interaction.client.tempVCs.set(voiceChannel.id, { ownerId: member.id });

        return interaction.reply({ content: "✅ Canal reclamado. Ahora es tuyo.", flags: MessageFlags.Ephemeral });
    }

    if (ownerId !== member.id) {
        return interaction.reply({ content: "Solo el dueño del canal puede hacer esto.", flags: MessageFlags.Ephemeral });
    }

    const everyoneRole = interaction.guild.roles.everyone;
    const botId = interaction.client.user.id;

    try {
        switch (action) {
            case "vc_lock":
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: false });
                await voiceChannel.permissionOverwrites.edit(member.id, { Connect: true });
                await voiceChannel.permissionOverwrites.edit(botId, { Connect: true, ViewChannel: true, ManageChannels: true });
                return interaction.reply({ content: "🔒 Canal bloqueado. Nadie más puede entrar.", flags: MessageFlags.Ephemeral });

            case "vc_unlock":
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { Connect: true });
                return interaction.reply({ content: "🔓 Canal desbloqueado. Cualquiera puede entrar.", flags: MessageFlags.Ephemeral });

            case "vc_hide":
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: false });
                await voiceChannel.permissionOverwrites.edit(member.id, { ViewChannel: true });
                await voiceChannel.permissionOverwrites.edit(botId, { Connect: true, ViewChannel: true, ManageChannels: true });
                return interaction.reply({ content: "👻 Canal oculto. Nadie lo ve en la lista.", flags: MessageFlags.Ephemeral });

            case "vc_show":
                await voiceChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: true });
                return interaction.reply({ content: "👁️ Canal visible de nuevo.", flags: MessageFlags.Ephemeral });

            case "vc_kick": {
                const targetId = interaction.values[0];
                if (targetId === member.id) {
                    return interaction.reply({ content: "No puedes expulsarte a ti mismo ❌", flags: MessageFlags.Ephemeral });
                }
                const targetMember = voiceChannel.members.get(targetId);
                if (!targetMember) {
                    return interaction.reply({ content: "Esa persona no está en tu canal.", flags: MessageFlags.Ephemeral });
                }
                await targetMember.voice.disconnect("Expulsado por el dueño del canal temporal");
                return interaction.reply({ content: `👢 <@${targetId}> fue expulsado del canal.`, flags: MessageFlags.Ephemeral });
            }
        }
    } catch (error) {
        console.error("Error modificando permisos del canal:", error);
        return interaction.reply({ content: "Algo salió mal. Asegúrate de que el bot tenga los permisos necesarios.", flags: MessageFlags.Ephemeral });
    }
}

module.exports = { handleInteraction };