const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
        .setName('torneo-mc')
        .setDescription('Envía el embed de inscripción al torneo para todos los miembros.'),
    async execute(interaction) {
        // Embed principal del torneo
        const torneoEmbed = new EmbedBuilder()
            .setColor("NotQuiteBlack")
            .setTitle('Información del Torneo Arena PVP de Minecraft')
            .setDescription('¡Prepárate para luchar en un duelo épico y ganar el gran premio! Aquí tienes todo lo que necesitas saber:')
            .addFields(
                { name: 'Formato', value: 'Eliminación directa 1 vs 1 en una arena personalizada. Se realizarán rondas consecutivas hasta determinar al ganador', inline: false },
                { name: 'Información relevante', value: '* Hora de inicio: <t:1736035200:t>\n* Premio: $15 USD.', inline: false },
                { name: 'Cómo participar', value: '1. Ve al canal <#1282215373688799284>.\n2. Haz clic en el botón “Inscribirme”.\n3. ¡Ya estás participando!', inline: false },
                { name: 'Reglas', value: '* Versión de Minecraft: 1.20.1.\n* No se permiten mods.\n* Cualquier comportamiento antideportivo resultará en descalificación.', inline: false },
            )
            .setImage('https://i.imgur.com/52ILUwS.jpeg');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('inscribirme')
                .setLabel('Inscribirme')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚔️')
        );

        // Enviar el embed del torneo
        interaction.deferReply();
        interaction.deleteReply();
        await interaction.channel.send({ embeds: [torneoEmbed], components: [row] });

        // Recolector de botones
        const filter = (i) => ['inscribirme', 'confirmar_inscripcion', 'salir_torneo'].includes(i.customId);
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 0 });

        collector.on('collect', async (i) => {
            const requiredRoleId = '1311799987474010113';
            const filePath = path.join(__dirname, 'inscritos_torneo.json');
            let inscritos = [];

            if (fs.existsSync(filePath)) {
                inscritos = JSON.parse(fs.readFileSync(filePath));
            }

            if (i.customId === 'inscribirme') {
                // Verificar si el usuario tiene el rol necesario
                if (!i.member.roles.cache.has(requiredRoleId)) {
                    await i.reply({ content: 'No tienes el rol necesario para inscribirte en el torneo.', ephemeral: true });
                    return;
                }

                // Verificar si ya está inscrito
                const yaInscrito = inscritos.some(inscrito => inscrito.discordId === i.user.id);

                const embed = new EmbedBuilder();
                const rowButtons = new ActionRowBuilder();

                if (yaInscrito) {
                    embed.setColor("#FFC868")
                        .setDescription(`<@${i.user.id}>: Ya estás inscrito en el torneo. Si deseas salir, presiona el botón a continuación.`);

                    rowButtons.addComponents(
                        new ButtonBuilder()
                            .setCustomId('salir_torneo')
                            .setLabel('Salir del torneo')
                            .setStyle(ButtonStyle.Danger)
                    );
                } else {
                    embed.setColor("NotQuiteBlack")
                        .setDescription(`<@${i.user.id}>: Por favor, confirma tu inscripción al torneo.`);

                    rowButtons.addComponents(
                        new ButtonBuilder()
                            .setCustomId('confirmar_inscripcion')
                            .setLabel('Confirmar inscripción')
                            .setStyle(ButtonStyle.Success)
                    );
                }

                // Enviar el mensaje con el embed y los botones juntos
                await i.reply({ embeds: [embed], components: [rowButtons], ephemeral: true });
            }

            if (i.customId === 'confirmar_inscripcion') {
                // Confirmar la inscripción y guardar en el JSON
                inscritos.push({
                    invocador: i.user.username,
                    discordId: i.user.id
                });

                fs.writeFileSync(filePath, JSON.stringify(inscritos, null, 2));

                await i.followUp({ content: '¡Tu inscripción al torneo ha sido confirmada! ¡Buena suerte!', ephemeral: true });
            }

            if (i.customId === 'salir_torneo') {
                // Eliminar al usuario del JSON
                inscritos = inscritos.filter(inscrito => inscrito.discordId !== i.user.id);

                fs.writeFileSync(filePath, JSON.stringify(inscritos, null, 2));

                await i.followUp({ content: 'Has salido del torneo con éxito.', ephemeral: true });
            }
        });
    },
};
