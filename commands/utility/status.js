const { SlashCommandBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require('discord.js');
const { pteroPanel } = require('../../config.json');

const serverService = require('../../services/serversService');

const PANEL_URL = pteroPanel.url;
const API_KEY = pteroPanel.apiKey;

// 1. Nueva función para verificar si el Panel/Host tiene conexión
async function checkPanelStatus() {
  try {
    const controller = new AbortController();
    // Timeout de 3 segundos: si no responde en 3s, asumimos que se fue la luz/internet
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(PANEL_URL, {
      method: 'HEAD', // Solo pedimos las cabeceras para que sea ultra rápido
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return res.ok || res.status < 500; // Si responde (incluso 403/401), el host está vivo.
  } catch (err) {
    return false; // Error de red, timeout o DNS
  }
}

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
    .setName('estado')
    .setDescription('Muestra el estado del Host y de los servidores registrados.'),

  async execute(interaction) {
    await interaction.deferReply();

    // 2. Verificar estado del Panel General primero
    const isPanelOnline = await checkPanelStatus();

    const servers = await serverService.getServers();
    if (!servers || servers.length === 0) {
      return interaction.editReply({
        content: 'No hay servidores registrados para consultar.',
      });
    }

    // Inicializar el ContainerBuilder
    const statusContainer = new ContainerBuilder()
      .setAccentColor(2895667)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('### Estado de los servidores | ArkaniaHost')
      );

    // 3. AÑADIR LA LÍNEA DEL ESTADO DEL HOST (PANEL)
    const hostStyle = isPanelOnline ? ButtonStyle.Success : ButtonStyle.Danger;
    const hostLabel = isPanelOnline ? 'ONLINE' : 'OFFLINE';

    statusContainer
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent('**Host**') // Título de la sección del host
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId('status_host_panel')
              .setLabel(hostLabel)
              .setStyle(hostStyle)
              .setDisabled(true)
          )
      )
      .addSeparatorComponents((separator) => separator); // Separador visual

    // 4. Itera sobre los servidores
    for (const server of servers) {
      let status = null;
      let isRunning = false;

      if (isPanelOnline) {
        status = await getServerStatus(server.server_id);
        isRunning = status === 'running';
      } else {
        status = 'host_down'; // Estado especial interno
        isRunning = false;
      }

      // Define el estilo y la etiqueta del botón
      let buttonStyle = ButtonStyle.Danger;
      let buttonLabel = 'OFFLINE';

      if (isRunning) {
        buttonStyle = ButtonStyle.Success;
        buttonLabel = 'ONLINE';
      } else if (!isPanelOnline) {
        // Si el panel no responde, marcamos los servidores en rojo o gris oscuro
        buttonStyle = ButtonStyle.Secondary;
        buttonLabel = 'UNREACHABLE'; // O "SIN CONEXIÓN"
      }

      statusContainer
        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(`${server.name}`)
            )
            .setButtonAccessory((button) =>
              button
                .setCustomId(`status_${server.server_id}`)
                .setLabel(buttonLabel)
                .setStyle(buttonStyle)
                .setDisabled(true)
            )
        );
    }

    return interaction.editReply({
      components: [statusContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};