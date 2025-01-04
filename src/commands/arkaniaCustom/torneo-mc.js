const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
        .setName('torneo-mc')
        .setDescription('Envía el embed de inscripción al torneo para todos los miembros.'),
    async execute(interaction) {
        // Confirmar ejecución del comando
        await interaction.reply({
            content: '✅ El comando para el torneo fue enviado con éxito.',
            ephemeral: true
        });

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
                .setLabel('Inscribirme / Salir')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚔️')
        );

        // Enviar el embed del torneo
        await interaction.channel.send({ embeds: [torneoEmbed], components: [row] });

        // Recolector de botones
        const filter = (i) => i.customId === 'inscribirme';
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 0 });

        collector.on('collect', async (i) => {
            const filePath = path.join(__dirname, 'inscritos_torneo.json');
            let inscritos = [];

            if (fs.existsSync(filePath)) {
                inscritos = JSON.parse(fs.readFileSync(filePath));
            }

            const yaInscrito = inscritos.some(inscrito => inscrito.discordId === i.user.id);

            if (yaInscrito) {
                // Eliminar al usuario del JSON
                inscritos = inscritos.filter(inscrito => inscrito.discordId !== i.user.id);
                fs.writeFileSync(filePath, JSON.stringify(inscritos, null, 2));

                const embed = new EmbedBuilder()
                    .setColor("#FFC868")
                    .setDescription(`❌ <@${i.user.id}>: Has salido del torneo con éxito.`);

                await i.reply({ embeds: [embed], ephemeral: true });
            } else {
                // Inscribir al usuario en el torneo
                inscritos.push({
                    invocador: i.user.username,
                    discordId: i.user.id
                });

                fs.writeFileSync(filePath, JSON.stringify(inscritos, null, 2));

                const embed = new EmbedBuilder()
                    .setColor("NotQuiteBlack")
                    .setDescription(`✅ <@${i.user.id}>: ¡Te has inscrito al torneo con éxito! ¡Buena suerte!`);

                await i.reply({ embeds: [embed], ephemeral: true });
            }
        });
    },
};
