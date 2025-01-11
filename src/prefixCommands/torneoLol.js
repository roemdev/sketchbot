const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const assets = require('../../assets.json')

module.exports = {
    name: 'torneolol',
    description: 'Envía el embed de inscripción al torneo para todos los miembros.',
    async execute(message, args) {

      if (!message.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
        const deny = new EmbedBuilder()
          .setColor(assets.color.base)
          .setDescription(`${assets.emoji.deny} No puedes ejecutar este comando.`)
        return message.reply({ embeds: [deny], allowedMentions: { repliedUser: false } });
      }

        // Embed principal del torneo
        const torneoEmbed = new EmbedBuilder()
            .setColor("NotQuiteBlack")
            .setTitle('🏆 ARKANIA RIFT')
            .setDescription('¿Estás listo para enfrentarte a los mejores y demostrar tu supremacía en el Puente del Progreso? Inscríbete ahora y únete a esta épica contienda donde cada jugada cuenta y solo el más fuerte llegará a la cima. ¡No dejes que te lo cuenten, haz historia en ARKANIA RIFT! ¿Tienes lo que se necesita para ganar? **¡Este es tu momento!**')
            .addFields(
                { name: 'Fechas', value: 'Demuestra tu valía del 23 al 14 de diciembre en dos grandes fases de máxima competitividad.' },
                { name: 'Criterios', value: '¿Zaun o Piltóver? Aplasta a tu rival en el Puente del Progreso ARAM en un `1 VS 1` con un campeón significativo de tu lado.' },
                { name: 'Premios', value: 'Compite en este gran torneo y vive al máximo la experiencia Arcane ganando el **Pase de Batalla de Arcane**.' }
            )
            .setImage('https://i.imgur.com/cUq8oRq.png');

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                  .setCustomId('inscribirme')
                  .setLabel('Inscribirme')
                  .setStyle(ButtonStyle.Primary)
                );
          

        // Enviar el embed del torneo
        await message.channel.send({ embeds: [torneoEmbed], components: [row] });
        await message.delete();

        // Recolector de botones
        const filter = (i) => ['inscribirme'].includes(i.customId);
        const collector = message.channel.createMessageComponentCollector({ filter, time: 0 });

        collector.on('collect', async (i) => {
            if (i.customId === 'inscribirme') {
                // Abrir modal
                const modal = new ModalBuilder()
                    .setCustomId('modal_inscripcion')
                    .setTitle('Inscripción al Torneo')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('nombre_invocador')
                                .setLabel('Riot ID (ej: Karma#LAN)')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await i.showModal(modal);
            }
        });

        // Manejar el envío de modales
        const client = message.client;

        if (!client.modalEventRegistered) {
            client.modalEventRegistered = true;

            client.on('interactionCreate', async (modalInteraction) => {
                if (!modalInteraction.isModalSubmit() || modalInteraction.customId !== 'modal_inscripcion') return;

                const nombreInvocador = modalInteraction.fields.getTextInputValue('nombre_invocador');

                const confirmationEmbed = new EmbedBuilder()
                    .setColor(assets.color.green)
                    .setDescription(`${assets.emoji.check} Tu solicitud ha sido enviada. Espera la confirmación.`);

                await modalInteraction.reply({ embeds: [confirmationEmbed], flags: MessageFlags.Ephemeral });

                // Crear embed de validación
                const validacionEmbed = new EmbedBuilder()
                    .setColor(assets.color.base)
                    .setTitle('Solicitud de Inscripción al Torneo')
                    .addFields(
                        { name: ' ', value: `**ID**: ${nombreInvocador}`, inline: true },
                        { name: ' ', value: `**Miembro**: <@${modalInteraction.user.id}>`, inline: true }
                    );

                const rowValidacion = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('aprobar')
                        .setLabel(' ')
                        .setEmoji(assets.emoji.whitecheck)
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('denegar')
                        .setLabel(' ')
                        .setEmoji(assets.emoji.whitedeny)
                        .setStyle(ButtonStyle.Danger)
                );

                const validacionChannel = await client.channels.fetch('1252998185664647209').catch(() => null);

                if (!validacionChannel) return;

                const mensajeValidacion = await validacionChannel.send({
                    embeds: [validacionEmbed],
                    components: [rowValidacion],
                });

                const collector = validacionChannel.createMessageComponentCollector({
                    filter: (i) =>
                        ['aprobar', 'denegar'].includes(i.customId) &&
                        i.message.id === mensajeValidacion.id,
                    time: 0,
                });

                collector.on('collect', async (i) => {
                    if (i.customId === 'aprobar') {
                        const filePath = path.join(__dirname, 'torneolol.json');
                        let inscritos = [];
                    
                        if (fs.existsSync(filePath)) {
                            inscritos = JSON.parse(fs.readFileSync(filePath));
                        }
                    
                        inscritos.push({ invocador: nombreInvocador, discordId: modalInteraction.user.displayName });
                    
                        fs.writeFileSync(filePath, JSON.stringify(inscritos, null, 2));
                    
                        // Respuesta al moderador
                        const embedAprobadoModerador = new EmbedBuilder()
                            .setColor(assets.color.green)
                            .setDescription(`${assets.emoji.check} Inscripción aprobada.`);
                    
                        await i.reply({ embeds: [embedAprobadoModerador], flags: MessageFlags.Ephemeral });
                                        
                        await modalInteraction.user.send({ content:`${assets.emoji.check} Tu inscripción fue confirmada. ¡Buena suerte en el torneo!`});
                    
                    } else if (i.customId === 'denegar') {
                        // Respuesta al moderador
                        const embedDenegadoModerador = new EmbedBuilder()
                            .setColor(assets.color.red) // Rojo
                            .setDescription(`${assets.emoji.deny} Inscripción denegada.`);
                    
                        await i.reply({ embeds: [embedDenegadoModerador], flags: MessageFlags.Ephemeral });
                  
                        await modalInteraction.user.send({ content: `${assets.emoji.deny} No pudimos confirmar tu inscripción.\n\nRevisa los datos enviados o contacta a un administrador.` });
                    }
                    

                    await i.message.edit({
                        components: [
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId('aprobar')
                                    .setLabel(' ')
                                    .setEmoji(assets.emoji.whitecheck)
                                    .setStyle(ButtonStyle.Success)
                                    .setDisabled(true),
                                new ButtonBuilder()
                                    .setCustomId('denegar')
                                    .setLabel(' ')
                                    .setEmoji(assets.emoji.whitedeny)
                                    .setStyle(ButtonStyle.Danger)
                                    .setDisabled(true)
                            ),
                        ],
                    });
                });
            });
        }
    },
};
