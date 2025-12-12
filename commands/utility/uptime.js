const { SlashCommandBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require('discord.js');
const { pteroPanel } = require('../../config.json');

const serverService = require('../../services/serversService');
const fetch = require('node-fetch');

const PANEL_URL = pteroPanel.url;
const API_KEY = pteroPanel.apiKey;

async function getServerStatus(serverId) {
  try {
    const res = await fetch(`${PANEL_URL}/api/client/servers/${serverId}/resources`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json',
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.attributes.current_state;
  } catch (err) {
    console.error(`Error consultando servidor ${serverId}: ${err.message}`);
    return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Muestra el estado de los servidores registrados.'),

  async execute(interaction) {
    await interaction.deferReply();

    const servers = await serverService.getServers();
    if (!servers || servers.length === 0) {
      return interaction.editReply({
        content: 'No hay servidores registrados para consultar.',
      });
    }

    // 1. Inicializar el ContainerBuilder
    const statusContainer = new ContainerBuilder()
      .setAccentColor(2895667)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('### Estado de los servidores | ArkaniaHost')
      );

    // 2. Itera sobre los servidores y construye secciones dinámicas
    for (const server of servers) {
      const status = await getServerStatus(server.server_id);
      const isRunning = status === 'running';

      // Define el estilo y la etiqueta del botón
      const buttonStyle = isRunning ? ButtonStyle.Success : ButtonStyle.Secondary;
      const buttonLabel = isRunning ? 'ONLINE' : 'OFFLINE';

      statusContainer
        .addSeparatorComponents((separator) => separator)
        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(`${server.name}`) // Muestra el nombre del servidor
            )
            .setButtonAccessory((button) =>
              button
                .setCustomId(`status_${server.server_id}`) // ID único para el botón
                .setLabel(buttonLabel)
                .setStyle(buttonStyle)
                .setDisabled(true) // Desactivado, solo muestra el estado
            )
        );
    }

    // 4. Enviar el Container en lugar del Embed
    return interaction.editReply({
      components: [statusContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};