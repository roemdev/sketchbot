const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, PermissionsBitField, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits } = require('discord.js');
const assets = require('../../../assets.json');

const { voiceChannelsMap } = require('../../events/joinToCreate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice-master')
        .setDescription('Controla los permisos de un canal de voz con botones interactivos.')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {
        const voiceChannelState = {};

        // Botones de control
        const buttons = [
            new ButtonBuilder()
                .setCustomId('lock')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('hide')
                .setEmoji('👁️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('kick')
                .setEmoji('🔫')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('info')
                .setEmoji('📑')
                .setStyle(ButtonStyle.Secondary)
        ];

        const buttonRow = new ActionRowBuilder().addComponents(buttons);

        // Embed inicial
        const embed = new EmbedBuilder()
            .setColor(assets.color.base)
            .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL({ dynamic: true }) })
            .setTitle('Interfaz del VoiceMaster')
            .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setDescription('Haz clic en los botones de abajo para controlar tu canal de voz.')
            .addFields({ name: "Uso de los botones", value: "🔒 — **Bloquear** el canal de voz.\n👁️ — **Ocultar** el canal de voz.\n🔫 — **Expulsar** a alguien del canal de voz.\n📑 — **Mostrar** la información del canal de voz." });

        // Enviar el mensaje con los controles
        interaction.reply({ content: '<:check:1313237490395648021>', ephemeral: true })
        const message = await interaction.channel.send({ embeds: [embed], components: [buttonRow] });

        // Crear colector de interacciones
        const filter = (i) => buttons.some(button => button.data.custom_id === i.customId);
        const collector = message.createMessageComponentCollector({ filter });

        collector.on('collect', async (i) => {
            const userId = i.user.id;
            const voiceChannel = i.member.voice.channel;

            if (!voiceChannel) {
                const warningEmbed = new EmbedBuilder()
                    .setColor(assets.color.yellow)
                    .setDescription(`${assets.emoji.warn} <@${i.user.id}>: No estás **conectado** a un canal de voz.`);
                return i.reply({ embeds: [warningEmbed], ephemeral: true });
            }

            if (i.customId === 'info') {
                await handleInfoButton(i, voiceChannel);
                return;
            }

            const isOwner = voiceChannelsMap.get(voiceChannel.id) === i.user.id;
            if (!isOwner) {
                const warningEmbed = new EmbedBuilder()
                    .setColor(assets.color.yellow)
                    .setDescription(`${assets.emoji.warn} <@${i.user.id}>: No eres el **propietario** de este canal de voz.`);
                return i.reply({ embeds: [warningEmbed], ephemeral: true });
            }

            switch (i.customId) {
                case 'lock':
                    await toggleChannelLock(i, voiceChannel, voiceChannelState);
                    break;

                case 'hide':
                    await toggleChannelVisibility(i, voiceChannel, voiceChannelState);
                    break;

                case 'kick':
                    await handleMemberKick(i, voiceChannel);
                    break;

                default:
                    break;
            }
        });
    },
};

// Utility Functions
async function toggleChannelLock(interaction, channel, state) {
    const isLocked = channel.permissionOverwrites.cache
        .get(channel.guild.id)
        ?.deny.has(PermissionsBitField.Flags.Connect);

    await channel.permissionOverwrites.edit(channel.guild.id, {
        [PermissionsBitField.Flags.Connect]: isLocked ? null : false,
    });

    const newState = !isLocked;
    state[interaction.user.id] = { ...state[interaction.user.id], lock: newState };

    const responseEmbed = new EmbedBuilder()
        .setColor(newState ? assets.color.yellow : assets.color.green)
        .setDescription(`${newState ? assets.emoji.warn : assets.emoji.check} <@${i.user.id}>: Tu canal de voz fue ${newState ? '**bloqueado**' : '**desbloqueado**'}.`);
    await interaction.reply({ embeds: [responseEmbed], ephemeral: true });
}

async function toggleChannelVisibility(interaction, channel, state) {
    const isHidden = channel.permissionOverwrites.cache
        .get(channel.guild.id)
        ?.deny.has(PermissionsBitField.Flags.ViewChannel);

    await channel.permissionOverwrites.edit(channel.guild.id, {
        [PermissionsBitField.Flags.ViewChannel]: isHidden ? null : false,
    });

    const newState = !isHidden;
    state[interaction.user.id] = { ...state[interaction.user.id], hide: newState };

    const responseEmbed = new EmbedBuilder()
        .setColor(newState ? assets.color.yellow : assets.color.green)
        .setDescription(`${newState ? assets.emoji.warn : assets.emoji.check} <@${i.user.id}>: Tu canal de voz se ${newState ? 'se ha **ocultado**' : 'ahora es **visible**'}.`);
    await interaction.reply({ embeds: [responseEmbed], ephemeral: true });
}

async function handleMemberKick(interaction, channel) {
    const members = [...channel.members.values()];

    if (members.length === 0) {
        const responseEmbed = new EmbedBuilder()
            .setColor(assets.color.yellow)
            .setDescription(`${assets.emoji.warn} <@${i.user.id}>: No hay miembros para **expulsar**.`);
        return interaction.reply({ embeds: [responseEmbed], ephemeral: true });
    }

    const options = members.map(member => new StringSelectMenuOptionBuilder()
        .setLabel(member.user.username)
        .setValue(member.id)
    );

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('selectKick')
        .setPlaceholder('Selecciona un miembro para expulsar')
        .addOptions(options);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
        content: 'Selecciona un miembro para expulsar:',
        components: [selectRow],
        ephemeral: true,
    });

    const filter = (i) => i.customId === 'selectKick';
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

    collector.on('collect', async (selectInteraction) => {
        const memberId = selectInteraction.values[0];
        const member = channel.members.get(memberId);

        if (!member) {
            const responseEmbed = new EmbedBuilder()
                .setColor(assets.color.yellow)
                .setDescription(`${assets.emoji.warn} <@${i.user.id}>: No se pudo encontrar al miembro seleccionado.`);
            return selectInteraction.reply({ embeds: [responseEmbed], ephemeral: true });
        }

        if (memberId === interaction.user.id) {
            const responseEmbed = new EmbedBuilder()
                .setColor(assets.color.yellow)
                .setDescription(`${assets.emoji.warn} <@${i.user.id}>: No puedes **expulsarte** de tu propio canal.`);
            return selectInteraction.reply({ embeds: [responseEmbed], ephemeral: true });
        }

        await member.voice.disconnect();
        const responseEmbed = new EmbedBuilder()
            .setColor(assets.color.green)
            .setDescription(`${assets.emoji.check} <@${i.user.id}>: El usuario **${member.user.username}** ha sido **expulsado** de tu canal de voz.`);
        await selectInteraction.reply({ embeds: [responseEmbed], ephemeral: true });
    });
}

async function handleInfoButton(interaction, channel) {
    if (!channel) {
        const responseEmbed = new EmbedBuilder()
            .setColor(assets.color.yellow)
            .setDescription(`${assets.emoji.warn} <@${i.user.id}>: No estás en un **canal de voz**.`);
        return interaction.reply({ embeds: [responseEmbed], ephemeral: true });
    }

    const isLocked = channel.permissionOverwrites.cache
        .get(channel.guild.id)
        ?.deny.has(PermissionsBitField.Flags.Connect) || false;

    const isHidden = channel.permissionOverwrites.cache
        .get(channel.guild.id)
        ?.deny.has(PermissionsBitField.Flags.ViewChannel) || false;

    const owner = voiceChannelsMap?.get(channel.id) || 'Desconocido';
    const membersCount = channel.members.filter(member => !member.user.bot).size;
    const creationDate = `<t:${Math.floor(channel.createdAt.getTime() / 1000)}:R>`;

    const infoEmbed = new EmbedBuilder()
        .setColor(assets.color.yellow)
        .setTitle(`Nombre: ${channel.name}`)
        .setAuthor({ name: 'Información del canal de voz', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`
            **Propietario:** <@${owner}>
            **Creado:** ${creationDate}
            **Bloqueado:** ${isLocked ? assets.emoji.check : assets.emoji.deny}
            **Invisible:** ${isHidden ? assets.emoji.check : assets.emoji.deny}
            **Online:** \`${membersCount}\`
        `);

    return interaction.reply({
        embeds: [infoEmbed],
        ephemeral: true,
    });
}
